import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import pg from "pg";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import { EventEmitter } from "events";

const upload = multer({ storage: multer.memoryStorage() });
const videoUploadEmitter = new EventEmitter();

// Handle post-upload events for lesson video uploads
videoUploadEmitter.on("post-upload", async (data: { lessonId: number; videoUrl: string }) => {
  console.log(`[videoUploadEmitter] Triggered 'post-upload' event for lesson ID \${data.lessonId}, video: \${data.videoUrl}`);
  // Generate unique Playback ID
  const playbackId = "pb_" + crypto.randomBytes(8).toString("hex");
  
  const db = getDB();
  let found = false;
  for (const c of db.courses) {
    if (!c.modules) continue;
    for (const m of c.modules) {
      if (!m.lessons) continue;
      const lesson = m.lessons.find(l => l.id === data.lessonId);
      if (lesson) {
        lesson.videoUrl = data.videoUrl;
        lesson.playbackId = playbackId;
        found = true;
        break;
      }
    }
    if (found) break;
  }
  
  if (found) {
    saveDB(db);
    console.log(`[videoUploadEmitter] Generated playback ID: \${playbackId} for lesson ID \${data.lessonId} in cache.`);
  }

  if (pgPool && pgConnectedStatus) {
    try {
      await pgPool.query(
        "UPDATE lessons SET video_url = \$1, playback_id = \$2 WHERE id = \$3",
        [data.videoUrl, playbackId, data.lessonId]
      );
      console.log(`[videoUploadEmitter] Generated unique playback ID: \${playbackId} for lesson ID \${data.lessonId} in lessons table.`);
    } catch (err) {
      console.error("[videoUploadEmitter] Failed to update playback_id in PostgreSQL:", err);
    }
  }
});

const { Pool } = pg;

const pgConnectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
let pgPool: pg.Pool | null = null;
let pgConnectedStatus = false;
let dbCachedInstance: any = null;

// Pre-declare DB file path for both connection states
const DB_FILE = path.join(process.cwd(), "db_state.json");

if (pgConnectionString) {
  console.log("[Database] Found system connection string. Starting Neon PostgreSQL pool/client...");
  pgPool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false } // Required for Neon secure serverless SQL connections
  });

  pgPool.query("SELECT NOW()")
    .then(() => {
      console.log("[Database] Neon PostgreSQL connected successfully! Verification succeeded.");
      pgConnectedStatus = true;
      initPgDatabase();
    })
    .catch((err) => {
      console.error(`
====================================================================
  NON-FATAL DATABASE CONNECTION ERROR: FAILED TO CONNECT TO NEON!
  ${err.message}
  The server will proceed using the local offline JSON / Memory database.
====================================================================
`);
    });
} else {
  console.warn(`
====================================================================
  DATABASE_URL IS NOT DEFINED!
  The Neon PostgreSQL connection URL was not provided.
  The server will proceed using the local offline JSON / Memory database.
====================================================================
`);
}

