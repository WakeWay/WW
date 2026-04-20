import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { query } from './db';
import { sendOtpEmail } from './mailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'wakeway-super-secret-key-replace-in-production';

// Generate a random 6 digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// =============== HEALTH CHECKS ===============

// Lightweight endpoint specifically for external cron jobs (like cron-job.org)
// Hitting this endpoint every 14 minutes prevents Render from putting the Free Tier server to sleep!
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'awake', time: new Date() });
});

// =============== AUTH ROUTES ===============

app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailLower = email.toLowerCase();

    // Validate user existence based on the action
    if (reason === 'login') {
      const userRes = await query(`SELECT id FROM users WHERE email = $1`, [emailLower]);
      if (userRes.rows.length === 0) {
        return res.status(400).json({ error: 'User not found. Please sign up.' });
      }
    } else if (reason === 'signup') {
      const userRes = await query(`SELECT id FROM users WHERE email = $1`, [emailLower]);
      if (userRes.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists. Please log in.' });
      }
    }
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // UPSERT the OTP
    await query(
      `INSERT INTO otps (email, code, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE 
       SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [emailLower, otp, expiresAt]
    );

    // Send via standard DB
    await sendOtpEmail(emailLower, otp, reason);

    res.json({ message: 'OTP sent successfully' });
  } catch (err: any) {
    console.error('request-otp error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const emailLower = email.toLowerCase();

    // Check OTP
    const otpRes = await query(
      `SELECT * FROM otps WHERE email = $1 AND code = $2 AND expires_at > NOW()`,
      [emailLower, otp]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // OTP valid. Check if user exists.
    let userRes = await query(`SELECT * FROM users WHERE email = $1`, [emailLower]);
    let user = userRes.rows[0];

    // If new user, create them
    if (!user) {
      const newUserRes = await query(
        `INSERT INTO users (email) VALUES ($1) RETURNING *`,
        [emailLower]
      );
      user = newUserRes.rows[0];
    }

    // Delete the used OTP
    await query(`DELETE FROM otps WHERE email = $1`, [emailLower]);

    // Issue JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err: any) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/deactivate', extractUser, async (req: any, res: any) => {
  try {
    const { otp } = req.body;
    const emailLower = req.user.email.toLowerCase();

    const otpRes = await query(
      `SELECT * FROM otps WHERE email = $1 AND code = $2 AND expires_at > NOW()`,
      [emailLower, otp]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Delete user (cascade removes trips)
    await query(`DELETE FROM users WHERE email = $1`, [emailLower]);
    await query(`DELETE FROM otps WHERE email = $1`, [emailLower]);

    res.json({ message: 'Account deactivated' });
  } catch (err: any) {
    console.error('deactivate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to protect routes
async function extractUser(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // Stateless fix: prevent orphaned tokens from trying to insert
    const userRes = await query(`SELECT id FROM users WHERE id = $1`, [payload.userId]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User does not exist anymore. Token void.' });
    }
    
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// =============== TRIP ROUTES ===============

app.get('/api/trips/history', extractUser, async (req: any, res: any) => {
  try {
    const tripRes = await query(
      `SELECT * FROM trip_history WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json({ trips: tripRes.rows });
  } catch (err: any) {
    console.error('get-trips error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/trips/history', extractUser, async (req: any, res: any) => {
  try {
    const { tripId, destinationName, radiusMeters, startTime, endTime, alarmTriggered } = req.body;
    
    await query(
      `INSERT INTO trip_history (user_id, trip_id, destination_name, radius_meters, start_time, end_time, alarm_triggered)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.userId,
        tripId,
        destinationName,
        radiusMeters,
        new Date(startTime),
        new Date(endTime),
        alarmTriggered || false
      ]
    );

    res.json({ message: 'Trip saved successfully' });
  } catch (err: any) {
    console.error('save-trip error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/trips/history', extractUser, async (req: any, res: any) => {
  try {
    await query(`DELETE FROM trip_history WHERE user_id = $1`, [req.user.userId]);
    res.json({ message: 'Trip history cleared.' });
  } catch (err: any) {
    console.error('delete-trips error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/trips/history/:tripId', extractUser, async (req: any, res: any) => {
  try {
    const { tripId } = req.params;
    await query(`DELETE FROM trip_history WHERE user_id = $1 AND trip_id = $2`, [req.user.userId, tripId]);
    res.json({ message: 'Trip deleted.' });
  } catch (err: any) {
    console.error('delete-trip error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
