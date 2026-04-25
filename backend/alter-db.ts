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
    console.log("Adding waypoints column...");
    await pool.query(`ALTER TABLE public.trip_history ADD COLUMN IF NOT EXISTS waypoints JSONB;`);
    console.log("✅ Column added successfully!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
alter();