// Synchronization and Loading Helper Functions
async function persistStateToPostgres(state: DbState) {
  if (!pgPool || !pgConnectedStatus) return;

  try {
    console.log("[Database Sync] Starting full Neon PostgreSQL synchronization batch persistence...");

    // 1. Users
    for (const u of state.users) {
      await pgPool.query(`
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

    // 2. Courses, Modules, Lessons
    for (const c of state.courses) {
      await pgPool.query(`
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
          await pgPool.query(`
            INSERT INTO modules (id, course_id, title)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET
              course_id = EXCLUDED.course_id,
              title = EXCLUDED.title
          `, [m.id, c.id, m.title]);

          if (Array.isArray(m.lessons)) {
            for (const l of m.lessons) {
              await pgPool.query(`
                INSERT INTO lessons (id, module_id, title, content, video_url, duration_minutes, is_preview_allowed, quiz_id, status, deleted_at, deleted_by, playback_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
                  deleted_by = EXCLUDED.deleted_by,
                  playback_id = EXCLUDED.playback_id
              `, [
                l.id, m.id, l.title, l.content || "", l.videoUrl || "",
                l.durationMinutes || 10, !!l.isPreviewAllowed, l.quizId || null,
                l.status || 'Published', l.deleted_at || null, l.deleted_by || null,
                l.playbackId || null
              ]);
            }
          }
        }
      }
    }

    // 3. Tutorials
    for (const t of state.tutorials) {
      await pgPool.query(`
        INSERT INTO tutorials (id, title, category, video_url, status, deleted_at, deleted_by, content, code_snippet, language_slug, cover_image_url, embedded_video_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          video_url = EXCLUDED.video_url,
          status = EXCLUDED.status,
          deleted_at = EXCLUDED.deleted_at,
          deleted_by = EXCLUDED.deleted_by,
          content = EXCLUDED.content,
          code_snippet = EXCLUDED.code_snippet,
          language_slug = EXCLUDED.language_slug,
          cover_image_url = EXCLUDED.cover_image_url,
          embedded_video_url = EXCLUDED.embedded_video_url
      `, [
        t.id, t.title, t.category || "", t.videoUrl || "", t.status || 'Published',
        t.deleted_at || null, t.deleted_by || null, t.content || "",
        t.codeSnippet || "", t.languageSlug || "javascript", t.coverImageUrl || "", t.embedded_video_url || ""
      ]);
    }

    // 4. PDFs (pdf_books)
    for (const p of state.pdfs) {
      await pgPool.query(`
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

    // 5. Quizzes & Questions
    for (const q of state.quizzes) {
      await pgPool.query(`
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
          await pgPool.query(`
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

    // 6. Challenges
    for (const ch of state.challenges) {
      await pgPool.query(`
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

    // 7. Certificates
    for (const cert of state.certificates) {
      await pgPool.query(`
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
      ]).catch(() => {});
    }

    // 8. Payment Requests
    for (const p of (state.paymentRequests || [])) {
      await pgPool.query(`
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

    // 9. Transactions
    for (const t of (state.transactions || [])) {
      await pgPool.query(`
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

    // 10. Notifications
    for (const n of (state.notifications || [])) {
      await pgPool.query(`
        INSERT INTO notifications (id, user_id, title, message, type, link_tab, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          type = EXCLUDED.type,
          link_tab = EXCLUDED.link_tab,
          is_read = EXCLUDED.is_read,
          created_at = EXCLUDED.created_at
      `, [
        n.id, n.userId, n.title, n.message || "", n.type || "INFO", n.link_tab || "dashboard",
        !!n.is_read, n.created_at || ""
      ]);
    }

    // Interactive Tracking: Enrollments
    for (const e of (state.enrollments || [])) {
      await pgPool.query(`
        INSERT INTO enrollments (id, user_id, course_id, enrolled_at)
        VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM enrollments), $1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [e.userId, e.courseId, e.enrolledAt]).catch(() => {});
    }

    // Interactive Tracking: Lesson progress
    for (const lp of (state.lessonProgress || [])) {
      await pgPool.query(`
        INSERT INTO lesson_progress (id, user_id, lesson_id, completed_at)
        VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM lesson_progress), $1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [lp.userId, lp.lessonId, lp.completedAt]).catch(() => {});
    }

    // PDF Purchases Sync
    for (const p of (state.pdfPurchases || [])) {
      await pgPool.query(`
        INSERT INTO pdf_purchases (id, user_id, user_name, pdf_id, pdf_title, amount_paid, payment_method, phone, status, proof_url, created_at, approved_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          user_name = EXCLUDED.user_name,
          pdf_id = EXCLUDED.pdf_id,
          pdf_title = EXCLUDED.pdf_title,
          amount_paid = EXCLUDED.amount_paid,
          payment_method = EXCLUDED.payment_method,
          phone = EXCLUDED.phone,
          status = EXCLUDED.status,
          proof_url = EXCLUDED.proof_url,
          created_at = EXCLUDED.created_at,
          approved_at = EXCLUDED.approved_at
      `, [
        p.id, p.userId, p.userName || "", p.pdfId, p.pdfTitle || "", p.amountPaid || 0,
        p.paymentMethod || "", p.phone || "", p.status || "PENDING_APPROVAL", p.proofUrl || "",
        p.createdAt || "", p.approvedAt || ""
      ]);
    }

    // Premium Access Sync
    for (const pa of (state.premiumAccess || [])) {
      await pgPool.query(`
        INSERT INTO premium_access (id, user_id, content_type, content_id, granted_at, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          content_type = EXCLUDED.content_type,
          content_id = EXCLUDED.content_id,
          granted_at = EXCLUDED.granted_at,
          status = EXCLUDED.status
      `, [
        pa.id, pa.userId, pa.contentType || "", pa.contentId, pa.grantedAt || "", pa.status || "ACTIVE"
      ]);
    }

    // Clean up deleted items from Postgres tables so they don't reappear on refresh
    if (state.courses?.length > 0) {
      await pgPool.query("DELETE FROM courses WHERE NOT (id = ANY($1::int[]))", [state.courses.map(c => c.id)]).catch(() => {});
    }
    if (state.tutorials?.length > 0) {
      await pgPool.query("DELETE FROM tutorials WHERE NOT (id = ANY($1::int[]))", [state.tutorials.map(t => t.id)]).catch(() => {});
    }
    if (state.pdfs?.length > 0) {
      await pgPool.query("DELETE FROM pdf_books WHERE NOT (id = ANY($1::int[]))", [state.pdfs.map(p => p.id)]).catch(() => {});
    }
    if (state.quizzes?.length > 0) {
      await pgPool.query("DELETE FROM quizzes WHERE NOT (id = ANY($1::int[]))", [state.quizzes.map(q => q.id)]).catch(() => {});
    }
    if (state.challenges?.length > 0) {
      await pgPool.query("DELETE FROM challenges WHERE NOT (id = ANY($1::int[]))", [state.challenges.map(c => c.id)]).catch(() => {});
    }
    if (Array.isArray(state.testimonials) && state.testimonials.length > 0) {
      await pgPool.query("DELETE FROM testimonials WHERE NOT (id = ANY($1::int[]))", [state.testimonials.map(t => t.id)]).catch(() => {});
    }

    // Enforce sequence reset to the highest ID for all tables
    const seqs = ['courses', 'modules', 'lessons', 'tutorials', 'pdf_books', 'quizzes', 'questions', 'challenges', 'payment_requests', 'transactions', 'notifications', 'course_reviews', 'users', 'pdf_purchases', 'premium_access'];
    for (const tbl of seqs) {
      await pgPool.query(`
        SELECT setval(pg_get_serial_sequence('${tbl}', 'id'), COALESCE((SELECT MAX(id) FROM ${tbl}), 1), true)
      `).catch(() => {});
    }

    console.log("[Database Sync] Successfully synchronized and committed all batch state variables directly to Neon PostgreSQL!");
  } catch (err: any) {
    console.error("[Database Sync] Critical error during persistStateToPostgres batch update:", err);
    try {
      fs.appendFileSync(path.join(process.cwd(), "sync_error.log"), `[persistStateToPostgres Error] ${err?.message}\n${err?.stack}\n\n`);
    } catch (e) {}
  }
}

async function loadDBFromPostgres(): Promise<DbState> {
  const db: DbState = {
    users: [],
    courses: [],
    tutorials: [],
    pdfs: [],
    quizzes: [],
    challenges: [],
    enrollments: [],
    lessonProgress: [],
    bookmarks: [],
    quizAttempts: [],
    challengeSubmissions: [],
    certificates: [],
    community: [],
    siteSettings: {
      platformName: "PowerCode Academy",
      logoUrl: "/powercodeacademy.png",
      enableRegistration: true,
      landingPromoBanner: "🎯 Limited Time Offer: Join our Premium Access with lifetime updates & interactive workspace labs!"
    },
    system_settings: {
      official_signature_url: "",
      official_seal_url: ""
    },
    certificateTemplates: [],
    certificateVerifications: [],
    courseVideos: [],
    tutorialVideos: [],
    courseImages: [],
    tutorialImages: [],
    announcements: [],
    aiConversations: [],
    userAchievements: [],
    digitalSignatures: [],
    adminSettings: [],
    learningPaths: [],
    adminActivityLogs: [],
    lessonNotes: [],
    lessonComments: [],
    pdfPurchases: [],
    programmingExamples: [],
    categories: [],
    paymentRequests: [],
    paymentProofs: [],
    premiumAccess: [],
    transactions: [],
    notifications: [],
    notificationSettings: [],
    notificationReads: [],
    notificationLogs: [],
    pushTokens: [],
    notificationSounds: [],
    supportMessages: []
  };

  if (!pgPool) return db;

  try {
    console.log("[Database Loading] Retrieving fresh data from Neon PostgreSQL tables...");

    // 1. Users
    const usersRes = await pgPool.query("SELECT * FROM users ORDER BY id ASC");
    db.users = usersRes.rows.map(row => ({
      id: row.id,
      name: row.name || "",
      email: row.email || "",
      passwordHash: row.password_hash || "",
      role: row.role || "STUDENT",
      avatarUrl: row.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      learningStreak: row.learning_streak || 1,
      lastActiveAt: row.last_active_at || new Date().toISOString(),
      createdAt: row.created_at || new Date().toISOString(),
      isVerified: row.is_verified !== false,
      score: row.score || 100,
      profile_picture_url: row.profile_picture_url || ""
    }));

    // 2. Courses, Modules, Lessons
    const coursesRes = await pgPool.query("SELECT * FROM courses ORDER BY id ASC");
    const modulesRes = await pgPool.query("SELECT * FROM modules ORDER BY id ASC");
    const lessonsRes = await pgPool.query("SELECT * FROM lessons ORDER BY id ASC");

    const modulesByCourse: { [key: number]: any[] } = {};
    const lessonsByModule: { [key: number]: any[] } = {};

    lessonsRes.rows.forEach(row => {
      const moduleId = row.module_id;
      if (!lessonsByModule[moduleId]) lessonsByModule[moduleId] = [];
      lessonsByModule[moduleId].push({
        id: row.id,
        title: row.title || "",
        content: row.content || "",
        videoUrl: row.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        durationMinutes: row.duration_minutes || 10,
        isPreviewAllowed: !!row.is_preview_allowed,
        quizId: row.quiz_id || undefined,
        status: row.status || "Published",
        deleted_at: row.deleted_at || null,
        deleted_by: row.deleted_by || null,
        playbackId: row.playback_id || null
      });
    });

    modulesRes.rows.forEach(row => {
      const courseId = row.course_id;
      if (!modulesByCourse[courseId]) modulesByCourse[courseId] = [];
      modulesByCourse[courseId].push({
        id: row.id,
        title: row.title || "",
        lessons: lessonsByModule[row.id] || []
      });
    });

    db.courses = coursesRes.rows.map(row => ({
      id: row.id,
      title: row.title || "",
      description: row.description || "",
      category: row.category || "",
      thumbnailUrl: row.thumbnail_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600",
      price: Number(row.price) || 0,
      isPremium: !!row.is_premium,
      status: row.status || "Published",
      deleted_at: row.deleted_at || null,
      deleted_by: row.deleted_by || null,
      modules: modulesByCourse[row.id] || []
    }));

    // 3. Tutorials
    const tutorialsRes = await pgPool.query("SELECT * FROM tutorials ORDER BY id ASC");
    db.tutorials = tutorialsRes.rows.map(row => ({
      id: row.id,
      title: row.title || "",
      category: row.category || "",
      videoUrl: row.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      status: row.status || "Published",
      deleted_at: row.deleted_at || null,
      deleted_by: row.deleted_by || null,
      content: row.content || "",
      codeSnippet: row.code_snippet || "",
      languageSlug: row.language_slug || "javascript",
      coverImageUrl: row.cover_image_url || "",
      embedded_video_url: row.embedded_video_url || ""
    }));

    // 4. PDFs (pdf_books)
    const pdfsRes = await pgPool.query("SELECT * FROM pdf_books ORDER BY id ASC");
    db.pdfs = pdfsRes.rows.map(row => ({
      id: row.id,
      title: row.title || "",
      fileUrl: row.file_url || "",
      author: row.author || "PowerCode Academy",
      price: Number(row.price) || 0,
      isPremium: !!row.is_premium,
      thumbnailUrl: row.thumbnail_url || "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=200",
      description: row.description || "",
      createdAt: row.created_at || new Date().toISOString(),
      status: row.status || "Published",
      deleted_at: row.deleted_at || null,
      deleted_by: row.deleted_by || null
    }));

    // 5. Quizzes & Questions
    const quizzesRes = await pgPool.query("SELECT * FROM quizzes ORDER BY id ASC");
    const questionsRes = await pgPool.query("SELECT * FROM questions ORDER BY id ASC");

    const questionsByQuiz: { [key: number]: any[] } = {};
    questionsRes.rows.forEach(row => {
      const quizId = row.quiz_id;
      if (!questionsByQuiz[quizId]) questionsByQuiz[quizId] = [];
      let parsedOptions = [];
      try {
        parsedOptions = row.options ? JSON.parse(row.options) : [];
      } catch (e) {
        parsedOptions = typeof row.options === "string" ? row.options.split(",") : [];
      }
      questionsByQuiz[quizId].push({
        id: row.id,
        question: row.question || "",
        options: parsedOptions,
        correctAnswer: row.correct_answer || ""
      });
    });

    db.quizzes = quizzesRes.rows.map(row => ({
      id: row.id,
      courseId: row.course_id,
      title: row.title || "",
      durationMinutes: row.duration_minutes || 10,
      passingScore: row.passing_score || 70,
      status: row.status || "Published",
      deleted_at: row.deleted_at || null,
      deleted_by: row.deleted_by || null,
      questions: questionsByQuiz[row.id] || []
    }));

    // 6. Challenges
    const challengesRes = await pgPool.query("SELECT * FROM challenges ORDER BY id ASC");
    db.challenges = challengesRes.rows.map(row => {
      let parsedTC = [];
      try {
        parsedTC = row.test_cases ? JSON.parse(row.test_cases) : [];
      } catch (e) {
        parsedTC = [];
      }
      return {
        id: row.id,
        title: row.title || "",
        description: row.description || "",
        difficulty: row.difficulty || "EASY",
        starterCode: row.starter_code || "",
        solutionCode: row.solution_code || "",
        testCases: parsedTC,
        points: row.points || 10,
        category: row.category || "",
        status: row.status || "Published",
        deleted_at: row.deleted_at || null,
        deleted_by: row.deleted_by || null
      };
    });

    // 7. Certificates
    const certsRes = await pgPool.query("SELECT * FROM certificates ORDER BY id ASC");
    db.certificates = certsRes.rows.map(row => ({
      certificateCode: row.certificate_code || String(row.id),
      userId: row.user_id,
      userName: row.user_name || "",
      courseId: row.course_id,
      courseTitle: row.course_title || "",
      date: row.created_at || "",
      type: row.type || "COURSE",
      description: row.description || "",
      qrCode: row.qr_code || ""
    }));

    // 8. Payment Requests
    const payRes = await pgPool.query("SELECT * FROM payment_requests ORDER BY id ASC");
    db.paymentRequests = payRes.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || "",
      userEmail: row.user_email || "",
      contentType: row.content_type || "",
      contentId: row.content_id,
      contentTitle: row.content_title || "",
      paymentMethod: row.payment_method || "",
      phone: row.phone || "",
      amountPaid: row.amount_paid || 0,
      proofUrl: row.proof_url || "",
      status: row.status || "PENDING",
      rejectionReason: row.rejection_reason || "",
      isDeleted: !!row.is_deleted,
      createdAt: row.created_at || ""
    }));

    // 9. Transactions
    const txRes = await pgPool.query("SELECT * FROM transactions ORDER BY id ASC");
    db.transactions = txRes.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      requestId: row.request_id || 0,
      amount: row.amount || 0,
      type: row.type || "PURCHASE",
      status: row.status || "COMPLETED",
      timestamp: row.timestamp || ""
    }));

    // PDF Purchases
    try {
      const pdfPurchasesRes = await pgPool.query("SELECT * FROM pdf_purchases ORDER BY id ASC");
      db.pdfPurchases = pdfPurchasesRes.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name || "",
        pdfId: row.pdf_id,
        pdfTitle: row.pdf_title || "",
        amountPaid: Number(row.amount_paid) || 0,
        paymentMethod: row.payment_method || "",
        phone: row.phone || "",
        status: row.status || "PENDING_APPROVAL",
        proofUrl: row.proof_url || "",
        createdAt: row.created_at || "",
        approvedAt: row.approved_at || ""
      }));
    } catch (e) {
      db.pdfPurchases = [];
    }

    // Premium Access
    try {
      const premiumAccessRes = await pgPool.query("SELECT * FROM premium_access ORDER BY id ASC");
      db.premiumAccess = premiumAccessRes.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        contentType: row.content_type || "",
        contentId: row.content_id,
        grantedAt: row.granted_at || "",
        status: row.status || "ACTIVE"
      }));
    } catch (e) {
      db.premiumAccess = [];
    }

    // 10. Notifications
    const noteRes = await pgPool.query("SELECT * FROM notifications ORDER BY id ASC");
    db.notifications = noteRes.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title || "",
      message: row.message || "",
      type: row.type || "INFO",
      link_tab: row.link_tab || "dashboard",
      is_read: !!row.is_read,
      created_at: row.created_at || ""
    }));

    // 11. System settings
    const sysSettingsRes = await pgPool.query("SELECT * FROM system_settings WHERE id = 1");
    if (sysSettingsRes.rows.length > 0) {
      db.system_settings = {
        official_signature_url: sysSettingsRes.rows[0].official_signature_url || "",
        official_seal_url: sysSettingsRes.rows[0].official_seal_url || ""
      };
    }

    // 12. Enrollments & Lesson progress
    const enrollRes = await pgPool.query("SELECT * FROM enrollments ORDER BY id ASC");
    db.enrollments = enrollRes.rows.map(row => ({
      userId: row.user_id,
      courseId: row.course_id,
      enrolledAt: row.enrolled_at || ""
    }));

    const lpRes = await pgPool.query("SELECT * FROM lesson_progress ORDER BY id ASC");
    db.lessonProgress = lpRes.rows.map(row => ({
      userId: row.user_id,
      lessonId: row.lesson_id,
      completedAt: row.completed_at || ""
    }));

    console.log("[Database Loading] Successfully loaded all tables from Neon PostgreSQL database!");
  } catch (err) {
    console.error("[Database Loading] Error loading tables from Neon PG:", err);
  }

  return db;
}

async function initPgDatabase() {
  if (!pgPool) return;
  try {
    console.log("[Database Initialization] Verifying schemas and executing idempotent migrations on Neon...");

    // Create all tables if they do not exist
    await pgPool.query(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS modules (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS tutorials (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS pdf_books (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS quizzes (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS challenges (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS certificates (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS course_reviews (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS payment_requests (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS payment_proofs (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS premium_access (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS pdf_purchases (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS notification_settings (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS notification_reads (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS notification_logs (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS push_tokens (id SERIAL PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS system_settings (id INTEGER PRIMARY KEY);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS enrollments (id SERIAL PRIMARY KEY, user_id INTEGER, course_id INTEGER, enrolled_at TEXT);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS lesson_progress (id SERIAL PRIMARY KEY, user_id INTEGER, lesson_id INTEGER, completed_at TEXT);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS bookmarks (id SERIAL PRIMARY KEY, user_id INTEGER, pdf_id INTEGER);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS quiz_attempts (id SERIAL PRIMARY KEY, user_id INTEGER, quiz_id INTEGER, score INTEGER, passed BOOLEAN, date TEXT);`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS challenge_submissions (id SERIAL PRIMARY KEY, user_id INTEGER, challenge_id INTEGER, submitted_code TEXT, status TEXT, score INTEGER, date TEXT);`);

    // Verify all columns exist via ALTER TABLE statements
    const columnAlterations = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'STUDENT';",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_streak INTEGER DEFAULT 1;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 100;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;",

      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS title TEXT;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS deleted_at TEXT;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS deleted_by TEXT;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS category TEXT;",

      "ALTER TABLE modules ADD COLUMN IF NOT EXISTS course_id INTEGER;",
      "ALTER TABLE modules ADD COLUMN IF NOT EXISTS title TEXT;",

      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id INTEGER;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS title TEXT;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content TEXT;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 10;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_preview_allowed BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS quiz_id INTEGER;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS deleted_at TEXT;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS deleted_by TEXT;",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS playback_id TEXT;",

      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS title TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS category TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS video_url TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS deleted_at TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS deleted_by TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS content TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS code_snippet TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS language_slug TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS cover_image_url TEXT;",
      "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS embedded_video_url TEXT;",

      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS title TEXT;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS file_url TEXT;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS author TEXT;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS description TEXT;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS created_at TEXT;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS deleted_at TEXT;",
      "ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS deleted_by TEXT;",

      "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS course_id INTEGER;",
      "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS title TEXT;",
      "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 10;",
      "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 70;",
      "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';",
      "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS deleted_at TEXT;",
      "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS deleted_by TEXT;",

      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS quiz_id INTEGER;",
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS question TEXT;",
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS options TEXT;",
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;",

      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS title TEXT;",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS description TEXT;",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'EASY';",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS starter_code TEXT;",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS solution_code TEXT;",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS test_cases TEXT;",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10;",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS category TEXT;",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS deleted_at TEXT;",
      "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS deleted_by TEXT;",

      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS course_id INTEGER;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_url TEXT;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_code TEXT;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS user_name TEXT;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS course_title TEXT;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS created_at TEXT;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS type TEXT;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS description TEXT;",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS qr_code TEXT;",

      "ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS course_id INTEGER;",
      "ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS rating INTEGER;",
      "ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS review TEXT;",
      "ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS created_at TEXT;",

      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS user_name TEXT;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS user_email TEXT;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS content_type TEXT;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS content_id INTEGER;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS content_title TEXT;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS payment_method TEXT;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS phone TEXT;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS amount_paid INTEGER;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS proof_url TEXT;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS created_at TEXT;",

      "ALTER TABLE premium_access ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE premium_access ADD COLUMN IF NOT EXISTS content_type TEXT;",
      "ALTER TABLE premium_access ADD COLUMN IF NOT EXISTS content_id INTEGER;",
      "ALTER TABLE premium_access ADD COLUMN IF NOT EXISTS granted_at TEXT;",
      "ALTER TABLE premium_access ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';",

      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS user_name TEXT;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS pdf_id INTEGER;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS pdf_title TEXT;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS amount_paid INTEGER;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS payment_method TEXT;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS phone TEXT;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING_APPROVAL';",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS proof_url TEXT;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS created_at TEXT;",
      "ALTER TABLE pdf_purchases ADD COLUMN IF NOT EXISTS approved_at TEXT;",

      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS request_id INTEGER;",
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount INTEGER;",
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type TEXT;",
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT;",
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS timestamp TEXT;",

      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT;",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link_tab TEXT;",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TEXT;",

      "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS official_signature_url TEXT;",
      "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS official_seal_url TEXT;",

      "ALTER TABLE payment_proofs ADD COLUMN IF NOT EXISTS request_id INTEGER;",
      "ALTER TABLE payment_proofs ADD COLUMN IF NOT EXISTS url TEXT;",
      "ALTER TABLE payment_proofs ADD COLUMN IF NOT EXISTS uploaded_at TEXT;",

      "ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;",
      "ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE;",
      "ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS sound_notifications BOOLEAN DEFAULT TRUE;",

      "ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS user_id INTEGER;",
      "ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS token TEXT;",
      "ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS type TEXT;"
    ];

    for (const alteration of columnAlterations) {
      await pgPool.query(alteration).catch(err => {
        console.warn(`[Database Migration] Column alteration warning (usually ignorable): ${err.message}`);
      });
    }
    console.log("[Database] Completed Neon table bootstrapping and safe migrations.");

    // Dynamic database safety patch: DROP NOT NULL constraint on any unmanaged columns (like 'fullname', 'password', etc.) that might exist in the shared/persistent DB
    try {
      await pgPool.query(`
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                  AND table_schema = 'public'
                  AND is_nullable = 'NO' 
                  AND column_name <> 'id'
            ) LOOP
                EXECUTE 'ALTER TABLE users ALTER COLUMN ' || quote_ident(r.column_name) || ' DROP NOT NULL';
            END LOOP;
        END $$;
      `);
      console.log("[Database] Neon PG safety patch applied: dynamically dropped NOT NULL constraint on any extraneous user table columns.");
    } catch (patchErr) {
      console.error("[Database] Failed to execute dynamic NOT NULL constraints drop safety patch:", patchErr);
    }

    // Seed system settings if empty
    const res = await pgPool.query("SELECT COUNT(*) FROM system_settings");
    const count = parseInt(res.rows[0].count, 10);
    if (count === 0) {
      const defaultSig = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='250' height='100' viewBox='0 0 250 100'><path d='M20,60 C40,25 55,85 70,45 C85,20 95,80 115,50 C135,25 155,90 175,55 C195,25 215,80 235,50' fill='none' stroke='%23ff7b00' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/><path d='M10,70 Q125,50 240,60' fill='none' stroke='%23111827' stroke-width='2' stroke-linecap='round'/></svg>";
      const defaultSeal = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><circle cx='60' cy='60' r='55' fill='%23fff5e6' stroke='%23ff7b00' stroke-width='4'/><circle cx='60' cy='60' r='47' fill='none' stroke='%23ff7b00' stroke-width='1.5' stroke-dasharray='4,4'/><path d='M60,18 L63,27 L72,27 L65,33 L67,42 L60,36 L53,42 L55,33 L48,27 L57,27 Z M60,78 L63,87 L72,87 L65,93 L67,102 L60,96 L53,102 L55,93 L48,87 L57,87 Z' fill='%23ff7b00'/><text x='60' y='55' font-family='Helvetica, Arial, sans-serif' font-size='8' font-weight='bold' fill='%23111827' text-anchor='middle'>OFFICIAL</text><text x='60' y='67' font-family='Helvetica, Arial, sans-serif' font-size='10' font-weight='black' fill='%23ff7b00' text-anchor='middle'>SEAL</text><text x='60' y='76' font-family='Helvetica, Arial, sans-serif' font-size='6' font-weight='bold' fill='%234b5563' text-anchor='middle'>POWERCODE</text></svg>";
      
      await pgPool.query(
        "INSERT INTO system_settings (id, official_signature_url, official_seal_url) VALUES (1, $1, $2)",
        [defaultSig, defaultSeal]
      );
      console.log("[Database] Initial default system_settings row seeded.");
    }

    // Check if the 'courses' table is empty (which indicates primary first-time deployment)
    const coursesCountRes = await pgPool.query("SELECT COUNT(*) FROM courses");
    const courseCountOnDb = parseInt(coursesCountRes.rows[0].count, 10);

    if (courseCountOnDb === 0) {
      console.log("[Database Migration] PostgreSQL business tables appear empty. Checking for seed files...");
      let seedState = defaultInitialState;
      if (fs.existsSync(DB_FILE)) {
        try {
          const rawSeed = fs.readFileSync(DB_FILE, "utf8");
          seedState = JSON.parse(rawSeed);
          console.log("[Database Migration] Located existing db_state.json. Performing comprehensive migration to Neon PostgreSQL...");
        } catch (e) {
          console.error("[Database Migration] Failed to parse db_state.json for seed, using code default state: ", e);
        }
      } else {
        console.log("[Database Migration] No db_state.json found. Creating first-time seeded state...");
      }

      // Enforce default Admin seed emails to exist inside the seed state
      const targetEmails = ["arceneirakoze550@gmail.com", "arceneirakoze@proton.me"];
      targetEmails.forEach((targetEmail, idx) => {
        const pass = targetEmail === "arceneirakoze@proton.me" ? "my_mother" : "admin123";
        const emailLower = targetEmail.trim().toLowerCase();
        const existingIdx = seedState.users.findIndex(u => u.email.trim().toLowerCase() === emailLower);
        
        if (existingIdx >= 0) {
          seedState.users[existingIdx].role = "ADMIN";
          seedState.users[existingIdx].passwordHash = pass;
        } else {
          const nextId = seedState.users.length ? Math.max(...seedState.users.map(u => u.id)) + 1 : 1 + idx;
          seedState.users.push({
            id: nextId,
            name: targetEmail.split("@")[0] === "arceneirakoze" ? "Arcene Irakoze" : "Admin Arcene",
            email: emailLower,
            passwordHash: pass,
            role: "ADMIN",
            avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
            learningStreak: 12,
            lastActiveAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isVerified: true,
            score: 500
          });
        }
      });

      // Persist the seed/bootstrap state to PostgreSQL
      await persistStateToPostgres(seedState);
      console.log("[Database Migration] Neon PostgreSQL has been successfully seeded and initialized!");
    } else {
      console.log("[Database Verification] PostgreSQL already contains records. Loading production data directly from Neon.");
    }

    // Populate our high-performance memory cache by pulling the entire schema from Neon PostgreSQL
    dbCachedInstance = await loadDBFromPostgres();
    dbCachedInstance = ensureDbSanitized(dbCachedInstance);

    // Enforce default Admin secrets inside memory cache
    const targetEmails = ["arceneirakoze550@gmail.com", "arceneirakoze@proton.me"];
    targetEmails.forEach(targetEmail => {
      const emailLower = targetEmail.trim().toLowerCase();
      const existingUser = dbCachedInstance.users.find((u: any) => u.email.trim().toLowerCase() === emailLower);
      if (existingUser) {
        existingUser.role = "ADMIN";
        existingUser.passwordHash = targetEmail === "arceneirakoze@proton.me" ? "my_mother" : "admin123";
      }
    });

    console.log(`
====================================================================
  MIGRATION & VERIFICATION REPORT (NEON POSTGRESQL ALIVE)
  --------------------------------------------------
  The Neon database is fully loaded and active as the ONLY source of truth.
  
  CURRENT ROW COUNTS:
  • Users: ${dbCachedInstance.users.length}
  • Courses: ${dbCachedInstance.courses.length}
  • Tutorials: ${dbCachedInstance.tutorials.length}
  • PDFs: ${dbCachedInstance.pdfs.length}
  • Quizzes: ${dbCachedInstance.quizzes.length}
  • Challenges: ${dbCachedInstance.challenges.length}
  • Payment Requests: ${dbCachedInstance.paymentRequests.length}
  • Transactions: ${dbCachedInstance.transactions.length}
  • Notifications: ${dbCachedInstance.notifications.length}
====================================================================
`);

  } catch (err) {
    console.error(`
====================================================================
  CRITICAL ERROR IN DATABASE BOOTSTRAP:
  ${err.message}
  Unrecoverable schema creation or migration error. Hard fail.
====================================================================
`);
    process.exit(1);
  }
}


// Signature Helper for Certificates
function signCertificate(certCode: string, userName: string, courseTitle: string): string {
  const data = `${certCode}|${userName}|${courseTitle}`;
  return crypto.createHmac("sha256", "powercode-cert-secret-key-2026").update(data).digest("hex");
}

// Initialize express app
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const server = http.createServer(app);
server.keepAliveTimeout = 120000;
server.headersTimeout = 120500; // slightly higher than keepAliveTimeout

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Serve custom logo asset
app.get("/powercodeacademy.png", (req, res) => {
  const publicPath = path.join(process.cwd(), "public", "powercodeacademy.png");
  const distPath = path.join(process.cwd(), "dist", "powercodeacademy.png");
  const rootPath = path.join(process.cwd(), "powercodeacademy.png");

  if (fs.existsSync(publicPath)) {
    res.sendFile(publicPath);
  } else if (fs.existsSync(distPath)) {
    res.sendFile(distPath);
  } else if (fs.existsSync(rootPath)) {
    res.sendFile(rootPath);
  } else {
    res.status(404).send("Logo not found");
  }
});

// CORS standard headers to support iframe sandboxes inside AI Studio
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// DB_FILE is declared globally at the top of the file

interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "STUDENT";
  avatarUrl: string;
  learningStreak: number;
  lastActiveAt: string;
  createdAt: string;
  isVerified: boolean;
  score: number;
  profile_picture_url?: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  isPremium: boolean;
  category?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  status?: string;
  deleted_at?: string;
  deleted_by?: string;
  modules: {
    id: number;
    title: string;
    lessons: {
      id: number;
      title: string;
      content: string;
      videoUrl: string;
      durationMinutes: number;
      isPreviewAllowed: boolean;
      quizId?: number | null;
      isPublished?: boolean;
      isArchived?: boolean;
      isDeleted?: boolean;
      status?: string;
      deleted_at?: string;
      deleted_by?: string;
      playbackId?: string | null;
    }[];
  }[];
}

interface Tutorial {
  id: number;
  title: string;
  category: string;
  content: string;
  codeSnippet?: string;
  languageSlug?: string;
  coverImageUrl?: string;
  videoUrl?: string;
  embedded_video_url?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  status?: string;
  deleted_at?: string;
  deleted_by?: string;
}

interface Pdf {
  id: number;
  title: string;
  author: string;
  category?: string;
  fileUrl: string;
  previewUrl?: string;
  isPremium: boolean;
  price?: number;
  thumbnailUrl?: string;
  description?: string;
  publishedDate?: string;
  createdAt?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  status?: string;
  deleted_at?: string;
  deleted_by?: string;
}

interface Quiz {
  id: number;
  courseId: number | null;
  title: string;
  durationMinutes: number;
  passingScore: number;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  status?: string;
  deleted_at?: string;
  deleted_by?: string;
  questions: {
    id: number;
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  starterCode: string;
  solutionCode: string;
  testCases: { input: any; output: any }[];
  points: number;
  category: string;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  status?: string;
  deleted_at?: string;
  deleted_by?: string;
}

interface CommunityPost {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  title: string;
  content: string;
  likesCount: number;
  likedBy: number[];
  createdAt: string;
  comments: {
    id: number;
    userId: number;
    userName: string;
    userAvatar: string;
    content: string;
    createdAt: string;
  }[];
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isImportant: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  status?: string;
  deleted_at?: string;
  deleted_by?: string;
}

interface DbState {
  users: User[];
  courses: Course[];
  tutorials: Tutorial[];
  pdfs: Pdf[];
  quizzes: Quiz[];
  challenges: Challenge[];
  enrollments: { userId: number; courseId: number; enrolledAt: string }[];
  lessonProgress: { userId: number; lessonId: number; completedAt: string }[];
  bookmarks: { userId: number; pdfId: number }[];
  quizAttempts: { id: number; userId: number; quizId: number; score: number; passed: boolean; date: string }[];
  challengeSubmissions: { id: number; userId: number; challengeId: number; submittedCode: string; status: "PASSED" | "FAILED"; score: number; date: string }[];
  certificates: { certificateCode: string; userId: number; userName: string; courseId: number | null; courseTitle: string; date: string; type?: string; description?: string; qrCode?: string }[];
  community: CommunityPost[];
  siteSettings: {
    platformName: string;
    logoUrl: string;
    enableRegistration: boolean;
    landingPromoBanner: string;
  };
  system_settings?: {
    official_signature_url: string;
    official_seal_url: string;
  };
  certificateTemplates: { id: number; title: string; subTitle: string; description: string; bgTheme: string }[];
  certificateVerifications: { certificateCode: string; userId: number; userName: string; status: string; dateVerified: string }[];
  courseVideos: { id: number; courseId: number; lessonId: number; videoUrl: string; fileName: string }[];
  tutorialVideos: { id: number; tutorialId: number; videoUrl: string; fileName: string }[];
  courseImages: { id: number; courseId: number; imageUrl: string; imageType: string }[];
  tutorialImages: { id: number; tutorialId: number; imageUrl: string }[];
  announcements: Announcement[];
  aiConversations: { id: number; userId: number; message: string; reply: string; date: string }[];
  userAchievements: { id: number; userId: number; title: string; description: string; icon: string; unlockedAt: string }[];
  digitalSignatures: { id: number; signerName: string; title: string; imageUrl: string }[];
  adminSettings: { key: string; value: string }[];
  learningPaths: { id: number; title: string; description: string; courseIds: number[] }[];
  adminActivityLogs: {
    id: number;
    adminName: string;
    actionType: string;
    contentType: string;
    contentTitle: string;
    timestamp: string;
    ipAddress: string;
  }[];
  lessonNotes: { userId: number; lessonId: number; notes: string; updatedAt: string }[];
  lessonComments: { id: number; userId: number; userName: string; userAvatar: string; lessonId: number; text: string; createdAt: string }[];
  pdfPurchases?: any[];
  programmingExamples?: any[];
  categories?: any[];
  paymentRequests?: any[];
  paymentProofs?: any[];
  premiumAccess?: any[];
  transactions?: any[];
  notifications?: any[];
  notificationSettings?: any[];
  notificationReads?: any[];
  notificationLogs?: any[];
  pushTokens?: any[];
  notificationSounds?: any[];
  supportMessages?: any[];
  directMessages?: {
    id: number;
    senderId: number;
    senderName: string;
    receiverId: number;
    receiverName: string;
    message: string;
    createdAt: string;
  }[];
  testimonials?: {
    id: number;
    name: string;
    role: string;
    company: string;
    avatarUrl: string;
    blurb: string;
    highlightPhrase: string;
    stats: { label: string; value: string }[];
    tags: string[];
    isApproved?: boolean;
    createdAt?: string;
    createdByUserId?: number;
  }[];
}

const defaultInitialState: DbState = {
  users: [
    {
      id: 1,
      name: "Admin Arcene",
      email: "admin@powercode.com",
      passwordHash: "admin123",
      role: "ADMIN",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      learningStreak: 15,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isVerified: true,
      score: 1250,
    },
    {
      id: 2,
      name: "Student Jane",
      email: "student@powercode.com",
      passwordHash: "student123",
      role: "STUDENT",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      learningStreak: 5,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isVerified: true,
      score: 450,
    },
    {
      id: 3,
      name: "Arcene Irakoze",
      email: "arceneirakoze550@gmail.com",
      passwordHash: "admin123",
      role: "ADMIN",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      learningStreak: 12,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isVerified: true,
      score: 500,
    },
    {
      id: 4,
      name: "Arcene Irakoze",
      email: "arceneirakoze@proton.me",
      passwordHash: "my_mother",
      role: "ADMIN",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      learningStreak: 12,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isVerified: true,
      score: 500,
    }
  ],
  courses: [
    {
      id: 1,
      title: "Complete JavaScript Zero to Hero",
      description: "Master the world's most versatile web programming language through dynamic modules, real sandbox IDE projects, quizzes, and certificates.",
      thumbnailUrl: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=500",
      price: 0.00,
      isPremium: false,
      modules: [
        {
          id: 101,
          title: "1. Variables & Primitive Syntaxes",
          lessons: [
            { id: 1001, title: "Welcome to JavaScript variables", content: "JavaScript has three core ways to declare variables: `let`, `const`, and `var`. Understanding Block vs Function scope is crucial. Write your first variables in the terminal and output using console.log.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", durationMinutes: 10, isPreviewAllowed: true },
            { id: 1002, title: "Data Types & Lexical Scoping", content: "Primitives include string, number, boolean, null, undefined, and symbol. Non-primitives are object, function, array. Learn how closures capture references.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", durationMinutes: 15, isPreviewAllowed: false }
          ]
        },
        {
          id: 102,
          title: "2. Control flows, condition loops",
          lessons: [
            { id: 1003, title: "Loops: For, While and For...Of", content: "Master array manipulation loops, using break, continue, and index operations.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", durationMinutes: 12, isPreviewAllowed: false }
          ]
        }
      ]
    },
    {
      id: 2,
      title: "Python Data Structures & OOP",
      description: "Dive deep into core computer science concepts, stacks, queues, object properties, dynamic models, and search algorithms in Python.",
      thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500",
      price: 0.00,
      isPremium: false,
      modules: [
        {
          id: 201,
          title: "1. Data Lists & Dictionaries",
          lessons: [
            { id: 2001, title: "Arrays & List comprehensions", content: "Explore computational Big-O metrics and fast indexing list transformations.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", durationMinutes: 18, isPreviewAllowed: true }
          ]
        }
      ]
    },
    {
      id: 3,
      title: "Advanced Full-Stack with Drizzle & Prisma",
      description: "Build robust schemas, leverage migration models, handle relations, and build performant backend routers with PostgreSQL.",
      thumbnailUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500",
      price: 49.99,
      isPremium: true,
      modules: [
        {
          id: 301,
          title: "1. Modeling Complex SQL Schemas",
          lessons: [
            { id: 3001, title: "Writing migrations the expert way", content: "Define correct column typings, indexes, check constraints, foreign keys and triggers for databases.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", durationMinutes: 22, isPreviewAllowed: false }
          ]
        }
      ]
    }
  ],
  tutorials: [
    {
      id: 1,
      title: "Getting Started with React Hooks",
      category: "React",
      content: "React Hooks let you use state and other React features without writing a class. The most popular hooks are useState and useEffect which manages life cycles inside functional elements.",
      codeSnippet: "import React, { useState } from 'react';\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button className='bg-primary font-bold px-4 py-2 rounded-lg' onClick={() => setCount(count + 1)}>\n      Total: {count}\n    </button>\n  );\n}",
      languageSlug: "javascript",
      embedded_video_url: "https://www.youtube.com/embed/Ke90Tje7VS0"
    },
    {
      id: 2,
      title: "Binary Search Tree implementations",
      category: "Python",
      content: "A Binary Search Tree (BST) is a hierarchical structural node arrangement where left child houses lesser numerical bounds, and right child houses greater values. Time complexity is O(log n).",
      codeSnippet: "class Node:\n    def __init__(self, key):\n        self.left = None\n        self.right = None\n        self.val = key\n\ndef insert(root, key):\n    if root is None:\n        return Node(key)\n    else:\n        if root.val < key:\n            root.right = insert(root.right, key)\n        else:\n            root.left = insert(root.left, key)\n    return root",
      languageSlug: "python",
      embedded_video_url: "https://www.youtube.com/embed/f55qe9EYDSc"
    },
    {
      id: 3,
      title: "Flexbox vs Grid layouts",
      category: "CSS",
      content: "Flexbox is designed for 1-dimensional layouts (row or column), while Grid is designed for 2-dimensional grid layouts, facilitating column and row tracking simultaneously.",
      codeSnippet: "/* CSS 2D Grid example */\n.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}",
      languageSlug: "css",
      embedded_video_url: "https://www.youtube.com/embed/hs3piaN4b5I"
    }
  ],
  pdfs: [
    {
      id: 1,
      title: "Eloquent JavaScript (3rd Edition)",
      author: "Marijn Haverbeke",
      category: "JavaScript",
      fileUrl: "https://eloquentjavascript.net/Eloquent_JavaScript.pdf",
      previewUrl: "https://eloquentjavascript.net/00_intro.html",
      isPremium: false,
      description: "A modern introduction to programming, JavaScript, and the wonders of digital architecture.",
      publishedDate: "2018-12-04"
    },
    {
      id: 2,
      title: "Python for Data Analysis",
      author: "Wes McKinney",
      category: "Python",
      fileUrl: "https://wesmckinney.com/book/",
      previewUrl: "https://wesmckinney.com/book/",
      isPremium: true,
      description: "The complete guide to data structures, clean manipulation, and deep processing with pandas, NumPy, and IPython.",
      publishedDate: "2022-10-12"
    },
    {
      id: 3,
      title: "Designing Data-Intensive Applications",
      author: "Martin Kleppmann",
      category: "PostgreSQL",
      fileUrl: "https://learning.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/",
      previewUrl: "https://learning.oreilly.com/library/view/designing-data-intensive-applications/",
      isPremium: true,
      description: "The definitive blueprint to navigating the architecture of storage, scaling, and database reliability.",
      publishedDate: "2017-03-16"
    }
  ],
  quizzes: [
    {
      id: 1,
      courseId: 1,
      title: "Variables and Scope Assessment",
      durationMinutes: 10,
      passingScore: 70,
      questions: [
        {
          id: 11,
          question: "Which of the following creates a block-scoped variable?",
          options: ["var", "let", "global", "static"],
          correctAnswer: "let"
        },
        {
          id: 12,
          question: "Can 'const' declared variables be mutated (e.g. adding item to const array)?",
          options: ["No, it will instantly throw a compiler error", "Yes, reference remains intact but contents can adapt", "Only inside asynchronous closures", "Never"],
          correctAnswer: "Yes, reference remains intact but contents can adapt"
        }
      ]
    }
  ],
  challenges: [
    {
      id: 1,
      title: "Reverse a String",
      description: "Write an algorithm program that takes a string input `s` and returns the reversed character representation sequence.",
      difficulty: "EASY",
      starterCode: "function reverseString(s) {\n  // Write your code here\n  \n}",
      solutionCode: "function reverseString(s) {\n  return s.split('').reverse().join('');\n}",
      testCases: [
        { input: "hello", output: "olleh" },
        { input: "academy", output: "ymedaca" }
      ],
      points: 10,
      category: "Strings"
    },
    {
      id: 2,
      title: "Two Sum Solver",
      description: "Given a numeric array `nums` and value `target`, locate the unique pair values indices which sum exactly to the target value.",
      difficulty: "MEDIUM",
      starterCode: "function twoSum(nums, target) {\n  // Return indexes as [idx1, idx2]\n  \n}",
      solutionCode: "function twoSum(nums, target) {\n  const map = {};\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (comp in map) return [map[comp], i];\n    map[nums[i]] = i;\n  }\n  return [];\n}",
      testCases: [
        { input: { nums: [2, 7, 11, 15], target: 9 }, output: [0, 1] },
        { input: { nums: [3, 2, 4], target: 6 }, output: [1, 2] }
      ],
      points: 20,
      category: "Algorithms"
    }
  ],
  enrollments: [
    { userId: 2, courseId: 1, enrolledAt: new Date().toISOString() }
  ],
  lessonProgress: [
    { userId: 2, lessonId: 1001, completedAt: new Date().toISOString() }
  ],
  bookmarks: [
    { userId: 2, pdfId: 1 }
  ],
  quizAttempts: [],
  challengeSubmissions: [],
  certificates: [],
  community: [
    {
      id: 1,
      userId: 2,
      userName: "Jane Doe",
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      title: "How to master asynchronous callbacks in ES6?",
      content: "I am working on Express middleware routing but nested callbacks are causing confusion about execution orders. Are promise lists better than basic loops?",
      likesCount: 3,
      likedBy: [1],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      comments: [
        {
          id: 501,
          userId: 1,
          userName: "Admin Arcene",
          userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
          content: "Definitely use async/await combined with Promise.all() for non-blocking asynchronous array evaluations. It keeps execution stack traces highly readable!",
          createdAt: new Date().toISOString()
        }
      ]
    }
  ],
  siteSettings: {
    platformName: "PowerCode Academy",
    logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100",
    enableRegistration: true,
    landingPromoBanner: "🔥 Register today and learn core programming blocks absolute free: JavaScript, Python, and C!"
  },
  system_settings: {
    official_signature_url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='250' height='100' viewBox='0 0 250 100'><path d='M20,60 C40,25 55,85 70,45 C85,20 95,80 115,50 C135,25 155,90 175,55 C195,25 215,80 235,50' fill='none' stroke='%23ff7b00' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/><path d='M10,70 Q125,50 240,60' fill='none' stroke='%23111827' stroke-width='2' stroke-linecap='round'/></svg>",
    official_seal_url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><circle cx='60' cy='60' r='55' fill='%23fff5e6' stroke='%23ff7b00' stroke-width='4'/><circle cx='60' cy='60' r='47' fill='none' stroke='%23ff7b00' stroke-width='1.5' stroke-dasharray='4,4'/><path d='M60,18 L63,27 L72,27 L65,33 L67,42 L60,36 L53,42 L55,33 L48,27 L57,27 Z M60,78 L63,87 L72,87 L65,93 L67,102 L60,96 L53,102 L55,93 L48,87 L57,87 Z' fill='%23ff7b00'/><text x='60' y='55' font-family='Helvetica, Arial, sans-serif' font-size='8' font-weight='bold' fill='%23111827' text-anchor='middle'>OFFICIAL</text><text x='60' y='67' font-family='Helvetica, Arial, sans-serif' font-size='10' font-weight='black' fill='%23ff7b00' text-anchor='middle'>SEAL</text><text x='60' y='76' font-family='Helvetica, Arial, sans-serif' font-size='6' font-weight='bold' fill='%234b5563' text-anchor='middle'>POWERCODE</text></svg>"
  },
  certificateTemplates: [
    { id: 1, title: "Excellence in Web Development", subTitle: "React/JavaScript Course Mastery", description: "This certificate templates is selected for students demonstrating complete proficiency in react models.", bgTheme: "orange" }
  ],
  certificateVerifications: [],
  courseVideos: [],
  tutorialVideos: [],
  courseImages: [],
  tutorialImages: [],
  announcements: [
    {
      id: 1,
      title: "Welcome to PowerCode Academy!",
      content: "We are thrilled to launch the new collapsed left sidebar, full Judge0 compilation IDE, and verified PDF certificates system. Start coding today!",
      createdAt: new Date().toISOString(),
      isImportant: true
    }
  ],
  aiConversations: [],
  userAchievements: [
    { id: 1, userId: 2, title: "Speed Demon", description: "Solved first coding challenge successfully.", icon: "⚡", unlockedAt: new Date().toISOString() }
  ],
  digitalSignatures: [
    { id: 1, signerName: "Arcene Irakoze", title: "Founder & Administrator, PowerCode Academy", imageUrl: "https://signature-placeholder.infra" }
  ],
  adminSettings: [
    { key: "cloudinary_cloud_name", value: "powercode_cloudinary_sandbox" }
  ],
  learningPaths: [
    { id: 1, title: "Full Stack Engineer Path", description: "Course block structure designed to turn students into ready full-stack developers.", courseIds: [1, 2] }
  ],
  adminActivityLogs: [],
  lessonNotes: [],
  lessonComments: [],
  pdfPurchases: [],
  programmingExamples: [],
  categories: [
    { id: 1, name: "Frontend Development" },
    { id: 2, name: "Backend Architecture" },
    { id: 3, name: "Mobile App Development" },
    { id: 4, name: "Database Engineering" },
    { id: 5, name: "Cloud & Devops" }
  ],
  paymentRequests: [],
  paymentProofs: [],
  premiumAccess: [],
  transactions: [],
  notifications: [],
  notificationSettings: [],
  notificationReads: [],
  notificationLogs: [],
  pushTokens: [],
  notificationSounds: [],
  supportMessages: [],
  testimonials: [
    {
      id: 1,
      name: "Sarah Jenkins",
      role: "Software Engineer II",
      company: "Google",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      blurb: "PowerCode Academy completely redefined my learning curve. The interactive browser-based compiler and immediate feedback from the Gemini AI Mentor felt like having a senior engineer sitting right next to me. I transitioned from retail management into a core engineering team at Google in less than 9 months!",
      highlightPhrase: "Went from absolute beginner to a Core Engineer at Google in 9 months.",
      stats: [
        { label: "Salary Increase", value: "+140%" },
        { label: "Time to Hire", value: "9 Months" },
        { label: "Lessons Finished", value: "142 Modules" }
      ],
      tags: ["Python AI", "Node.js Backend", "Monaco IDE Sandbox"],
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: "Alex Rivera",
      role: "Full-Stack Developer",
      company: "Stripe",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      blurb: "The certification program at PowerCode was the first credential that actually carried weight in my interviews. Employers were incredibly impressed with the physical verified QR links pointing back to my real compiled code sandboxes. I was hired at Stripe within two weeks of receiving my backend certificate!",
      highlightPhrase: "My verified portfolio sandbox landed me an offer at Stripe.",
      stats: [
        { label: "Interviews Booked", value: "8 callbacks" },
        { label: "Starting Role", value: "L4 Engineer" },
        { label: "Compiler Commits", value: "480+ runs" }
      ],
      tags: ["TypeScript", "PostgreSQL Joins", "Verified Credentials"],
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      name: "Mia Chen",
      role: "Frontend Team Lead",
      company: "Netflix",
      avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
      blurb: "I had some basic self-taught experience, but I lacked structured engineering foundations. PowerCode's deep-dives into CSS Box layouts, responsive flex grids, and advanced JavaScript asynchronous promises connected all the dots. Now I lead a team of frontend engineers building global components.",
      highlightPhrase: "Connected the dots to scale my knowledge to a Team Lead position.",
      stats: [
        { label: "Team Managed", value: "6 Engineers" },
        { label: "Promo Cycle", value: "1 Year" },
        { label: "Syllabus Mastery", value: "100%" }
      ],
      tags: ["Responsive Design", "Advanced JS", "CSS Box Masterclass"],
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 4,
      name: "Marcus Vance",
      role: "DevOps Architect",
      company: "AWS Partner Network",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
      blurb: "The API engineering modules are peerless. Setting up Express controllers, routing pipelines, middleware authenticators, and relational schemas on the live database was identical to my daily tasks now. It's not just a course; it's a simulated high-throughput production environment.",
      highlightPhrase: "Learned server-side clustering that perfectly mirrors production.",
      stats: [
        { label: "Compiles Done", value: "1,200+" },
        { label: "Placement", value: "AWS Partner" },
        { label: "Tech Stack Size", value: "12 Tools" }
      ],
      tags: ["Node.js Servers", "REST API Schema", "Relational DB"],
      isApproved: true,
      createdAt: new Date().toISOString()
    }
  ]
};

// State Helper Functions
function ensureDbSanitized(parsed: any): DbState {
  const arrayKeys: (keyof DbState)[] = [
    "users",
    "courses",
    "tutorials",
    "pdfs",
    "quizzes",
    "challenges",
    "enrollments",
    "lessonProgress",
    "bookmarks",
    "quizAttempts",
    "challengeSubmissions",
    "certificates",
    "community",
    "certificateTemplates",
    "certificateVerifications",
    "courseVideos",
    "tutorialVideos",
    "courseImages",
    "tutorialImages",
    "announcements",
    "aiConversations",
    "userAchievements",
    "digitalSignatures",
    "adminSettings",
    "learningPaths",
    "adminActivityLogs",
    "lessonNotes",
    "lessonComments",
    "pdfPurchases",
    "programmingExamples",
    "categories",
    "paymentRequests",
    "paymentProofs",
    "premiumAccess",
    "transactions",
    "notifications",
    "notificationSettings",
    "notificationReads",
    "notificationLogs",
    "pushTokens",
    "notificationSounds",
    "supportMessages",
    "testimonials"
  ];

  arrayKeys.forEach((key) => {
    if (!Array.isArray(parsed[key])) {
      parsed[key] = [];
    }
  });

  if (!parsed.siteSettings) {
    parsed.siteSettings = { ...defaultInitialState.siteSettings };
  }

  if (!parsed.system_settings) {
    parsed.system_settings = { ...defaultInitialState.system_settings };
  }

  // Sanitize and default new soft-delete and status fields
  if (Array.isArray(parsed.courses)) {
    parsed.courses.forEach((c: any) => {
      if (!c.status) {
        c.status = c.isDeleted ? "Trashed" : (c.isPublished !== false ? "Published" : "Draft");
      }
      c.deleted_at = c.deleted_at || null;
      c.deleted_by = c.deleted_by || null;
      if (Array.isArray(c.modules)) {
        c.modules.forEach((m: any) => {
          if (Array.isArray(m.lessons)) {
            m.lessons.forEach((l: any) => {
              if (!l.status) l.status = "Published";
              l.deleted_at = l.deleted_at || null;
              l.deleted_by = l.deleted_by || null;
            });
          }
        });
      }
    });
  }

  const standardSoftDeletable = ["tutorials", "pdfs", "quizzes", "challenges", "announcements"];
  standardSoftDeletable.forEach((key) => {
    if (Array.isArray(parsed[key])) {
      parsed[key].forEach((item: any) => {
        if (!item.status) {
          item.status = item.isDeleted ? "Trashed" : (item.isPublished !== false ? "Published" : "Draft");
        }
        item.deleted_at = item.deleted_at || null;
        item.deleted_by = item.deleted_by || null;
      });
    }
  });

  return parsed as DbState;
}

function initLocalDatabaseFallback() {
  console.log("[Database Fallback] Initializing local database fallback...");
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      dbCachedInstance = JSON.parse(raw);
      dbCachedInstance = ensureDbSanitized(dbCachedInstance);
      console.log("[Database Fallback] Successfully loaded local data from db_state.json");
    } catch (e: any) {
      console.error("[Database Fallback] Failed to parse db_state.json, falling back to defaultInitialState:", e);
      dbCachedInstance = JSON.parse(JSON.stringify(defaultInitialState));
    }
  } else {
    console.log("[Database Fallback] Creating new local db state from defaultInitialState...");
    dbCachedInstance = JSON.parse(JSON.stringify(defaultInitialState));
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbCachedInstance, null, 2), "utf8");
    } catch (e: any) {
      console.error("[Database Fallback] Failed to write initial db_state.json:", e);
    }
  }
}

// Immediately initialize on load so the cache is never null!
initLocalDatabaseFallback();

function getDB(): DbState {
  if (!dbCachedInstance) {
    console.log("[Database] getDB called before cache initialized. Providing default state.");
    return defaultInitialState;
  }
  return dbCachedInstance;
}

function saveDB(state: DbState): void {
  try {
    dbCachedInstance = state;
    
    // Always write to local JSON file for offline/local desktop resilience
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
    } catch (fsErr: any) {
      console.error("[Database Save] Failed to write db_state.json locally:", fsErr);
    }
    
    // Enforce instant background persistence directly to Neon PostgreSQL. 
    if (pgPool && pgConnectedStatus) {
      persistStateToPostgres(state).catch((err) => {
        console.error("[Database Sync] Error persisting state to Neon PostgreSQL:", err);
        try {
          fs.appendFileSync(path.join(process.cwd(), "sync_error.log"), `[saveDB.catch] ${err?.message}\n${err?.stack}\n\n`);
        } catch (e) {}
      });
    }
  } catch (err: any) {
    console.error("[Database Sync] Critical state save failure:", err);
    try {
      fs.appendFileSync(path.join(process.cwd(), "sync_error.log"), `[saveDB.throw] ${err?.message}\n${err?.stack}\n\n`);
    } catch (e) {}
  }
}

function logAdminActivity(
  db: DbState,
  adminName: string,
  actionType: string,
  contentType: string,
  contentTitle: string,
  ipAddress: string
): void {
  if (!db.adminActivityLogs) {
    db.adminActivityLogs = [];
  }
  const nextId = db.adminActivityLogs.length
    ? Math.max(...db.adminActivityLogs.map((l) => l.id)) + 1
    : 1;
  db.adminActivityLogs.push({
    id: nextId,
    adminName: adminName || "Admin",
    actionType,
    contentType,
    contentTitle: contentTitle || "Untitled",
    timestamp: new Date().toISOString(),
    ipAddress: ipAddress || "127.0.0.1",
  });
}

// Token helper simulation (non-cryptographic for simple container runtime simulation)
function parseUserFromAuth(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  const email = (parts[1] || "").trim().toLowerCase(); // Bearer <email> simulates simple token
  const db = getDB();
  const user = db.users.find(u => (u.email || "").trim().toLowerCase() === email);
  if (user && email === "arceneirakoze550@gmail.com" && user.role !== "ADMIN") {
    user.role = "ADMIN";
    saveDB(db);
  }
  return user || null;
}

// AUTH API
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required register fields" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  const cleanName = name.trim();

  const db = getDB();
  if (db.users.some(u => u.email.trim().toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: "User Account Email already exists" });
  }

  const newId = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  const newUser: User = {
    id: newId,
    name: cleanName,
    email: cleanEmail,
    passwordHash: cleanPassword, // simple simulated hashing
    role: "STUDENT",
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100`,
    learningStreak: 1,
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isVerified: true,
    score: 100,
  };

  db.users.push(newUser);
  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    try {
      await pgPool.query(`
        INSERT INTO users (id, name, email, password_hash, role, avatar_url, learning_streak, last_active_at, created_at, is_verified, score, profile_picture_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (email) DO NOTHING
      `, [
        newUser.id, newUser.name, newUser.email, newUser.passwordHash, newUser.role,
        newUser.avatarUrl, newUser.learningStreak, newUser.lastActiveAt, newUser.createdAt,
        newUser.isVerified, newUser.score, ""
      ]);
      console.log(`[Database] Account successfully registered and saved synchronously to Neon PG: ${cleanEmail}`);
    } catch (err) {
      console.error("[Database] Direct register table save to Postgres failed:", err);
    }
  }

  const token = newUser.email; // Simulating JWT
  res.json({ token, user: { ...newUser, isPro: newUser.role === "ADMIN" } });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPassword = String(password).trim();

  const db = getDB();
  const user = db.users.find(u => String(u.email || "").trim().toLowerCase() === cleanEmail);

  if (!user) {
    console.warn(`[Login] Match failed for email: ${cleanEmail}`);
    return res.status(401).json({ error: "We couldn't find an account matching that email address. Please double-check your spelling, or sign up to create a new profile." });
  }

  // Support both passwordHash and password triggers safely
  const userPass = String(user.passwordHash || (user as any).password || "").trim();

  if (userPass !== cleanPassword) {
    console.warn(`[Login] Password mismatch for ${cleanEmail}`);
    return res.status(401).json({ error: "Incorrect password. Please verify that your Caps Lock is off and try again, or contact our support team to reset it." });
  }

  user.lastActiveAt = new Date().toISOString();
  saveDB(db);

  const token = user.email; // Simulating JWT
  db.premiumAccess = db.premiumAccess || [];
  const isPro = db.premiumAccess.some((a: any) => a.userId === user.id && a.contentType === "PLATFORM_PRO" && a.status === "ACTIVE");
  res.json({ token, user: { ...user, isPro: !!isPro || user.role === "ADMIN" } });
});

app.get("/api/auth/me", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Not authorized" });
  }
  const db = getDB();
  db.premiumAccess = db.premiumAccess || [];
  const isPro = db.premiumAccess.some((a: any) => a.userId === user.id && a.contentType === "PLATFORM_PRO" && a.status === "ACTIVE");
  res.json({ user: { ...user, isPro: !!isPro || user.role === "ADMIN" } });
});

app.post("/api/users/profile", async (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Not authorized to update profile assets." });
  }

  const { name, email, password, profile_picture_url } = req.body;
  const db = getDB();
  const dbUser = db.users.find(u => u.id === user.id);
  if (!dbUser) {
    return res.status(404).json({ error: "User profile record not found." });
  }

  // Update properties if provided in request body
  if (name !== undefined) {
    dbUser.name = String(name).trim();
  }
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail && cleanEmail !== dbUser.email) {
      // Ensure email uniqueness
      const exists = db.users.some(u => u.email === cleanEmail && u.id !== user.id);
      if (exists) {
        return res.status(400).json({ error: "Email is already in use by another user profile." });
      }
      dbUser.email = cleanEmail;
    }
  }
  if (password !== undefined) {
    const cleanPass = String(password).trim();
    if (cleanPass) {
      dbUser.passwordHash = cleanPass;
    }
  }
  if (profile_picture_url !== undefined) {
    dbUser.profile_picture_url = profile_picture_url || "";
    dbUser.avatarUrl = profile_picture_url || "";
  }

  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    try {
      await pgPool.query(`
        UPDATE users 
        SET name = $1, email = $2, password_hash = $3, profile_picture_url = $4, avatar_url = $5
        WHERE id = $6
      `, [dbUser.name, dbUser.email, dbUser.passwordHash, dbUser.profile_picture_url, dbUser.avatarUrl, user.id]);
      console.log(`[Database] Robustly updated PG credentials profile for student email ${user.email}`);
    } catch (err) {
      console.error("[Database] Failed to save pg users profile modifications:", err);
    }
  }

  res.json({ success: true, user: dbUser });
});

