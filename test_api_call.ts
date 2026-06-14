import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pgConnectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function run() {
  const urlStatus = "http://localhost:3000/api/db-status";
  try {
    const statusRes = await fetch(urlStatus);
    const statusJson = await statusRes.json();
    console.log("Live Server DB Status:", statusJson);
  } catch (err: any) {
    console.error("Failed to query db-status:", err.message);
  }

  if (!pgConnectionString) {
    console.error("No database URL");
    return;
  }
  const pool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Find a valid user to test with
    const userRes = await pool.query("SELECT id, name, email FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
      console.error("No users found in database to test payment on!");
      return;
    }
    const testUser = userRes.rows[0];
    console.log("Using test user:", testUser);

    // 2. Clear out any prior test payments so we start fresh
    await pool.query("DELETE FROM payment_proofs");
    await pool.query("DELETE FROM transactions");
    await pool.query("DELETE FROM payment_requests");
    console.log("Cleared existing payment tables before test.");

    // 3. Make real HTTP POST request to endpoint
    console.log("Invoking POST /api/pdf-purchases...");
    const url = "http://localhost:3000/api/pdf-purchases";
    const payload = {
      pdfId: 1,
      pdfTitle: "Advanced Systems Mastery",
      amountPaid: 15000,
      paymentMethod: "MTN",
      phone: "+256 772 111 222",
      proofUrl: "https://dummyimage.com/600x800/ff7b00/ffffff&text=RECEIPT+MTN"
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${testUser.email}`
      },
      body: JSON.stringify(payload)
    });

    console.log("HTTP Response Status:", res.status);
    const bodyText = await res.text();
    console.log("HTTP Response Body:", bodyText);

    // 4. Query tables directly to see if any rows were inserted
    console.log("\n--- Checking database row counts after request input ---");
    const requestsCheck = await pool.query("SELECT * FROM payment_requests");
    console.log(`payment_requests rows count: ${requestsCheck.rows.length}`, requestsCheck.rows);

    const transactionsCheck = await pool.query("SELECT * FROM transactions");
    console.log(`transactions rows count: ${transactionsCheck.rows.length}`, transactionsCheck.rows);

    const notificationsCheck = await pool.query("SELECT * FROM notifications ORDER BY id DESC LIMIT 5");
    console.log(`notifications row count (last 5): ${notificationsCheck.rows.length}`, notificationsCheck.rows);

  } catch (err: any) {
    console.error("Trace failed with exception:", err.message, err.stack);
  } finally {
    await pool.end();
  }
}

run();
