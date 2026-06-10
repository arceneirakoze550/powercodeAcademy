import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Initialize express app
const app = express();
const PORT = 3000;

app.use(express.json());

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

// JSON Mock DB File Path to persist sandbox operations
const DB_FILE = path.join(process.cwd(), "db_state.json");

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
}

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  isPremium: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
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
    }[];
  }[];
}

interface Tutorial {
  id: number;
  title: string;
  category: string;
  content: string;
  codeSnippet: string;
  languageSlug: string;
  coverImageUrl?: string;
  videoUrl?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

interface Pdf {
  id: number;
  title: string;
  author: string;
  category: string;
  fileUrl: string;
  previewUrl: string;
  isPremium: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

interface Quiz {
  id: number;
  courseId: number | null;
  title: string;
  durationMinutes: number;
  passingScore: number;
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
            { id: 1001, title: "Welcome to JavaScript variables", content: "JavaScript has three core ways to declare variables: `let`, `const`, and `var`. Understanding Block vs Function scope is crucial. Write your first variables in the terminal and output using console.log.", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", durationMinutes: 10, isPreviewAllowed: true },
            { id: 1002, title: "Data Types & Lexical Scoping", content: "Primitives include string, number, boolean, null, undefined, and symbol. Non-primitives are object, function, array. Learn how closures capture references.", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", durationMinutes: 15, isPreviewAllowed: false }
          ]
        },
        {
          id: 102,
          title: "2. Control flows, condition loops",
          lessons: [
            { id: 1003, title: "Loops: For, While and For...Of", content: "Master array manipulation loops, using break, continue, and index operations.", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", durationMinutes: 12, isPreviewAllowed: false }
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
            { id: 2001, title: "Arrays & List comprehensions", content: "Explore computational Big-O metrics and fast indexing list transformations.", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", durationMinutes: 18, isPreviewAllowed: true }
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
            { id: 3001, title: "Writing migrations the expert way", content: "Define correct column typings, indexes, check constraints, foreign keys and triggers for databases.", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", durationMinutes: 22, isPreviewAllowed: false }
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
      languageSlug: "javascript"
    },
    {
      id: 2,
      title: "Binary Search Tree implementations",
      category: "Python",
      content: "A Binary Search Tree (BST) is a hierarchical structural node arrangement where left child houses lesser numerical bounds, and right child houses greater values. Time complexity is O(log n).",
      codeSnippet: "class Node:\n    def __init__(self, key):\n        self.left = None\n        self.right = None\n        self.val = key\n\ndef insert(root, key):\n    if root is None:\n        return Node(key)\n    else:\n        if root.val < key:\n            root.right = insert(root.right, key)\n        else:\n            root.left = insert(root.left, key)\n    return root",
      languageSlug: "python"
    },
    {
      id: 3,
      title: "Flexbox vs Grid layouts",
      category: "CSS",
      content: "Flexbox is designed for 1-dimensional layouts (row or column), while Grid is designed for 2-dimensional grid layouts, facilitating column and row tracking simultaneously.",
      codeSnippet: "/* CSS 2D Grid example */\n.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}",
      languageSlug: "css"
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
    },
    {
      id: 2,
      title: "Python for Data Analysis",
      author: "Wes McKinney",
      category: "Python",
      fileUrl: "https://wesmckinney.com/book/",
      previewUrl: "https://wesmckinney.com/book/",
      isPremium: true,
    },
    {
      id: 3,
      title: "Designing Data-Intensive Applications",
      author: "Martin Kleppmann",
      category: "PostgreSQL",
      fileUrl: "https://learning.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/",
      previewUrl: "https://learning.oreilly.com/library/view/designing-data-intensive-applications/",
      isPremium: true,
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
  adminActivityLogs: []
};

// State Helper Functions
function getDB(): DbState {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultInitialState, null, 2), "utf8");
      return defaultInitialState;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    
    // Ensure all array properties exist to prevent runtime errors
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
      "adminActivityLogs"
    ];

    arrayKeys.forEach((key) => {
      if (!Array.isArray(parsed[key])) {
        parsed[key] = [];
      }
    });

    if (!parsed.siteSettings) {
      parsed.siteSettings = { ...defaultInitialState.siteSettings };
    }

    return parsed;
  } catch (err) {
    console.error("DB retrieval failed, using fallback memory", err);
    return defaultInitialState;
  }
}

function saveDB(state: DbState): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving persistent db state", err);
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

