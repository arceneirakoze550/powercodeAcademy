import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pgConnectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

// Copy exactly how getDB() reads or defaultInitialState
// Let's create a script that reads dbCachedInstance or db_state.json
async function run() {
  if (!pgConnectionString) {
    console.error("No database URL found!");
    return;
  }
  const pool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  const stateJsonPath = path.join(process.cwd(), "db_state.json");
  let state: any;
  if (fs.existsSync(stateJsonPath)) {
    try {
      state = JSON.parse(fs.readFileSync(stateJsonPath, "utf8"));
    } catch {
      state = {};
    }
  } else {
    state = {};
  }

  // Ensure all keys exist
  const arrayKeys = [
    "users", "courses", "tutorials", "pdfs", "quizzes", "challenges", "enrollments",
    "lessonProgress", "bookmarks", "quizAttempts", "challengeSubmissions", "certificates",
    "community", "paymentRequests", "paymentProofs", "premiumAccess", "transactions", "notifications"
  ];
  arrayKeys.forEach(k => {
    if (!Array.isArray(state[k])) state[k] = [];
  });

  // Let's try executing the exact persistStateToPostgres logic block by block
  console.log("Full sync simulation started...");

  // 1. Users
  console.log("Step 1: Users...");
  try {
    for (const u of state.users) {
      await pool.query(`
        INSERT INTO users (id, name, email, password_hash, role, avatar_url, learning_streak, last_active_at, created_at, is_verified, score, profile_picture_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          avatar_url = EXCLUDED.avatar_url,
          learning_streak = EXCLUDED.learning_streak,
          last_active_at = EXCLUDED.last_active_at,
          score = EXCLUDED.score,
          profile_picture_url = EXCLUDED.profile_picture_url
      `, [
        u.id, u.name, u.email, u.passwordHash, u.role, u.avatarUrl,
        u.learningStreak, u.lastActiveAt, u.createdAt, u.isVerified, u.score,
        u.profile_picture_url || ""
      ]);
    }
    console.log("-> Users Succeeded!");
  } catch (err: any) {
    console.error("❌ Users Failed:", err.message, err.stack);
  }

  // 2. Courses
  console.log("Step 2: Courses, Modules, Lessons...");
  try {
    for (const c of state.courses) {
      await pool.query(`
        INSERT INTO courses (id, title, description, category, thumbnail_url, price, is_premium, status, deleted_at, deleted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          thumbnail_url = EXCLUDED.thumbnail_url,
          price = EXCLUDED.price,
          is_premium = EXCLUDED.is_premium,
          status = EXCLUDED.status,
          deleted_at = EXCLUDED.deleted_at,
          deleted_by = EXCLUDED.deleted_by
      `, [
        c.id, c.title, c.description, c.category || "", c.thumbnailUrl || "",
        Number(c.price) || 0, !!c.isPremium, c.status || 'Published', c.deleted_at || null, c.deleted_by || null
      ]);

      if (Array.isArray(c.modules)) {
        for (const m of c.modules) {
          await pool.query(`
            INSERT INTO modules (id, course_id, title)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET
              course_id = EXCLUDED.course_id,
              title = EXCLUDED.title
          `, [m.id, c.id, m.title]);

          if (Array.isArray(m.lessons)) {
            for (const l of m.lessons) {
              await pool.query(`
                INSERT INTO lessons (id, module_id, title, content, video_url, duration_minutes, is_preview_allowed, quiz_id, status, deleted_at, deleted_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                  module_id = EXCLUDED.module_id,
                  title = EXCLUDED.title,
                  content = EXCLUDED.content,
                  video_url = EXCLUDED.video_url,
                  duration_minutes = EXCLUDED.duration_minutes,
                  is_preview_allowed = EXCLUDED.is_preview_allowed,
                  quiz_id = EXCLUDED.quiz_id,
                  status = EXCLUDED.status,
                  deleted_at = EXCLUDED.deleted_at,
                  deleted_by = EXCLUDED.deleted_by
              `, [
                l.id, m.id, l.title, l.content || "", l.videoUrl || "",
                l.durationMinutes || 10, !!l.isPreviewAllowed, l.quizId || null,
                l.status || 'Published', l.deleted_at || null, l.deleted_by || null
              ]);
            }
          }
        }
      }
    }
    console.log("-> Courses Succeeded!");
  } catch (err: any) {
    console.error("❌ Courses/Modules/Lessons Failed:", err.message, err.stack);
  }

  // 3. Tutorials
  console.log("Step 3: Tutorials...");
  try {
    for (const t of state.tutorials) {
      await pool.query(`
        INSERT INTO tutorials (id, title, category, video_url, status, deleted_at, deleted_by, content)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          video_url = EXCLUDED.video_url,
          status = EXCLUDED.status,
          deleted_at = EXCLUDED.deleted_at,
          deleted_by = EXCLUDED.deleted_by,
          content = EXCLUDED.content
      `, [
        t.id, t.title, t.category || "", t.videoUrl || "", t.status || 'Published',
        t.deleted_at || null, t.deleted_by || null, t.content || ""
      ]);
    }
    console.log("-> Tutorials Succeeded!");
  } catch (err: any) {
    console.error("❌ Tutorials Failed:", err.message, err.stack);
  }

  // 4. PDFs
  console.log("Step 4: PDFs...");
  try {
    for (const p of state.pdfs) {
      await pool.query(`
        INSERT INTO pdf_books (id, title, file_url, author, price, is_premium, thumbnail_url, description, created_at, status, deleted_at, deleted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          file_url = EXCLUDED.file_url,
          author = EXCLUDED.author,
          price = EXCLUDED.price,
          is_premium = EXCLUDED.is_premium,
          thumbnail_url = EXCLUDED.thumbnail_url,
          description = EXCLUDED.description,
          created_at = EXCLUDED.created_at,
          status = EXCLUDED.status,
          deleted_at = EXCLUDED.deleted_at,
          deleted_by = EXCLUDED.deleted_by
      `, [
        p.id, p.title, p.fileUrl || "", p.author || "PowerCode Academy", Number(p.price) || 0,
        !!p.isPremium, p.thumbnailUrl || "", p.description || "", p.createdAt || "",
        p.status || 'Published', p.deleted_at || null, p.deleted_by || null
      ]);
    }
    console.log("-> PDFs Succeeded!");
  } catch (err: any) {
    console.error("❌ PDFs Failed:", err.message, err.stack);
  }

  // 5. Quizzes
  console.log("Step 5: Quizzes...");
  try {
    for (const q of state.quizzes) {
      await pool.query(`
        INSERT INTO quizzes (id, course_id, title, duration_minutes, passing_score, status, deleted_at, deleted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          course_id = EXCLUDED.course_id,
          title = EXCLUDED.title,
          duration_minutes = EXCLUDED.duration_minutes,
          passing_score = EXCLUDED.passing_score,
          status = EXCLUDED.status,
          deleted_at = EXCLUDED.deleted_at,
          deleted_by = EXCLUDED.deleted_by
      `, [
        q.id, q.courseId, q.title, q.durationMinutes || 10, q.passingScore || 70,
        q.status || 'Published', q.deleted_at || null, q.deleted_by || null
      ]);

      if (Array.isArray(q.questions)) {
        for (const qn of q.questions) {
          await pool.query(`
            INSERT INTO questions (id, quiz_id, question, options, correct_answer)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET
              quiz_id = EXCLUDED.quiz_id,
              question = EXCLUDED.question,
              options = EXCLUDED.options,
              correct_answer = EXCLUDED.correct_answer
          `, [
            qn.id, q.id, qn.question, JSON.stringify(qn.options || []), qn.correctAnswer || ""
          ]);
        }
      }
    }
    console.log("-> Quizzes Succeeded!");
  } catch (err: any) {
    console.error("❌ Quizzes Failed:", err.message, err.stack);
  }

  // 6. Challenges
  console.log("Step 6: Challenges...");
  try {
    for (const ch of state.challenges) {
      await pool.query(`
        INSERT INTO challenges (id, title, description, difficulty, starter_code, solution_code, test_cases, points, category, status, deleted_at, deleted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          difficulty = EXCLUDED.difficulty,
          starter_code = EXCLUDED.starter_code,
          solution_code = EXCLUDED.solution_code,
          test_cases = EXCLUDED.test_cases,
          points = EXCLUDED.points,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          deleted_at = EXCLUDED.deleted_at,
          deleted_by = EXCLUDED.deleted_by
      `, [
        ch.id, ch.title, ch.description, ch.difficulty || "EASY", ch.starterCode || "",
        ch.solutionCode || "", JSON.stringify(ch.testCases || []), ch.points || 10,
        ch.category || "", ch.status || 'Published', ch.deleted_at || null, ch.deleted_by || null
      ]);
    }
    console.log("-> Challenges Succeeded!");
  } catch (err: any) {
    console.error("❌ Challenges Failed:", err.message, err.stack);
  }

  // 7. Certificates
  console.log("Step 7: Certificates...");
  try {
    for (const cert of state.certificates) {
      await pool.query(`
        INSERT INTO certificates (id, user_id, course_id, certificate_url, certificate_code, user_name, course_title, created_at, type, description, qr_code)
        VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM certificates), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          course_id = EXCLUDED.course_id,
          certificate_url = EXCLUDED.certificate_url,
          certificate_code = EXCLUDED.certificate_code,
          user_name = EXCLUDED.user_name,
          course_title = EXCLUDED.course_title,
          created_at = EXCLUDED.created_at,
          type = EXCLUDED.type,
          description = EXCLUDED.description,
          qr_code = EXCLUDED.qr_code
      `, [
        cert.userId, cert.courseId, cert.qrCode || "", cert.certificateCode, cert.userName || "",
        cert.courseTitle || "", cert.date || "", cert.type || "COURSE", cert.description || "", cert.qrCode || ""
      ]);
    }
    console.log("-> Certificates Succeeded!");
  } catch (err: any) {
    console.error("❌ Certificates Failed:", err.message, err.stack);
  }

  // 8. Payment Requests
  console.log("Step 8: Payment Requests...");
  try {
    for (const p of (state.paymentRequests || [])) {
      await pool.query(`
        INSERT INTO payment_requests (id, user_id, user_name, user_email, content_type, content_id, content_title, payment_method, phone, amount_paid, proof_url, status, rejection_reason, is_deleted, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          user_name = EXCLUDED.user_name,
          user_email = EXCLUDED.user_email,
          content_type = EXCLUDED.content_type,
          content_id = EXCLUDED.content_id,
          content_title = EXCLUDED.content_title,
          payment_method = EXCLUDED.payment_method,
          phone = EXCLUDED.phone,
          amount_paid = EXCLUDED.amount_paid,
          proof_url = EXCLUDED.proof_url,
          status = EXCLUDED.status,
          rejection_reason = EXCLUDED.rejection_reason,
          is_deleted = EXCLUDED.is_deleted,
          created_at = EXCLUDED.created_at
      `, [
        p.id, p.userId, p.userName || "", p.userEmail || "", p.contentType || "",
        p.contentId, p.contentTitle || "", p.paymentMethod || "", p.phone || "",
        p.amountPaid || 0, p.proofUrl || "", p.status || "PENDING", p.rejectionReason || "",
        !!p.isDeleted, p.createdAt || ""
      ]);
    }
    console.log("-> Payment Requests Succeeded!");
  } catch (err: any) {
    console.error("❌ Payment Requests Failed:", err.message, err.stack);
  }

  // 9. Transactions
  console.log("Step 9: Transactions...");
  try {
    for (const t of (state.transactions || [])) {
      await pool.query(`
        INSERT INTO transactions (id, user_id, request_id, amount, type, status, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          request_id = EXCLUDED.request_id,
          amount = EXCLUDED.amount,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          timestamp = EXCLUDED.timestamp
      `, [
        t.id, t.userId, t.requestId || null, t.amount || 0, t.type || "PURCHASE",
        t.status || "COMPLETED", t.timestamp || ""
      ]);
    }
    console.log("-> Transactions Succeeded!");
  } catch (err: any) {
    console.error("❌ Transactions Failed:", err.message, err.stack);
  }

  await pool.end();
}

run();