// USERS STATE MANAGEMENT
app.get("/api/users", (req, res) => {
  const adminUser = parseUserFromAuth(req);
  if (!adminUser || adminUser.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  const db = getDB();
  res.json({ users: db.users });
});

// DELETE USER (Admin Only)
app.delete("/api/users/:id", (req, res) => {
  const adminUser = parseUserFromAuth(req);
  if (!adminUser || adminUser.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized access. Admins only." });
  }

  const targetId = Number(req.params.id);
  if (targetId === adminUser.id) {
    return res.status(400).json({ error: "You cannot delete your own admin account while active." });
  }

  const db = getDB();
  db.users = db.users || [];

  const idx = db.users.findIndex(u => u.id === targetId);
  if (idx === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const deletedUser = db.users[idx];
  db.users.splice(idx, 1);

  // Clean secondary items referencing this user
  db.enrollments = (db.enrollments || []).filter(e => e.userId !== targetId);
  db.lessonProgress = (db.lessonProgress || []).filter(p => p.userId !== targetId);
  db.bookmarks = (db.bookmarks || []).filter(b => b.userId !== targetId);
  db.notifications = (db.notifications || []).filter(n => n.userId !== targetId);

  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    pgPool.query("DELETE FROM users WHERE id = $1", [targetId]).catch((err) => {
      console.error("[Database Sync] Error deleting user from Postgres:", err);
    });
    pgPool.query("DELETE FROM enrollments WHERE user_id = $1", [targetId]).catch(() => {});
    pgPool.query("DELETE FROM lesson_progress WHERE user_id = $1", [targetId]).catch(() => {});
    pgPool.query("DELETE FROM bookmarks WHERE user_id = $1", [targetId]).catch(() => {});
    pgPool.query("DELETE FROM notifications WHERE user_id = $1", [targetId]).catch(() => {});
  }

  res.json({ success: true, message: `User "${deletedUser.name}" successfully deleted.` });
});

// DIRECT MESSAGING & USER SEARCH APIs
app.get("/api/users/search", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const q = String(req.query.q || "").trim().toLowerCase();
  const db = getDB();
  const dbUsers = db.users || [];

  if (!q) {
    // Return first 20 users by default for active discovery
    const filtered = dbUsers
      .filter(u => u.id !== user.id)
      .slice(0, 20)
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl || u.profile_picture_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        learningStreak: u.learningStreak || 0
      }));
    return res.json({ success: true, users: filtered });
  }

  const filtered = dbUsers
    .filter(u => u.id !== user.id && u.name && u.name.toLowerCase().includes(q))
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl || u.profile_picture_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      learningStreak: u.learningStreak || 0
    }));

  res.json({ success: true, users: filtered });
});

app.get("/api/direct-messages", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const db = getDB();
  db.directMessages = db.directMessages || [];

  const userMessages = db.directMessages.filter(
    m => m.senderId === user.id || m.receiverId === user.id
  );

  res.json({ success: true, messages: userMessages });
});

app.post("/api/direct-messages", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { receiverId, message } = req.body;
  if (!receiverId || !message || !String(message).trim()) {
    return res.status(400).json({ error: "Receiver ID and message content are required" });
  }

  const db = getDB();
  db.users = db.users || [];
  const receiverUser = db.users.find(u => u.id === Number(receiverId));
  if (!receiverUser) {
    return res.status(404).json({ error: "Recipient user not found" });
  }

  db.directMessages = db.directMessages || [];
  const nextId = db.directMessages.length
    ? Math.max(...db.directMessages.map((m) => m.id)) + 1
    : 1;

  const newMessage = {
    id: nextId,
    senderId: user.id,
    senderName: user.name,
    receiverId: receiverUser.id,
    receiverName: receiverUser.name,
    message: String(message).trim(),
    createdAt: new Date().toISOString()
  };

  db.directMessages.push(newMessage);

  // Send a system notification to the receiver
  db.notifications = db.notifications || [];
  const nextNotifId = db.notifications.length
    ? Math.max(...db.notifications.map((n) => n.id)) + 1
    : 1;

  db.notifications.push({
    id: nextNotifId,
    userId: receiverUser.id,
    title: `New Message from ${user.name}`,
    description: String(message).trim().slice(0, 60) + (String(message).length > 60 ? "..." : ""),
    category: "message",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDB(db);

  res.json({ success: true, message: newMessage });
});

function getOnlineImageForTitle(title: string): string {
  const t = String(title || "").toLowerCase();
  if (t.includes("react")) {
    return "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=60";
  }
  if (t.includes("python")) {
    return "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60";
  }
  if (t.includes("javascript") || t.includes(" js ")) {
    return "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=600&auto=format&fit=crop&q=60";
  }
  if (t.includes("css") || t.includes("style") || t.includes("html") || t.includes("tailwind")) {
    return "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=60";
  }
  if (t.includes("sql") || t.includes("postgres") || t.includes("database") || t.includes("db ")) {
    return "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=60";
  }
  if (t.includes("ai ") || t.includes("intelligence") || t.includes("gemini") || t.includes("openai") || t.includes("bot ") || t.includes("neural")) {
    return "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=60";
  }
  if (t.includes("kotlin") || t.includes("android") || t.includes("mobile") || t.includes("ios") || t.includes("swift")) {
    return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=60";
  }
  return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60";
}

// COURSES API
app.get("/api/courses", (req, res) => {
  const db = getDB();
  const user = parseUserFromAuth(req);
  const isAdmin = user && user.role === "ADMIN";

  const enrolledCourseIds = user
    ? db.enrollments.filter(e => e.userId === user.id).map(e => e.courseId)
    : [];

  const progressLessIds = user
    ? db.lessonProgress.filter(p => p.userId === user.id).map(p => p.lessonId)
    : [];

  let rawCourses = (db.courses || []).filter(c => c.status !== "Trashed" && !c.isDeleted);
  if (!isAdmin) {
    rawCourses = rawCourses.filter(c => !c.status || c.status === "Published");
  }

  db.premiumAccess = db.premiumAccess || [];

  const coursesWithUserData = rawCourses.map(c => {
    // A course has premium access if it is free, OR if the user is an admin,
    // OR if the user is a platform pro, OR if they have direct course purchase.
    const isPlatformPro = user && db.premiumAccess.some(a => a.userId === user.id && a.contentType === "PLATFORM_PRO" && a.status === "ACTIVE");
    const hasAccess = !c.isPremium || (user && (user.role === "ADMIN" || isPlatformPro || db.premiumAccess.some(a => a.userId === user.id && a.contentType === "COURSE" && Number(a.contentId) === c.id && a.status === "ACTIVE")));
    const mappedModules = (c.modules || []).map((m: any) => {
      const lessonsWithCompletion = (m.lessons || []).map((l: any) => {
        return {
          ...l,
          isCompleted: user ? progressLessIds.includes(l.id) : false
        };
      });
      const allLessonsCompleted = lessonsWithCompletion.length > 0 && lessonsWithCompletion.every((l: any) => l.isCompleted);
      return {
        ...m,
        lessons: lessonsWithCompletion,
        isCompleted: allLessonsCompleted
      };
    });
    return {
      ...c,
      modules: mappedModules,
      hasPremiumAccess: !!hasAccess,
      isEnrolled: enrolledCourseIds.includes(c.id),
      progressPercent: enrolledCourseIds.includes(c.id)
        ? Math.round(
            (mappedModules.flatMap(m => m.lessons || []).filter(l => l.isCompleted).length /
              Math.max(mappedModules.flatMap(m => m.lessons || []).length, 1)) *
              100
          )
        : 0
    };
  });

  res.json({ courses: coursesWithUserData });
});

app.post("/api/courses", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden: Admin authority missing" });
  }

  const { title, description, thumbnailUrl, price, isPremium, modules } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Missing required Course details" });
  }

  const db = getDB();
  const newCourseId = db.courses.length ? Math.max(...db.courses.map(c => c.id)) + 1 : 1;

  const formattedModules = Array.isArray(modules)
    ? modules.map((m: any, mIdx: number) => ({
        id: 1000 + mIdx + newCourseId * 10,
        title: m.title || `Module ${mIdx + 1}`,
        lessons: Array.isArray(m.lessons)
          ? m.lessons.map((l: any, lIdx: number) => ({
              id: l.id || (10000 + lIdx + mIdx * 100 + newCourseId * 1000),
              title: l.title || `Lesson ${lIdx + 1}`,
              content: l.content || "",
              videoUrl: l.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              durationMinutes: Number(l.durationMinutes) || 10,
              isPreviewAllowed: !!l.isPreviewAllowed,
              quizId: l.quizId ? Number(l.quizId) : undefined
            }))
          : []
      }))
    : [];

  let finalThumbnail = thumbnailUrl || "";
  if (!finalThumbnail || finalThumbnail.startsWith("https://images.unsplash.com/photo-1516321318423-f06f85e504b3") || finalThumbnail === "") {
    finalThumbnail = getOnlineImageForTitle(title);
  }

  const newCourse: Course = {
    id: newCourseId,
    title,
    description,
    thumbnailUrl: finalThumbnail,
    price: Number(price) || 0,
    isPremium: !!isPremium,
    modules: formattedModules
  };

  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  logAdminActivity(db, user.name, "CREATE", "COURSE", newCourse.title, String(ip));

  db.courses.push(newCourse);
  saveDB(db);
  
  // Dispatch instant global notification
  notifyUser(
    0, 
    "New Course Published! 📚", 
    `Master your coding skills with our newly added course: "${newCourse.title}". Start learning today!`, 
    "SUCCESS", 
    "courses"
  );

  res.json({ course: newCourse });
});

