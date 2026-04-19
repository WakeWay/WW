import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Fix import timing bug
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const query = (text: string) => pool.query(text);

async function fix() {
  try {
    console.log("Dropping old auth.users foreign key constraint...");
    await query(`ALTER TABLE public.trip_history DROP CONSTRAINT IF EXISTS trip_history_user_id_fkey;`);
    
    console.log("Adding new public.users foreign key constraint...");
    await query(`ALTER TABLE public.trip_history ADD CONSTRAINT trip_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;`);
    
    console.log("✅ Database relationship successfully fixed!");
    process.exit(0);
  } catch (e) { 
    console.error("Error fixing DB:", e); 
    process.exit(1); 
  }
}
fix();
