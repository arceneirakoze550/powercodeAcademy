import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pgConnectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function run() {
  if (!pgConnectionString) {
    console.error("No connection string found!");
    return;
  }
  const pool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("--- STARTING TRACE TEST INSERT ---");
    const paymentReq = {
      id: 9999, // use a high ID for test
      userId: 1,
      userName: "Test User",
      userEmail: "test@example.com",
      contentType: "COURSE",
      contentId: 5,
      contentTitle: "Advanced Next.js Bootcamp",
      paymentMethod: "MTN",
      phone: "0780000000",
      amountPaid: 15000,
      proofUrl: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=200",
      createdAt: new Date().toISOString()
    };

    const nextProofId = 9999;
    const nextTxId = 9999;

    console.log("1. Attempting INSERT into payment_requests...");
    try {
      const res = await pool.query(`
        INSERT INTO payment_requests (id, user_id, user_name, user_email, content_type, content_id, content_title, payment_method, phone, amount_paid, proof_url, status, rejection_reason, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', '', $12)
        RETURNING *
      `, [paymentReq.id, paymentReq.userId, paymentReq.userName, paymentReq.userEmail, paymentReq.contentType, paymentReq.contentId, paymentReq.contentTitle, paymentReq.paymentMethod, paymentReq.phone, paymentReq.amountPaid, paymentReq.proofUrl, paymentReq.createdAt]);
      console.log("INSERT payment_requests Success!", res.rows);
    } catch (err: any) {
      console.error("INSERT payment_requests FAILED:", err.message, err.stack);
    }

    console.log("2. Attempting INSERT into payment_proofs...");
    try {
      const res = await pool.query(`
        INSERT INTO payment_proofs (id, request_id, url, uploaded_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [nextProofId, paymentReq.id, paymentReq.proofUrl, paymentReq.createdAt]);
      console.log("INSERT payment_proofs Success!", res.rows);
    } catch (err: any) {
      console.error("INSERT payment_proofs FAILED:", err.message, err.stack);
    }

    console.log("3. Attempting INSERT into transactions...");
    try {
      const res = await pool.query(`
        INSERT INTO transactions (id, user_id, request_id, amount, type, status, timestamp)
        VALUES ($1, $2, $3, $4, 'PURCHASE', 'PENDING', $5)
        RETURNING *
      `, [nextTxId, paymentReq.userId, paymentReq.id, paymentReq.amountPaid, paymentReq.createdAt]);
      console.log("INSERT transactions Success!", res.rows);
    } catch (err: any) {
      console.error("INSERT transactions FAILED:", err.message, err.stack);
    }

    console.log("--- TRACE TEST COMPLETED, CLEANING UP ---");
    await pool.query("DELETE FROM payment_proofs WHERE id = 9999");
    await pool.query("DELETE FROM transactions WHERE id = 9999");
    await pool.query("DELETE FROM payment_requests WHERE id = 9999");
    console.log("Cleanup finished.");

  } catch (err: any) {
    console.error("Error in execution:", err.message);
  } finally {
    await pool.end();
  }
}

run();