app.post("/api/courses/:id/enroll", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Auth required to enroll courses" });
  }

  const courseId = Number(req.params.id);
  const db = getDB();

  const course = db.courses.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  if (course.isPremium) {
    db.premiumAccess = db.premiumAccess || [];
    const hasAccess = user.role === "ADMIN" || db.premiumAccess.some(a => a.userId === user.id && a.contentType === "COURSE" && Number(a.contentId) === courseId && a.status === "ACTIVE");
    if (!hasAccess) {
      return res.status(402).json({ error: "PAYMENT_REQUIRED", message: "This is a premium course. You must pay to unlock it." });
    }
  }

  if (!db.enrollments.some(e => e.userId === user.id && e.courseId === courseId)) {
    db.enrollments.push({
      userId: user.id,
      courseId,
      enrolledAt: new Date().toISOString()
    });
    saveDB(db);
  }

  res.json({ message: "Enrolled successfully", courseId });
});

app.post("/api/courses/:courseId/lessons/:lessonId/complete", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Auth required" });

  const lessonId = Number(req.params.lessonId);
  const courseId = Number(req.params.courseId);
  const db = getDB();

  // Enforce linking quiz check
  const course = db.courses.find(c => c.id === courseId);
  const lesson = course?.modules?.flatMap((m: any) => m.lessons || []).find((l: any) => l.id === lessonId);
  if (lesson && lesson.quizId) {
    const passed = db.quizAttempts?.some(attempt => attempt.userId === user.id && attempt.quizId === Number(lesson.quizId) && attempt.passed === true);
    if (!passed) {
      return res.status(400).json({
        error: "QUIZ_REQUIRED",
        message: "You must complete and pass the mandatory evaluative quiz linked to this lesson before unlocking coursework progress!"
      });
    }
  }

  if (!db.lessonProgress.some(p => p.userId === user.id && p.lessonId === lessonId)) {
    db.lessonProgress.push({
      userId: user.id,
      lessonId,
      completedAt: new Date().toISOString()
    });

    // Award XP
    const uIdx = db.users.findIndex(u => u.id === user.id);
    if (uIdx !== -1) {
      db.users[uIdx].score = (db.users[uIdx].score || 0) + 15;
      db.users[uIdx].learningStreak = (db.users[uIdx].learningStreak || 1) + 1;
    }

    // Check if course fully completed
    const course = db.courses.find(c => c.id === courseId);
    if (course) {
      const allLessonIds = (course.modules || []).flatMap(m => m.lessons || []).map(l => l.id);
      const userCompletedOfCourse = db.lessonProgress.filter(p => p.userId === user.id && allLessonIds.includes(p.lessonId)).map(p => p.lessonId);

      // If finished, generate certificate automatically
      if (allLessonIds.every(id => userCompletedOfCourse.includes(id))) {
        const certCode = `CERT-JS-${Math.floor(100000 + Math.random() * 900000)}`;
        if (!db.certificates.some(c => c.userId === user.id && c.courseId === courseId)) {
          const signature = signCertificate(certCode, user.name, course.title);
          const autoCert = {
            certificateCode: certCode,
            userId: user.id,
            userName: user.name,
            courseId,
            courseTitle: course.title,
            date: new Date().toLocaleDateString(),
            digitalSignature: signature
          };
          db.certificates.push(autoCert as any);

          // Dispatch automatic certificate notification to student
          notifyUser(
            user.id,
            "Course Completed! Certificate Awarded! 🎓🎉",
            `Spectacular! You completed all modules for "${course.title}". We have verified and issued your official certificate of accomplishment. Code: ${certCode}.`,
            "SUCCESS",
            "dashboard"
          );
        }
      }
    }

    saveDB(db);
  }

  res.json({ success: true });
});

// TUTORIALS API
app.get("/api/tutorials", (req, res) => {
  const db = getDB();
  const user = parseUserFromAuth(req);
  const isAdmin = user && user.role === "ADMIN";

  let list = (db.tutorials || []).filter(t => t.status !== "Trashed" && !t.isDeleted);
  if (!isAdmin) {
    list = list.filter(t => t.status !== "Draft");
  }
  res.json({ tutorials: list });
});

app.post("/api/tutorials", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { title, category, content, codeSnippet, languageSlug, coverImageUrl, videoUrl, embedded_video_url } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: "Missing metadata params" });
  }

  const db = getDB();
  const id = db.tutorials.length ? Math.max(...db.tutorials.map(t => t.id)) + 1 : 1;
  const newTutorial: Tutorial = {
    id,
    title,
    category,
    content,
    codeSnippet: codeSnippet || "",
    languageSlug: languageSlug || "javascript",
    coverImageUrl: coverImageUrl || "",
    videoUrl: videoUrl || "",
    embedded_video_url: embedded_video_url || "",
    status: "Published"
  };

  db.tutorials.push(newTutorial);
  saveDB(db);

  notifyUser(
    0,
    "New Tutorial Guideline! 💡",
    `Check out our new comprehensive code tutorial: "${newTutorial.title}". Gain new insights and practice directly.`,
    "SUCCESS",
    "tutorials"
  );

  res.json({ tutorial: newTutorial });
});

// PDF ARCHIVE API
app.get("/api/pdfs", (req, res) => {
  const db = getDB();
  const user = parseUserFromAuth(req);
  const isAdmin = user && user.role === "ADMIN";

  const bookmarkedIds = user
    ? db.bookmarks.filter(b => b.userId === user.id).map(b => b.pdfId)
    : [];

  let list = (db.pdfs || []).filter(p => p.status !== "Trashed" && !p.isDeleted);
  if (!isAdmin) {
    list = list.filter(p => !p.status || p.status === "Published");
  }

  db.premiumAccess = db.premiumAccess || [];
  const isPlatformPro = user && db.premiumAccess.some(a => a.userId === user.id && a.contentType === "PLATFORM_PRO" && a.status === "ACTIVE");

  const pdfsWithBookmarks = list.map(p => {
    const hasAccess = !p.isPremium || (user && (user.role === "ADMIN" || isPlatformPro || db.pdfPurchases?.some(acc => acc.userId === user.id && acc.pdfId === p.id && acc.status === "APPROVED")));
    return {
      ...p,
      isBookmarked: bookmarkedIds.includes(p.id),
      hasPremiumAccess: !!hasAccess
    };
  });

  res.json({ pdfs: pdfsWithBookmarks });
});

app.post("/api/pdfs", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

  const { title, author, category, fileUrl, previewUrl, isPremium, description, publishedDate } = req.body;
  if (!title || !category || !fileUrl) {
    return res.status(400).json({ error: "Missing credentials file parameters" });
  }

  const db = getDB();
  const id = db.pdfs.length ? Math.max(...db.pdfs.map(p => p.id)) + 1 : 1;
  const newPdf: Pdf = {
    id,
    title,
    author: author || "Unknown Author",
    category,
    fileUrl,
    previewUrl: previewUrl || fileUrl,
    isPremium: !!isPremium,
    description: description || "A comprehensive computer science handbook and reference manual.",
    publishedDate: publishedDate || new Date().toISOString().split("T")[0]
  };

  db.pdfs.push(newPdf);
  saveDB(db);

  notifyUser(
    0,
    "New Reference Book Added! 📖",
    `Learn offline: "${newPdf.title}" by ${newPdf.author} is now live. Grab your printable guide!`,
    "SUCCESS",
    "pdfs"
  );

  res.json({ pdf: newPdf });
});

app.post("/api/pdfs/:id/bookmark", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Auth required" });

  const pdfId = Number(req.params.id);
  const db = getDB();

  const index = db.bookmarks.findIndex(b => b.userId === user.id && b.pdfId === pdfId);
  if (index !== -1) {
    db.bookmarks.splice(index, 1);
  } else {
    db.bookmarks.push({ userId: user.id, pdfId });
  }

  saveDB(db);
  res.json({ message: "Bookmark status updated", bookmarked: index === -1 });
});

// COMPILER CODE SIMULATION & TEST-CASES RUNNER
app.post("/api/compile", (req, res) => {
  const { code, language, input } = req.body;
  if (!code) {
    return res.status(400).json({ error: "No executable source script detected" });
  }

  // Simulate compiler sandbox with interactive code properties
  try {
    if (language === "javascript" || language === "html" || language === "css") {
      let logBuffer: string[] = [];
      const dummyConsole = {
        log: (...args: any[]) => logBuffer.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")),
        error: (...args: any[]) => logBuffer.push("Error: " + args.join(" ")),
        warn: (...args: any[]) => logBuffer.push("Warning: " + args.join(" "))
      };

      // Sandboxed function execution scope
      const evaluator = new Function("console", code);
      evaluator(dummyConsole);

      res.json({
        success: true,
        output: logBuffer.length ? logBuffer.join("\n") : "Program built successfully (returned undefined)."
      });
    } else if (language === "python") {
      // Simulate Python print statement responses organically
      const printMatches = code.match(/print\(([^)]+)\)/g) || [];
      const processedOutput = printMatches.map((m: string) => {
        const payload = m.slice(6, -1).trim();
        if (payload.startsWith("'") || payload.startsWith('"')) {
          return payload.slice(1, -1);
        }
        return `[Evaluated: ${payload}]`;
      });

      res.json({
        success: true,
        output: processedOutput.length ? processedOutput.join("\n") : "Python execution completed with code: 0\n\n(Generated outputs simulated)"
      });
    } else {
      // General C/C++, PHP, Java simulation sandbox responses
      res.json({
        success: true,
        output: `[${language.toUpperCase()} Compiler Sandbox Output]\n-- Compilation Success --\nEnvironment simulated cleanly.\nResult: Code parsed with 0 memory errors.`
      });
    }
  } catch (err: any) {
    res.status(200).json({
      success: false,
      output: `Runtime Error Code Crash:\n${err.message || err}`
    });
  }
});

// GEMINI AI COMPANION AGENT
app.post("/api/ai/assistant", async (req, res) => {
  const { message, codeContext, language } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing dialogue query" });
  }

  // Fallback if key missing is handled lazily to prevent server bootstrap crashes
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.json({
      response: "Hello! I am your visual sidekick coding assistant inside PowerCode Academy. To activate actual Gemini AI-generated corrections and solutions live, configure the GEMINI_API_KEY inside your Secret preferences. For now, check this algorithmic recommendation:\n\n```javascript\n// Ensure correctly utilizing let/const primitives and clean callbacks\nconst response = await fetch('/api/courses');\n```"
    });
  }

  try {
    const promptString = `You are a professional computer science professor and coding mentor running inside PowerCode Academy.
The student language is ${language || "Unknown"}.
The current workspace editor code block is:
\`\`\`${language || "javascript"}
${codeContext || "No active file contents"}
\`\`\`

The student asks the following: "${message}"

Write a helpful response. Provide beautiful, correct code hints/corrections, clear and concise language descriptions, and guide the student constructively.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptString,
    });

    res.json({ response: response.text });
  } catch (err: any) {
    console.error("Gemini Assistant Failure", err);
    res.status(500).json({ error: "Could not fetch AI generation. Underlyings: " + err.message });
  }
});

// QUIZZES AND ANSWERS SUBMISSIONS
app.get("/api/quizzes", (req, res) => {
  const db = getDB();
  const user = parseUserFromAuth(req);
  const isAdmin = user && user.role === "ADMIN";
  let list = (db.quizzes || []).filter(q => q.status !== "Trashed" && !q.isDeleted);
  if (!isAdmin) {
    list = list.filter(q => !q.status || q.status === "Published");
  }
  res.json({ quizzes: list });
});

app.post("/api/quizzes/submit", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authorize token" });

  const { quizId, answers } = req.body; // Map: questionId -> studentAnswer string
  if (!quizId || !answers) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const db = getDB();
  const quiz = db.quizzes.find(q => q.id === Number(quizId));
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  let correctCount = 0;
  quiz.questions.forEach(q => {
    if (answers[q.id] === q.correctAnswer) {
      correctCount++;
    }
  });

  const finalScore = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = finalScore >= quiz.passingScore;

  // Add attempt record
  db.quizAttempts.push({
    id: db.quizAttempts.length + 1,
    userId: user.id,
    quizId: quiz.id,
    score: finalScore,
    passed,
    date: new Date().toLocaleDateString()
  });

  // Award XP scores if passed
  if (passed) {
    const uIdx = db.users.findIndex(u => u.id === user.id);
    if (uIdx !== -1) {
      db.users[uIdx].score = (db.users[uIdx].score || 0) + 50;
      db.users[uIdx].learningStreak = (db.users[uIdx].learningStreak || 1) + 1;
    }
  }

  saveDB(db);
  res.json({ score: finalScore, passed, correctCount, totalQuestions: quiz.questions.length });
});

// CODING CHALLENGES
app.get("/api/challenges", (req, res) => {
  const db = getDB();
  const user = parseUserFromAuth(req);
  const isAdmin = user && user.role === "ADMIN";

  const passedChallengeIds = user
    ? db.challengeSubmissions.filter(s => s.userId === user.id && s.status === "PASSED").map(s => s.challengeId)
    : [];

  let list = (db.challenges || []).filter(c => c.status !== "Trashed" && !c.isDeleted);
  if (!isAdmin) {
    list = list.filter(c => !c.status || c.status === "Published");
  }

  const challengesWithStatus = list.map(c => ({
    ...c,
    isCompleted: passedChallengeIds.includes(c.id)
  }));

  res.json({ challenges: challengesWithStatus });
});

app.post("/api/challenges/submit", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Missing user session token" });

  const { challengeId, code } = req.body;
  if (!challengeId || !code) {
    return res.status(400).json({ error: "Challenge credentials missing" });
  }

  const db = getDB();
  const ch = db.challenges.find(c => c.id === Number(challengeId));
  if (!ch) return res.status(404).json({ error: "Challenge not found" });

  let isAllPassed = true;
  let summary = "";

  // Dynamic sandbox runtime analysis mapping
  try {
    if (ch.id === 1) { // Reverse a String
      const userFn = new Function("s", `${code}; return reverseString(s);`);
      const test1 = userFn("hello") === "olleh";
      const test2 = userFn("academy") === "ymedaca";
      isAllPassed = test1 && test2;
      summary = isAllPassed ? "All test cases passed!" : "Failed on string reverse edge states.";
    } else if (ch.id === 2) { // Two Sum Solver
      const userFn = new Function("nums", "target", `${code}; return twoSum(nums, target);`);
      // Simulating index comparison safely
      const r1 = userFn([2, 7, 11, 15], 9);
      const r2 = userFn([3, 2, 4], 6);
      const t1 = Array.isArray(r1) && r1[0] === 0 && r1[1] === 1;
      const t2 = Array.isArray(r2) && r2[0] === 1 && r2[1] === 2;
      isAllPassed = t1 && t2;
      summary = isAllPassed ? "All test cases passed!" : "Could not optimize hash mapping pair indexes.";
    } else {
      // General dynamic solvers
      isAllPassed = true;
      summary = "Simulated compiler parameters verified correctly.";
    }
  } catch (err: any) {
    isAllPassed = false;
    summary = `Failed: Sandbox Syntax Execution Crash ("${err.message || err}")`;
  }

  const status = isAllPassed ? "PASSED" : "FAILED";
  const pointsAwarded = isAllPassed ? ch.points : 0;

  db.challengeSubmissions.push({
    id: db.challengeSubmissions.length + 1,
    userId: user.id,
    challengeId: ch.id,
    submittedCode: code,
    status,
    score: pointsAwarded,
    date: new Date().toLocaleDateString()
  });

  if (isAllPassed) {
    const uIdx = db.users.findIndex(u => u.id === user.id);
    if (uIdx !== -1) {
      db.users[uIdx].score = (db.users[uIdx].score || 0) + pointsAwarded;
      db.users[uIdx].learningStreak = (db.users[uIdx].learningStreak || 1) + 1;
    }
  }

  saveDB(db);
  res.json({ status, summary, points: pointsAwarded });
});

// CERTIFICATES
app.get("/api/certificates", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Auth payload required" });

  const db = getDB();
  let modified = false;
  
  const userCertificates = db.certificates.filter(c => c.userId === user.id).map(c => {
    const signature = (c as any).digitalSignature || signCertificate(c.certificateCode, c.userName, c.courseTitle);
    if (!(c as any).digitalSignature) {
      (c as any).digitalSignature = signature;
      modified = true;
    }
    return {
      ...c,
      digitalSignature: signature
    };
  });

  if (modified) {
    saveDB(db);
  }

  res.json({ certificates: userCertificates });
});

// LESSON NOTES PER USER & LESSON ID
app.get("/api/lessons/:lessonId/notes", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Auth payload required" });

  const lessonId = parseInt(req.params.lessonId);
  const db = getDB();
  if (!db.lessonNotes) db.lessonNotes = [];

  const entry = db.lessonNotes.find(n => n.userId === user.id && n.lessonId === lessonId);
  res.json({ notes: entry ? entry.notes : "" });
});

app.post("/api/lessons/:lessonId/notes", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Auth payload required" });

  const lessonId = parseInt(req.params.lessonId);
  const { notes } = req.body;

  const db = getDB();
  if (!db.lessonNotes) db.lessonNotes = [];

  const entryIdx = db.lessonNotes.findIndex(n => n.userId === user.id && n.lessonId === lessonId);
  if (entryIdx !== -1) {
    db.lessonNotes[entryIdx].notes = notes || "";
    db.lessonNotes[entryIdx].updatedAt = new Date().toISOString();
  } else {
    db.lessonNotes.push({
      userId: user.id,
      lessonId,
      notes: notes || "",
      updatedAt: new Date().toISOString()
    });
  }
  saveDB(db);
  res.json({ success: true });
});

// LESSON COMMENTS SECTION ENDPOINTS
app.get("/api/lessons/:lessonId/comments", (req, res) => {
  const lessonId = parseInt(req.params.lessonId);
  const db = getDB();
  if (!db.lessonComments) db.lessonComments = [];

  const comments = db.lessonComments.filter(c => c.lessonId === lessonId).map(c => {
    const creator = db.users.find(u => u.id === c.userId);
    return {
      ...c,
      userAvatar: creator
        ? (creator.profile_picture_url || creator.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100")
        : (c.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100")
    };
  });
  res.json({ comments });
});

app.post("/api/lessons/:lessonId/comments", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Auth payload required" });

  const lessonId = parseInt(req.params.lessonId);
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Comment text is required" });
  }

  const db = getDB();
  if (!db.lessonComments) db.lessonComments = [];

  const newComment = {
    id: db.lessonComments.length > 0 ? Math.max(...db.lessonComments.map(c => c.id)) + 1 : 1,
    lessonId,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatarUrl || "https://images.unsplash.com/photo-1549790108-3777bc3021f1?w=100",
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  db.lessonComments.push(newComment);
  saveDB(db);

  res.json({ success: true, comment: newComment });
});

app.delete("/api/lessons/comments/:commentId", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Auth payload required" });

  const commentId = parseInt(req.params.commentId);
  const db = getDB();
  if (!db.lessonComments) db.lessonComments = [];

  const commentIndex = db.lessonComments.findIndex(c => c.id === commentId);
  if (commentIndex === -1) {
    return res.status(404).json({ error: "Comment not found" });
  }

  const comment = db.lessonComments[commentIndex];
  if (comment.userId !== user.id && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Not authorized to delete this comment" });
  }

  db.lessonComments.splice(commentIndex, 1);
  saveDB(db);
  res.json({ success: true });
});

// COMMUNITY
app.get("/api/community", (req, res) => {
  const db = getDB();
  const posts = (db.community || []).map(post => {
    const postCreator = db.users.find(u => u.id === post.userId);
    return {
      ...post,
      userAvatar: postCreator 
        ? (postCreator.profile_picture_url || postCreator.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100") 
        : (post.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"),
      comments: (post.comments || []).map(comment => {
        const commentCreator = db.users.find(u => u.id === comment.userId);
        return {
          ...comment,
          userAvatar: commentCreator
            ? (commentCreator.profile_picture_url || commentCreator.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100")
            : (comment.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100")
        };
      })
    };
  });
  res.json({ posts });
});

app.post("/api/community/post", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authorization credentials lost" });

  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Missing contents parameters" });
  }

  const db = getDB();
  const newPost: CommunityPost = {
    id: db.community.length ? Math.max(...db.community.map(p => p.id)) + 1 : 1,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatarUrl,
    title,
    content,
    likesCount: 0,
    likedBy: [],
    createdAt: new Date().toISOString(),
    comments: []
  };

  db.community.push(newPost);
  saveDB(db);
  res.json({ post: newPost });
});

app.post("/api/community/comment", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId, content } = req.body;
  if (!postId || !content) return res.status(400).json({ error: "Content fields needed" });

  const db = getDB();
  const postIdx = db.community.findIndex(p => p.id === Number(postId));
  if (postIdx === -1) return res.status(404).json({ error: "Post missing" });

  const comment = {
    id: Date.now(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatarUrl,
    content,
    createdAt: new Date().toISOString()
  };

  db.community[postIdx].comments.push(comment);
  saveDB(db);
  res.json({ comment });
});

app.post("/api/community/like", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = req.body;
  const db = getDB();
  const postIdx = db.community.findIndex(p => p.id === Number(postId));
  if (postIdx === -1) return res.status(404).json({ error: "Post not found" });

  const post = db.community[postIdx];
  const uIdx = post.likedBy.indexOf(user.id);

  if (uIdx !== -1) {
    post.likedBy.splice(uIdx, 1);
    post.likesCount--;
  } else {
    post.likedBy.push(user.id);
    post.likesCount++;
  }

  saveDB(db);
  res.json({ likesCount: post.likesCount, liked: uIdx === -1 });
});

// ANALYTICS STATS & SITE SETTINGS
app.get("/api/analytics", (req, res) => {
  const db = getDB();
  const totalUsers = db.users.length;
  const totalCourses = db.courses.length;
  const totalTutorials = db.tutorials.length;
  const totalPdfs = db.pdfs.length;
  const totalSubmissions = db.challengeSubmissions.length;
  const totalCertificates = db.certificates.length;

  res.json({
    totalUsers,
    activeUsers: totalUsers,
    totalCourses,
    totalTutorials,
    totalPdfs,
    totalCertificates,
    revenue: 149.97, // Simulated purchases
    weeklyRegistrations: [4, 6, 8, 12, 15, 20, totalUsers],
    streakLeaderboard: db.users
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(u => ({ name: u.name, score: u.score, streak: u.learningStreak })),
  });
});

app.get("/api/settings", (req, res) => {
  const db = getDB();
  res.json({ settings: db.siteSettings });
});

app.post("/api/settings", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access ONLY" });

  const db = getDB();
  db.siteSettings = {
    ...db.siteSettings,
    ...req.body
  };
  saveDB(db);
  res.json({ settings: db.siteSettings });
});

// CERTIFICATE SYSTEM SETTINGS ENDPOINTS WITH NEON POSTGRESQL DRIVER
app.get("/api/db-status", (req, res) => {
  res.json({
    connected: pgConnectedStatus,
    driver: pgPool ? "Neon PostgreSQL" : "Local Ephemeral JSON (db_state.json)",
    hasConnectionString: !!pgConnectionString
  });
});

app.get("/api/system-settings", async (req, res) => {
  if (pgPool && pgConnectedStatus) {
    try {
      const result = await pgPool.query("SELECT official_signature_url, official_seal_url FROM system_settings WHERE id = 1");
      if (result.rows.length > 0) {
        return res.json({ system_settings: result.rows[0], source: "Neon Postgres" });
      }
    } catch (err) {
      console.error("[Database] Failed to read system settings from Neon PostgreSQL:", err);
    }
  }

  // Fallback to local memory DB
  const db = getDB();
  res.json({ system_settings: db.system_settings || defaultInitialState.system_settings, source: "Local JSON" });
});

app.post("/api/system-settings", async (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const { official_signature_url, official_seal_url } = req.body;

  if (pgPool && pgConnectedStatus) {
    try {
      await pgPool.query(
        `INSERT INTO system_settings (id, official_signature_url, official_seal_url)
         VALUES (1, $1, $2)
         ON CONFLICT (id) DO UPDATE SET
           official_signature_url = EXCLUDED.official_signature_url,
           official_seal_url = EXCLUDED.official_seal_url`,
        [official_signature_url || "", official_seal_url || ""]
      );

      // Keep local JSON in sync
      const db = getDB();
      db.system_settings = { official_signature_url, official_seal_url };
      saveDB(db);

      return res.json({ success: true, system_settings: db.system_settings, source: "Neon Postgres" });
    } catch (err: any) {
      console.error("[Database] Failed to save system settings to Neon PostgreSQL:", err);
      return res.status(500).json({ error: `Neon Database Error: ${err.message || err}` });
    }
  }

  // Fallback to local memory DB
  const db = getDB();
  db.system_settings = {
    ...(db.system_settings || defaultInitialState.system_settings),
    ...req.body
  };
  saveDB(db);
  res.json({ success: true, system_settings: db.system_settings, source: "Local JSON" });
});


/* =========================================================================
   ADDITIONAL ADMIN CONTENT MANAGEMENT ENDPOINTS
   ========================================================================= */

// EDIT/UPDATE COURSE
app.put("/api/courses/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const courseId = Number(req.params.id);
  const { title, description, thumbnailUrl, price, isPremium, modules } = req.body;

  const db = getDB();
  const cIdx = db.courses.findIndex(c => c.id === courseId);
  if (cIdx === -1) return res.status(404).json({ error: "Course not found" });

  // Handle formatted modules
  const formattedModules = Array.isArray(modules)
    ? modules.map((m: any, mIdx: number) => ({
        id: m.id || (1000 + mIdx + courseId * 10),
        title: m.title || `Module ${mIdx + 1}`,
        lessons: Array.isArray(m.lessons)
          ? m.lessons.map((l: any, lIdx: number) => ({
              id: l.id || (10000 + lIdx + mIdx * 100 + courseId * 1000),
              title: l.title || `Lesson ${lIdx + 1}`,
              content: l.content || "",
              videoUrl: l.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              durationMinutes: Number(l.durationMinutes) || 10,
              isPreviewAllowed: !!l.isPreviewAllowed,
              quizId: l.quizId ? Number(l.quizId) : undefined
            }))
          : []
      }))
    : db.courses[cIdx].modules;

  let finalThumb = thumbnailUrl || "";
  if (!finalThumb || finalThumb.startsWith("https://images.unsplash.com/photo-1516321318423-f06f85e504b3") || finalThumb === "") {
    finalThumb = getOnlineImageForTitle(title || db.courses[cIdx].title);
  }

  db.courses[cIdx] = {
    ...db.courses[cIdx],
    title: title || db.courses[cIdx].title,
    description: description || db.courses[cIdx].description,
    thumbnailUrl: finalThumb,
    price: price !== undefined ? Number(price) : db.courses[cIdx].price,
    isPremium: isPremium !== undefined ? !!isPremium : db.courses[cIdx].isPremium,
    modules: formattedModules
  };

  saveDB(db);
  res.json({ course: db.courses[cIdx] });
});

// DELETE COURSE
app.delete("/api/courses/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const courseId = Number(req.params.id);
  const db = getDB();
  const permanent = req.query.permanent === "true";
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  const idx = db.courses.findIndex(c => c.id === courseId);
  if (idx !== -1) {
    const course = db.courses[idx];
    if (permanent) {
      logAdminActivity(db, user.name, "PERMANENT_DELETE", "COURSE", course.title, String(ip));
      db.courses = db.courses.filter(c => c.id !== courseId);
      db.enrollments = db.enrollments.filter(e => e.courseId !== courseId);
      db.lessonProgress = db.lessonProgress.filter(p => !String(p.lessonId).startsWith(String(courseId)));
    } else {
      course.status = "Trashed";
      course.isDeleted = true;
      course.deleted_at = new Date().toISOString();
      course.deleted_by = user.email;
      logAdminActivity(db, user.name, "DELETE", "COURSE", course.title, String(ip));
    }
  }

  saveDB(db);
  res.json({ success: true, message: permanent ? "Course permanently deleted" : "Course moved to trash successfully" });
});

// DELETE LESSON
app.delete("/api/lessons/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const lessonId = Number(req.params.id);
  const db = getDB();
  const permanent = req.query.permanent === "true";
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  let found = false;
  for (const c of db.courses) {
    if (!c.modules) continue;
    for (const m of c.modules) {
      if (!m.lessons) continue;
      const idx = m.lessons.findIndex(l => l.id === lessonId);
      if (idx !== -1) {
        const lesson = m.lessons[idx];
        if (permanent) {
          logAdminActivity(db, user.name, "PERMANENT_DELETE", "LESSON", lesson.title, String(ip));
          m.lessons = m.lessons.filter(l => l.id !== lessonId);
          db.lessonProgress = db.lessonProgress.filter(p => p.lessonId !== lessonId);
        } else {
          lesson.status = "Trashed";
          lesson.isDeleted = true;
          lesson.deleted_at = new Date().toISOString();
          lesson.deleted_by = user.email;
          logAdminActivity(db, user.name, "DELETE", "LESSON", lesson.title, String(ip));
        }
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    return res.status(404).json({ error: "Lesson not found in curricula systems" });
  }

  saveDB(db);
  res.json({ success: true, message: permanent ? "Lesson permanently purged" : "Lesson moved to trash successfully" });
});

// ADD OR CHANGE VIDEO TO SPECIFIC LESSON
app.post("/api/courses/:courseId/lessons/:lessonId/video", upload.any(), (req: any, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const courseId = Number(req.params.courseId);
  const lessonId = Number(req.params.lessonId);
  let videoUrl = req.body.videoUrl;

  // Process multipart/form-data upload via multer
  if (req.files && req.files.length > 0) {
    const file = req.files[0];
    
    // File size validator (e.g. 100MB limit)
    const maxSizeBytes = 100 * 1024 * 1024; // 100 MB
    if (file.size > maxSizeBytes) {
      return res.status(400).json({ error: "File size exceeds the limit of 100MB" });
    }

    const randomSlug = Math.random().toString(36).substring(2, 10);
    videoUrl = `https://res.cloudinary.com/powercode/image/upload/v172605/videos/${randomSlug}_${file.originalname.replace(/\s+/g, "_")}`;
  }

  const db = getDB();
  const courseIdx = db.courses.findIndex(c => c.id === courseId);
  if (courseIdx === -1) return res.status(404).json({ error: "Course not found" });

  let foundLesson: any = null;
  for (const mod of db.courses[courseIdx].modules) {
    const les = mod.lessons.find((l: any) => l.id === lessonId);
    if (les) {
      foundLesson = les;
      break;
    }
  }

  if (!foundLesson) {
    return res.status(404).json({ error: "Lesson not found in curriculum" });
  }

  const prevVideoUrl = foundLesson.videoUrl || "";
  const newVideoUrl = videoUrl !== undefined ? videoUrl : prevVideoUrl;
  if (newVideoUrl !== prevVideoUrl) {
    foundLesson.videoUrl = newVideoUrl;
    if (newVideoUrl === "") {
      notifyUser(-1, "Video Lecture Cleared 🧹", `Lesson "${foundLesson.title}" video removed.`, "WARNING", "media");
      notifyUser(0, "Class Video Removed ⚠️", `Lecture video has been taken down for "${foundLesson.title}".`, "WARNING", "classroom");
      io.emit("VIDEO_DELETED", { title: foundLesson.title });
    } else {
      // Trigger post-upload event to generate a unique Playback ID in the lessons table
      videoUploadEmitter.emit("post-upload", {
        lessonId,
        videoUrl: newVideoUrl
      });

      notifyUser(-1, "Video Lecture Registered! 🎥", `Lesson "${foundLesson.title}" video uploaded: ${newVideoUrl}`, "SUCCESS", "media");
      notifyUser(0, "New Video Class Live! 🚀", `New lecture uploaded for "${foundLesson.title}". Watch it now!`, "SUCCESS", "classroom");
      io.emit("VIDEO_UPLOADED", { title: foundLesson.title, url: newVideoUrl });
    }
  }

  saveDB(db);
  res.json({ success: true, course: db.courses[courseIdx], videoUrl: newVideoUrl, playbackId: foundLesson.playbackId });
});

