import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    // We need a valid user_id. Let's find one first.
    const userRes = await pool.query(`SELECT id FROM users LIMIT 1`);
    if (userRes.rows.length === 0) {
      console.log("No users found to test insert.");
      process.exit(0);
    }
    const userId = userRes.rows[0].id;
    
    // Attempt an insert
    await pool.query(
      `INSERT INTO trip_history (user_id, trip_id, waypoints, start_time, end_time, alarm_triggered)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        'test-trip-id',
        JSON.stringify([{ lat: 10, lng: 20 }]),
        new Date(),
        new Date(),
        false
      ]
    );
    console.log("✅ Manual Insert Succeeded! The database is now ready.");
    
    // Cleanup
    await pool.query(`DELETE FROM trip_history WHERE trip_id = 'test-trip-id'`);
    process.exit(0);
  } catch (e) {
    console.error("Insert failed:", e);
    process.exit(1);
  }
}
check();
