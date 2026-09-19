import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from './db';
import { sendOtpEmail } from './mailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const getRequiredJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET must be configured before starting the backend');
  }
  return secret;
};

const JWT_SECRET = getRequiredJwtSecret();

const getMissingEnvVars = () => {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const emailJsConfigured = process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY;

  if (!emailJsConfigured) {
    required.push('EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY');
  }

  return required.filter((key) => !process.env[key] || process.env[key] === '');
};

// Generate a random 6 digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const SHARE_TTL_HOURS = 24;
const hashShareToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const roundLocation = (value: number) => Math.round(value * 1000) / 1000;
const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getShareStatus = (share: any) => {
  if (share.status === 'active' && new Date(share.expires_at).getTime() <= Date.now()) return 'expired';
  return share.status;
};

const serializeShare = async (share: any) => {
  const status = getShareStatus(share);
  const events = await query(
    `SELECT event_type, waypoint_index, created_at FROM trip_share_events WHERE share_id = $1 ORDER BY created_at ASC`,
    [share.id]
  );

  return {
    id: share.id,
    status,
    tripId: share.trip_id,
    destinationName: share.destination_name || 'Destination',
    destination: share.destination_latitude === null || share.destination_longitude === null
      ? null
      : { latitude: Number(share.destination_latitude), longitude: Number(share.destination_longitude) },
    currentWaypointIndex: share.current_waypoint_index,
    lastKnownLocation: share.last_location_latitude === null || share.last_location_longitude === null
      ? null
      : { latitude: Number(share.last_location_latitude), longitude: Number(share.last_location_longitude) },
    expectedArrivalAt: share.expected_arrival_at,
    expiresAt: share.expires_at,
    createdAt: share.created_at,
    events: events.rows.map((event: any) => ({
      type: event.event_type,
      waypointIndex: event.waypoint_index,
      createdAt: event.created_at,
    })),
  };
};

// Helper to avoid hanging the request if the SMTP provider blocks or is slow.
async function sendOtpWithTimeout(email: string, otp: string, reason: 'login' | 'deactivate' | 'signup') {
  const timeoutMs = Number.parseInt(process.env.EMAILJS_TIMEOUT_MS || '30000', 10);
  let timeoutHandle: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('SMTP send timeout')), timeoutMs);
  });

  try {
    return await Promise.race([sendOtpEmail(email, otp, reason), timeout]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

// =============== HEALTH CHECKS ===============

// Lightweight endpoint specifically for external cron jobs (like cron-job.org)
// Hitting this endpoint every 14 minutes prevents Render from putting the Free Tier server to sleep!
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'awake', time: new Date() });
});

// =============== AUTH ROUTES ===============

