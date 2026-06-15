import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pgConnectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function checkReq() {
  const pool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT * FROM payment_requests WHERE id = 6");
    console.log("PostgreSQL Row for ID 6:", res.rows[0]);

    const resAccess = await pool.query("SELECT * FROM premium_access WHERE user_id = 9");
    console.log("PostgreSQL Rows for premium_access:", resAccess.rows);

    const resPdf = await pool.query("SELECT * FROM pdf_purchases WHERE user_id = 9");
    console.log("PostgreSQL Rows for pdf_purchases:", resPdf.rows);
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkReq();