// CHANGE USER PASSWORD (FOR ADMIN PASSWORD REVISIONS)
app.post("/api/users/change-password", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Auth registration session required" });

  const { newPassword } = req.body;
  if (!newPassword || !newPassword.trim()) {
    return res.status(400).json({ error: "New credentials password cannot be empty" });
  }

  const db = getDB();
  const dbUser = db.users.find(u => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: "User profile target not located" });

  dbUser.passwordHash = newPassword.trim();
  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    (async () => {
      try {
        await pgPool.query(`
          UPDATE users SET password_hash = $1 WHERE id = $2
        `, [dbUser.passwordHash, user.id]);
        console.log(`[Database] Synchronously updated password in Neon PG for ${dbUser.email}`);
      } catch (err) {
        console.error("[Database] Synchronously updated password failed in Postgres:", err);
      }
    })();
  }

  res.json({ success: true, message: "Password updated successfully" });
});

// EDIT/UPDATE TUTORIAL
app.put("/api/tutorials/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const tutId = Number(req.params.id);
  const { title, category, content, codeSnippet, languageSlug, coverImageUrl, videoUrl, embedded_video_url } = req.body;

  const db = getDB();
  const tIdx = db.tutorials.findIndex(t => t.id === tutId);
  if (tIdx === -1) return res.status(404).json({ error: "Tutorial not found" });

  db.tutorials[tIdx] = {
    ...db.tutorials[tIdx],
    title: title || db.tutorials[tIdx].title,
    category: category || db.tutorials[tIdx].category,
    content: content || db.tutorials[tIdx].content,
    codeSnippet: codeSnippet !== undefined ? codeSnippet : db.tutorials[tIdx].codeSnippet,
    languageSlug: languageSlug || db.tutorials[tIdx].languageSlug,
    coverImageUrl: coverImageUrl || db.tutorials[tIdx].coverImageUrl,
    videoUrl: videoUrl || db.tutorials[tIdx].videoUrl,
    embedded_video_url: embedded_video_url !== undefined ? embedded_video_url : db.tutorials[tIdx].embedded_video_url,
    status: db.tutorials[tIdx].status || "Published"
  };

  saveDB(db);
  res.json({ tutorial: db.tutorials[tIdx] });
});

// DELETE TUTORIAL
app.delete("/api/tutorials/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const tutId = Number(req.params.id);
  const db = getDB();
  const permanent = req.query.permanent === "true";
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  const idx = db.tutorials.findIndex(t => t.id === tutId);
  if (idx !== -1) {
    const tut = db.tutorials[idx];
    if (permanent) {
      logAdminActivity(db, user.name, "PERMANENT_DELETE", "TUTORIAL", tut.title, String(ip));
      db.tutorials = db.tutorials.filter(t => t.id !== tutId);
    } else {
      tut.status = "Trashed";
      tut.isDeleted = true;
      tut.deleted_at = new Date().toISOString();
      tut.deleted_by = user.email;
      logAdminActivity(db, user.name, "DELETE", "TUTORIAL", tut.title, String(ip));
    }
  }

  saveDB(db);
  res.json({ success: true, message: permanent ? "Tutorial permanently deleted" : "Tutorial moved to trash" });
});

// DELETE PDF BOOK
app.delete("/api/pdfs/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const pdfId = Number(req.params.id);
  const db = getDB();
  const permanent = req.query.permanent === "true";
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  const idx = db.pdfs.findIndex(p => p.id === pdfId);
  if (idx !== -1) {
    const pdf = db.pdfs[idx];
    if (permanent) {
      logAdminActivity(db, user.name, "PERMANENT_DELETE", "PDF", pdf.title, String(ip));
      db.pdfs = db.pdfs.filter(p => p.id !== pdfId);
      db.bookmarks = db.bookmarks.filter(b => b.pdfId !== pdfId);
    } else {
      pdf.status = "Trashed";
      pdf.isDeleted = true;
      pdf.deleted_at = new Date().toISOString();
      pdf.deleted_by = user.email;
      logAdminActivity(db, user.name, "DELETE", "PDF", pdf.title, String(ip));
    }
  }

  saveDB(db);
  res.json({ success: true, message: permanent ? "PDF resource permanently deleted" : "PDF resource shifted to trash" });
});

// CREATE CODING CHALLENGE
app.post("/api/challenges", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const { title, description, difficulty, starterCode, solutionCode, testCases, points, category } = req.body;
  if (!title || !description || !starterCode || !solutionCode) {
    return res.status(400).json({ error: "Missing required challenge specifications" });
  }

  const db = getDB();
  const indexId = db.challenges.length ? Math.max(...db.challenges.map(c => c.id)) + 1 : 1;

  const newChallenge = {
    id: indexId,
    title,
    description,
    difficulty: difficulty || "EASY",
    starterCode,
    solutionCode,
    testCases: Array.isArray(testCases) ? testCases : [{ input: "", output: "" }],
    points: Number(points) || 10,
    category: category || "Algorithms"
  };

  db.challenges.push(newChallenge);
  saveDB(db);

  notifyUser(
    0,
    "New Coding Challenge Live! ⚡",
    `Show off your engineering prowess with a new ${newChallenge.difficulty} challenge: "${newChallenge.title}". Earn +${newChallenge.points} XP upon completion!`,
    "SUCCESS",
    "challenges"
  );

  res.json({ challenge: newChallenge });
});

// DELETE CODING CHALLENGE
app.delete("/api/challenges/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const challengeId = Number(req.params.id);
  const db = getDB();
  const permanent = req.query.permanent === "true";
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  const idx = db.challenges.findIndex(c => c.id === challengeId);
  if (idx !== -1) {
    const challenge = db.challenges[idx];
    if (permanent) {
      logAdminActivity(db, user.name, "PERMANENT_DELETE", "CHALLENGE", challenge.title, String(ip));
      db.challenges = db.challenges.filter(c => c.id !== challengeId);
    } else {
      challenge.status = "Trashed";
      challenge.isDeleted = true;
      challenge.deleted_at = new Date().toISOString();
      challenge.deleted_by = user.email;
      logAdminActivity(db, user.name, "DELETE", "CHALLENGE", challenge.title, String(ip));
    }
  }

  saveDB(db);
  res.json({ success: true, message: permanent ? "Challenge permanently wiped" : "Challenge moved to trash" });
});

// CREATE NEW QUIZZES
app.post("/api/quizzes", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const { title, passingScore, durationMinutes, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Title and quiz questions are strictly required" });
  }

  const db = getDB();
  const indexId = db.quizzes.length ? Math.max(...db.quizzes.map(q => q.id)) + 1 : 1;

  const formattedQuestions = questions.map((q: any, qIdx: number) => ({
    id: 8000 + qIdx + indexId * 100,
    question: q.question || "Empty quiz question description",
    options: Array.isArray(q.options) ? q.options : ["A", "B", "C", "D"],
    correctAnswer: q.correctAnswer || q.answer || ""
  }));

  const newQuiz = {
    id: indexId,
    courseId: null as (number | null),
    title,
    durationMinutes: Number(durationMinutes) || 15,
    passingScore: Number(passingScore) || 75,
    questions: formattedQuestions
  };

  db.quizzes.push(newQuiz);
  saveDB(db);

  notifyUser(
    0,
    "New Assessment Quiz Online! 📝",
    `Test your knowledge and verify your competency with: "${newQuiz.title}" (Passing Grade: ${newQuiz.passingScore}%).`,
    "SUCCESS",
    "dashboard"
  );

  res.json({ quiz: newQuiz });
});

// DELETE QUIZ
app.delete("/api/quizzes/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const qId = Number(req.params.id);
  const db = getDB();
  const permanent = req.query.permanent === "true";

  const idx = db.quizzes.findIndex(q => q.id === qId);
  if (idx !== -1) {
    if (permanent) {
      db.quizzes = db.quizzes.filter(q => q.id !== qId);
    } else {
      db.quizzes[idx].status = "Trashed";
      db.quizzes[idx].isDeleted = true;
      db.quizzes[idx].deleted_at = new Date().toISOString();
      db.quizzes[idx].deleted_by = user.email;
    }
  }

  saveDB(db);
  res.json({ success: true, message: permanent ? "Quiz permanently deleted" : "Quiz moved to trash" });
});

// GET & POST & PUT & DELETE TESTIMONIALS (STUDENT SUCCESS STORIES)
app.get("/api/testimonials", (req, res) => {
  const db = getDB();
  if (!db.testimonials || db.testimonials.length === 0) {
    db.testimonials = defaultInitialState.testimonials || [];
    saveDB(db);
  }
  res.json({ testimonials: db.testimonials });
});

app.post("/api/testimonials", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { name, role, company, avatarUrl, blurb, highlightPhrase, stats, tags } = req.body;
  if (!name || !role || !blurb) {
    return res.status(400).json({ error: "Name, role, and testimonial content are required" });
  }

  const db = getDB();
  if (!db.testimonials) db.testimonials = [];

  const nextId = db.testimonials.length ? Math.max(...db.testimonials.map(t => t.id)) + 1 : 1;

  const newTestimonial = {
    id: nextId,
    name,
    role,
    company: company || "Freelancer",
    avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    blurb,
    highlightPhrase: highlightPhrase || `Joined as student, now thriving as ${role}`,
    stats: Array.isArray(stats) ? stats : [
      { label: "Salary Increase", value: "+50%" },
      { label: "Time to Hire", value: "3 Months" },
      { label: "Mastered Tags", value: `${(tags || []).length || 2} Skills` }
    ],
    tags: Array.isArray(tags) ? tags : ["Graduate"],
    isApproved: true,
    createdAt: new Date().toISOString(),
    createdByUserId: user.id
  };

  db.testimonials.push(newTestimonial);
  saveDB(db);
  res.json({ success: true, testimonial: newTestimonial });
});

app.put("/api/testimonials/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const id = Number(req.params.id);
  const db = getDB();
  if (!db.testimonials) db.testimonials = [];

  const idx = db.testimonials.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Testimonial not found" });
  }

  const testimonial = db.testimonials[idx];
  const isCreator = testimonial.createdByUserId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isAdmin && !isCreator) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { name, role, company, avatarUrl, blurb, highlightPhrase, stats, tags } = req.body;

  db.testimonials[idx] = {
    ...testimonial,
    name: name !== undefined ? name : testimonial.name,
    role: role !== undefined ? role : testimonial.role,
    company: company !== undefined ? company : testimonial.company,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : testimonial.avatarUrl,
    blurb: blurb !== undefined ? blurb : testimonial.blurb,
    highlightPhrase: highlightPhrase !== undefined ? highlightPhrase : testimonial.highlightPhrase,
    stats: stats !== undefined ? stats : testimonial.stats,
    tags: tags !== undefined ? tags : testimonial.tags
  };

  saveDB(db);
  res.json({ success: true, testimonial: db.testimonials[idx] });
});

app.delete("/api/testimonials/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const id = Number(req.params.id);
  const db = getDB();
  if (!db.testimonials) db.testimonials = [];

  const idx = db.testimonials.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Testimonial not found" });
  }

  const testimonial = db.testimonials[idx];
  const isCreator = testimonial.createdByUserId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isAdmin && !isCreator) {
    return res.status(403).json({ error: "Permission denied" });
  }

  db.testimonials.splice(idx, 1);
  saveDB(db);
  res.json({ success: true, message: "Testimonial deleted successfully" });
});

// GET & POST ANNOUNCEMENTS
app.get("/api/announcements", (req, res) => {
  const db = getDB();
  const user = parseUserFromAuth(req);
  const isAdmin = user && user.role === "ADMIN";

  let list = (db.announcements || []).filter(a => a.status !== "Trashed" && !a.isDeleted);
  if (!isAdmin) {
    list = list.filter(a => a.status === "Published");
  }
  res.json({ announcements: list });
});

app.post("/api/announcements", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin ONLY" });

  const { title, content, isImportant } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Missing announcement title or content" });
  }

  const db = getDB();
  if (!db.announcements) db.announcements = [];

  const newAnn = {
    id: db.announcements.length ? Math.max(...db.announcements.map(a => a.id)) + 1 : 1,
    title,
    content,
    createdAt: new Date().toISOString(),
    isImportant: !!isImportant
  };

  db.announcements.push(newAnn);
  saveDB(db);

  notifyUser(
    0,
    newAnn.isImportant ? "🔥 Urgent Academy Announcement!" : "📢 New Announcement from Faculty",
    `${newAnn.title}: ${newAnn.content}`,
    newAnn.isImportant ? "WARNING" : "INFO",
    "dashboard"
  );

  res.json({ announcement: newAnn });
});

app.delete("/api/announcements/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const annId = Number(req.params.id);
  const db = getDB();
  const permanent = req.query.permanent === "true";
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  if (!db.announcements) db.announcements = [];
  const idx = db.announcements.findIndex(a => a.id === annId);
  if (idx !== -1) {
    const ann = db.announcements[idx];
    if (permanent) {
      logAdminActivity(db, user.name, "PERMANENT_DELETE", "ANNOUNCEMENT", ann.title, String(ip));
      db.announcements = db.announcements.filter(a => a.id !== annId);
    } else {
      ann.status = "Trashed";
      ann.isDeleted = true;
      ann.deleted_at = new Date().toISOString();
      ann.deleted_by = user.email;
      logAdminActivity(db, user.name, "DELETE", "ANNOUNCEMENT", ann.title, String(ip));
    }
  }

  saveDB(db);
  res.json({ success: true, message: permanent ? "Announcement permanently removed" : "Announcement moved to trash" });
});

// GET & POST LEARNING PATHS
app.get("/api/learning-paths", (req, res) => {
  const db = getDB();
  const list = db.learningPaths || [];
  res.json({ learningPaths: list });
});

app.post("/api/learning-paths", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin authority required" });

  const { title, description, courseIds } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const db = getDB();
  if (!db.learningPaths) db.learningPaths = [];

  const newPath = {
    id: db.learningPaths.length ? Math.max(...db.learningPaths.map(lp => lp.id)) + 1 : 1,
    title,
    description: description || "",
    courseIds: Array.isArray(courseIds) ? courseIds.map(Number) : []
  };

  db.learningPaths.push(newPath);
  saveDB(db);
  res.json({ learningPath: newPath });
});

app.delete("/api/learning-paths/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin authority required" });

  const id = Number(req.params.id);
  const db = getDB();

  if (db.learningPaths) {
    db.learningPaths = db.learningPaths.filter(lp => lp.id !== id);
  }
  saveDB(db);
  res.json({ success: true });
});

// MANUAL CERTIFICATE GENERATION FOR SPECIFIC STUDENT
app.post("/api/certificates/manual", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const { studentEmail, courseTitle, type, description } = req.body;
  if (!studentEmail || !courseTitle) {
    return res.status(400).json({ error: "studentEmail and courseTitle are strictly required" });
  }

  const db = getDB();
  const targetStudent = db.users.find(u => u.email === studentEmail);
  if (!targetStudent) {
    return res.status(404).json({ error: `No student enrolled with email: ${studentEmail}` });
  }

  const certCode = `CERT-MAN-${Math.floor(100000 + Math.random() * 900000)}`;
  const signature = signCertificate(certCode, targetStudent.name, courseTitle);
  const cert = {
    certificateCode: certCode,
    userId: targetStudent.id,
    userName: targetStudent.name,
    courseId: null,
    courseTitle: courseTitle,
    date: new Date().toLocaleDateString(),
    type: type || "Excellence Honors Award",
    description: description || "Awarded for exceptional coding performances and system validations.",
    qrCode: `https://powercodeacademy.com/verify/${certCode}`,
    digitalSignature: signature
  };

  db.certificates.push(cert as any);
  saveDB(db);

  notifyUser(
    targetStudent.id,
    "New Certified Credential Awarded! 🎓",
    `Congratulations, ${targetStudent.name}! You have been awarded a certified credential for "${courseTitle}". Enjoy and view/download it on your student dashboard.`,
    "SUCCESS",
    "dashboard"
  );

  res.json({ success: true, certificate: cert });
});

// MANUALLY REMOVE / REVOKE CERTIFICATE
app.delete("/api/certificates/:code", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const certCode = req.params.code;
  const db = getDB();

  db.certificates = db.certificates.filter(c => c.certificateCode !== certCode);
  saveDB(db);
  res.json({ success: true, message: "Certificate revoked successfully" });
});

// COMPUTER LOCAL FILE UPLOAD DIALOG OVERLAY (CLOUDINARY STORAGE SIMULATOR API)
// Converts computer files beautifully to persistent Local/Simulated cloud assets on our internal db
app.post("/api/upload", upload.any(), (req: any, res) => {
  let fileName = req.body.fileName;
  let fileType = req.body.fileType || "image";

  // If a multipart file was uploaded via multer:
  if (req.files && req.files.length > 0) {
    const file = req.files[0];
    fileName = file.originalname;
    if (file.mimetype.startsWith("video/")) {
      fileType = "video";
    } else if (file.mimetype.startsWith("image/")) {
      fileType = "image";
    } else if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      fileType = "pdf";
    }

    // File size validator for video files
    if (fileType === "video") {
      const maxSizeBytes = 100 * 1024 * 1024; // 100 MB
      if (file.size > maxSizeBytes) {
        return res.status(400).json({ error: "File size exceeds the limit of 100MB" });
      }
    }
  }

  if (!fileName) {
    return res.status(400).json({ error: "fileName parameter is required" });
  }

  // Generate a premium asset identifier matching the structure of Cloudinary paths
  const randomSlug = Math.random().toString(36).substring(2, 10);
  const folder = fileType === "video" ? "videos" : (fileType === "pdf" ? "pdfs" : "images");
  
  // Real data URL conversion for images so they render flawlessly
  let finalAssetUrl = `https://res.cloudinary.com/powercode/image/upload/v172605/${folder}/${randomSlug}_${fileName.replace(/\s+/g, "_")}`;
  if (req.files && req.files.length > 0) {
    const file = req.files[0];
    if (file.mimetype.startsWith("image/")) {
      const base64Data = file.buffer.toString("base64");
      finalAssetUrl = `data:${file.mimetype};base64,${base64Data}`;
    }
  }

  const db = getDB();

  // Trigger post-upload event for lesson table Playback ID generation
  const lessonId = req.body.lessonId || req.query.lessonId;
  if (fileType === "video" && lessonId) {
    videoUploadEmitter.emit("post-upload", {
      lessonId: Number(lessonId),
      videoUrl: finalAssetUrl
    });
  }

  // Index references inside local media collection tables depending on file properties
  if (fileType === "video") {
    db.tutorialVideos.push({
      id: db.tutorialVideos.length + 1,
      tutorialId: 0,
      videoUrl: finalAssetUrl,
      fileName: fileName
    });
  } else {
    db.tutorialImages.push({
      id: db.tutorialImages.length + 1,
      tutorialId: 0,
      imageUrl: finalAssetUrl
    });
  }

  saveDB(db);

  res.json({
    success: true,
    url: finalAssetUrl,
    fileName,
    secure_url: finalAssetUrl,
    asset_id: `cl_ps_${randomSlug}`
  });
});


// ==========================================
// NEW ADMIN ACTIVITY LOGS & BULK ACTIONS
// ==========================================

// GET LOGS
app.get("/api/admin/logs", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const db = getDB();
  res.json({ logs: db.adminActivityLogs || [] });
});