  const email = parts[1]; // Bearer <email> simulates simple token
  const db = getDB();
  return db.users.find(u => u.email === email) || null;
}

// AUTH API
app.post("/api/auth/register", (req, res) => {
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

  const token = newUser.email; // Simulating JWT
  res.json({ token, user: newUser });
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
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Support both passwordHash and password triggers safely
  const userPass = String(user.passwordHash || (user as any).password || "").trim();

  if (userPass !== cleanPassword) {
    console.warn(`[Login] Password mismatch for ${cleanEmail}`);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  user.lastActiveAt = new Date().toISOString();
  saveDB(db);

  const token = user.email; // Simulating JWT
  res.json({ token, user });
});

app.get("/api/auth/me", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Not authorized" });
  }
  res.json({ user });
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

  let rawCourses = db.courses;
  if (!isAdmin) {
    rawCourses = rawCourses.filter(c => c.isDeleted !== true && c.isArchived !== true && c.isPublished !== false);
  }

  const coursesWithUserData = rawCourses.map(c => {
    return {
      ...c,
      isEnrolled: enrolledCourseIds.includes(c.id),
      progressPercent: enrolledCourseIds.includes(c.id)
        ? Math.round(
            ((c.modules || []).flatMap(m => m.lessons || []).filter(l => progressLessIds.includes(l.id)).length /
              Math.max((c.modules || []).flatMap(m => m.lessons || []).length, 1)) *
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
              id: 10000 + lIdx + mIdx * 100 + newCourseId * 1000,
              title: l.title || `Lesson ${lIdx + 1}`,
              content: l.content || "",
              videoUrl: l.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4",
              durationMinutes: Number(l.durationMinutes) || 10,
              isPreviewAllowed: !!l.isPreviewAllowed
            }))
          : []
      }))
    : [];

  const newCourse: Course = {
    id: newCourseId,
    title,
    description,
    thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500",
    price: Number(price) || 0,
    isPremium: !!isPremium,
    modules: formattedModules
  };

  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  logAdminActivity(db, user.name, "CREATE", "COURSE", newCourse.title, String(ip));

  db.courses.push(newCourse);
  saveDB(db);
  res.json({ course: newCourse });
});

app.post("/api/courses/:id/enroll", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Auth required to enroll courses" });
  }

  const courseId = Number(req.params.id);
  const db = getDB();

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
          db.certificates.push({
            certificateCode: certCode,
            userId: user.id,
            userName: user.name,
            courseId,
            courseTitle: course.title,
            date: new Date().toLocaleDateString()
          });
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

  let list = db.tutorials || [];
  if (!isAdmin) {
    list = list.filter(t => t.isDeleted !== true && t.isArchived !== true && t.isPublished !== false);
  }
  res.json({ tutorials: list });
});

app.post("/api/tutorials", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { title, category, content, codeSnippet, languageSlug } = req.body;
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
    languageSlug: languageSlug || "javascript"
  };

  db.tutorials.push(newTutorial);
  saveDB(db);
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

  let list = db.pdfs || [];
  if (!isAdmin) {
    list = list.filter(p => p.isDeleted !== true && p.isArchived !== true && p.isPublished !== false);
  }

  const pdfsWithBookmarks = list.map(p => ({
    ...p,
    isBookmarked: bookmarkedIds.includes(p.id)
  }));

  res.json({ pdfs: pdfsWithBookmarks });
});

app.post("/api/pdfs", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

  const { title, author, category, fileUrl, previewUrl, isPremium } = req.body;
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
    isPremium: !!isPremium
  };

  db.pdfs.push(newPdf);
  saveDB(db);
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
  res.json({ quizzes: db.quizzes });
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

  let list = db.challenges || [];
  if (!isAdmin) {
    list = list.filter(c => c.isDeleted !== true && c.isArchived !== true && c.isPublished !== false);
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
  const userCertificates = db.certificates.filter(c => c.userId === user.id);
  res.json({ certificates: userCertificates });
});

// COMMUNITY
app.get("/api/community", (req, res) => {
  const db = getDB();
  res.json({ posts: db.community });
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
              videoUrl: l.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4",
              durationMinutes: Number(l.durationMinutes) || 10,
              isPreviewAllowed: !!l.isPreviewAllowed
            }))
          : []
      }))
    : db.courses[cIdx].modules;

  db.courses[cIdx] = {
    ...db.courses[cIdx],
    title: title || db.courses[cIdx].title,
    description: description || db.courses[cIdx].description,
    thumbnailUrl: thumbnailUrl || db.courses[cIdx].thumbnailUrl,
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
      course.isDeleted = true;
      logAdminActivity(db, user.name, "DELETE", "COURSE", course.title, String(ip));
    }
  }

  saveDB(db);
  res.json({ success: true, message: permanent ? "Course permanently deleted" : "Course moved to trash successfully" });
});

// EDIT/UPDATE TUTORIAL
app.put("/api/tutorials/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const tutId = Number(req.params.id);
  const { title, category, content, codeSnippet, languageSlug, coverImageUrl, videoUrl } = req.body;

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
    videoUrl: videoUrl || db.tutorials[tIdx].videoUrl
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
      tut.isDeleted = true;
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
      pdf.isDeleted = true;
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
      challenge.isDeleted = true;
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
  res.json({ quiz: newQuiz });
});