app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const missing = getMissingEnvVars();
    if (missing.length > 0) {
      console.error('Missing backend env vars for request-otp:', missing);
      return res.status(503).json({ error: `Backend not configured. Missing: ${missing.join(', ')}` });
    }

    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailLower = email.trim().toLowerCase();
    console.log('[OTP] Request received', { email: `${emailLower.slice(0, 2)}***`, reason });

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

    // UPSERT the OTP
    await query(
      `INSERT INTO otps (email, code, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
       ON CONFLICT (email) DO UPDATE 
       SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [emailLower, otp]
    );
    console.log('[OTP] Code stored', { reason });

    // Send via standard DB
    try {
      console.log('[OTP] Sending email', { reason });
      await sendOtpWithTimeout(emailLower, otp, reason as any);
      console.log('[OTP] Email sent', { reason });
    } catch (e: any) {
      console.error('OTP send error:', e && e.message ? e.message : e);
      return res.status(502).json({ error: 'Failed to deliver OTP email' });
    }

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

    const emailLower = email.trim().toLowerCase();
    const otpValue = String(otp).trim();
    console.log('[OTP] Verify request received', {
      email: `${emailLower.slice(0, 2)}***`,
      codeLength: otpValue.length,
    });

    // Check OTP
    const otpRes = await query(
      `SELECT * FROM otps WHERE email = $1 AND BTRIM(code) = $2 AND expires_at > NOW()`,
      [emailLower, otpValue]
    );
    console.log('[OTP] Verify lookup', { matchCount: otpRes.rows.length });

    if (otpRes.rows.length === 0) {
      const diagnosticRes = await query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE expires_at > NOW())::int AS active
         FROM otps WHERE email = $1`,
        [emailLower]
      );
      console.log('[OTP] Verify diagnostic', diagnosticRes.rows[0]);
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
    const { tripId, waypoints, startTime, endTime, alarmTriggered } = req.body;
    
    await query(
      `INSERT INTO trip_history (user_id, trip_id, waypoints, start_time, end_time, alarm_triggered)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.userId,
        tripId,
        JSON.stringify(waypoints || []),
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

// =============== LIVE TRIP SHARING ===============

app.post('/api/trips/:tripId/share', extractUser, async (req: any, res: any) => {
  try {
    const { tripId } = req.params;
    const {
      destinationName,
      destination,
      currentWaypointIndex = 0,
      expectedArrivalAt,
      expiresInHours = SHARE_TTL_HOURS,
    } = req.body;
    const ttlHours = Math.min(Math.max(Number(expiresInHours) || SHARE_TTL_HOURS, 1), SHARE_TTL_HOURS);

    if (!destination || !Number.isFinite(destination.latitude) || !Number.isFinite(destination.longitude)) {
      return res.status(400).json({ error: 'A valid destination is required' });
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const shareRes = await query(
      `INSERT INTO trip_shares
       (user_id, trip_id, token_hash, destination_name, destination_latitude, destination_longitude,
        current_waypoint_index, expected_arrival_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + ($9 * INTERVAL '1 hour'))
       RETURNING *`,
      [
        req.user.userId,
        tripId,
        hashShareToken(token),
        String(destinationName || 'Destination').slice(0, 120),
        roundLocation(Number(destination.latitude)),
        roundLocation(Number(destination.longitude)),
        Math.max(0, Number(currentWaypointIndex) || 0),
        expectedArrivalAt || null,
        ttlHours,
      ]
    );
    const share = shareRes.rows[0];

    await query(
      `INSERT INTO trip_share_events (share_id, event_type, waypoint_index) VALUES ($1, 'trip_started', $2)`,
      [share.id, share.current_waypoint_index]
    );

    res.status(201).json({
      share: await serializeShare(share),
      token,
      expiresAt: share.expires_at,
    });
  } catch (err: any) {
    console.error('create-share error:', err);
    res.status(500).json({ error: 'Unable to create trip share' });
  }
});

app.get('/share/:token', async (req, res) => {
  try {
    const shareRes = await query(`SELECT * FROM trip_shares WHERE token_hash = $1`, [hashShareToken(req.params.token)]);
    if (shareRes.rows.length === 0) return res.status(404).json({ error: 'Share link not found' });

    const share = shareRes.rows[0];
    if (getShareStatus(share) === 'expired' && share.status === 'active') {
      await query(`UPDATE trip_shares SET status = 'expired', updated_at = NOW() WHERE id = $1`, [share.id]);
      share.status = 'expired';
    }
    const payload = await serializeShare(share);
    if (req.accepts('html')) {
      const latestEvent = payload.events[payload.events.length - 1];
      const loc = payload.lastKnownLocation;
      const hasLocation = loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';

      const mapsUrl = hasLocation
        ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
        : null;
      const mapsEmbed = hasLocation
        ? `https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=14&output=embed`
        : null;

      const locationSection = hasLocation
        ? `<div class="map-wrap">
            <iframe
              src="${mapsEmbed}"
              width="100%" height="280" style="border:0;border-radius:12px;margin-top:12px"
              allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade">
            </iframe>
            <a class="maps-link" href="${mapsUrl}" target="_blank" rel="noopener">
              📍 Open in Google Maps
            </a>
            <p class="approx-note">Location is intentionally approximate and updates every ~15 seconds.</p>
          </div>`
        : `<p class="waiting">📡 Waiting for first location update&hellip;</p>`;

      const statusColor = payload.status === 'active' ? '#137a45' : payload.status === 'completed' ? '#1d4ed8' : '#b45309';
      const statusBg   = payload.status === 'active' ? '#e7f8ef' : payload.status === 'completed' ? '#eff6ff' : '#fef3c7';

      res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="15">
  <title>WakeWay – ${escapeHtml(payload.destinationName)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f7fb;color:#172033;padding:20px}
    main{max-width:520px;margin:0 auto;background:#fff;border:1px solid #dce3ee;border-radius:20px;padding:24px;box-shadow:0 8px 30px #17203314}
    h1{font-size:22px;font-weight:800;margin:8px 0 4px}
    .subtitle{font-size:14px;color:#596579;margin-bottom:20px}
    .status{display:inline-block;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
    .row{border-top:1px solid #e8edf4;padding:14px 0}
    .label{font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
    .value{font-weight:700;font-size:15px}
    .map-wrap{margin-top:4px}
    .maps-link{display:inline-block;margin-top:10px;font-size:14px;font-weight:600;color:#2563eb;text-decoration:none}
    .maps-link:hover{text-decoration:underline}
    .approx-note{font-size:11px;color:#94a3b8;margin-top:8px}
    .waiting{color:#94a3b8;font-size:14px;margin-top:8px;font-style:italic}
    .footer{font-size:11px;color:#cbd5e1;text-align:center;margin-top:20px}
  </style>
</head>
<body>
<main>
  <div class="status" style="background:${statusBg};color:${statusColor}">${escapeHtml(payload.status)}</div>
  <h1>WakeWay trip</h1>
  <p class="subtitle">Travelling to <strong>${escapeHtml(payload.destinationName)}</strong></p>

  <div class="row">
    <div class="label">Last known area</div>
    ${locationSection}
  </div>

  <div class="row">
    <div class="label">Latest event</div>
    <div class="value">${escapeHtml(latestEvent?.type?.replace(/_/g, ' ') || 'Trip started')}</div>
  </div>

  <div class="row">
    <div class="label">Link expires</div>
    <div class="value">${escapeHtml(new Date(payload.expiresAt).toLocaleString())}</div>
  </div>

  <p class="footer">Page auto-refreshes every 15 seconds &bull; Powered by WakeWay</p>
</main>
</body>
</html>`);
      return;
    }
    res.json({ share: payload });
  } catch (err: any) {
    console.error('get-share error:', err);
    res.status(500).json({ error: 'Unable to load trip share' });
  }
});