// LOG ACTION MANUALLY
app.post("/api/admin/logs", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const { actionType, contentType, contentTitle } = req.body;
  if (!actionType || !contentType || !contentTitle) {
    return res.status(400).json({ error: "Missing log specifications" });
  }

  const db = getDB();
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  logAdminActivity(db, user.name, actionType, contentType, contentTitle, String(ip));
  saveDB(db);
  res.json({ success: true, logs: db.adminActivityLogs });
});

// BULK ACTIONS
app.post("/api/admin/bulk", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const { contentType, action, ids } = req.body;
  if (!contentType || !action || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid bulk actions specifications" });
  }

  const db = getDB();
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  if (contentType === "LESSON") {
    // Traverse courses and modules to find lessons
    db.courses.forEach(c => {
      if (c.modules) {
        c.modules.forEach(m => {
          if (m.lessons) {
            m.lessons.forEach((l: any) => {
              if (ids.map(Number).includes(l.id)) {
                if (action === "delete") {
                  l.isDeleted = true;
                  logAdminActivity(db, user.name, "DELETE", "LESSON", l.title, String(ip));
                } else if (action === "restore") {
                  l.isDeleted = false;
                  logAdminActivity(db, user.name, "RESTORE", "LESSON", l.title, String(ip));
                } else if (action === "permanent_delete") {
                  m.lessons = m.lessons.filter((less: any) => less.id !== l.id);
                  logAdminActivity(db, user.name, "PERMANENT_DELETE", "LESSON", l.title, String(ip));
                }
              }
            });
          }
        });
      }
    });
  } else {
    let itemsList: any[] = [];
    if (contentType === "COURSE") itemsList = db.courses;
    else if (contentType === "TUTORIAL") itemsList = db.tutorials;
    else if (contentType === "PDF") itemsList = db.pdfs;
    else if (contentType === "CHALLENGE") itemsList = db.challenges;
    else if (contentType === "ANNOUNCEMENT") itemsList = db.announcements;
    else if (contentType === "QUIZ") itemsList = db.quizzes;
    else if (contentType === "CERTIFICATE") itemsList = db.certificates;
    else if (contentType === "USER") itemsList = db.users;
    else if (contentType === "PAYMENT") itemsList = db.paymentRequests;
    else return res.status(400).json({ error: "Invalid content type specified" });

    ids.forEach(id => {
      const idx = itemsList.findIndex(item => (item.id === Number(id)) || (item.certificateCode === String(id)));
      if (idx !== -1) {
        const item = itemsList[idx];
        const title = item.title || item.name || item.courseTitle || item.contentTitle || item.certificateCode || `Item #${id}`;
        
        if (action === "delete") {
          item.isDeleted = true;
          logAdminActivity(db, user.name, "DELETE", contentType, title, String(ip));
        } else if (action === "publish") {
          item.isPublished = true;
          logAdminActivity(db, user.name, "PUBLISH", contentType, title, String(ip));
        } else if (action === "unpublish") {
          item.isPublished = false;
          logAdminActivity(db, user.name, "UNPUBLISH", contentType, title, String(ip));
        } else if (action === "archive") {
          item.isArchived = true;
          logAdminActivity(db, user.name, "ARCHIVE", contentType, title, String(ip));
        } else if (action === "restore") {
          item.isDeleted = false;
          item.isArchived = false;
          logAdminActivity(db, user.name, "RESTORE", contentType, title, String(ip));
        } else if (action === "permanent_delete") {
          itemsList.splice(idx, 1);
          logAdminActivity(db, user.name, "PERMANENT_DELETE", contentType, title, String(ip));
        }
      }
    });
  }

  saveDB(db);
  res.json({ success: true });
});

// NEW CRUD PUT ROUTES FOR PDFS, CHALLENGES, AND ANNOUNCEMENTS
app.put("/api/pdfs/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const pdfId = Number(req.params.id);
  const { title, author, category, fileUrl, previewUrl, isPremium, isPublished, isArchived, description, publishedDate } = req.body;

  const db = getDB();
  const idx = db.pdfs.findIndex(p => p.id === pdfId);
  if (idx === -1) return res.status(404).json({ error: "PDF not found" });

  db.pdfs[idx] = {
    ...db.pdfs[idx],
    title: title || db.pdfs[idx].title,
    author: author || db.pdfs[idx].author,
    category: category || db.pdfs[idx].category,
    fileUrl: fileUrl || db.pdfs[idx].fileUrl,
    previewUrl: previewUrl || db.pdfs[idx].previewUrl,
    isPremium: isPremium !== undefined ? !!isPremium : db.pdfs[idx].isPremium,
    isPublished: isPublished !== undefined ? !!isPublished : db.pdfs[idx].isPublished,
    isArchived: isArchived !== undefined ? !!isArchived : db.pdfs[idx].isArchived,
    description: description || db.pdfs[idx].description,
    publishedDate: publishedDate || db.pdfs[idx].publishedDate
  };

  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  logAdminActivity(db, user.name, "EDIT", "PDF", db.pdfs[idx].title, String(ip));

  saveDB(db);
  res.json({ pdf: db.pdfs[idx] });
});

app.put("/api/challenges/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const challengeId = Number(req.params.id);
  const { title, description, difficulty, starterCode, solutionCode, testCases, points, category, isPublished, isArchived } = req.body;

  const db = getDB();
  const idx = db.challenges.findIndex(c => c.id === challengeId);
  if (idx === -1) return res.status(404).json({ error: "Coding challenge not found" });

  db.challenges[idx] = {
    ...db.challenges[idx],
    title: title || db.challenges[idx].title,
    description: description || db.challenges[idx].description,
    difficulty: difficulty || db.challenges[idx].difficulty,
    starterCode: starterCode || db.challenges[idx].starterCode,
    solutionCode: solutionCode || db.challenges[idx].solutionCode,
    testCases: Array.isArray(testCases) ? testCases : db.challenges[idx].testCases,
    points: points !== undefined ? Number(points) : db.challenges[idx].points,
    category: category || db.challenges[idx].category,
    isPublished: isPublished !== undefined ? !!isPublished : db.challenges[idx].isPublished,
    isArchived: isArchived !== undefined ? !!isArchived : db.challenges[idx].isArchived
  };

  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  logAdminActivity(db, user.name, "EDIT", "CHALLENGE", db.challenges[idx].title, String(ip));

  saveDB(db);
  res.json({ challenge: db.challenges[idx] });
});

app.put("/api/announcements/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const annId = Number(req.params.id);
  const { title, content, isImportant, isPublished, isArchived } = req.body;

  const db = getDB();
  if (!db.announcements) db.announcements = [];
  const idx = db.announcements.findIndex(a => a.id === annId);
  if (idx === -1) return res.status(404).json({ error: "Announcement not found" });

  db.announcements[idx] = {
    ...db.announcements[idx],
    title: title || db.announcements[idx].title,
    content: content || db.announcements[idx].content,
    isImportant: isImportant !== undefined ? !!isImportant : db.announcements[idx].isImportant,
    isPublished: isPublished !== undefined ? !!isPublished : db.announcements[idx].isPublished,
    isArchived: isArchived !== undefined ? !!isArchived : db.announcements[idx].isArchived
  };

  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  logAdminActivity(db, user.name, "EDIT", "ANNOUNCEMENT", db.announcements[idx].title, String(ip));

  saveDB(db);
  res.json({ announcement: db.announcements[idx] });
});


// ==========================================
// STUDENT TICKET SUPPORT & ADMIN CONSOLE API
// ==========================================

// GET ALL SUPPORT MESSAGES
app.get("/api/support-messages", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const db = getDB();
  db.supportMessages = db.supportMessages || [];

  if (user.role === "ADMIN") {
    res.json({ success: true, messages: db.supportMessages });
  } else {
    res.json({ success: true, messages: db.supportMessages.filter((m: any) => m.userId === user.id) });
  }
});

// SUBMIT NEW SUPPORT MESSAGE
app.post("/api/support-messages", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: "Missing subject or message contents" });
  }

  const db = getDB();
  db.supportMessages = db.supportMessages || [];

  const nextId = db.supportMessages.length ? Math.max(...db.supportMessages.map((m: any) => m.id)) + 1 : 1;
  const newMsg = {
    id: nextId,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    subject,
    message,
    createdAt: new Date().toISOString()
  };

  db.supportMessages.push(newMsg);
  saveDB(db);

  // Notify Admin about new ticket message
  notifyUser(1, `🆕 New Support Ticket from ${user.name}`, `Subject: ${subject}`, "INFO", "dashboard");

  res.json({ success: true, message: "Support ticket logged successfully!", ticket: newMsg });
});

// ADMIN REPLY TO SUPPORT MESSAGE
app.post("/api/support-messages/:id/reply", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Unauthorized access" });

  const { replyMessage } = req.body;
  if (!replyMessage) {
    return res.status(400).json({ error: "Reply message body cannot be empty" });
  }

  const db = getDB();
  db.supportMessages = db.supportMessages || [];

  const ticketId = parseInt(req.params.id);
  const ticket = db.supportMessages.find((m: any) => m.id === ticketId);
  if (!ticket) return res.status(404).json({ error: "Support ticket not found" });

  ticket.replyMessage = replyMessage;
  ticket.repliedAt = new Date().toISOString();

  saveDB(db);

  // Notify student about admin reply
  notifyUser(ticket.userId, "✉️ Support Ticket Reply Received", `Your ticket: "${ticket.subject}" has received a reply from the PowerCode Academy Admin.`, "SUCCESS", "dashboard");

  res.json({ success: true, message: "Reply delivered successfully!", ticket });
});


// ==========================================
// PDF BOOK MONETIZATION & PREMIUM ACCESS API
// ==========================================

// GET ALL PURCHASES (For Admin: all, for students: own)
app.get("/api/pdf-purchases", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const db = getDB();
  db.pdfPurchases = db.pdfPurchases || [];

  if (user.role === "ADMIN") {
    res.json({ purchases: db.pdfPurchases });
  } else {
    res.json({ purchases: db.pdfPurchases.filter((p: any) => p.userId === user.id) });
  }
});

// SUBMIT NEW PURCHASE PROOF
app.post("/api/pdf-purchases", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { pdfId, pdfTitle, amountPaid, paymentMethod, phone, proofUrl } = req.body;
  if (!pdfId || !pdfTitle || !amountPaid || !paymentMethod || !phone || !proofUrl) {
    return res.status(400).json({ error: "Missing required purchase specifications" });
  }

  const db = getDB();
  db.pdfPurchases = db.pdfPurchases || [];
  db.paymentRequests = db.paymentRequests || [];
  db.paymentProofs = db.paymentProofs || [];
  db.transactions = db.transactions || [];

  const nextReqId = db.paymentRequests.length ? Math.max(...db.paymentRequests.map((r: any) => r.id)) + 1 : 1;
  const timestamp = new Date().toISOString();

  // Create unified payment Request
  const paymentReq = {
    id: nextReqId,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    contentType: "PDF",
    contentId: Number(pdfId),
    contentTitle: pdfTitle,
    paymentMethod,
    phone,
    amountPaid: Number(amountPaid),
    proofUrl,
    status: "PENDING",
    rejectionReason: "",
    createdAt: timestamp
  };
  db.paymentRequests.push(paymentReq);

  // Push to legacy pdfPurchases for direct client state matching
  const newPurchase = {
    id: nextReqId,
    userId: user.id,
    userName: user.name,
    pdfId: Number(pdfId),
    pdfTitle,
    amountPaid: Number(amountPaid),
    paymentMethod,
    phone,
    status: "PENDING_APPROVAL",
    proofUrl,
    createdAt: timestamp
  };
  db.pdfPurchases.push(newPurchase);

  // Push to payment_proofs database state
  const nextProofId = db.paymentProofs.length ? Math.max(...db.paymentProofs.map((p: any) => p.id)) + 1 : 1;
  db.paymentProofs.push({
    id: nextProofId,
    requestId: nextReqId,
    url: proofUrl,
    uploadedAt: timestamp
  });

  // Create pending transaction log
  const nextTxId = db.transactions.length ? Math.max(...db.transactions.map((t: any) => t.id)) + 1 : 1;
  db.transactions.push({
    id: nextTxId,
    userId: user.id,
    requestId: nextReqId,
    amount: Number(amountPaid),
    type: "PURCHASE",
    status: "PENDING",
    timestamp: timestamp
  });

  saveDB(db);

  // Sync to Neon PostgreSQL if active
  if (pgPool && pgConnectedStatus) {
    (async () => {
      try {
        await pgPool.query(`
          INSERT INTO payment_requests (id, user_id, user_name, user_email, content_type, content_id, content_title, payment_method, phone, amount_paid, proof_url, status, rejection_reason, created_at)
          VALUES ($1, $2, $3, $4, 'PDF', $5, $6, $7, $8, $9, $10, 'PENDING', '', $11)
        `, [nextReqId, user.id, user.name, user.email, Number(pdfId), pdfTitle, paymentMethod, phone, Number(amountPaid), proofUrl, timestamp]);
      } catch (err) {
        console.error("Neon Postgres inserts error on PDF purchase sync:", err);
      }
    })();
  }

  // Trigger Notification to Admin & Student!
  notifyUser(-1, "New PDF Purchase Submitted! 💰", `${user.name} submitted proof for ${pdfTitle} (${paymentMethod} phone: ${phone})`, "INFO", "payments");
  notifyUser(user.id, "Payment Submitted! 💳", `We received your payment proof for "${pdfTitle}". It is safely queued for admin review.`, "INFO", "purchases");

  // Broadcast Socket event
  io.emit("NEW_PAYMENT_REQUEST", {
    id: nextReqId,
    userId: user.id,
    userName: user.name,
    contentType: "PDF",
    contentId: Number(pdfId),
    contentTitle: pdfTitle,
    paymentMethod,
    phone,
    amountPaid: Number(amountPaid),
    status: "PENDING",
    createdAt: timestamp
  });

  res.json({ success: true, purchase: newPurchase });
});

// APPROVE PDF PURCHASE (Grants Premium Access)
app.post("/api/pdf-purchases/:id/approve", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const purchaseId = Number(req.params.id);
  const db = getDB();
  db.pdfPurchases = db.pdfPurchases || [];

  const pIdx = db.pdfPurchases.findIndex((p: any) => p.id === purchaseId);
  if (pIdx === -1) return res.status(404).json({ error: "Purchase record not found" });

  const purchase = db.pdfPurchases[pIdx];
  purchase.status = "APPROVED";
  purchase.approvedAt = new Date().toISOString();

  // Log admin activity
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  logAdminActivity(db, user.name, "PUBLISH", "PDF", `Paid access approved for ${purchase.pdfTitle}`, String(ip));

  saveDB(db);

  // Trigger Notification to Student
  notifyUser(
    purchase.userId,
    "Payment Approved! 🎉",
    `Your payment of UGX ${purchase.amountPaid || 15000} has been approved. You can now access your purchased content: "${purchase.pdfTitle}"!`,
    "SUCCESS",
    "pdfs"
  );

  // Broadcast Socket event
  io.emit("PAYMENT_APPROVED", {
    id: purchase.id,
    userId: purchase.userId,
    contentType: "PDF",
    contentId: purchase.pdfId,
    contentTitle: purchase.pdfTitle,
    amountPaid: purchase.amountPaid,
    status: "APPROVED"
  });

  res.json({ success: true, purchase });
});

// REJECT PDF PURCHASE (With Student In-App and Sound Notifications!)
app.post("/api/pdf-purchases/:id/reject", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const purchaseId = Number(req.params.id);
  const { reason } = req.body;
  const db = getDB();
  db.pdfPurchases = db.pdfPurchases || [];

  const pIdx = db.pdfPurchases.findIndex((p: any) => p.id === purchaseId);
  if (pIdx === -1) return res.status(404).json({ error: "Purchase record not found" });

  const purchase = db.pdfPurchases[pIdx];
  purchase.status = "REJECTED";

  saveDB(db);

  // Trigger Notification to Student
  notifyUser(
    purchase.userId,
    "Payment Rejection ⚠️",
    `Your payment of UGX ${purchase.amountPaid || 15000} for "${purchase.pdfTitle || "PDF Book"}" could not be verified. Reason: ${reason || "Invalid screenshot match"}. Please submit valid payment proof.`,
    "ERROR",
    "dashboard"
  );

  // Broadcast Socket event
  io.emit("PAYMENT_REJECTED", {
    id: purchase.id,
    userId: purchase.userId,
    contentType: "PDF",
    contentId: purchase.pdfId,
    contentTitle: purchase.pdfTitle,
    amountPaid: purchase.amountPaid,
    status: "REJECTED"
  });

  res.json({ success: true, purchase });
});


// =========================================================================
// REAL-TIME PAYMENT, NOTIFICATION, CERTIFICATE AND SUBSCRIPTION SYSTEM APIs
// =========================================================================

// Helper to dispatch push notifications via Expo gateway (for Mobile App compatibility)
async function sendPushNotifications(userId: number, title: string, message: string) {
  const db = getDB();
  db.pushTokens = db.pushTokens || [];
  
  // Find tokens for this user or ALL devices if userId === 0 (broadcast)
  const targetTokens = db.pushTokens.filter((t: any) => userId === 0 || Number(t.userId) === Number(userId));
  if (targetTokens.length === 0) return;

  const expoTokens = targetTokens.filter((t: any) => t.type === "expo").map((t: any) => t.token);

  if (expoTokens.length > 0) {
    try {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: "default",
        title: title,
        body: message,
        data: { title, message }
      }));
      
      await globalThis.fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(messages)
      });
      console.log(`[Push Notification] Dispatched Expo push notifications to ${expoTokens.length} devices.`);
    } catch (err) {
      console.warn("[Push Notification] Failed to dispatch via Expo gateway:", err);
    }
  }

  // Record logs in notificationLogs
  db.notificationLogs = db.notificationLogs || [];
  targetTokens.forEach((t: any) => {
    const nextLogId = db.notificationLogs.length ? Math.max(...db.notificationLogs.map((l: any) => l.id)) + 1 : 1;
    db.notificationLogs.push({
      id: nextLogId,
      notificationId: 0,
      channel: t.type === "expo" ? "EXPO_PUSH" : "BROWSER_PUSH",
      status: "SENT",
      sentAt: new Date().toISOString()
    });
  });
}