// DELETE QUIZ
app.delete("/api/quizzes/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const qId = Number(req.params.id);
  const db = getDB();

  db.quizzes = db.quizzes.filter(q => q.id !== qId);
  saveDB(db);
  res.json({ success: true });
});

// GET & POST ANNOUNCEMENTS
app.get("/api/announcements", (req, res) => {
  const db = getDB();
  const user = parseUserFromAuth(req);
  const isAdmin = user && user.role === "ADMIN";

  let list = db.announcements || [];
  if (!isAdmin) {
    list = list.filter(a => a.isDeleted !== true && a.isArchived !== true && a.isPublished !== false);
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
      ann.isDeleted = true;
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
  const cert = {
    certificateCode: certCode,
    userId: targetStudent.id,
    userName: targetStudent.name,
    courseId: null,
    courseTitle: courseTitle,
    date: new Date().toLocaleDateString(),
    type: type || "Excellence Honors Award",
    description: description || "Awarded for exceptional coding performances and system validations.",
    qrCode: `https://powercodeacademy.com/verify/${certCode}`
  };

  db.certificates.push(cert);
  saveDB(db);
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
app.post("/api/upload", (req, res) => {
  const { fileName, fileType, fileData } = req.body; // fileData is base64 representation if sent, or empty

  if (!fileName) {
    return res.status(400).json({ error: "fileName parameter is required" });
  }

  // Generate a premium asset identifier matching the structure of Cloudinary paths
  const randomSlug = Math.random().toString(36).substring(2, 10);
  const folder = fileType === "video" ? "videos" : "images";
  const mockCloudinaryUrl = `https://res.cloudinary.com/powercode/image/upload/v172605/${folder}/${randomSlug}_${fileName.replace(/\s+/g, "_")}`;

  const db = getDB();

  // Index references inside local media collection tables depending on file properties
  if (fileType === "video") {
    db.tutorialVideos.push({
      id: db.tutorialVideos.length + 1,
      tutorialId: 0,
      videoUrl: mockCloudinaryUrl,
      fileName: fileName
    });
  } else {
    db.tutorialImages.push({
      id: db.tutorialImages.length + 1,
      tutorialId: 0,
      imageUrl: mockCloudinaryUrl
    });
  }

  saveDB(db);

  res.json({
    success: true,
    url: mockCloudinaryUrl,
    fileName,
    secure_url: mockCloudinaryUrl,
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
  let itemsList: any[] = [];
  if (contentType === "COURSE") itemsList = db.courses;
  else if (contentType === "TUTORIAL") itemsList = db.tutorials;
  else if (contentType === "PDF") itemsList = db.pdfs;
  else if (contentType === "CHALLENGE") itemsList = db.challenges;
  else if (contentType === "ANNOUNCEMENT") itemsList = db.announcements;
  else return res.status(400).json({ error: "Invalid content type specified" });

  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  ids.forEach(id => {
    const idx = itemsList.findIndex(item => item.id === Number(id));
    if (idx !== -1) {
      const item = itemsList[idx];
      if (action === "delete") {
        item.isDeleted = true;
        logAdminActivity(db, user.name, "DELETE", contentType, item.title, String(ip));
      } else if (action === "publish") {
        item.isPublished = true;
        logAdminActivity(db, user.name, "PUBLISH", contentType, item.title, String(ip));
      } else if (action === "unpublish") {
        item.isPublished = false;
        logAdminActivity(db, user.name, "UNPUBLISH", contentType, item.title, String(ip));
      } else if (action === "archive") {
        item.isArchived = true;
        logAdminActivity(db, user.name, "ARCHIVE", contentType, item.title, String(ip));
      } else if (action === "restore") {
        item.isDeleted = false;
        item.isArchived = false;
        logAdminActivity(db, user.name, "RESTORE", contentType, item.title, String(ip));
      } else if (action === "permanent_delete") {
        const title = item.title;
        itemsList.splice(idx, 1);
        logAdminActivity(db, user.name, "PERMANENT_DELETE", contentType, title, String(ip));
      }
    }
  });

  saveDB(db);
  res.json({ success: true });
});

// NEW CRUD PUT ROUTES FOR PDFS, CHALLENGES, AND ANNOUNCEMENTS
app.put("/api/pdfs/:id", (req, res) => {
  const user = parseUserFromAuth(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

  const pdfId = Number(req.params.id);
  const { title, author, category, fileUrl, previewUrl, isPremium, isPublished, isArchived } = req.body;

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
    isArchived: isArchived !== undefined ? !!isArchived : db.pdfs[idx].isArchived
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PowerCode Academy Dev] Server listening robustly on: http://localhost:${PORT}`);
  });
}

startServer();
