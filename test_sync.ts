import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pgConnectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

interface DbState {
  users: any[];
  courses: any[];
  tutorials: any[];
  pdfs: any[];
  quizzes: any[];
  challenges: any[];
  enrollments: any[];
  lessonProgress: any[];
  bookmarks: any[];
  quizAttempts: any[];
  challengeSubmissions: any[];
  certificates: any[];
  community: any[];
  siteSettings: any;
  system_settings: any;
  certificateTemplates: any[];
  certificateVerifications: any[];
  courseVideos: any[];
  tutorialVideos: any[];
  courseImages: any[];
  tutorialImages: any[];
  announcements: any[];
  aiConversations: any[];
  userAchievements: any[];
  digitalSignatures: any[];
  adminSettings: any[];
  learningPaths: any[];
  adminActivityLogs: any[];
  lessonNotes: any[];
  lessonComments: any[];
  pdfPurchases: any[];
  programmingExamples: any[];
  categories: any[];
  paymentRequests: any[];
  paymentProofs: any[];
  premiumAccess: any[];
  transactions: any[];
  notifications: any[];
  notificationSettings: any[];
  notificationReads: any[];
  notificationLogs: any[];
  pushTokens: any[];
  notificationSounds: any[];
}

async function loadDBFromPostgres(pgPool: pg.Pool): Promise<DbState> {
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
    siteSettings: {},
    system_settings: {},
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
    notificationSounds: []
  };

  const usersRes = await pgPool.query("SELECT * FROM users ORDER BY id ASC");
  db.users = usersRes.rows;

  const coursesRes = await pgPool.query("SELECT * FROM courses ORDER BY id ASC");
  db.courses = coursesRes.rows;

  const tutorialsRes = await pgPool.query("SELECT * FROM tutorials ORDER BY id ASC");
  db.tutorials = tutorialsRes.rows;

  const pdfsRes = await pgPool.query("SELECT * FROM pdf_books ORDER BY id ASC");
  db.pdfs = pdfsRes.rows.map(r => ({
    id: r.id,
    title: r.title,
    fileUrl: r.file_url,
    author: r.author,
    price: r.price,
    isPremium: r.is_premium,
    thumbnailUrl: r.thumbnail_url,
    description: r.description,
    createdAt: r.created_at,
    status: r.status,
    deleted_at: r.deleted_at,
    deleted_by: r.deleted_by
  }));

  const quizzesRes = await pgPool.query("SELECT * FROM quizzes ORDER BY id ASC");
  db.quizzes = quizzesRes.rows;

  const challengesRes = await pgPool.query("SELECT * FROM challenges ORDER BY id ASC");
  db.challenges = challengesRes.rows;

  const certsRes = await pgPool.query("SELECT * FROM certificates ORDER BY id ASC");
  db.certificates = certsRes.rows;

  const payRes = await pgPool.query("SELECT * FROM payment_requests ORDER BY id ASC");
  db.paymentRequests = payRes.rows;

  const txRes = await pgPool.query("SELECT * FROM transactions ORDER BY id ASC");
  db.transactions = txRes.rows;

  const noteRes = await pgPool.query("SELECT * FROM notifications ORDER BY id ASC");
  db.notifications = noteRes.rows;

  return db;
}

async function run() {
  if (!pgConnectionString) {
    console.error("No connection string found!");
    return;
  }
  const pgPool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const state = await loadDBFromPostgres(pgPool);
    console.log("Loaded current state row counts:");
    console.log("Users:", state.users.length);
    console.log("Courses:", state.courses.length);
    console.log("Tutorials:", state.tutorials.length);
    console.log("PDFs:", state.pdfs.length);
    console.log("Quizzes:", state.quizzes.length);
    console.log("Challenges:", state.challenges.length);
    console.log("Certificates:", state.certificates.length);
    console.log("Payment Requests:", state.paymentRequests.length);
    console.log("Transactions:", state.transactions.length);
    console.log("Notifications:", state.notifications.length);

    // Let's run parts of save/persist, logging each step
    console.log("\n--- SIMULATING persistStateToPostgres AT HIGH GRANULARITY ---");

    // 1. Users
    try {
      console.log("Testing Users loop...");
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
          u.id, u.name, u.email, u.password_hash || u.passwordHash, u.role, u.avatar_url || u.avatarUrl,
          u.learning_streak || u.learningStreak, u.last_active_at || u.lastActiveAt, u.created_at || u.createdAt, u.is_verified || u.isVerified, u.score,
          u.profile_picture_url || ""
        ]);
      }
      console.log("Users sync logic succeeded.");
    } catch (err: any) {
      console.error("Users loop failed:", err.message);
    }

    // 4. PDFs
    try {
      console.log("Testing PDFs loop...");
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
      console.log("PDFs sync logic succeeded.");
    } catch (err: any) {
      console.error("PDFs loop failed:", err.message);
    }

    // 7. Certificates
    try {
      console.log("Testing Certificates loop...");
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
          cert.user_id || cert.userId, cert.course_id || cert.courseId, cert.qr_code || cert.qrCode || "", cert.certificate_code || cert.certificateCode, cert.user_name || cert.userName || "",
          cert.course_title || cert.courseTitle || "", cert.created_at || cert.date || "", cert.type || "COURSE", cert.description || "", cert.qr_code || cert.qrCode || ""
        ]);
      }
      console.log("Certificates sync logic succeeded.");
    } catch (err: any) {
      console.error("Certificates loop failed:", err.message);
    }

  } catch (err: any) {
    console.error("Critical error in run:", err.message);
  } finally {
    await pgPool.end();
  }
}

run();