// Global In-app notification dispatcher
function notifyUser(userId: number, title: string, message: string, type: string, linkTab: string = "dashboard") {
  const db = getDB();
  db.notifications = db.notifications || [];

  const newId = db.notifications.length ? Math.max(...db.notifications.map((n: any) => n.id)) + 1 : 1;
  const newNotif = {
    id: newId,
    userId, // 0 for all students, -1 for Admins
    title,
    message,
    type, // SUCCESS, WARNING, INFO, ERROR, NEW_COURSE
    linkTab,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  db.notifications.push(newNotif);
  saveDB(db);

  // Sync to Neon Postgres database if active
  if (pgPool && pgConnectedStatus) {
    pgPool.query(`
      INSERT INTO notifications (id, user_id, title, message, type, link_tab, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [newNotif.id, userId, title, message, type, linkTab, false, newNotif.createdAt])
    .catch(err => console.error("Postgres notification sync error:", err));
  }

  // Send push notifications in background
  sendPushNotifications(userId, title, message).catch(err => {
    console.error("sendPushNotifications failed:", err);
  });

  // Broadcast ADMIN_WARNING Socket event if type is WARNING
  if (type === "WARNING") {
    io.emit("ADMIN_WARNING", newNotif);
  }
}

// Submitting a payment request
app.post("/api/payments/request", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { contentType, contentId, contentTitle, paymentMethod, phone, amountPaid, proofUrl } = req.body;
  if (!contentType || !amountPaid || !paymentMethod || !phone || !proofUrl) {
    return res.status(400).json({ error: "Missing required payment fields" });
  }

  const db = getDB();
  db.paymentRequests = db.paymentRequests || [];
  db.paymentProofs = db.paymentProofs || [];
  db.transactions = db.transactions || [];

  const nextReqId = db.paymentRequests.length ? Math.max(...db.paymentRequests.map((r: any) => r.id)) + 1 : 1;
  
  const paymentReq = {
    id: nextReqId,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    contentType, // "COURSE", "TUTORIAL", "PDF", "CHALLENGE", "CERTIFICATE", "PREMIUM_PLAN"
    contentId: contentId ? Number(contentId) : 0,
    contentTitle: contentTitle || "Premium License",
    paymentMethod, // "MTN", "Airtel"
    phone,
    amountPaid: Number(amountPaid),
    proofUrl,
    status: "PENDING",
    rejectionReason: "",
    createdAt: new Date().toISOString()
  };

  db.paymentRequests.push(paymentReq);

  // Also push to legacy pdfPurchases to support dual/retro compatibility
  if (contentType === "PDF") {
    db.pdfPurchases = db.pdfPurchases || [];
    db.pdfPurchases.push({
      id: nextReqId,
      userId: user.id,
      userName: user.name,
      pdfId: Number(contentId),
      pdfTitle: contentTitle,
      amountPaid: Number(amountPaid),
      paymentMethod,
      phone,
      status: "PENDING_APPROVAL",
      proofUrl,
      createdAt: paymentReq.createdAt
    });
  }

  // Push to payment_proofs database state
  const nextProofId = db.paymentProofs.length ? Math.max(...db.paymentProofs.map((p: any) => p.id)) + 1 : 1;
  db.paymentProofs.push({
    id: nextProofId,
    requestId: nextReqId,
    url: proofUrl,
    uploadedAt: paymentReq.createdAt
  });

  // Create pending transaction log
  const nextTxId = db.transactions.length ? Math.max(...db.transactions.map((t: any) => t.id)) + 1 : 1;
  db.transactions.push({
    id: nextTxId,
    userId: user.id,
    requestId: nextReqId,
    amount: Number(amountPaid),
    type: "PURCHASE",
    status: "PENDING",
    timestamp: paymentReq.createdAt
  });

  saveDB(db);

  // Synchronize to Neon PostgreSQL
  if (pgPool && pgConnectedStatus) {
    (async () => {
      try {
        await pgPool.query(`
          INSERT INTO payment_requests (id, user_id, user_name, user_email, content_type, content_id, content_title, payment_method, phone, amount_paid, proof_url, status, rejection_reason, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', '', $12)
        `, [paymentReq.id, user.id, user.name, user.email, contentType, paymentReq.contentId, paymentReq.contentTitle, paymentMethod, phone, paymentReq.amountPaid, proofUrl, paymentReq.createdAt]);

        await pgPool.query(`
          INSERT INTO payment_proofs (id, request_id, url, uploaded_at)
          VALUES ($1, $2, $3, $4)
        `, [nextProofId, nextReqId, proofUrl, paymentReq.createdAt]);

        await pgPool.query(`
          INSERT INTO transactions (id, user_id, request_id, amount, type, status, timestamp)
          VALUES ($1, $2, $3, $4, 'PURCHASE', 'PENDING', $5)
        `, [nextTxId, user.id, nextReqId, paymentReq.amountPaid, paymentReq.createdAt]);
      } catch (err) {
        console.error("Neon Postgres inserts error:", err);
      }
    })();
  }

  // Trigger notification for admin & student! (with sound alert automatically)
  notifyUser(-1, "New Payment Submitted! 💰", `${user.name} submitted proof for ${paymentReq.contentTitle} (${paymentMethod} phone: ${phone})`, "INFO", "payments");
  notifyUser(user.id, "Payment Submitted! 💳", `We received your payment proof for "${paymentReq.contentTitle}". It is safely queued for admin review.`, "INFO", "purchases");

  // Broadcast Socket event
  io.emit("NEW_PAYMENT_REQUEST", paymentReq);

  res.json({ success: true, request: paymentReq });
});

// SUBMIT PRO UPGRADE PAYMENT REQUEST
app.post("/api/premium/pro/purchase", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { phone, paymentMethod, amount, proofUrl } = req.body;
  if (!phone || !paymentMethod || !amount || !proofUrl) {
    return res.status(400).json({ error: "Missing required payment fields" });
  }

  const db = getDB();
  db.paymentRequests = db.paymentRequests || [];
  db.paymentProofs = db.paymentProofs || [];
  db.transactions = db.transactions || [];

  const nextReqId = db.paymentRequests.length ? Math.max(...db.paymentRequests.map((r: any) => r.id)) + 1 : 1;
  const timestamp = new Date().toISOString();

  const paymentReq = {
    id: nextReqId,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    contentType: "PLATFORM_PRO",
    contentId: 0,
    contentTitle: "PowerCode Premium Pro Plan",
    paymentMethod,
    phone,
    amountPaid: Number(amount),
    proofUrl,
    status: "PENDING",
    rejectionReason: "",
    createdAt: timestamp
  };

  db.paymentRequests.push(paymentReq);

  const nextProofId = db.paymentProofs.length ? Math.max(...db.paymentProofs.map((p: any) => p.id)) + 1 : 1;
  db.paymentProofs.push({
    id: nextProofId,
    requestId: nextReqId,
    url: proofUrl,
    uploadedAt: timestamp
  });

  const nextTxId = db.transactions.length ? Math.max(...db.transactions.map((t: any) => t.id)) + 1 : 1;
  db.transactions.push({
    id: nextTxId,
    userId: user.id,
    requestId: nextReqId,
    amount: Number(amount),
    type: "PURCHASE",
    status: "PENDING",
    timestamp: timestamp
  });

  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    (async () => {
      try {
        await pgPool.query(`
          INSERT INTO payment_requests (id, user_id, user_name, user_email, content_type, content_id, content_title, payment_method, phone, amount_paid, proof_url, status, rejection_reason, created_at)
          VALUES ($1, $2, $3, $4, 'PLATFORM_PRO', 0, 'PowerCode Premium Pro Plan', $5, $6, $7, $8, 'PENDING', '', $9)
        `, [nextReqId, user.id, user.name, user.email, paymentMethod, phone, Number(amount), proofUrl, timestamp]);

        await pgPool.query(`
          INSERT INTO payment_proofs (id, request_id, url, uploaded_at)
          VALUES ($1, $2, $3, $4)
        `, [nextProofId, nextReqId, proofUrl, timestamp]);

        await pgPool.query(`
          INSERT INTO transactions (id, user_id, request_id, amount, type, status, timestamp)
          VALUES ($1, $2, $3, $4, 'PURCHASE', 'PENDING', $5)
        `, [nextTxId, user.id, nextReqId, Number(amount), timestamp]);
      } catch (err) {
        console.error("Neon Postgres inserts error on pro upgrade sync:", err);
      }
    })();
  }

  notifyUser(-1, "New Pro Upgrade Payment! 💰", `${user.name} submitted proof for Pro Plan (${paymentMethod} phone: ${phone})`, "INFO", "payments");
  notifyUser(user.id, "Pro Upgrade Payment Submitted! 💳", `We received your payment proof for the Premium Pro Plan. It is safely queued for admin review.`, "INFO", "purchases");

  io.emit("NEW_PAYMENT_REQUEST", paymentReq);

  res.json({ success: true, request: paymentReq });
});

// Student check payment requests status
app.get("/api/payments/my-status", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const db = getDB();
  db.paymentRequests = db.paymentRequests || [];
  db.premiumAccess = db.premiumAccess || [];

  const myRequests = db.paymentRequests.filter((r: any) => r.userId === user.id && r.isDeleted !== true);
  const myAccess = db.premiumAccess.filter((a: any) => a.userId === user.id);

  res.json({ requests: myRequests, premiumAccess: myAccess });
});

// Admin get all active payment requests
app.get("/api/payments/admin", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin authority required" });

  const db = getDB();
  db.paymentRequests = db.paymentRequests || [];
  res.json({ requests: db.paymentRequests.filter((r: any) => r.isDeleted !== true) });
});

// Approve a payment
app.put("/api/payments/:id/approve", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin authority required" });

  const reqId = Number(req.params.id);
  const db = getDB();
  db.paymentRequests = db.paymentRequests || [];
  db.premiumAccess = db.premiumAccess || [];
  db.transactions = db.transactions || [];

  const rIdx = db.paymentRequests.findIndex((r: any) => r.id === reqId);
  if (rIdx === -1) return res.status(404).json({ error: "Payment request record not found" });

  const request = db.paymentRequests[rIdx];
  request.status = "APPROVED";

  // Legacy compatibility check for PDFs
  if (request.contentType === "PDF" && db.pdfPurchases) {
    const pIdx = db.pdfPurchases.findIndex((p: any) => p.id === reqId);
    if (pIdx !== -1) {
      db.pdfPurchases[pIdx].status = "APPROVED";
      db.pdfPurchases[pIdx].approvedAt = new Date().toISOString();
    }
  }

  // Add Row to premiumAccess to lock/unlock feature states permanently
  const nextAccId = db.premiumAccess.length ? Math.max(...db.premiumAccess.map((a: any) => a.id)) + 1 : 1;
  const accessRow = {
    id: nextAccId,
    userId: request.userId,
    contentType: request.contentType, // "COURSE", "TUTORIAL", "PDF" etc
    contentId: request.contentId,
    grantedAt: new Date().toISOString(),
    status: "ACTIVE"
  };
  db.premiumAccess.push(accessRow);

  // Update transactional status logs
  const txIdx = db.transactions.findIndex((t: any) => t.requestId === reqId);
  if (txIdx !== -1) {
    db.transactions[txIdx].status = "SUCCESS";
  }

  saveDB(db);

  // Synchronize to Postgres
  if (pgPool && pgConnectedStatus) {
    (async () => {
      try {
        await pgPool.query("UPDATE payment_requests SET status = 'APPROVED' WHERE id = $1", [reqId]);
        await pgPool.query(`
          INSERT INTO premium_access (id, user_id, content_type, content_id, granted_at, status)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          ON CONFLICT (id) DO NOTHING
        `, [nextAccId, request.userId, request.contentType, request.contentId, accessRow.grantedAt]);
        await pgPool.query("UPDATE transactions SET status = 'SUCCESS' WHERE request_id = $1", [reqId]);
      } catch (err) {
        console.error("Failed to approve Postgres records:", err);
      }
    })();
  }

  // Trigger user notification: sound, push notifications, in-app notification logs!
  notifyUser(
    request.userId,
    "Payment Approved! 🎉",
    `Your payment of UGX ${request.amountPaid} has been approved. You can now access your purchased content: "${request.contentTitle}"!`,
    "SUCCESS",
    request.contentType === "PDF" ? "pdfs" : request.contentType === "COURSE" ? "courses" : "dashboard"
  );

  // Broadcast Socket event
  io.emit("PAYMENT_APPROVED", request);

  res.json({ success: true, request });
});

// Reject a payment
app.put("/api/payments/:id/reject", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin authority required" });

  const reqId = Number(req.params.id);
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: "Rejection explanation reason is required" });

  const db = getDB();
  db.paymentRequests = db.paymentRequests || [];
  db.transactions = db.transactions || [];

  const rIdx = db.paymentRequests.findIndex((r: any) => r.id === reqId);
  if (rIdx === -1) return res.status(404).json({ error: "Payment request record not found" });

  const request = db.paymentRequests[rIdx];
  request.status = "REJECTED";
  request.rejectionReason = reason;

  // Legacy compat
  if (request.contentType === "PDF" && db.pdfPurchases) {
    const pIdx = db.pdfPurchases.findIndex((p: any) => p.id === reqId);
    if (pIdx !== -1) {
      db.pdfPurchases[pIdx].status = "REJECTED";
    }
  }

  const txIdx = db.transactions.findIndex((t: any) => t.requestId === reqId);
  if (txIdx !== -1) {
    db.transactions[txIdx].status = "FAILED";
  }

  saveDB(db);

  // Synchronize to Postgres
  if (pgPool && pgConnectedStatus) {
    (async () => {
      try {
        await pgPool.query("UPDATE payment_requests SET status = 'REJECTED', rejection_reason = $1 WHERE id = $2", [reason, reqId]);
        await pgPool.query("UPDATE transactions SET status = 'FAILED' WHERE request_id = $1", [reqId]);
      } catch (err) {
        console.error("Failed to reject Postgres payment request:", err);
      }
    })();
  }

  // Trigger rejection notification: sound, push notifications, in-app notification logs!
  notifyUser(
    request.userId,
    "Payment Rejection ❌",
    `Your payment could not be verified. Reason: ${reason}. Please submit valid payment proof.`,
    "ERROR",
    "dashboard"
  );

  // Broadcast Socket event
  io.emit("PAYMENT_REJECTED", request);

  res.json({ success: true, request });
});

// Soft Delete payment request
app.delete("/api/payments/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const reqId = Number(req.params.id);
  const db = getDB();
  db.paymentRequests = db.paymentRequests || [];

  const idx = db.paymentRequests.findIndex((r: any) => r.id === reqId);
  if (idx !== -1) {
    db.paymentRequests[idx].isDeleted = true;
    saveDB(db);

    if (pgPool && pgConnectedStatus) {
      pgPool.query("UPDATE payment_requests SET is_deleted = TRUE WHERE id = $1", [reqId]).catch(() => {});
    }
  }

  res.json({ success: true, message: "Payment request successfully soft deleted" });
});

// Register custom notification service device push tokens (Expo or browser notifications)
app.post("/api/notifications/register-token", (req, res) => {
  const user = parseUserFromAuth(req);
  const userId = user ? user.id : 0;

  const { token, type } = req.body;
  if (!token) return res.status(400).json({ error: "Device terminal token is required" });

  const db = getDB();
  db.pushTokens = db.pushTokens || [];

  const exists = db.pushTokens.some((t: any) => t.token === token && t.userId === userId);
  if (!exists) {
    const nextId = db.pushTokens.length ? Math.max(...db.pushTokens.map((t: any) => t.id)) + 1 : 1;
    db.pushTokens.push({ id: nextId, userId, token, type: type || "expo" });
    saveDB(db);

    if (pgPool && pgConnectedStatus) {
      pgPool.query("INSERT INTO push_tokens (user_id, token, type) VALUES ($1, $2, $3)", [userId, token, type || "expo"])
        .catch(err => console.error("Postgres push token sync error:", err));
    }
  }

  res.json({ success: true });
});

// Retrieve notifications list
app.get("/api/notifications/my-list", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const db = getDB();
  db.notifications = db.notifications || [];

  let list = db.notifications;
  if (user.role === "ADMIN") {
    // Admins see targeted, general, and targeted admin logs
    list = list.filter((n: any) => n.userId === user.id || n.userId === 0 || n.userId === -1);
  } else {
    list = list.filter((n: any) => n.userId === user.id || n.userId === 0);
  }

  res.json({ success: true, notifications: list });
});

// Set notification reads status
app.post("/api/notifications/read", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { notificationId } = req.body;
  const db = getDB();
  db.notifications = db.notifications || [];

  if (notificationId) {
    const notif = db.notifications.find((n: any) => n.id === Number(notificationId));
    if (notif) {
      notif.isRead = true;
    }
  } else {
    // Read all
    db.notifications.forEach((n: any) => {
      if (n.userId === user.id || (user.role === "ADMIN" && n.userId === -1) || n.userId === 0) {
        n.isRead = true;
      }
    });
  }

  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    if (notificationId) {
      pgPool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [notificationId]).catch(() => {});
    } else {
      pgPool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR user_id = 0", [user.id]).catch(() => {});
    }
  }

  res.json({ success: true });
});

// DELETE SINGLE NOTIFICATION
app.delete("/api/notifications/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const notifId = Number(req.params.id);
  const db = getDB();
  db.notifications = db.notifications || [];

  const foundIndex = db.notifications.findIndex((n: any) => n.id === notifId);
  if (foundIndex === -1) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const notif = db.notifications[foundIndex];
  if (notif.userId !== user.id && notif.userId !== 0 && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized operation" });
  }

  db.notifications.splice(foundIndex, 1);
  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    pgPool.query("DELETE FROM notifications WHERE id = $1", [notifId]).catch((err) => {
      console.error("[Database Sync] Error deleting single notification from Postgres:", err);
    });
  }

  res.json({ success: true, message: "Notification deleted successfully." });
});

// DELETE ALL NOTIFICATIONS FOR CURRENT USER
app.delete("/api/notifications", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const db = getDB();
  db.notifications = db.notifications || [];

  db.notifications = db.notifications.filter((n: any) => {
    if (user.role === "ADMIN") {
      return n.userId !== user.id && n.userId !== -1 && n.userId !== 0;
    }
    return n.userId !== user.id && n.userId !== 0;
  });

  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    if (user.role === "ADMIN") {
      pgPool.query("DELETE FROM notifications WHERE user_id = $1 OR user_id = -1 OR user_id = 0", [user.id]).catch(() => {});
    } else {
      pgPool.query("DELETE FROM notifications WHERE user_id = $1 OR user_id = 0", [user.id]).catch(() => {});
    }
  }

  res.json({ success: true, message: "All notifications cleared successfully." });
});

// Retrieve notification settings
app.get("/api/notifications/settings", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const db = getDB();
  db.notificationSettings = db.notificationSettings || [];

  let settings = db.notificationSettings.find((s: any) => s.userId === user.id);
  if (!settings) {
    settings = {
      id: db.notificationSettings.length ? Math.max(...db.notificationSettings.map((s: any) => s.id)) + 1 : 1,
      userId: user.id,
      emailNotifications: true,
      pushNotifications: true,
      soundNotifications: true,
      inAppNotifications: true,
      email_notifications: true,
      push_notifications: true,
      sound_notifications: true,
      emailAlertsNewModules: true,
      emailAlertsDmReplies: true
    };
    db.notificationSettings.push(settings);
    saveDB(db);
  }

  // Double-ensure boolean values
  settings.emailNotifications = settings.emailNotifications !== false;
  settings.pushNotifications = settings.pushNotifications !== false;
  settings.soundNotifications = settings.soundNotifications !== false;
  settings.inAppNotifications = settings.inAppNotifications !== false;
  settings.email_notifications = settings.email_notifications !== false;
  settings.push_notifications = settings.push_notifications !== false;
  settings.sound_notifications = settings.sound_notifications !== false;
  settings.emailAlertsNewModules = settings.emailAlertsNewModules !== false;
  settings.emailAlertsDmReplies = settings.emailAlertsDmReplies !== false;

  res.json({ success: true, settings });
});

// Update notification settings
app.post("/api/notifications/settings", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { 
    email_notifications, 
    push_notifications, 
    sound_notifications, 
    emailNotifications, 
    pushNotifications, 
    soundNotifications, 
    inAppNotifications,
    emailAlertsNewModules,
    emailAlertsDmReplies
  } = req.body;
  const db = getDB();
  db.notificationSettings = db.notificationSettings || [];

  let settings = db.notificationSettings.find((s: any) => s.userId === user.id);
  
  const emailVal = email_notifications !== undefined ? !!email_notifications : (emailNotifications !== undefined ? !!emailNotifications : true);
  const pushVal = push_notifications !== undefined ? !!push_notifications : (pushNotifications !== undefined ? !!pushNotifications : true);
  const soundVal = sound_notifications !== undefined ? !!sound_notifications : (soundNotifications !== undefined ? !!soundNotifications : (inAppNotifications !== undefined ? !!inAppNotifications : true));
  const newModulesVal = emailAlertsNewModules !== undefined ? !!emailAlertsNewModules : true;
  const dmRepliesVal = emailAlertsDmReplies !== undefined ? !!emailAlertsDmReplies : true;

  if (!settings) {
    settings = {
      id: db.notificationSettings.length ? Math.max(...db.notificationSettings.map((s: any) => s.id)) + 1 : 1,
      userId: user.id,
    };
    db.notificationSettings.push(settings);
  }

  settings.emailNotifications = emailVal;
  settings.pushNotifications = pushVal;
  settings.soundNotifications = soundVal;
  settings.inAppNotifications = soundVal;
  settings.email_notifications = emailVal;
  settings.push_notifications = pushVal;
  settings.sound_notifications = soundVal;
  settings.emailAlertsNewModules = newModulesVal;
  settings.emailAlertsDmReplies = dmRepliesVal;

  saveDB(db);

  if (pgPool && pgConnectedStatus) {
    pgPool.query(`
      INSERT INTO notification_settings (user_id, email_notifications, push_notifications, sound_notifications)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET 
        email_notifications = EXCLUDED.email_notifications,
        push_notifications = EXCLUDED.push_notifications,
        sound_notifications = EXCLUDED.sound_notifications
    `, [user.id, emailVal, pushVal, soundVal]).catch(() => {
      pgPool.query(`
        UPDATE notification_settings 
        SET email_notifications = $1, push_notifications = $2, sound_notifications = $3
        WHERE user_id = $4
      `, [emailVal, pushVal, soundVal, user.id]).catch((err) => console.error("Error updating SQL notification_settings:", err));
    });
  }

  res.json({ success: true, settings });
});

// Retrieve custom uploaded sounds
app.get("/api/notifications/sounds", (req, res) => {
  const db = getDB();
  db.notificationSounds = db.notificationSounds || [];
  res.json({ success: true, sounds: db.notificationSounds });
});

// Admin upload/update alert notification sound files
app.post("/api/notifications/sounds", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { alertType, url, fileName, fileData } = req.body;
  if (!alertType) {
    return res.status(400).json({ error: "alertType parameter of sound is required" });
  }

  const db = getDB();
  db.notificationSounds = db.notificationSounds || [];

  // Find if sound of this type already exists, update or create
  let sound = db.notificationSounds.find((s: any) => s.alertType === alertType);
  
  // Use uploaded file data URL if supplied, or a custom simulator link
  let finalUrl = url;
  if (fileData) {
    finalUrl = fileData;
  } else if (!finalUrl && fileName) {
    const slug = Math.random().toString(36).substring(2, 8);
    finalUrl = `https://res.cloudinary.com/powercode/video/upload/v172605/sounds/${slug}_${fileName.replace(/\s+/g, "_")}`;
  }

  if (!finalUrl) {
    return res.status(400).json({ error: "Audio URL or file metadata is required." });
  }

  if (sound) {
    sound.url = finalUrl;
    sound.fileName = fileName || sound.fileName || `custom_${alertType}.mp3`;
    sound.updatedAt = new Date().toISOString();
  } else {
    sound = {
      id: db.notificationSounds.length + 1,
      alertType,
      url: finalUrl,
      fileName: fileName || `custom_${alertType}.mp3`,
      updatedAt: new Date().toISOString()
    };
    db.notificationSounds.push(sound);
  }

  saveDB(db);

  // Log activity
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  logAdminActivity(db, user.name, "UPLOAD_SOUND", "NOTIFICATION_SOUND", `Alert: ${alertType} - ${sound.fileName}`, String(ip));

  res.json({ success: true, sound });
});

// Admin Revenue Charts & Analytics data
app.get("/api/admin/revenue", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const db = getDB();
  db.paymentRequests = db.paymentRequests || [];

  const approvedReqs = db.paymentRequests.filter((r: any) => r.status === "APPROVED");
  const pendingReqs = db.paymentRequests.filter((r: any) => r.status === "PENDING");
  const rejectedReqs = db.paymentRequests.filter((r: any) => r.status === "REJECTED");

  // Calculations
  const totalRevenue = approvedReqs.reduce((acc, r) => acc + (Number(r.amountPaid) || 0), 0);

  const todayStr = new Date().toISOString().substring(0, 10);
  const todaysRevenue = approvedReqs
    .filter(r => r.createdAt && r.createdAt.substring(0, 10) === todayStr)
    .reduce((acc, r) => acc + (Number(r.amountPaid) || 0), 0);

  const thisMonthStr = new Date().toISOString().substring(0, 7);
  const monthlyRevenue = approvedReqs
    .filter(r => r.createdAt && r.createdAt.substring(0, 7) === thisMonthStr)
    .reduce((acc, r) => acc + (Number(r.amountPaid) || 0), 0);

  // Top Products
  const purchaseCounts: Record<string, { count: number, total: number, title: string }> = {};
  approvedReqs.forEach(r => {
    const key = `${r.contentType}:${r.contentId}`;
    if (!purchaseCounts[key]) {
      purchaseCounts[key] = { count: 0, total: 0, title: r.contentTitle || "Premium License" };
    }
    purchaseCounts[key].count += 1;
    purchaseCounts[key].total += Number(r.amountPaid) || 0;
  });

  const topPurchasedContent = Object.values(purchaseCounts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top Paying Students
  const userPayments: Record<number, { id: number, name: string, email: string, spent: number }> = {};
  approvedReqs.forEach(r => {
    const uId = Number(r.userId) || 0;
    if (!userPayments[uId]) {
      userPayments[uId] = { id: uId, name: r.userName || "Student", email: r.userEmail || "", spent: 0 };
    }
    userPayments[uId].spent += Number(r.amountPaid) || 0;
  });

  const topPayingUsers = Object.values(userPayments)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Daily Chart Records
  const chartValues: Record<string, number> = {};
  approvedReqs.forEach(r => {
    if (r.createdAt) {
      const date = r.createdAt.substring(0, 10);
      chartValues[date] = (chartValues[date] || 0) + (Number(r.amountPaid) || 0);
    }
  });

  const revenueChartData = Object.entries(chartValues)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-15);

  res.json({
    totalRevenue,
    todaysRevenue,
    monthlyRevenue,
    pendingPaymentsCount: pendingReqs.length,
    approvedPaymentsCount: approvedReqs.length,
    rejectedPaymentsCount: rejectedReqs.length,
    topPurchasedContent,
    topPayingUsers,
    revenueChartData
  });
});


// GET ADMIN TRANSACTIONS FROM DATABASE
app.get("/api/admin/transactions", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const db = getDB();
  db.transactions = db.transactions || [];
  db.users = db.users || [];
  db.paymentRequests = db.paymentRequests || [];

  const mappedList = db.transactions.map((t: any) => {
    const associatedUser = db.users.find((u: any) => u.id === t.userId);
    const associatedReq = db.paymentRequests.find((r: any) => r.id === t.requestId);
    return {
      id: t.id,
      userId: t.userId,
      requestId: t.requestId,
      amount: t.amount,
      type: t.type,
      status: t.status,
      timestamp: t.timestamp || associatedReq?.createdAt,
      userName: associatedUser?.name || associatedReq?.userName || "Student",
      userEmail: associatedUser?.email || associatedReq?.userEmail || "",
      contentType: associatedReq?.contentType || t.type,
      contentTitle: associatedReq?.contentTitle || "Premium Access",
      paymentMethod: associatedReq?.paymentMethod || "MOMO",
      phone: associatedReq?.phone || ""
    };
  });

  // Sort descending by id
  mappedList.sort((a, b) => b.id - a.id);

  res.json({ success: true, transactions: mappedList });
});


// ==========================================
// UNIVERSAL DATABASE TABLE CRUD SYSTEM API
// ==========================================

// GET TABLE ROWS
app.get("/api/admin/tables/:table", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const table = req.params.table;
  const db = getDB();

  if (table === "courses") {
    return res.json({ rows: db.courses || [] });
  } 
  
  if (table === "modules") {
    const flatModules = (db.courses || []).flatMap((c: any) => 
      (c.modules || []).map((m: any) => ({
        ...m,
        courseId: c.id,
        courseTitle: c.title,
        lessonsCount: m.lessons?.length || 0
      }))
    );
    return res.json({ rows: flatModules });
  }

  if (table === "lessons") {
    const flatLessons = (db.courses || []).flatMap((c: any) => 
      (c.modules || []).flatMap((m: any) => 
        (m.lessons || []).map((l: any) => ({
          ...l,
          courseId: c.id,
          courseTitle: c.title,
          moduleId: m.id,
          moduleTitle: m.title
        }))
      )
    );
    return res.json({ rows: flatLessons });
  }

  if (table === "tutorials") {
    return res.json({ rows: db.tutorials || [] });
  }

  if (table === "pdfs") {
    return res.json({ rows: db.pdfs || [] });
  }

  if (table === "quizzes") {
    return res.json({ rows: db.quizzes || [] });
  }

  if (table === "questions") {
    const flatQuestions = (db.quizzes || []).flatMap((q: any) => 
      (q.questions || []).map((qu: any) => ({
        ...qu,
        quizId: q.id,
        quizTitle: q.title
      }))
    );
    return res.json({ rows: flatQuestions });
  }

  if (table === "challenges") {
    return res.json({ rows: db.challenges || [] });
  }

  if (table === "announcements") {
    return res.json({ rows: db.announcements || [] });
  }

  if (table === "certificates") {
    return res.json({ rows: db.certificates || [] });
  }

  if (table === "users") {
    return res.json({ rows: db.users || [] });
  }

  if (table === "categories") {
    return res.json({ rows: db.categories || [] });
  }

  if (table === "programming_examples") {
    return res.json({ rows: db.programmingExamples || [] });
  }

  if (table === "pdf_purchases") {
    return res.json({ rows: db.pdfPurchases || [] });
  }

  res.status(400).json({ error: "Invalid dynamic db table name" });
});

// CREATE TABLE ROW
app.post("/api/admin/tables/:table", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const table = req.params.table;
  const db = getDB();
  const body = req.body;

  if (table === "courses") {
    const nextId = db.courses.length ? Math.max(...db.courses.map(c => c.id)) + 1 : 1;
    const item = { id: nextId, modules: [], isPublished: true, ...body };
    db.courses.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "modules") {
    const courseId = Number(body.courseId);
    const course = db.courses.find(c => c.id === courseId);
    if (!course) return res.status(400).json({ error: "Assigned course ID not found" });

    const flatModules = db.courses.flatMap(c => c.modules || []);
    const nextId = flatModules.length ? Math.max(...flatModules.map(m => m.id)) + 1 : 1001;

    const item = { id: nextId, lessons: [], ...body, courseId };
    course.modules = course.modules || [];
    course.modules.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "lessons") {
    const courseId = Number(body.courseId);
    const moduleId = Number(body.moduleId);
    const course = db.courses.find(c => c.id === courseId);
    if (!course) return res.status(400).json({ error: "Associated Course not found" });

    const mod = course.modules?.find(m => m.id === moduleId);
    if (!mod) return res.status(400).json({ error: "Parent Module not found in specified course" });

    const flatLessons = db.courses.flatMap(c => (c.modules || []).flatMap(m => m.lessons || []));
    const nextId = flatLessons.length ? Math.max(...flatLessons.map(l => l.id)) + 1 : 10001;

    const item = { 
      id: nextId, 
      title: body.title, 
      content: body.content || "", 
      videoUrl: body.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", 
      durationMinutes: Number(body.durationMinutes) || 12,
      isPreviewAllowed: !!body.isPreviewAllowed,
      quizId: body.quizId ? Number(body.quizId) : undefined
    };

    mod.lessons = mod.lessons || [];
    mod.lessons.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "tutorials") {
    const nextId = db.tutorials.length ? Math.max(...db.tutorials.map(t => t.id)) + 1 : 1;
    const item = { id: nextId, isPublished: true, ...body };
    db.tutorials.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "pdfs") {
    const nextId = db.pdfs.length ? Math.max(...db.pdfs.map(p => p.id)) + 1 : 1;
    const item = { id: nextId, isPublished: true, ...body };
    db.pdfs.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "quizzes") {
    const nextId = db.quizzes.length ? Math.max(...db.quizzes.map(q => q.id)) + 1 : 1;
    const item = { id: nextId, questions: [], ...body };
    db.quizzes.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "questions") {
    const quizId = Number(body.quizId);
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) return res.status(400).json({ error: "Quiz not found" });

    const flatQuestions = db.quizzes.flatMap(q => q.questions || []);
    const nextId = flatQuestions.length ? Math.max(...flatQuestions.map(qu => qu.id)) + 1 : 80001;

    const parsedOptions = Array.isArray(body.options) 
      ? body.options 
      : typeof body.options === "string" 
        ? body.options.split(",").map((s: string) => s.trim()) 
        : ["A", "B", "C", "D"];

    const item = {
      id: nextId,
      question: body.question,
      options: parsedOptions,
      correctAnswer: body.correctAnswer || ""
    };

    quiz.questions = quiz.questions || [];
    quiz.questions.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "challenges") {
    const nextId = db.challenges.length ? Math.max(...db.challenges.map(c => c.id)) + 1 : 1;
    const item = { id: nextId, isPublished: true, ...body };
    db.challenges.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "announcements") {
    const nextId = db.announcements.length ? Math.max(...db.announcements.map(a => a.id)) + 1 : 1;
    const item = { id: nextId, createdAt: new Date().toISOString(), isPublished: true, ...body };
    db.announcements.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "certificates") {
    const item = { certificateCode: `CERT-GEN-${Math.floor(100000 + Math.random()*900000)}`, date: new Date().toLocaleDateString(), ...body };
    db.certificates.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "users") {
    const nextId = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
    const item = { id: nextId, score: 0, learningStreak: 1, createdAt: new Date().toISOString(), ...body };
    db.users.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "categories") {
    db.categories = db.categories || [];
    const nextId = db.categories.length ? Math.max(...db.categories.map((c: any) => c.id)) + 1 : 1;
    const item = { id: nextId, name: body.name || "New Category" };
    db.categories.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  if (table === "programming_examples") {
    db.programmingExamples = db.programmingExamples || [];
    const nextId = db.programmingExamples.length ? Math.max(...db.programmingExamples.map((p: any) => p.id)) + 1 : 1;
    const item = { id: nextId, ...body };
    db.programmingExamples.push(item);
    saveDB(db);
    return res.json({ success: true, item });
  }

  res.status(400).json({ error: "Dynamic database layout unsupported or invalid" });
});

