import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pgConnectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function checkRows() {
  if (!pgConnectionString) {
    console.error("No database URL");
    return;
  }
  const pool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT * FROM payment_requests");
    console.log("Current payment_requests rows count in PG:", res.rows.length);
    console.log("Rows:", res.rows);
  } catch (err: any) {
    console.error("Error querying payment_requests:", err.message);
  } finally {
    await pool.end();
  }
}

checkRows();
