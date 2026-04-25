import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function alter() {
  try {
    console.log("Altering radius_meters to be nullable...");
    await pool.query(`ALTER TABLE public.trip_history ALTER COLUMN radius_meters DROP NOT NULL;`);
    console.log("✅ Altered successfully!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
alter();