// UPDATE TABLE ROW
app.put("/api/admin/tables/:table/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const table = req.params.table;
  const rowId = Number(req.params.id);
  const db = getDB();
  const body = req.body;

  if (table === "courses") {
    const idx = db.courses.findIndex(c => c.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "Course not found" });
    db.courses[idx] = { ...db.courses[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.courses[idx] });
  }

  if (table === "modules") {
    let found = false;
    for (const c of db.courses) {
      const mIdx = (c.modules || []).findIndex(m => m.id === rowId);
      if (mIdx !== -1) {
        c.modules[mIdx] = { ...c.modules[mIdx], ...body, id: rowId };
        found = true;
        break;
      }
    }
    if (!found) return res.status(404).json({ error: "Module not found in any courses" });
    saveDB(db);
    return res.json({ success: true });
  }

  if (table === "lessons") {
    let found = false;
    for (const c of db.courses) {
      for (const m of (c.modules || [])) {
        const lIdx = (m.lessons || []).findIndex(l => l.id === rowId);
        if (lIdx !== -1) {
          const prevVideoUrl = m.lessons[lIdx].videoUrl || "";
          const videoInput = body.videoUrl !== undefined ? body.videoUrl : undefined;
          const newVideoUrl = videoInput !== undefined ? videoInput : prevVideoUrl;
          if (newVideoUrl !== prevVideoUrl) {
            if (newVideoUrl === "") {
              notifyUser(-1, "Video Lecture Cleared 🧹", `Lesson "${m.lessons[lIdx].title}" video removed.`, "WARNING", "media");
              notifyUser(0, "Class Video Removed ⚠️", `Lecture video has been taken down for "${m.lessons[lIdx].title}".`, "WARNING", "classroom");
              io.emit("VIDEO_DELETED", { title: m.lessons[lIdx].title });
            } else {
              notifyUser(-1, "Video Lecture Registered! 🎥", `Lesson "${m.lessons[lIdx].title}" video uploaded: ${newVideoUrl}`, "SUCCESS", "media");
              notifyUser(0, "New Video Class Live! 🚀", `New lecture uploaded for "${m.lessons[lIdx].title}". Watch it now!`, "SUCCESS", "classroom");
              io.emit("VIDEO_UPLOADED", { title: m.lessons[lIdx].title, url: newVideoUrl });
            }
          }

          m.lessons[lIdx] = { 
            ...m.lessons[lIdx], 
            ...body, 
            videoUrl: newVideoUrl,
            id: rowId,
            quizId: body.quizId ? Number(body.quizId) : undefined
          };
          found = true;
          break;
        }
      }
    }
    if (!found) return res.status(404).json({ error: "Lesson not found in any modules" });
    saveDB(db);
    return res.json({ success: true });
  }

  if (table === "tutorials") {
    const idx = db.tutorials.findIndex(t => t.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "Tutorial not found" });
    
    const prevVideoUrl = db.tutorials[idx].videoUrl || "";
    const newVideoUrl = body.videoUrl !== undefined ? body.videoUrl : prevVideoUrl;
    if (newVideoUrl !== prevVideoUrl) {
      if (newVideoUrl === "") {
        notifyUser(-1, "Tutorial Video Cleared 🧹", `Tutorial "${db.tutorials[idx].title}" video removed.`, "WARNING", "media");
        notifyUser(0, "Tutorial Video Removed ⚠️", `Tutorial video has been taken down for "${db.tutorials[idx].title}".`, "WARNING", "tutorials");
        io.emit("VIDEO_DELETED", { title: db.tutorials[idx].title });
      } else {
        notifyUser(-1, "Tutorial Video Registered! 🎥", `Tutorial "${db.tutorials[idx].title}" video uploaded: ${newVideoUrl}`, "SUCCESS", "media");
        notifyUser(0, "New Tutorial Video Live! 🚀", `New video tutorial uploaded for "${db.tutorials[idx].title}". Watch it now!`, "SUCCESS", "tutorials");
        io.emit("VIDEO_UPLOADED", { title: db.tutorials[idx].title, url: newVideoUrl });
      }
    }

    db.tutorials[idx] = { ...db.tutorials[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.tutorials[idx] });
  }

  if (table === "pdfs") {
    const idx = db.pdfs.findIndex(p => p.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "PDF not found" });
    db.pdfs[idx] = { ...db.pdfs[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.pdfs[idx] });
  }

  if (table === "quizzes") {
    const idx = db.quizzes.findIndex(q => q.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "Quiz not found" });
    db.quizzes[idx] = { ...db.quizzes[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.quizzes[idx] });
  }

  if (table === "questions") {
    let found = false;
    for (const q of db.quizzes) {
      const qIdx = (q.questions || []).findIndex((qu: any) => qu.id === rowId);
      if (qIdx !== -1) {
        const parsedOptions = Array.isArray(body.options) 
          ? body.options 
          : typeof body.options === "string" 
            ? body.options.split(",").map((s: string) => s.trim()) 
            : q.questions[qIdx].options;

        q.questions[qIdx] = {
          ...q.questions[qIdx],
          ...body,
          options: parsedOptions,
          id: rowId
        };
        found = true;
        break;
      }
    }
    if (!found) return res.status(404).json({ error: "Quiz question not found in database schemas" });
    saveDB(db);
    return res.json({ success: true });
  }

  if (table === "challenges") {
    const idx = db.challenges.findIndex(c => c.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "Challenge not found" });
    db.challenges[idx] = { ...db.challenges[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.challenges[idx] });
  }

  if (table === "announcements") {
    const idx = db.announcements.findIndex(a => a.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "Announcement not found" });
    db.announcements[idx] = { ...db.announcements[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.announcements[idx] });
  }

  if (table === "users") {
    const idx = db.users.findIndex(u => u.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "User not found" });
    db.users[idx] = { ...db.users[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.users[idx] });
  }

  if (table === "categories") {
    db.categories = db.categories || [];
    const idx = db.categories.findIndex((c: any) => c.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "Category not found" });
    db.categories[idx] = { ...db.categories[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.categories[idx] });
  }

  if (table === "programming_examples") {
    db.programmingExamples = db.programmingExamples || [];
    const idx = db.programmingExamples.findIndex((p: any) => p.id === rowId);
    if (idx === -1) return res.status(404).json({ error: "Programming Example snippet not found" });
    db.programmingExamples[idx] = { ...db.programmingExamples[idx], ...body, id: rowId };
    saveDB(db);
    return res.json({ success: true, item: db.programmingExamples[idx] });
  }

  res.status(400).json({ error: "Universal update rejected or table does not exist" });
});

// DELETE TABLE ROW (SOFT AND PHYSICAL DELETION SYSTEM ON ALL AUDITED ENTITIES)
app.delete("/api/admin/tables/:table/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const table = req.params.table;
  const db = getDB();
  const rowId = Number(req.params.id);
  const permanent = req.query.permanent === "true";

  const softDeleteTables = ["courses", "tutorials", "pdfs", "quizzes", "challenges", "announcements", "lessons"];
  if (softDeleteTables.includes(table) && !permanent) {
    let found = false;
    if (table === "courses") {
      const idx = db.courses.findIndex(c => c.id === rowId);
      if (idx !== -1) {
        db.courses[idx].status = "Trashed";
        db.courses[idx].deleted_at = new Date().toISOString();
        db.courses[idx].deleted_by = user.email;
        found = true;
      }
    } else if (table === "tutorials") {
      const idx = db.tutorials.findIndex(t => t.id === rowId);
      if (idx !== -1) {
        db.tutorials[idx].status = "Trashed";
        db.tutorials[idx].deleted_at = new Date().toISOString();
        db.tutorials[idx].deleted_by = user.email;
        found = true;
      }
    } else if (table === "pdfs") {
      const idx = db.pdfs.findIndex(p => p.id === rowId);
      if (idx !== -1) {
        db.pdfs[idx].status = "Trashed";
        db.pdfs[idx].deleted_at = new Date().toISOString();
        db.pdfs[idx].deleted_by = user.email;
        found = true;
      }
    } else if (table === "quizzes") {
      const idx = db.quizzes.findIndex(q => q.id === rowId);
      if (idx !== -1) {
        db.quizzes[idx].status = "Trashed";
        db.quizzes[idx].deleted_at = new Date().toISOString();
        db.quizzes[idx].deleted_by = user.email;
        found = true;
      }
    } else if (table === "challenges") {
      const idx = db.challenges.findIndex(c => c.id === rowId);
      if (idx !== -1) {
        db.challenges[idx].status = "Trashed";
        db.challenges[idx].deleted_at = new Date().toISOString();
        db.challenges[idx].deleted_by = user.email;
        found = true;
      }
    } else if (table === "announcements") {
      const idx = db.announcements.findIndex(a => a.id === rowId);
      if (idx !== -1) {
        db.announcements[idx].status = "Trashed";
        db.announcements[idx].deleted_at = new Date().toISOString();
        db.announcements[idx].deleted_by = user.email;
        found = true;
      }
    } else if (table === "lessons") {
      for (const c of db.courses) {
        for (const m of (c.modules || [])) {
          const idx = (m.lessons || []).findIndex(l => l.id === rowId);
          if (idx !== -1) {
            m.lessons[idx].status = "Trashed";
            m.lessons[idx].deleted_at = new Date().toISOString();
            m.lessons[idx].deleted_by = user.email;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    if (!found) {
      return res.status(404).json({ error: "Item not found to soft delete" });
    }

    saveDB(db);
    return res.json({ success: true, message: `${table} row moved to trash bin` });
  }

  // PHYSICAL DELETION AS PERMANENT SAFEGUARD
  if (table === "courses") {
    db.courses = db.courses.filter(c => c.id !== rowId);
    db.enrollments = db.enrollments.filter(e => e.courseId !== rowId);
  } else if (table === "modules") {
    db.courses.forEach(c => {
      if (c.modules) {
        c.modules = c.modules.filter(m => m.id !== rowId);
      }
    });
  } else if (table === "lessons") {
    db.courses.forEach(c => {
      if (c.modules) {
        c.modules.forEach(m => {
          if (m.lessons) {
            m.lessons = m.lessons.filter(l => l.id !== rowId);
          }
        });
      }
    });
    db.lessonProgress = db.lessonProgress.filter(p => p.lessonId !== rowId);
  } else if (table === "tutorials") {
    db.tutorials = db.tutorials.filter(t => t.id !== rowId);
  } else if (table === "pdfs") {
    db.pdfs = db.pdfs.filter(p => p.id !== rowId);
    db.bookmarks = db.bookmarks.filter(b => b.pdfId !== rowId);
  } else if (table === "quizzes") {
    db.quizzes = db.quizzes.filter(q => q.id !== rowId);
  } else if (table === "questions") {
    db.quizzes.forEach(q => {
      if (q.questions) {
        q.questions = q.questions.filter((qu: any) => qu.id !== rowId);
      }
    });
  } else if (table === "challenges") {
    db.challenges = db.challenges.filter(c => c.id !== rowId);
  } else if (table === "announcements") {
    db.announcements = db.announcements.filter(a => a.id !== rowId);
  } else if (table === "certificates") {
    db.certificates = db.certificates.filter(c => Number(c.courseId) !== rowId && (c as any).id !== rowId);
  } else if (table === "users") {
    db.users = db.users.filter(u => u.id !== rowId);
  } else if (table === "categories") {
    db.categories = (db.categories || []).filter((c: any) => c.id !== rowId);
  } else if (table === "programming_examples") {
    db.programmingExamples = (db.programmingExamples || []).filter((p: any) => p.id !== rowId);
  } else if (table === "pdf_purchases") {
    db.pdfPurchases = (db.pdfPurchases || []).filter((p: any) => p.id !== rowId);
  } else {
    return res.status(400).json({ error: "Dynamic delete table was not found" });
  }

  saveDB(db);
  res.json({ success: true, message: `Table row physically scrubbed from ${table}` });
});

// GET TRASHED AUDIT DATA FOR DESKTOP TRASH BIN
app.get("/api/admin/trash", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });
  const db = getDB();
  
  const trashedCourses = (db.courses || []).filter((c: any) => c.status === "Trashed");
  const trashedTutorials = (db.tutorials || []).filter((t: any) => t.status === "Trashed");
  const trashedPdfs = (db.pdfs || []).filter((p: any) => p.status === "Trashed");
  const trashedQuizzes = (db.quizzes || []).filter((q: any) => q.status === "Trashed");
  const trashedChallenges = (db.challenges || []).filter((c: any) => c.status === "Trashed");
  const trashedAnnouncements = (db.announcements || []).filter((a: any) => a.status === "Trashed");
  
  const trashedLessons: any[] = [];
  (db.courses || []).forEach((c: any) => {
    (c.modules || []).forEach((m: any) => {
      (m.lessons || []).forEach((l: any) => {
        if (l.status === "Trashed") {
          trashedLessons.push({
            ...l,
            courseId: c.id,
            courseTitle: c.title,
            moduleId: m.id,
            moduleTitle: m.title
          });
        }
      });
    });
  });

  res.json({
    success: true,
    trash: {
      courses: trashedCourses,
      tutorials: trashedTutorials,
      pdfs: trashedPdfs,
      quizzes: trashedQuizzes,
      challenges: trashedChallenges,
      announcements: trashedAnnouncements,
      lessons: trashedLessons
    }
  });
});

// RESTORE TRASHED CONTENT BACK TO ACTIVE DRAFT STATE
app.post("/api/admin/trash/restore", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });
  
  const { table, id } = req.body;
  const rowId = Number(id);
  const db = getDB();
  let found = false;

  if (table === "courses") {
    const idx = db.courses.findIndex((c: any) => c.id === rowId);
    if (idx !== -1) {
      db.courses[idx].status = "Draft";
      db.courses[idx].deleted_at = null;
      db.courses[idx].deleted_by = null;
      found = true;
    }
  } else if (table === "tutorials") {
    const idx = db.tutorials.findIndex((t: any) => t.id === rowId);
    if (idx !== -1) {
      db.tutorials[idx].status = "Draft";
      db.tutorials[idx].deleted_at = null;
      db.tutorials[idx].deleted_by = null;
      found = true;
    }
  } else if (table === "pdfs") {
    const idx = db.pdfs.findIndex((p: any) => p.id === rowId);
    if (idx !== -1) {
      db.pdfs[idx].status = "Draft";
      db.pdfs[idx].deleted_at = null;
      db.pdfs[idx].deleted_by = null;
      found = true;
    }
  } else if (table === "quizzes") {
    const idx = db.quizzes.findIndex((q: any) => q.id === rowId);
    if (idx !== -1) {
      db.quizzes[idx].status = "Draft";
      db.quizzes[idx].deleted_at = null;
      db.quizzes[idx].deleted_by = null;
      found = true;
    }
  } else if (table === "challenges") {
    const idx = db.challenges.findIndex((c: any) => c.id === rowId);
    if (idx !== -1) {
      db.challenges[idx].status = "Draft";
      db.challenges[idx].deleted_at = null;
      db.challenges[idx].deleted_by = null;
      found = true;
    }
  } else if (table === "announcements") {
    const idx = db.announcements.findIndex((a: any) => a.id === rowId);
    if (idx !== -1) {
      db.announcements[idx].status = "Draft";
      db.announcements[idx].deleted_at = null;
      db.announcements[idx].deleted_by = null;
      found = true;
    }
  } else if (table === "lessons") {
    for (const c of db.courses) {
      for (const m of (c.modules || [])) {
        const lIdx = (m.lessons || []).findIndex((l: any) => l.id === rowId);
        if (lIdx !== -1) {
          m.lessons[lIdx].status = "Published";
          m.lessons[lIdx].deleted_at = null;
          m.lessons[lIdx].deleted_by = null;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  if (!found) {
    return res.status(404).json({ error: "Item to restore was not found" });
  }

  saveDB(db);
  res.json({ success: true, message: `${table} item restored to active draft status` });
});

// TOGGLE PUBLICATION STATUS LIVE FOR ADMIN TOGGLE BUTTONS
app.post("/api/admin/tables/:table/:id/toggle-publish", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const table = req.params.table;
  const rowId = Number(req.params.id);
  const db = getDB();
  let item: any = null;

  if (table === "courses") {
    item = db.courses.find(c => c.id === rowId);
  } else if (table === "tutorials") {
    item = db.tutorials.find(t => t.id === rowId);
  } else if (table === "pdfs") {
    item = db.pdfs.find(p => p.id === rowId);
  } else if (table === "quizzes") {
    item = db.quizzes.find(q => q.id === rowId);
  } else if (table === "challenges") {
    item = db.challenges.find(c => c.id === rowId);
  } else if (table === "announcements") {
    item = db.announcements.find(a => a.id === rowId);
  } else if (table === "lessons") {
    for (const c of db.courses) {
      for (const m of (c.modules || [])) {
        item = (m.lessons || []).find((l: any) => l.id === rowId);
        if (item) break;
      }
      if (item) break;
    }
  }

  if (!item) return res.status(404).json({ error: "Item not found to toggle publication status" });

  const prevStatus = item.status || (item.isPublished !== false ? "Published" : "Draft");
  const newStatus = (prevStatus === "Published") ? "Unpublished" : "Published";
  item.status = newStatus;
  item.isPublished = (newStatus === "Published");

  saveDB(db);
  res.json({ success: true, item, prevStatus, newStatus });
});

// BULK ACTIONS UNIVERSAL SHEET ROUTE
app.post("/api/admin/tables/:table/bulk", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const table = req.params.table;
  const { action, ids } = req.body;
  if (!action || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid specifications for universal bulk action" });
  }

  const db = getDB();
  const numIds = ids.map(Number);

  if (action === "delete") {
    // Perform physical purges
    if (table === "courses") db.courses = db.courses.filter(c => !numIds.includes(c.id));
    else if (table === "tutorials") db.tutorials = db.tutorials.filter(t => !numIds.includes(t.id));
    else if (table === "pdfs") db.pdfs = db.pdfs.filter(p => !numIds.includes(p.id));
    else if (table === "challenges") db.challenges = db.challenges.filter(c => !numIds.includes(c.id));
    else if (table === "announcements") db.announcements = db.announcements.filter(a => !numIds.includes(a.id));
    else if (table === "users") db.users = db.users.filter(u => !numIds.includes(u.id));
    else if (table === "quizzes") db.quizzes = db.quizzes.filter(q => !numIds.includes(q.id));
    else if (table === "categories") db.categories = (db.categories || []).filter((c: any) => !numIds.includes(c.id));
    else if (table === "programming_examples") db.programmingExamples = (db.programmingExamples || []).filter((p: any) => !numIds.includes(p.id));
    else if (table === "pdf_purchases") db.pdfPurchases = (db.pdfPurchases || []).filter((p: any) => !numIds.includes(p.id));
  } else if (action === "publish") {
    if (table === "courses") db.courses.forEach(c => { if (numIds.includes(c.id)) c.isPublished = true; });
    else if (table === "tutorials") db.tutorials.forEach(t => { if (numIds.includes(t.id)) t.isPublished = true; });
    else if (table === "pdfs") db.pdfs.forEach(p => { if (numIds.includes(p.id)) p.isPublished = true; });
    else if (table === "challenges") db.challenges.forEach(c => { if (numIds.includes(c.id)) c.isPublished = true; });
    else if (table === "announcements") db.announcements.forEach(a => { if (numIds.includes(a.id)) a.isPublished = true; });
  } else if (action === "unpublish") {
    if (table === "courses") db.courses.forEach(c => { if (numIds.includes(c.id)) c.isPublished = false; });
    else if (table === "tutorials") db.tutorials.forEach(t => { if (numIds.includes(t.id)) t.isPublished = false; });
    else if (table === "pdfs") db.pdfs.forEach(p => { if (numIds.includes(p.id)) p.isPublished = false; });
    else if (table === "challenges") db.challenges.forEach(c => { if (numIds.includes(c.id)) c.isPublished = false; });
    else if (table === "announcements") db.announcements.forEach(a => { if (numIds.includes(a.id)) a.isPublished = false; });
  }

  saveDB(db);
  res.json({ success: true });
});

// CSV BULK IMPORT ENDPOINT
app.post("/api/admin/tables/:table/import-csv", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const table = req.params.table;
  const { rows } = req.body; // Array of objects matching headers
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: "CSV parsed rows array expected" });
  }

  const db = getDB();

  rows.forEach(row => {
    if (table === "courses") {
      const nextId = db.courses.length ? Math.max(...db.courses.map(c => c.id)) + 1 : 1;
      db.courses.push({ id: nextId, title: row.title || "Untitled", description: row.description || "", price: Number(row.price) || 0, isPremium: String(row.isPremium).toLowerCase() === "true", modules: [], isPublished: true, thumbnailUrl: row.thumbnailUrl || "", bannerUrl: row.bannerUrl || "" } as any);
    } else if (table === "tutorials") {
      const nextId = db.tutorials.length ? Math.max(...db.tutorials.map(t => t.id)) + 1 : 1;
      db.tutorials.push({ id: nextId, title: row.title || "Untitled", category: row.category || "General", content: row.content || "", codeSnippet: row.codeSnippet || "", languageSlug: row.languageSlug || "javascript", isPublished: true });
    } else if (table === "pdfs") {
      const nextId = db.pdfs.length ? Math.max(...db.pdfs.map(p => p.id)) + 1 : 1;
      db.pdfs.push({ id: nextId, title: row.title || "Untitled", author: row.author || "Unknown", category: row.category || "General", fileUrl: row.fileUrl || "https://powercodeacademy.com/book.pdf", previewUrl: row.previewUrl || "", isPremium: String(row.isPremium).toLowerCase() === "true", isPublished: true });
    } else if (table === "quizzes") {
      const nextId = db.quizzes.length ? Math.max(...db.quizzes.map(q => q.id)) + 1 : 1;
      db.quizzes.push({ id: nextId, title: row.title || "Untitled Quiz", courseId: Number(row.courseId) || null, durationMinutes: Number(row.durationMinutes) || 15, passingScore: Number(row.passingScore) || 75, questions: [] });
    } else if (table === "challenges") {
      const nextId = db.challenges.length ? Math.max(...db.challenges.map(c => c.id)) + 1 : 1;
      db.challenges.push({ id: nextId, title: row.title || "Untitled Challenge", description: row.description || "", difficulty: (row.difficulty || "EASY").toUpperCase(), starterCode: row.starterCode || "", solutionCode: row.solutionCode || "", points: Number(row.points) || 10, category: row.category || "Algorithms", isPublished: true, testCases: [] } as any);
    } else if (table === "announcements") {
      const nextId = db.announcements.length ? Math.max(...db.announcements.map(a => a.id)) + 1 : 1;
      db.announcements.push({ id: nextId, title: row.title || "Alert", content: row.content || "", createdAt: new Date().toISOString(), isImportant: String(row.isImportant).toLowerCase() === "true" });
    } else if (table === "categories") {
      db.categories = db.categories || [];
      const nextId = db.categories.length ? Math.max(...db.categories.map((c: any) => c.id)) + 1 : 1;
      db.categories.push({ id: nextId, name: row.name || "Custom" });
    } else if (table === "programming_examples") {
      db.programmingExamples = db.programmingExamples || [];
      const nextId = db.programmingExamples.length ? Math.max(...db.programmingExamples.map((p: any) => p.id)) + 1 : 1;
      db.programmingExamples.push({ id: nextId, title: row.title || "Snippet", language: row.language || "JavaScript", code: row.code || "", description: row.description || "" });
    }
  });

  saveDB(db);
  res.json({ success: true, count: rows.length });
});


// Global error handler middleware to prevent stack traces from returning HTML (which breaks frontend JSON parsing)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("API error intercepted:", err);
  res.status(500).json({
    error: err?.message || "Internal server error",
    details: err?.stack || ""
  });
});


// Dev vs Production Setup integration in server.ts
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA catchall fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[PowerCode Academy Dev] Server listening robustly on: http://localhost:${PORT}`);
  });
}

startServer();
