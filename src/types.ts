import { Language } from "./translations";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "STUDENT";
  avatarUrl: string;
  learningStreak: number;
  lastActiveAt: string;
  createdAt: string;
  isVerified: boolean;
  score: number;
  profile_picture_url?: string;
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  videoUrl: string;
  durationMinutes: number;
  isPreviewAllowed: boolean;
  quizId?: number;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  status?: string;
  deleted_at?: string;
  deleted_by?: string;
  playbackId?: string | null;
  isCompleted?: boolean;
}

export interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
  isCompleted?: boolean;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  isPremium: boolean;
  modules: Module[];
  isEnrolled?: boolean;
  progressPercent?: number;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

export interface Tutorial {
  id: number;
  title: string;
  category: string;
  content: string;
  codeSnippet: string;
  languageSlug: string;
  coverImageUrl?: string;
  videoUrl?: string;
  embedded_video_url?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

export interface PdfBook {
  id: number;
  title: string;
  author: string;
  category: string;
  fileUrl: string;
  previewUrl: string;
  isPremium: boolean;
  description?: string;
  publishedDate?: string;
  isBookmarked?: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Quiz {
  id: number;
  courseId: number | null;
  title: string;
  durationMinutes: number;
  passingScore: number;
  questions: QuizQuestion[];
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  status?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface CodingChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  starterCode: string;
  solutionCode: string;
  testCases: { input: any; output: any }[];
  points: number;
  category: string;
  isCompleted?: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

export interface CommunityPost {
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

export interface LeaderboardUser {
  name: string;
  score: number;
  streak: number;
}

export interface AnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalTutorials: number;
  totalPdfs: number;
  totalCertificates: number;
  revenue: number;
  weeklyRegistrations: number[];
  streakLeaderboard: LeaderboardUser[];
}

export interface SiteSettings {
  platformName: string;
  logoUrl: string;
  enableRegistration: boolean;
  landingPromoBanner: string;
}

export interface Certificate {
  certificateCode: string;
  userId: number;
  userName: string;
  courseId: number | null;
  courseTitle: string;
  date: string;
  type?: string; 
  description?: string;
  qrCode?: string;
  digitalSignature?: string;
}

export interface CertificateTemplate {
  id: number;
  title: string;
  subTitle: string;
  description: string;
  bgTheme: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isImportant: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

export interface UserAchievement {
  id: number;
  userId: number;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface LearningPath {
  id: number;
  title: string;
  description: string;
  courseIds: number[];
}

export interface CourseVideo {
  id: number;
  courseId: number;
  lessonId: number;
  videoUrl: string;
  fileName: string;
}

export interface TutorialVideo {
  id: number;
  tutorialId: number;
  videoUrl: string;
  fileName: string;
}

export interface CourseImage {
  id: number;
  courseId: number;
  imageUrl: string;
  imageType: "THUMBNAIL" | "BANNER";
}

export interface TutorialImage {
  id: number;
  tutorialId: number;
  imageUrl: string;
}

export interface AdminActivityLog {
  id: number;
  adminName: string;
  actionType: "CREATE" | "EDIT" | "DELETE" | "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "RESTORE" | "PERMANENT_DELETE" | "BULK_DELETE" | "BULK_PUBLISH" | "BULK_UNPUBLISH";
  contentType: "COURSE" | "TUTORIAL" | "PDF" | "CHALLENGE" | "ANNOUNCEMENT" | "QUIZ";
  contentTitle: string;
  timestamp: string;
  ipAddress: string;
}

export interface PdfPurchase {
  id: number;
  userId: number;
  userName: string;
  pdfId: number;
  pdfTitle: string;
  amountPaid: number;
  paymentMethod: "MTN" | "Airtel";
  phone: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  proofUrl: string;
  createdAt: string;
  approvedAt?: string;
}

export interface ProgrammingExample {
  id: number;
  title: string;
  language: string;
  code: string;
  description: string;
}

export interface Category {
  id: number;
  name: string;
}