// Keep /api/share/:token as an alias for backwards compatibility
app.get('/api/share/:token', (req, res) => res.redirect(301, `/share/${req.params.token}`));

app.patch('/api/trips/:tripId/share/:shareId', extractUser, async (req: any, res: any) => {
  try {
    const { tripId, shareId } = req.params;
    const { status, currentWaypointIndex, location, expectedArrivalAt, eventType } = req.body;
    const allowedEvents = ['near_destination', 'trip_completed'];

    const existingRes = await query(
      `SELECT * FROM trip_shares WHERE id = $1 AND trip_id = $2 AND user_id = $3`,
      [shareId, tripId, req.user.userId]
    );
    if (existingRes.rows.length === 0) return res.status(404).json({ error: 'Share not found' });
    const existing = existingRes.rows[0];
    if (getShareStatus(existing) !== 'active') return res.status(409).json({ error: 'Share is no longer active' });

    const nextStatus = status === 'completed' ? 'completed' : 'active';
    const completedAt = nextStatus === 'completed' ? new Date() : null;
    const hasLocation = location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
    const updatedRes = await query(
      `UPDATE trip_shares SET
        status = $1,
        current_waypoint_index = COALESCE($2, current_waypoint_index),
        last_location_latitude = CASE WHEN $3 THEN $4 ELSE last_location_latitude END,
        last_location_longitude = CASE WHEN $3 THEN $5 ELSE last_location_longitude END,
        expected_arrival_at = COALESCE($6, expected_arrival_at),
        completed_at = COALESCE($7, completed_at),
        updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        nextStatus,
        Number.isFinite(currentWaypointIndex) ? Math.max(0, Number(currentWaypointIndex)) : null,
        Boolean(hasLocation),
        hasLocation ? roundLocation(Number(location.latitude)) : null,
        hasLocation ? roundLocation(Number(location.longitude)) : null,
        expectedArrivalAt || null,
        completedAt,
        shareId,
      ]
    );

    if (eventType && allowedEvents.includes(eventType)) {
      await query(
        `INSERT INTO trip_share_events (share_id, event_type, waypoint_index) VALUES ($1, $2, $3)`,
        [shareId, eventType, currentWaypointIndex ?? existing.current_waypoint_index]
      );
    }

    res.json({ share: await serializeShare(updatedRes.rows[0]) });
  } catch (err: any) {
    console.error('update-share error:', err);
    res.status(500).json({ error: 'Unable to update trip share' });
  }
});

app.delete('/api/trips/:tripId/share/:shareId', extractUser, async (req: any, res: any) => {
  try {
    const result = await query(
      `UPDATE trip_shares SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND trip_id = $2 AND user_id = $3 AND status = 'active' RETURNING id`,
      [req.params.shareId, req.params.tripId, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Active share not found' });
    await query(
      `INSERT INTO trip_share_events (share_id, event_type) VALUES ($1, 'share_revoked')`,
      [req.params.shareId]
    );
    res.json({ message: 'Trip share revoked' });
  } catch (err: any) {
    console.error('revoke-share error:', err);
    res.status(500).json({ error: 'Unable to revoke trip share' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
