import React, { useState, useEffect } from "react";
import { User, Course, Tutorial, PdfBook, Quiz, CodingChallenge, Certificate, Announcement, LearningPath } from "../types";
import TrashManager from "./TrashManager";
import ContentMediaManager from "./ContentMediaManager";
import { Users, BookOpen, FileText, Landmark, Award, ShieldAlert, TrendingUp, Settings, Plus, Flame, Sparkles, BookMarked, Eye, Trash, CheckSquare, Clock, Upload, Film, Edit, HelpCircle, Check, MapPin, Megaphone, Star, ChevronRight, CornerDownRight, DollarSign, Zap } from "lucide-react";
import { exportSelectedItemsToPdf } from "../utils/pdfService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import CertificateSettings from "./CertificateSettings";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface DashboardProps {
  user: User;
  onViewCertificate: (cert: Certificate) => void;
  coursesList: Course[];
  onEnrollCourse: (courseId: number) => void;
  t: (key: string) => string;
  onUpdateUser?: (updated: User) => void;
  triggerToast?: (message: string, type?: string) => void;
  onRefreshData?: () => void;
}

type AdminTab = "stats" | "courses" | "tutorials" | "pdfs" | "challenges" | "quizzes" | "certificates" | "announcements" | "paths" | "settings" | "purchases" | "trash" | "logs" | "sounds" | "transactions" | "media" | "users";

export default function Dashboard({ user, onViewCertificate, coursesList, onEnrollCourse, t, onUpdateUser, triggerToast, onRefreshData }: DashboardProps) {
  const isAdmin = user.role === "ADMIN";

  // LOCAL TOAST FALLBACK SYSTEM
  const [localToast, setLocalToast] = useState<{ message: string; type: string } | null>(null);
  const showToast = (message: string, type: string = "info") => {
    if (triggerToast) {
      triggerToast(message, type);
    } else {
      setLocalToast({ message, type });
      setTimeout(() => setLocalToast(null), 4000);
    }
  };

  // REUSABLE CONFIRM DELETE MODAL STATE
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const openDeleteConfirmation = (title: string, description: string, onConfirm: () => Promise<void> | void) => {
    setDeleteModal({
      isOpen: true,
      title,
      description,
      onConfirm,
    });
  };

  // ADMIN VIEW CONFIG
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("stats");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // DATABASE/PLATFORM PREFERENCE PRESETS
  const [platformName, setPlatformName] = useState<string>("PowerCode Academy");
  const [enableRegistration, setEnableRegistration] = useState<boolean>(true);
  const [landingPromoBanner, setLandingPromoBanner] = useState<string>("");
  const [settingsFeedback, setSettingsFeedback] = useState<string>("");

  // CERTIFICATE OFFICIAL DIGITAL SIGNATURE & SEAL SYSTEM SETTINGS
  const [officialSignatureUrl, setOfficialSignatureUrl] = useState<string>("");
  const [officialSealUrl, setOfficialSealUrl] = useState<string>("");
  const [certificateFeedback, setCertificateFeedback] = useState<string>("");

  // COLLECTIONS STATE FOR MANAGEMENT
  const [adminCourses, setAdminCourses] = useState<Course[]>([]);
  const [adminTutorials, setAdminTutorials] = useState<Tutorial[]>([]);
  const [adminPdfs, setAdminPdfs] = useState<PdfBook[]>([]);
  const [adminChallenges, setAdminChallenges] = useState<CodingChallenge[]>([]);
  const [adminQuizzes, setAdminQuizzes] = useState<Quiz[]>([]);
  const [adminCertificates, setAdminCertificates] = useState<Certificate[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<Announcement[]>([]);
  const [adminLearningPaths, setAdminLearningPaths] = useState<LearningPath[]>([]);
  const [adminPurchases, setAdminPurchases] = useState<any[]>([]);
  const [adminPaymentRequests, setAdminPaymentRequests] = useState<any[]>([]);
  const [adminRevenueData, setAdminRevenueData] = useState<any>(null);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectExplanation, setRejectExplanation] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");
  const [paymentQuery, setPaymentQuery] = useState<string>("");
  const [revenueTimeframe, setRevenueTimeframe] = useState<string>("all");

  const [userNotificationSettings, setUserNotificationSettings] = useState<any>({
    emailNotifications: true,
    pushNotifications: true,
    soundNotifications: true,
    inAppNotifications: true,
  });
  const [notificationSoundsList, setNotificationSoundsList] = useState<any[]>([]);
  const [adminSelectedAlertType, setAdminSelectedAlertType] = useState<string>("success");
  const [customSoundUploadUrl, setCustomSoundUploadUrl] = useState<string>("");
  const [customSoundFileLabel, setCustomSoundFileLabel] = useState<string>("");
  const [studentPaymentRequestsList, setStudentPaymentRequestsList] = useState<any[]>([]);
  const [adminTransactions, setAdminTransactions] = useState<any[]>([]);
  const [txFilterQuery, setTxFilterQuery] = useState<string>("");
  const [txFilterStatus, setTxFilterStatus] = useState<string>("ALL");

  // FILE UPLOAD AND SIMULATION HELPER
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // 1. COURSE CREATOR/EDITOR STATE
  const [editCourseId, setEditCourseId] = useState<number | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [courseDesc, setCourseDesc] = useState<string>("");
  const [courseThumbnail, setCourseThumbnail] = useState<string>("");
  const [courseBanner, setCourseBanner] = useState<string>("");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>("");
  const [coursePrice, setCoursePrice] = useState<string>("0");
  const [coursePremium, setCoursePremium] = useState<boolean>(false);
  const [courseModulesJson, setCourseModulesJson] = useState<string>(
    JSON.stringify([
      {
        title: "Module 1: Basic Variables",
        lessons: [
          { title: "Lesson 1.1: Syntax Basics", content: "Learn basic keywords.", videoUrl: "", durationMinutes: 10, isPreviewAllowed: true }
        ]
      }
    ], null, 2)
  );

  // 2. TUTORIAL CREATOR/EDITOR STATE
  const [editTutorialId, setEditTutorialId] = useState<number | null>(null);
  const [tutTitle, setTutTitle] = useState<string>("");
  const [tutCategory, setTutCategory] = useState<string>("Web Development");
  const [tutContent, setTutContent] = useState<string>("");
  const [tutCode, setTutCode] = useState<string>("");
  const [tutLanguage, setTutLanguage] = useState<string>("javascript");
  const [tutCoverImg, setTutCoverImg] = useState<string>("");
  const [tutVideoUrl, setTutVideoUrl] = useState<string>("");
  const [tutEmbeddedVideoUrl, setTutEmbeddedVideoUrl] = useState<string>("");

  // 3. PDF BOOK CREATOR STATE
  const [pdfTitle, setPdfTitle] = useState<string>("");
  const [pdfAuthor, setPdfAuthor] = useState<string>("");
  const [pdfCategory, setPdfCategory] = useState<string>("Coding");
  const [pdfFileUrl, setPdfFileUrl] = useState<string>("");
  const [pdfPremium, setPdfPremium] = useState<boolean>(false);
  const [pdfDescription, setPdfDescription] = useState<string>("");
  const [pdfPublishedDate, setPdfPublishedDate] = useState<string>("");

  // 4. CODING CHALLENGE CREATOR
  const [challengeTitle, setChallengeTitle] = useState<string>("");
  const [challengeDesc, setChallengeDesc] = useState<string>("");
  const [challengeDifficulty, setChallengeDifficulty] = useState<string>("EASY");
  const [challengeStarterCode, setChallengeStarterCode] = useState<string>("function main() {\n  \n}");
  const [challengeSolutionCode, setChallengeSolutionCode] = useState<string>("function main() {\n  return true;\n}");
  const [challengeTestCasesJson, setChallengeTestCasesJson] = useState<string>('[\n  { "input": "hello", "output": "hello" }\n]');
  const [challengePoints, setChallengePoints] = useState<string>("10");
  const [challengeCategory, setChallengeCategory] = useState<string>("Algorithms");

  // 5. QUIZ CREATOR
  const [quizTitle, setQuizTitle] = useState<string>("");
  const [quizPassScore, setQuizPassScore] = useState<string>("70");
  const [quizDuration, setQuizDuration] = useState<string>("15");
  const [quizQuestionsJson, setQuizQuestionsJson] = useState<string>(
    JSON.stringify([
      {
        question: "What is correct execution parameter?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: "Option A"
      }
    ], null, 2)
  );

  // 6. MANUAL CERTIFICATE GENERATOR
  const [certStudentEmail, setCertStudentEmail] = useState<string>("");
  const [certCourseTitle, setCertCourseTitle] = useState<string>("");
  const [certAwardType, setCertAwardType] = useState<string>("Excellence Honors Award");
  const [certAwardDesc, setCertAwardDesc] = useState<string>("Awarded for demonstrating highly optimized algorithmic code verification scores.");

  // 7. ANNOUNCEMENT CREATOR
  const [annTitle, setAnnTitle] = useState<string>("");
  const [annContent, setAnnContent] = useState<string>("");
  const [annImportant, setAnnImportant] = useState<boolean>(true);

  // 8. LEARNING PATH CREATOR
  const [pathTitle, setPathTitle] = useState<string>("");
  const [pathDesc, setPathDesc] = useState<string>("");
  const [pathCourseIds, setPathCourseIds] = useState<string>("");

  // EXTRA EDIT ENTITIES STATE
  const [editPdfId, setEditPdfId] = useState<number | null>(null);
  const [editChallengeId, setEditChallengeId] = useState<number | null>(null);
  const [editAnnouncementId, setEditAnnouncementId] = useState<number | null>(null);

  // SELECTION STATE (BULK ACTIONS)
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [selectedTutorials, setSelectedTutorials] = useState<number[]>([]);
  const [selectedPdfs, setSelectedPdfs] = useState<number[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<number[]>([]);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<number[]>([]);

  // ADMIN ACTIVITY LOGS STATE
  const [adminActivityLogs, setAdminActivityLogs] = useState<any[]>([]);

  // GENERAL STATE VALIDATION FEEDBACK
  const [feedback, setFeedback] = useState<string>("");

  // DATABASE CONNECTION STATUS (NEON POSTGRES VS FALLBACK)
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; driver: string; hasConnectionString: boolean } | null>(null);

  // LOAD COMPLETE DATA PANEL FOR CORRESPONDING VISITS
  const loadPlatformData = async () => {
    setLoading(true);
    const safeFetchJson = async (url: string, init?: RequestInit) => {
      try {
        const res = await fetch(url, init);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return await res.json();
        }
      } catch (err) {
        console.warn(`Dashboard failed to fetch or parse ${url}`, err);
      }
      return {};
    };

    try {
      const statsData = await safeFetchJson("/api/analytics");
      setStats(statsData);

      // Fetch Postgres / Neon connection status
      const pgStatus = await safeFetchJson("/api/db-status");
      setDbStatus(pgStatus);

      // Settings config
      const setData = await safeFetchJson("/api/settings");
      if (setData.settings) {
        setPlatformName(setData.settings.platformName);
        setEnableRegistration(setData.settings.enableRegistration);
        setLandingPromoBanner(setData.settings.landingPromoBanner);
      }

      // Certificate System Settings
      const certSetData = await safeFetchJson("/api/system-settings");
      if (certSetData.system_settings) {
        setOfficialSignatureUrl(certSetData.system_settings.official_signature_url || "");
        setOfficialSealUrl(certSetData.system_settings.official_seal_url || "");
      }

      // Catalog entities
      const coursesData = await safeFetchJson("/api/courses", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminCourses(coursesData.courses || []);

      const tutData = await safeFetchJson("/api/tutorials", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminTutorials(tutData.tutorials || []);

      const pdfData = await safeFetchJson("/api/pdfs", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminPdfs(pdfData.pdfs || []);

      const chalData = await safeFetchJson("/api/challenges", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminChallenges(chalData.challenges || []);

      const quizData = await safeFetchJson("/api/quizzes", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminQuizzes(quizData.quizzes || []);

      const certsData = await safeFetchJson("/api/certificates", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminCertificates(certsData.certificates || []);

      const annData = await safeFetchJson("/api/announcements", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminAnnouncements(annData.announcements || []);

      const pathsData = await safeFetchJson("/api/learning-paths", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminLearningPaths(pathsData.learningPaths || []);

      // PDF Purchases
      const purchasesData = await safeFetchJson("/api/pdf-purchases", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminPurchases(purchasesData.purchases || []);

      // Universal Payments Requests
      const paymentsReqData = await safeFetchJson("/api/payments/admin", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminPaymentRequests(paymentsReqData.requests || []);

      // Revenue Analytics metrics
      const revenueReport = await safeFetchJson("/api/admin/revenue", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminRevenueData(revenueReport || null);

      // Fetch all system users (for admin management and trash soft-delete references)
      const usersTable = await safeFetchJson("/api/admin/tables/users", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      if (usersTable && Array.isArray(usersTable.rows)) {
        setAllUsersList(usersTable.rows);
      } else if (usersTable && Array.isArray(usersTable.items)) {
        setAllUsersList(usersTable.items);
      } else {
        // Fallback or Direct User Array sync
        const customUsers = await safeFetchJson("/api/admin/tables/users", {
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        setAllUsersList(Array.isArray(customUsers) ? customUsers : []);
      }

      // Admin logs
      const logsData = await safeFetchJson("/api/admin/logs", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminActivityLogs(logsData.logs || []);

      // Admin transactions
      if (isAdmin) {
        const txData = await safeFetchJson("/api/admin/transactions", {
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        if (txData && txData.success && Array.isArray(txData.transactions)) {
          setAdminTransactions(txData.transactions);
        }
      }

      // Load Notification settings for active user
      const settingsData = await safeFetchJson("/api/notifications/settings", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      if (settingsData.success && settingsData.settings) {
        setUserNotificationSettings(settingsData.settings);
      }

      // Load Notification sounds list
      const soundsData = await safeFetchJson("/api/notifications/sounds", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      if (soundsData.success && Array.isArray(soundsData.sounds)) {
        setNotificationSoundsList(soundsData.sounds);
      }

      // Load non-admin student payments list for Transaction History View
      if (user.role !== "ADMIN") {
        const studentPayments = await safeFetchJson("/api/payments/my-status", {
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        if (studentPayments && Array.isArray(studentPayments.requests)) {
          setStudentPaymentRequestsList(studentPayments.requests);
        }
      }

    } catch (e) {
      console.error("Dashboard database synchronization failed", e);
    } finally {
      setLoading(false);
      if (onRefreshData) {
        onRefreshData();
      }
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, [user]);

  // ==========================================
  // NEW BULK OPERATIONS HANDLERS
  // ==========================================
  const triggerBulkAction = async (
    contentType: "COURSE" | "TUTORIAL" | "PDF" | "CHALLENGE" | "ANNOUNCEMENT", 
    action: "delete" | "publish" | "unpublish" | "archive" | "restore" | "permanent_delete",
    ids: number[]
  ) => {
    if (ids.length === 0) {
      alert("Please select at least one item first.");
      return;
    }

    const performStoreAction = async () => {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({ contentType, action, ids })
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update local state immediately via local filter operations
      if (action === "delete" || action === "permanent_delete") {
        if (contentType === "COURSE") {
          setAdminCourses(prev => prev.filter(c => !ids.includes(c.id)));
          setSelectedCourses([]);
        } else if (contentType === "TUTORIAL") {
          setAdminTutorials(prev => prev.filter(t => !ids.includes(t.id)));
          setSelectedTutorials([]);
        } else if (contentType === "PDF") {
          setAdminPdfs(prev => prev.filter(p => !ids.includes(p.id)));
          setSelectedPdfs([]);
        } else if (contentType === "CHALLENGE") {
          setAdminChallenges(prev => prev.filter(c => !ids.includes(c.id)));
          setSelectedChallenges([]);
        } else if (contentType === "ANNOUNCEMENT") {
          setAdminAnnouncements(prev => prev.filter(a => !ids.includes(a.id)));
          setSelectedAnnouncements([]);
        }
      } else {
        if (contentType === "COURSE") setSelectedCourses([]);
        else if (contentType === "TUTORIAL") setSelectedTutorials([]);
        else if (contentType === "PDF") setSelectedPdfs([]);
        else if (contentType === "CHALLENGE") setSelectedChallenges([]);
        else if (contentType === "ANNOUNCEMENT") setSelectedAnnouncements([]);
      }

      showToast(`Bulk ${action} completed successfully! 🧹`, "success");
      loadPlatformData();
    };

    if (action === "delete" || action === "permanent_delete") {
      let title = "Execute Bulk Delete?";
      let desc = `Are you sure you want to delete ${ids.length} selected items?`;
      if (action === "permanent_delete") {
        title = "Execute Bulk Permanent Delete?";
        desc = `CRITICAL WARNING: This will permanently and irreversibly delete ${ids.length} selected items from the active database! Continue?`;
      }
      openDeleteConfirmation(title, desc, performStoreAction);
    } else {
      try {
        await performStoreAction();
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const triggerBulkExport = async (
    contentType: "COURSE" | "TUTORIAL" | "PDF" | "CHALLENGE" | "ANNOUNCEMENT",
    ids: number[]
  ) => {
    if (ids.length === 0) {
      alert("Please select at least one item to export.");
      return;
    }

    setFeedback(`Packaging ${ids.length} items into combined PDF...`);
    
    let itemsToExport: { type: "course" | "tutorial" | "challenge" | "announcement" | "pdf"; data: any }[] = [];
    
    if (contentType === "COURSE") {
      itemsToExport = adminCourses.filter(c => ids.includes(c.id)).map(c => ({ type: "course", data: c }));
    } else if (contentType === "TUTORIAL") {
      itemsToExport = adminTutorials.filter(t => ids.includes(t.id)).map(t => ({ type: "tutorial", data: t }));
    } else if (contentType === "PDF") {
      itemsToExport = adminPdfs.filter(p => ids.includes(p.id)).map(p => ({ type: "pdf", data: p }));
    } else if (contentType === "CHALLENGE") {
      itemsToExport = adminChallenges.filter(c => ids.includes(c.id)).map(c => ({ type: "challenge", data: c }));
    } else if (contentType === "ANNOUNCEMENT") {
      itemsToExport = adminAnnouncements.filter(a => ids.includes(a.id)).map(a => ({ type: "announcement", data: a }));
    }

    try {
      await exportSelectedItemsToPdf(itemsToExport);
      setFeedback("✅ PDF report containing selected content downloaded successfully!");
    } catch (err) {
      console.error(err);
      setFeedback("❌ Failed to compile combined PDF.");
    }
  };

  // LOCAL SECURE COMPUTER FILE UPLOAD SIMULATOR (WITH ACTUAL BASE64 DATA URL READS FOR REAL IMAGES & PDFS)
  const handleFileSystemUploadSim = async (e: React.ChangeEvent<HTMLInputElement>, fileType: "image" | "video" | "pdf", setterCallback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(`Processing ${file.name}...`);
    window.showPowerCodeLoader?.(fileType === "video" ? "Applying Watermark & Uploading..." : "Uploading Content...");

    try {
      if (fileType === "image" || fileType === "pdf") {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64Url = event.target?.result as string;
          if (base64Url) {
            setterCallback(base64Url);
            setUploadProgress(`✅ Loaded high-fidelity digital ${fileType} asset: ${file.name}`);
            
            // Log file upload metadata in background for backend consistency
            fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileType: fileType,
                fileData: base64Url
              })
            }).catch(err => console.warn("Background upload sync bypassed", err))
              .finally(() => {
                setTimeout(() => {
                  window.hidePowerCodeLoader?.();
                }, 400);
              });
          } else {
            window.hidePowerCodeLoader?.();
          }
        };
        reader.onerror = () => {
          setUploadProgress(`❌ Failed to parse local ${fileType} asset.`);
          window.hidePowerCodeLoader?.();
        };
        reader.readAsDataURL(file);
      } else {
        // Video upload with automatic watermarking simulation
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: "video",
            watermark: "@PowerCode Academy"
          })
        });

        const data = await response.json();
        if (data.success) {
          setterCallback(data.url);
          setUploadProgress(`✅ Successfully linked watermarked PowerCode video asset!`);
        } else {
          setUploadProgress(`❌ File upload pipeline error.`);
        }
        setTimeout(() => {
          window.hidePowerCodeLoader?.();
        }, 400);
      }
    } catch {
      setUploadProgress(`❌ Network pipeline connection error.`);
      window.hidePowerCodeLoader?.();
    } finally {
      setTimeout(() => setUploadProgress(""), 4500);
    }
  };

  // COURSE ENDPOINT SUBMITTERS (POST/PUT)
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;

    setFeedback("Publishing Course blueprint...");
    let modulesList;
    try {
      modulesList = JSON.parse(modulesJsonStringClean(courseModulesJson));
    } catch (err) {
      setFeedback("❌ Syntax error inside your modules configuration array. Please fix brackets.");
      return;
    }

    const payload = {
      title: courseTitle,
      description: courseDesc,
      thumbnailUrl: courseThumbnail,
      price: Number(coursePrice),
      isPremium: coursePremium,
      modules: modulesList
    };

    try {
      const endpoint = editCourseId ? `/api/courses/${editCourseId}` : "/api/courses";
      const method = editCourseId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.error) {
        setFeedback(`❌ Error: ${data.error}`);
      } else {
        setFeedback(editCourseId ? "✅ Course updated successfully!" : "✅ Course created live on feed!");
        resetCourseForm();
        loadPlatformData();
      }
    } catch (err: any) {
      setFeedback(`❌ Driver fail: ${err.message || err}`);
    }
  };

  const handleEditCourseSelect = (c: Course) => {
    setEditCourseId(c.id);
    setCourseTitle(c.title);
    setCourseDesc(c.description);
    setCourseThumbnail(c.thumbnailUrl);
    setCoursePrice(String(c.price));
    setCoursePremium(c.isPremium);
    setCourseModulesJson(JSON.stringify(c.modules, null, 2));
    setFeedback("🛠️ Course selected for revisions. Edit fields above.");
  };

  const handleDeleteCourse = (id: number) => {
    openDeleteConfirmation(
      "Move Course to Trash?",
      "Are you sure you want to move this course to the Trash bin?",
      async () => {
        const res = await fetch(`/api/courses/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setAdminCourses(prev => prev.filter(c => c.id !== id));
        showToast("Course successfully moved to trash! 🧹", "success");
        loadPlatformData();
      }
    );
  };

  const resetCourseForm = () => {
    setEditCourseId(null);
    setCourseTitle("");
    setCourseDesc("");
    setCourseThumbnail("");
    setCourseBanner("");
    setCoursePrice("0");
    setCoursePremium(false);
    setCourseModulesJson(JSON.stringify([{ title: "Module 1", lessons: [{ title: "Intro", content: "Test notes" }] }], null, 2));
  };

  // TUTORIAL ENDPOINT SUBMITTERS
  const handleTutorialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutTitle.trim()) return;

    setFeedback("Processing tutorial...");
    const payload = {
      title: tutTitle,
      category: tutCategory,
      content: tutContent,
      codeSnippet: tutCode,
      languageSlug: tutLanguage,
      coverImageUrl: tutCoverImg,
      videoUrl: tutVideoUrl,
      embedded_video_url: tutEmbeddedVideoUrl
    };

    try {
      const endpoint = editTutorialId ? `/api/tutorials/${editTutorialId}` : "/api/tutorials";
      const method = editTutorialId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.error) {
        setFeedback(`❌ Error: ${data.error}`);
      } else {
        setFeedback(editTutorialId ? "✅ Tutorial revised successfully!" : "✅ Tutorial posted live!");
        resetTutorialForm();
        loadPlatformData();
      }
    } catch (err: any) {
      setFeedback(`❌ pipeline: ${err.message}`);
    }
  };

  const handleEditTutorialSelect = (t: Tutorial) => {
    setEditTutorialId(t.id);
    setTutTitle(t.title);
    setTutCategory(t.category);
    setTutContent(t.content);
    setTutCode(t.codeSnippet || "");
    setTutLanguage(t.languageSlug || "javascript");
    setTutCoverImg(t.coverImageUrl || "");
    setTutVideoUrl(t.videoUrl || "");
    setTutEmbeddedVideoUrl(t.embedded_video_url || "");
    setFeedback("🛠️ Editing tutorial settings.");
  };

  const handleDeleteTutorial = (id: number) => {
    openDeleteConfirmation(
      "Move Tutorial to Trash?",
      "Are you sure you want to move this tutorial to the Trash bin?",
      async () => {
        const res = await fetch(`/api/tutorials/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setAdminTutorials(prev => prev.filter(t => t.id !== id));
        showToast("Tutorial successfully moved to trash! 🧹", "success");
        loadPlatformData();
      }
    );
  };

  const resetTutorialForm = () => {
    setEditTutorialId(null);
    setTutTitle("");
    setTutCategory("Web Development");
    setTutContent("");
    setTutCode("");
    setTutLanguage("javascript");
    setTutCoverImg("");
    setTutVideoUrl("");
    setTutEmbeddedVideoUrl("");
  };

  // PDF BOOK ADDITION SUBMITTER
  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfTitle.trim() || !pdfFileUrl.trim()) return;

    setFeedback(editPdfId ? "Revising digital book in catalog..." : "Indexing digital book to Library...");
    try {
      const endpoint = editPdfId ? `/api/pdfs/${editPdfId}` : "/api/pdfs";
      const method = editPdfId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          title: pdfTitle,
          author: pdfAuthor,
          category: pdfCategory,
          fileUrl: pdfFileUrl,
          isPremium: pdfPremium,
          description: pdfDescription,
          publishedDate: pdfPublishedDate
        })
      });
      const data = await res.json();
      if (data.error) setFeedback(`❌ Link error: ${data.error}`);
      else {
        setFeedback(editPdfId ? "✅ PDF Book updated successfully!" : "✅ PDF Book successfully linked and cataloged!");
        resetPdfForm();
        loadPlatformData();
      }
    } catch {
      setFeedback("❌ Failed to resolve storage index.");
    }
  };

  const handleEditPdfSelect = (p: PdfBook) => {
    setEditPdfId(p.id);
    setPdfTitle(p.title);
    setPdfAuthor(p.author);
    setPdfCategory(p.category);
    setPdfFileUrl(p.fileUrl);
    setPdfPremium(!!p.isPremium);
    setPdfDescription(p.description || "");
    setPdfPublishedDate(p.publishedDate || "");
    setFeedback("🛠️ PDF Book selected for edit. Update the fields above.");
  };

  const resetPdfForm = () => {
    setEditPdfId(null);
    setPdfTitle("");
    setPdfAuthor("");
    setPdfFileUrl("");
    setPdfPremium(false);
    setPdfDescription("");
    setPdfPublishedDate("");
  };

  const handleDeletePdf = (id: number) => {
    openDeleteConfirmation(
      "Move PDF Resource to Trash?",
      "Are you sure you want to move this PDF resource to the Trash bin?",
      async () => {
        const res = await fetch(`/api/pdfs/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setAdminPdfs(prev => prev.filter(pdf => pdf.id !== id));
        showToast("PDF resource successfully moved to trash! 🧹", "success");
        loadPlatformData();
      }
    );
  };

  // CHALLENGE SUBMITTER
  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeTitle.trim() || !challengeStarterCode.trim()) return;

    setFeedback(editChallengeId ? "Updating challenge constraints..." : "Adding challenge constraints...");
    let testCases;
    try {
      testCases = JSON.parse(challengeTestCasesJson);
    } catch {
      setFeedback("❌ Invalid JSON in challenge algorithmic test cases field.");
      return;
    }

    try {
      const endpoint = editChallengeId ? `/api/challenges/${editChallengeId}` : "/api/challenges";
      const method = editChallengeId ? "PUT" : "POST";

      const resReal = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          title: challengeTitle,
          description: challengeDesc,
          difficulty: challengeDifficulty,
          starterCode: challengeStarterCode,
          solutionCode: challengeSolutionCode,
          testCases: testCases,
          points: Number(challengePoints),
          category: challengeCategory
        })
      });

      const data = await resReal.json();
      if (data.error) setFeedback(`❌ Error: ${data.error}`);
      else {
        setFeedback(editChallengeId ? "✅ Coding challenge successfully updated!" : "✅ Coding challenge successfully published!");
        resetChallengeForm();
        loadPlatformData();
      }
    } catch {
      setFeedback("❌ Driver network error.");
    }
  };

  const handleEditChallengeSelect = (c: CodingChallenge) => {
    setEditChallengeId(c.id);
    setChallengeTitle(c.title);
    setChallengeDesc(c.description);
    setChallengeDifficulty(c.difficulty);
    setChallengeStarterCode(c.starterCode);
    setChallengeSolutionCode(c.solutionCode || "");
    setChallengeTestCasesJson(JSON.stringify(c.testCases, null, 2));
    setChallengePoints(String(c.points));
    setChallengeCategory(c.category);
    setFeedback("🛠️ Challenge selected for edit. Update fields above.");
  };

  const resetChallengeForm = () => {
    setEditChallengeId(null);
    setChallengeTitle("");
    setChallengeDesc("");
    setChallengeDifficulty("EASY");
    setChallengeStarterCode("function main() {\n  \n}");
    setChallengeSolutionCode("function main() {\n  return true;\n}");
    setChallengeTestCasesJson('[\n  { "input": "hello", "output": "hello" }\n]');
    setChallengePoints("10");
    setChallengeCategory("Algorithms");
  };

  const handleDeleteChallenge = (id: number) => {
    openDeleteConfirmation(
      "Move Challenge to Trash?",
      "Are you sure you want to move this coding challenge to the Trash bin?",
      async () => {
        const res = await fetch(`/api/challenges/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setAdminChallenges(prev => prev.filter(c => c.id !== id));
        showToast("Coding challenge successfully moved to trash! 🧹", "success");
        loadPlatformData();
      }
    );
  };

  // QUIZ SUBMITTER
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) return;

    setFeedback("Uploading assessment questions...");
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(quizQuestionsJson);
    } catch {
      setFeedback("❌ Syntax error inside your Quiz Questions json specification array.");
      return;
    }

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          title: quizTitle,
          passingScore: Number(quizPassScore),
          durationMinutes: Number(quizDuration),
          questions: parsedQuestions
        })
      });
      const data = await res.json();
      if (data.error) setFeedback(`❌ Error: ${data.error}`);
      else {
        setFeedback("✅ Assessment Quiz posted successfully!");
        setQuizTitle("");
        loadPlatformData();
      }
    } catch {
      setFeedback("❌ Connection error.");
    }
  };

  const handleDeleteQuiz = (id: number) => {
    openDeleteConfirmation(
      "Move Quiz to Trash?",
      "Are you sure you want to move this assessment quiz to the Trash bin?",
      async () => {
        const res = await fetch(`/api/quizzes/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setAdminQuizzes(prev => prev.filter(q => q.id !== id));
        showToast("Quiz successfully moved to trash! 🧹", "success");
        loadPlatformData();
      }
    );
  };

  // MANUAL CERTIFICATE GENERATION TRIGGER
  const handleManualCertificateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certStudentEmail.trim() || !certCourseTitle.trim()) return;

    setFeedback("Analyzing user credentials and printing Certificate graphics...");
    try {
      const res = await fetch("/api/certificates/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          studentEmail: certStudentEmail,
          courseTitle: certCourseTitle,
          type: certAwardType,
          description: certAwardDesc
        })
      });
      const data = await res.json();
      if (data.error) {
        setFeedback(`❌ Error: ${data.error}`);
      } else {
        setFeedback(`🎉 Certificate successfully issued manually for student folder!`);
        setCertStudentEmail("");
        setCertCourseTitle("");
        loadPlatformData();
      }
    } catch {
      setFeedback("❌ Network pipeline failure.");
    }
  };

  const handleRevokeCertificate = (code: string) => {
    openDeleteConfirmation(
      "Revoke Certificate?",
      `Are you sure you want to revoke and delete Certificate credentials code: ${code}?`,
      async () => {
        const res = await fetch(`/api/certificates/${code}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setAdminCertificates(prev => prev.filter(c => c.code !== code));
        showToast("Certificate successfully revoked! 📜❌", "success");
        loadPlatformData();
      }
    );
  };

  // ANNOUNCEMENTS MANAGERS
  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    setFeedback(editAnnouncementId ? "Updating Announcement board..." : "Publishing Announcement banner...");
    try {
      const endpoint = editAnnouncementId ? `/api/announcements/${editAnnouncementId}` : "/api/announcements";
      const method = editAnnouncementId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          isImportant: annImportant
        })
      });
      const data = await res.json();
      if (data.error) setFeedback(`❌ Error: ${data.error}`);
      else {
        setFeedback(editAnnouncementId ? "✅ Board updated successfully!" : "✅ Board notified successfully!");
        resetAnnouncementForm();
        loadPlatformData();
      }
    } catch {
      setFeedback("❌ Endpoint timeout.");
    }
  };

  const handleEditAnnouncementSelect = (a: Announcement) => {
    setEditAnnouncementId(a.id);
    setAnnTitle(a.title);
    setAnnContent(a.content);
    setAnnImportant(!!a.isImportant);
    setFeedback("🛠️ Announcement selected for edit. Update fields above.");
  };

  const resetAnnouncementForm = () => {
    setEditAnnouncementId(null);
    setAnnTitle("");
    setAnnContent("");
    setAnnImportant(true);
  };

  const handleDeleteAnnouncement = (id: number) => {
    openDeleteConfirmation(
      "Move Announcement to Trash?",
      "Are you sure you want to move this announcement banner to the Trash bin?",
      async () => {
        const res = await fetch(`/api/announcements/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setAdminAnnouncements(prev => prev.filter(a => a.id !== id));
        showToast("Announcement successfully moved to trash! 🧹", "success");
        loadPlatformData();
      }
    );
  };

  // PATH MANAGERS
  const handlePathSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathTitle.trim()) return;

    setFeedback("Publishing custom path...");
    const courseIds = pathCourseIds.split(",").map(id => Number(id.trim())).filter(n => !isNaN(n));

    try {
      const res = await fetch("/api/learning-paths", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          title: pathTitle,
          description: pathDesc,
          courseIds
        })
      });
      const data = await res.json();
      if (data.error) setFeedback(data.error);
      else {
        setFeedback("✅ Pathway successfully added!");
        setPathTitle("");
        setPathDesc("");
        setPathCourseIds("");
        loadPlatformData();
      }
    } catch {
      setFeedback("❌ Failed to write path.");
    }
  };

  const handleDeletePath = async (id: number) => {
    try {
      await fetch(`/api/learning-paths/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsFeedback("Saving configurations...");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          platformName,
          enableRegistration,
          landingPromoBanner
        })
      });
      const data = await res.json();
      if (data.error) setSettingsFeedback(data.error);
      else {
        setSettingsFeedback("✅ Configuration preferences updated live!");
        setTimeout(() => setSettingsFeedback(""), 3500);
      }
    } catch {
      setSettingsFeedback("❌ Settings pipeline connection failed.");
    }
  };

  const handleSaveCertificateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertificateFeedback("Saving certificate assets...");
    try {
      const res = await fetch("/api/system-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          official_signature_url: officialSignatureUrl,
          official_seal_url: officialSealUrl
        })
      });
      const data = await res.json();
      if (data.error) {
        setCertificateFeedback(data.error);
      } else {
        setCertificateFeedback("✅ Certificate signature & seal stored permanently!");
        setTimeout(() => setCertificateFeedback(""), 3500);
      }
    } catch (err: any) {
      setCertificateFeedback(`❌ Error: ${err.message || err}`);
    }
  };

  // Helper arrays for dirty clean code formatting
  const modulesJsonStringClean = (str: string) => str.trim();

  return (
    <div className="space-y-6 font-sans select-none" id="powercode-dashboard-engine">

      {/* Local Toast Notification box fallback */}
      {localToast && (
        <div id="visual-toast-banner" className="fixed bottom-6 right-6 z-50 bg-[#161b22] border border-[#ff7b00]/60 p-4 rounded-2xl shadow-[0_0_30px_rgba(255,123,0,0.25)] flex items-center gap-3.5 max-w-sm transition-all duration-300 border-l-4 border-l-[#ff7b00]">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            localToast.type === "success" ? "bg-green-500 shadow-[0_0_10px_#22c55e]" :
            localToast.type === "warning" ? "bg-amber-400 shadow-[0_0_10px_#fbbf24]" :
            localToast.type === "error" ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : "bg-blue-400 shadow-[0_0_10px_#60a5fa]"
          }`} />
          <div className="flex-1 min-w-0">
            <h6 className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">Live Event Alert</h6>
            <p className="text-white text-xs font-semibold leading-relaxed break-words mt-0.5">{localToast.message}</p>
          </div>
        </div>
      )}

      {/* Central Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        description={deleteModal.description}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModal.onConfirm}
      />
      
      {/* ROLE AND USER GREETINGS ROW */}
      <div className="bg-gradient-to-r from-[#161b22] via-[#21262d] to-[#ff7b00]/10 p-5 rounded-2xl border border-[#30363d] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={user.profile_picture_url || user.avatarUrl || "https://images.unsplash.com/photo-1549790108-3777bc3021f1?w=100"}
              alt={user.name}
              className="w-12 h-12 rounded-full border-2 border-[#ff7b00] object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#161b22] rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{user.name}</h2>
              <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                isAdmin ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-orange-500/15 text-orange-400 border border-orange-500/30"
              }`}>
                {user.role} VIEW
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e]">Registered student key: {user.email}</p>
          </div>
        </div>

        {/* Student parameters */}
        <div className="flex gap-4 p-3 bg-[#0d1117] rounded-xl border border-[#30363d] text-xs">
          <div>
            <span className="text-[9px] text-[#8b949e] uppercase font-bold block mb-0.5">Scored Merit</span>
            <span className="text-sm font-extrabold text-[#ff7b00]">{user.score || 100} XP</span>
          </div>
          <div className="w-px h-6 bg-[#30363d]" />
          <div>
            <span className="text-[9px] text-[#8b949e] uppercase font-bold block mb-0.5">Global Streak Status</span>
            <span className="text-sm font-extrabold text-orange-500 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {user.learningStreak || 1} Days
            </span>
          </div>
        </div>
      </div>

      {uploadProgress && (
        <div className="bg-[#ff7b00]/10 border border-[#ff7b00]/30 text-white p-3 rounded-xl text-xs font-mono animate-pulse">
          {uploadProgress}
        </div>
      )}

      {feedback && (
        <div className="bg-[#1f2937] border border-[#30363d] text-[#e6edf3] p-3 rounded-xl text-xs font-semibold">
          {feedback}
        </div>
      )}

      {isAdmin ? (
        /* =========================================================================
           SUPER ADMINISTRATIVE CONTENT DASHBOARD
           ========================================================================= */
        <div className="space-y-6" id="admin-copilot-portal">
          
          {/* Collapsible/Tab navigation rows for Admin panel */}
          <div className="flex flex-wrap gap-1.5 border-b border-[#30363d] pb-3" id="admin-tabs">
            {(["stats", "courses", "tutorials", "pdfs", "challenges", "quizzes", "certificates", "announcements", "paths", "settings", "purchases", "sounds", "media", "transactions", "trash", "logs", "users"] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveAdminTab(tab); setFeedback(""); }}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  activeAdminTab === tab
                    ? "bg-[#ff7b00] text-white"
                    : "bg-[#161b22] text-[#8b949e] hover:text-white border border-[#30363d]"
                }`}
                id={`admin-tab-trigger-${tab}`}
              >
                {tab === "pdfs" ? "PDF Books" : tab === "paths" ? "Learning Paths" : tab === "trash" ? "Trash Bin" : tab === "logs" ? "Activity Logs" : tab === "purchases" ? "MoMo Purchases" : tab === "sounds" ? "Notification Sounds" : tab === "transactions" ? "Transaction History" : tab === "media" ? "Content Media Manager" : tab === "users" ? "Manage Users" : tab}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW METRIC INDICATORS */}
          {activeAdminTab === "stats" && stats && (
            <div className="space-y-6 animate-fade-in font-sans" id="admin-stats-view">
              
              {/* Core Financial Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center shadow-lg hover:border-[#ff7b00]/30 transition-all">
                  <Users className="w-5 h-5 text-[#ff7b00] mx-auto mb-2" />
                  <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">Total Students</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{stats.totalUsers || 0}</span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center shadow-lg hover:border-[#ff7b00]/30 transition-all">
                  <BookOpen className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                  <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">Courses Pub</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{stats.totalCourses || 0}</span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center shadow-lg hover:border-[#ff7b00]/30 transition-all">
                  <Award className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">Certificates</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{stats.totalCertificates || 0}</span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center shadow-lg hover:border-[#ff7b00]/30 transition-all">
                  <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">Total Sales</span>
                  <span className="text-xl font-extrabold text-emerald-400 mt-1 block">
                    UGX {(adminRevenueData?.totalRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center shadow-lg hover:border-[#ff7b00]/30 transition-all">
                  <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">This Month</span>
                  <span className="text-xl font-extrabold text-blue-400 mt-1 block">
                    UGX {(adminRevenueData?.monthlyRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#161b22] border border-[#ff7b00]/20 p-4 rounded-xl text-center shadow-lg bg-orange-500/5">
                  <Zap className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                  <span className="text-[9px] text-gray-300 font-bold block uppercase tracking-wider">Today's Sales</span>
                  <span className="text-sm font-extrabold text-white mt-1 block">
                    UGX {(adminRevenueData?.todaysRevenue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* RECHARTS FINANCIAL DAILY TRENDS GRAPH */}
              <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl shadow-xl">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-gray-400 tracking-widest uppercase animate-pulse">ACADEMY FISCAL STREAM</h4>
                    <h3 className="text-base font-extrabold text-white">Daily Revenue Progression (Uganda Shillings)</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Timeframe Filter Selector */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Filter Time:</span>
                      <select
                        value={revenueTimeframe}
                        onChange={(e) => setRevenueTimeframe(e.target.value)}
                        className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#ff7b00] font-mono cursor-pointer"
                      >
                        <option value="all">All Time</option>
                        <option value="30days">Past 30 Days</option>
                        <option value="7days">Past 7 Days</option>
                        <option value="today">Today Only</option>
                      </select>
                    </div>

                    {/* Download CSV Action Trigger Button */}
                    <button
                      onClick={() => {
                        const now = Date.now();
                        let filteredRequests = [...adminPaymentRequests];

                        if (revenueTimeframe === "7days") {
                          const cutOff = now - 7 * 24 * 3600 * 1000;
                          filteredRequests = filteredRequests.filter((r) => {
                            const dateVal = r.createdAt || r.timestamp || r.created_at || now;
                            return new Date(dateVal).getTime() >= cutOff;
                          });
                        } else if (revenueTimeframe === "30days") {
                          const cutOff = now - 30 * 24 * 3600 * 1000;
                          filteredRequests = filteredRequests.filter((r) => {
                            const dateVal = r.createdAt || r.timestamp || r.created_at || now;
                            return new Date(dateVal).getTime() >= cutOff;
                          });
                        } else if (revenueTimeframe === "today") {
                          const cutOff = new Date().setHours(0,0,0,0);
                          filteredRequests = filteredRequests.filter((r) => {
                            const dateVal = r.createdAt || r.timestamp || r.created_at || now;
                            return new Date(dateVal).getTime() >= cutOff;
                          });
                        }

                        const headers = ["Transaction ID", "Student Name", "Student Email", "Purchased Content", "Price (UGX)", "Payment Channel", "Status", "Timestamp"];
                        const rows = filteredRequests.map((r) => {
                          return [
                            r.id || "",
                            `"${(r.userName || "Student").replace(/"/g, '""')}"`,
                            r.userEmail || "",
                            `"${(r.contentTitle || r.contentType || "Premium Product").replace(/"/g, '""')}"`,
                            r.amount || r.purchaseAmount || 0,
                            r.paymentMethod || "MoMo",
                            r.status || "APPROVED",
                            r.createdAt || r.timestamp || r.created_at || ""
                          ];
                        });

                        const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
                        const mimeBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const blobUrl = URL.createObjectURL(mimeBlob);
                        
                        const clickTrack = document.createElement("a");
                        clickTrack.href = blobUrl;
                        clickTrack.setAttribute("download", `PowerCode_Academy_Revenue_Report_${revenueTimeframe}_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(clickTrack);
                        clickTrack.click();
                        document.body.removeChild(clickTrack);
                        setFeedback(`✨ Successfully exported ${filteredRequests.length} rows to CSV!`);
                        setTimeout(() => setFeedback(""), 4000);
                      }}
                      className="bg-[#2ea44f] hover:bg-[#2c974b] text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded uppercase tracking-wide transition-colors cursor-pointer flex items-center gap-1 font-mono"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Download CSV</span>
                    </button>

                    <div className="flex gap-3 text-xs font-mono text-gray-400 bg-[#0d1117] p-1.5 rounded-lg border border-[#21262d]">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                        Approved: <span className="text-white font-bold">{adminRevenueData?.approvedPaymentsCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span>
                        Pending: <span className="text-white font-bold">{adminRevenueData?.pendingPaymentsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {adminRevenueData?.revenueChartData?.length > 0 ? (
                  <div className="h-64 w-full" id="revenue-recharts-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={adminRevenueData.revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="#888888" fontSize={9} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px' }}
                          labelStyle={{ color: '#888888', fontSize: '10px' }}
                          itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                          formatter={(value: any) => [`UGX ${Number(value).toLocaleString()}`, 'Revenue']}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col justify-center items-center bg-[#0d1117] rounded-xl border border-[#21262d] p-6 text-center text-slate-500 text-xs font-mono">
                    <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
                    No transactions captured to form analytical trends charts.
                  </div>
                )}
              </div>

              {/* Bottom Rank Tables & Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Most Purchased Content list */}
                <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl shadow-xl">
                  <h4 className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider mb-3">BEST SELLING CURRICULA</h4>
                  {adminRevenueData?.topPurchasedContent?.length > 0 ? (
                    <div className="space-y-3">
                      {adminRevenueData.topPurchasedContent.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                          <div>
                            <span className="text-[9px] bg-[#21262d] border border-[#30363d] rounded px-1.5 py-0.5 text-[#ff7b00] font-mono font-bold mr-2 uppercase">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white uppercase">{item.title}</span>
                          </div>
                          <div className="text-right font-mono text-[11px]">
                            <span className="text-gray-400 block">{item.count} sales</span>
                            <span className="text-emerald-400 font-bold">UGX {item.total.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-500 font-mono">No product sales yet.</div>
                  )}
                </div>

                {/* Top spenders & High-Score mix */}
                <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl shadow-xl">
                  <h4 className="text-xs font-mono text-[#8b949e] font-bold uppercase tracking-wider mb-3">TOP INVESTORS LEDGER</h4>
                  {adminRevenueData?.topPayingUsers?.length > 0 ? (
                    <div className="space-y-3">
                      {adminRevenueData.topPayingUsers.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                          <div>
                            <span className="text-[10px] text-white font-bold block">{item.name}</span>
                            <span className="text-[9px] text-[#8b949e] font-mono">{item.email}</span>
                          </div>
                          <div className="font-mono text-xs font-extrabold text-emerald-400">
                            UGX {item.spent.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-500 font-mono">No paying references registered.</div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: COURSE CREATION BOARD (INCLUDING VIDEO UPLOADS & LESSON MANAGEMENT) */}
          {activeAdminTab === "courses" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="admin-courses-form">
              
              {/* Creator form */}
              <form onSubmit={handleCourseSubmit} className="lg:col-span-1 bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 mb-2 flex items-center justify-between">
                  <span>{editCourseId ? `Edit Course (ID: ${editCourseId})` : "Launch New Course"}</span>
                  {editCourseId && <button onClick={resetCourseForm} className="text-xs text-orange-400">Cancel</button>}
                </h4>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Course Title:</label>
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Master C++ Polymorphism"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none focus:border-[#ff7b00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Course Brief:</label>
                  <textarea
                    rows={2}
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    placeholder="Provide short descriptive syllabus info..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none focus:border-[#ff7b00]"
                  />
                </div>

                {/* COMPUTERS FILES SELECTORS (FOR CLOUDINARY CAPABILITIES) */}
                <div className="space-y-2.5 p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d]">
                  <span className="text-[9px] text-[#ff7b00] uppercase font-bold tracking-wider block mb-1">Upload Graphics and Videos (Computer)</span>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 block font-semibold">Thumbnail image:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSystemUploadSim(e, "image", setCourseThumbnail)}
                      className="text-[10px] text-gray-500 block w-full"
                    />
                    <input
                      type="text"
                      value={courseThumbnail}
                      onChange={(e) => setCourseThumbnail(e.target.value)}
                      placeholder="Or enter direct thumbnail url..."
                      className="w-full bg-[#161b22] border border-[#30363d] text-[10px] py-1 px-2.5 rounded text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 block font-semibold font-sans">Banner image:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSystemUploadSim(e, "image", setCourseBanner)}
                      className="text-[10px] text-gray-500 block w-full"
                    />
                  </div>

                  <div className="space-y-1 border-t border-[#30363d]/50 pt-2 mt-2">
                    <label className="text-[9px] text-[#ff7b00] block font-semibold font-mono">Upload Lesson Video (Cloudinary Store):</label>
                    <input
                      type="file"
                      accept="video/mp4,video/*"
                      onChange={(e) => handleFileSystemUploadSim(e, "video", setUploadedVideoUrl)}
                      className="text-[10px] text-gray-500 block w-full"
                    />
                    {uploadedVideoUrl && (
                      <div className="p-2 bg-[#1f242c] rounded border border-emerald-500/30 text-[9px] font-mono text-emerald-400 break-all select-all">
                        <strong>Cloudinary Video Linked!</strong> Use this inside your JSON videoUrl keys:
                        <input
                          type="text"
                          readOnly
                          value={uploadedVideoUrl}
                          className="w-full bg-[#0d1117] border border-[#30363d] p-1 mt-1 rounded text-[9.5px] text-[#ff7b00]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase font-bold">Price ($):</label>
                    <input
                      type="number"
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1 flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      checked={coursePremium}
                      onChange={(e) => setCoursePremium(e.target.checked)}
                      className="accent-[#ff7b00]"
                    />
                    <label className="text-[10px] text-gray-400 font-bold uppercase">PRO ACCESS</label>
                  </div>
                </div>

                {/* Modules Json Config */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span className="uppercase">MODULES & LESSONS ARRAY (JSON):</span>
                    <span className="text-[#ff7b00] font-sans">Modules & Lessons creator</span>
                  </div>
                  <textarea
                    rows={6}
                    value={courseModulesJson}
                    onChange={(e) => setCourseModulesJson(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[10px] font-mono text-[#dbebd6] outline-none"
                  />
                  <p className="text-[8px] text-gray-500">Must be a valid list containing modules & nested lessons (videoUrl, content, durationMinutes, isPreviewAllowed) properties.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 rounded-lg transition-colors"
                >
                  {editCourseId ? "Confirm Revisions" : "Publish Course Now"}
                </button>
              </form>

              {/* Course Catalog List */}
              <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-3 overflow-y-auto max-h-[600px]">
                {(() => {
                  const activeList = adminCourses.filter(c => c.isDeleted !== true);
                  return (
                    <>
                      <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 mb-3">ACTIVE ACADEMY SYLLABUS ({activeList.length})</h4>
                      
                      {/* BULK ACTION TOOLBAR */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#1b222c] border border-[#2d3846] rounded-xl text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={selectedCourses.length === activeList.length && activeList.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCourses(activeList.map(item => item.id));
                              else setSelectedCourses([]);
                            }}
                            className="accent-[#ff7b00]"
                          />
                          <span className="font-bold text-gray-300 font-mono text-[10px]">
                            SELECTED ({selectedCourses.length}/{activeList.length})
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <button 
                            onClick={() => triggerBulkAction("COURSE", "publish", selectedCourses)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Publish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("COURSE", "unpublish", selectedCourses)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Unpublish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("COURSE", "archive", selectedCourses)}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded font-semibold text-[10px]"
                          >
                            Archive
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("COURSE", "delete", selectedCourses)}
                            className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-semibold text-[10px]"
                          >
                            Move to Trash
                          </button>
                          <button 
                            onClick={() => triggerBulkExport("COURSE", selectedCourses)}
                            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded font-semibold text-[10px]"
                          >
                            Export PDF
                          </button>
                        </div>
                      </div>

                      {activeList.map((c) => (
                        <div key={c.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-start justify-between gap-3 text-xs font-sans">
                          <div className="flex gap-3 items-start w-full">
                            <input 
                              type="checkbox"
                              checked={selectedCourses.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCourses([...selectedCourses, c.id]);
                                else setSelectedCourses(selectedCourses.filter(id => id !== c.id));
                              }}
                              className="accent-[#ff7b00] mt-4"
                            />
                            <img
                              src={c.thumbnailUrl}
                              alt="thumbnail"
                              className="w-12 h-12 object-cover rounded border border-[#30363d] self-center"
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-white flex items-center gap-2 flex-wrap">
                                <span>{c.title}</span>
                                <span className="bg-[#21262d] text-gray-400 font-mono text-[9px] px-1.5 py-0.5 rounded uppercase font-normal">ID: {c.id}</span>
                                {c.isPublished === false && <span className="text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-mono font-bold">UNPUBLISHED</span>}
                                {c.isArchived === true && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded font-mono font-bold">ARCHIVED</span>}
                              </h5>
                              <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{c.description}</p>
                              <span className="text-[10px] text-orange-400 font-mono block mt-1">
                                {c.isPremium ? "⭐ PRO" : "🆓 Free"} (Price: ${c.price}) • Lessons: {c.modules?.flatMap(m => m.lessons).length || 0}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 shrink-0 self-center">
                            <button
                              onClick={() => handleEditCourseSelect(c)}
                              className="p-1 text-[#ff7b00] hover:bg-[#ff7b00]/10 rounded"
                              title="Edit Course"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(c.id)}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                              title="Delete Course"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 3: TUTORIAL MANAGING */}
          {activeAdminTab === "tutorials" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="admin-tutorials">
              <form onSubmit={handleTutorialSubmit} className="lg:col-span-1 bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 flex justify-between uppercase">
                  <span>{editTutorialId ? "Edit Tutorial" : "Compose Tutorial"}</span>
                  {editTutorialId && <button onClick={resetTutorialForm} className="text-xs text-orange-400">Cancel</button>}
                </h4>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Tutorial Title:</label>
                  <input
                    type="text"
                    required
                    value={tutTitle}
                    onChange={(e) => setTutTitle(e.target.value)}
                    placeholder="e.g. Understading JS closures"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold">Category:</label>
                    <input
                      type="text"
                      value={tutCategory}
                      onChange={(e) => setTutCategory(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold">Lang Keyslug:</label>
                    <input
                      type="text"
                      value={tutLanguage}
                      onChange={(e) => setTutLanguage(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                  <span className="text-[9px] text-[#ff7b00] font-bold block mb-1">Direct Computer Media files:</span>
                  <label className="text-[8px] text-gray-400 block font-bold">Tutorial Video:</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileSystemUploadSim(e, "video", setTutVideoUrl)}
                    className="text-[9px] text-gray-500 block mb-1"
                  />
                  <input
                    type="text"
                    value={tutVideoUrl}
                    onChange={(e) => setTutVideoUrl(e.target.value)}
                    placeholder="Video Url"
                    className="w-full bg-[#161b22] border border-[#30363d] text-[10px] rounded p-1 text-white mb-2"
                  />

                  <label className="text-[8px] text-gray-400 block font-bold">Embedded Video URL (YouTube embed, iframe, or .mp4 link):</label>
                  <input
                    type="text"
                    value={tutEmbeddedVideoUrl}
                    onChange={(e) => setTutEmbeddedVideoUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/embed/Ke90Tje7VS0"
                    className="w-full bg-[#161b22] border border-[#30363d] text-[10px] rounded p-1 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">Rich Format Content (HTML/Markdown):</label>
                  <textarea
                    rows={4}
                    value={tutContent}
                    onChange={(e) => setTutContent(e.target.value)}
                    placeholder="<h1>Dynamic head</h1><p>Body rules</p>"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[11px] font-mono text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">Syntax-Highlighted Block:</label>
                  <textarea
                    rows={3}
                    value={tutCode}
                    onChange={(e) => setTutCode(e.target.value)}
                    placeholder="// sample snippet"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[11px] font-mono text-emerald-400 outline-none"
                  />
                </div>

                <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 rounded-lg">
                  {editTutorialId ? "Confirm revisions" : "Publish Tutorial"}
                </button>
              </form>

              {/* List component */}
              <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-3 overflow-y-auto max-h-[580px]">
                {(() => {
                  const activeList = adminTutorials.filter(t => t.isDeleted !== true);
                  return (
                    <>
                      <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 mb-2">TUTORIALS CATALOG ({activeList.length})</h4>
                      
                      {/* BULK ACTION TOOLBAR */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#1b222c] border border-[#2d3846] rounded-xl text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={selectedTutorials.length === activeList.length && activeList.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTutorials(activeList.map(item => item.id));
                              else setSelectedTutorials([]);
                            }}
                            className="accent-[#ff7b00]"
                          />
                          <span className="font-bold text-gray-300 font-mono text-[10px]">
                            SELECTED ({selectedTutorials.length}/{activeList.length})
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap font-sans">
                          <button 
                            onClick={() => triggerBulkAction("TUTORIAL", "publish", selectedTutorials)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Publish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("TUTORIAL", "unpublish", selectedTutorials)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Unpublish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("TUTORIAL", "archive", selectedTutorials)}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded font-semibold text-[10px]"
                          >
                            Archive
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("TUTORIAL", "delete", selectedTutorials)}
                            className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-semibold text-[10px]"
                          >
                            Move to Trash
                          </button>
                          <button 
                            onClick={() => triggerBulkExport("TUTORIAL", selectedTutorials)}
                            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded font-semibold text-[10px]"
                          >
                            Export PDF
                          </button>
                        </div>
                      </div>

                      {activeList.map((t) => (
                        <div key={t.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs font-sans">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={selectedTutorials.includes(t.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedTutorials([...selectedTutorials, t.id]);
                                else setSelectedTutorials(selectedTutorials.filter(id => id !== t.id));
                              }}
                              className="accent-[#ff7b00]"
                            />
                            <div>
                              <h5 className="font-bold text-white flex items-center gap-2 flex-wrap text-xs font-sans">
                                <span>{t.title}</span>
                                <span className="bg-[#21262d] text-gray-400 font-mono text-[9px] px-1.5 py-0.5 rounded font-normal">ID: {t.id}</span>
                                {t.isPublished === false && <span className="text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-mono font-bold">UNPUBLISHED</span>}
                                {t.isArchived === true && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded font-mono font-bold">ARCHIVED</span>}
                              </h5>
                              <span className="text-[9px] text-orange-400 uppercase block mt-1 font-sans">Category: {t.category} • slug: {t.languageSlug}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditTutorialSelect(t)} className="p-1 hover:bg-[#ff7b00]/10 rounded text-[#ff7b00]">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteTutorial(t.id)} className="p-1 hover:bg-red-500/10 rounded text-red-500">
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 4: PDF BOOKS */}
          {activeAdminTab === "pdfs" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin-pdf-book-tab">
              <form onSubmit={handlePdfSubmit} className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-4 h-fit">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2">Index Downloadable PDF Book</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">Book Title:</label>
                  <input
                    type="text"
                    required
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    placeholder="e.g. Introduction to Algorithmic Complexity"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold">Author Writer:</label>
                    <input
                      type="text"
                      value={pdfAuthor}
                      onChange={(e) => setPdfAuthor(e.target.value)}
                      placeholder="Arcene Irakoze"
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold">Category:</label>
                    <input
                      type="text"
                      value={pdfCategory}
                      onChange={(e) => setPdfCategory(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Published Date:</label>
                  <input
                    type="date"
                    value={pdfPublishedDate}
                    onChange={(e) => setPdfPublishedDate(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Book Description:</label>
                  <textarea
                    rows={2}
                    value={pdfDescription}
                    onChange={(e) => setPdfDescription(e.target.value)}
                    placeholder="Short description summarizing what this reference manual is about..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1 bg-[#0d1117]/50 p-3.5 rounded-xl border border-[#30363d]/80">
                  <label className="text-[10px] text-[#ff7b00] uppercase font-bold flex items-center gap-1.5 font-mono mb-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Book from PC:</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => handleFileSystemUploadSim(e, "pdf", setPdfFileUrl)}
                    className="text-[10px] text-gray-500 block w-full file:bg-[#21262d] file:border-0 file:text-xs file:text-white file:px-3 file:py-1 file:rounded-md file:hover:bg-[#30363d] cursor-pointer mb-2"
                  />
                  <label className="text-[9px] text-gray-400 block font-mono">Or specify reference URL:</label>
                  <input
                    type="text"
                    value={pdfFileUrl}
                    onChange={(e) => setPdfFileUrl(e.target.value)}
                    placeholder="e.g. /static/pdfs/mybook.pdf"
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pdfPremium}
                    onChange={(e) => setPdfPremium(e.target.checked)}
                    className="accent-[#ff7b00]"
                  />
                  <label className="text-[10px] text-gray-400 font-bold uppercase">PRO ACCESS REQUIRED</label>
                </div>

                <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 rounded-lg">
                  Publish book link
                </button>
              </form>

              <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-3 max-h-[500px] overflow-y-auto">
                {(() => {
                  const activeList = adminPdfs.filter(p => p.isDeleted !== true);
                  return (
                    <>
                      <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 mb-2">INDEXED PDF ARCHIVE ({activeList.length})</h4>
                      
                      {/* BULK ACTION TOOLBAR */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#1b222c] border border-[#2d3846] rounded-xl text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={selectedPdfs.length === activeList.length && activeList.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPdfs(activeList.map(item => item.id));
                              else setSelectedPdfs([]);
                            }}
                            className="accent-[#ff7b00]"
                          />
                          <span className="font-bold text-gray-300 font-mono text-[10px]">
                            SELECTED ({selectedPdfs.length}/{activeList.length})
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap font-sans">
                          <button 
                            onClick={() => triggerBulkAction("PDF", "publish", selectedPdfs)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Publish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("PDF", "unpublish", selectedPdfs)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Unpublish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("PDF", "archive", selectedPdfs)}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded font-semibold text-[10px]"
                          >
                            Archive
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("PDF", "delete", selectedPdfs)}
                            className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-semibold text-[10px]"
                          >
                            Move to Trash
                          </button>
                          <button 
                            onClick={() => triggerBulkExport("PDF", selectedPdfs)}
                            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded font-semibold text-[10px]"
                          >
                            Export PDF
                          </button>
                        </div>
                      </div>

                      {activeList.map((p) => (
                        <div key={p.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs font-sans">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={selectedPdfs.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedPdfs([...selectedPdfs, p.id]);
                                else setSelectedPdfs(selectedPdfs.filter(id => id !== p.id));
                              }}
                              className="accent-[#ff7b00]"
                            />
                            <div>
                              <h5 className="font-bold text-white flex items-center gap-2 flex-wrap text-xs">
                                <span>{p.title}</span>
                                <span className="bg-[#21262d] text-gray-400 font-mono text-[9px] px-1.5 py-0.5 rounded font-normal">ID: {p.id}</span>
                                {p.isPublished === false && <span className="text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-mono font-bold">UNPUBLISHED</span>}
                                {p.isArchived === true && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded font-mono font-bold">ARCHIVED</span>}
                              </h5>
                              <span className="text-[10px] text-gray-500">Author: {p.author} ({p.isPremium ? "PRO" : "FREE"})</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditPdfSelect(p)} className="p-1 hover:bg-[#ff7b00]/10 rounded text-[#ff7b00]" title="Edit PDF">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeletePdf(p.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded" title="Delete PDF">
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 5: CODING CHALLENGES */}
          {activeAdminTab === "challenges" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin-coding-challenges">
              <form onSubmit={handleChallengeSubmit} className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-1.5 uppercase">MANUALLY COMPOSE LEETCODE CHALLENGE</h4>

                <div className="space-y-1">
                  <label className="text-[#8b949e] uppercase font-bold text-[10px]">Challenge Title:</label>
                  <input
                    type="text"
                    required
                    value={challengeTitle}
                    onChange={(e) => setChallengeTitle(e.target.value)}
                    placeholder="e.g. Reverse words in list"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#8b949e] uppercase font-bold text-[10px]">Description Constraints:</label>
                  <textarea
                    rows={2}
                    value={challengeDesc}
                    onChange={(e) => setChallengeDesc(e.target.value)}
                    placeholder="Syllabus algorithmic notes..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[#8b949e] uppercase font-bold text-[10px]">Difficulty:</label>
                    <select
                      value={challengeDifficulty}
                      onChange={(e) => setChallengeDifficulty(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-1.5 text-xs text-white"
                    >
                      <option value="EASY">EASY</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HARD">HARD</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#8b949e] uppercase font-bold text-[10px]">Score Points:</label>
                    <input
                      type="number"
                      value={challengePoints}
                      onChange={(e) => setChallengePoints(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#8b949e] uppercase font-bold text-[10px]">Category:</label>
                    <input
                      type="text"
                      value={challengeCategory}
                      onChange={(e) => setChallengeCategory(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[#8b949e] uppercase font-bold text-[10px] block font-mono">Starter Code:</label>
                    <textarea
                      rows={3}
                      value={challengeStarterCode}
                      onChange={(e) => setChallengeStarterCode(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[10px] font-mono text-emerald-300 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#8b949e] uppercase font-bold text-[10px] block font-mono">Solution Code:</label>
                    <textarea
                      rows={3}
                      value={challengeSolutionCode}
                      onChange={(e) => setChallengeSolutionCode(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[10px] font-mono text-emerald-400 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[#8b949e] uppercase font-bold text-[10px] block font-mono">Test Cases json:</label>
                  <textarea
                    rows={2}
                    value={challengeTestCasesJson}
                    onChange={(e) => setChallengeTestCasesJson(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[10px] font-mono text-yellow-300 outline-none"
                  />
                </div>

                <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 rounded-lg">
                  {editChallengeId ? "Confirm Algorithmic Revisions" : "Publish algorithmic challenge"}
                </button>
              </form>

              <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-3 max-h-[580px] overflow-y-auto">
                {(() => {
                  const activeList = adminChallenges.filter(c => c.isDeleted !== true);
                  return (
                    <>
                      <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 mb-2">CHALLENGES LIST ({activeList.length})</h4>
                      
                      {/* BULK ACTION TOOLBAR */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#1b222c] border border-[#2d3846] rounded-xl text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={selectedChallenges.length === activeList.length && activeList.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedChallenges(activeList.map(item => item.id));
                              else setSelectedChallenges([]);
                            }}
                            className="accent-[#ff7b00]"
                          />
                          <span className="font-bold text-gray-300 font-mono text-[10px]">
                            SELECTED ({selectedChallenges.length}/{activeList.length})
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap font-sans">
                          <button 
                            onClick={() => triggerBulkAction("CHALLENGE", "publish", selectedChallenges)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Publish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("CHALLENGE", "unpublish", selectedChallenges)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Unpublish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("CHALLENGE", "archive", selectedChallenges)}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded font-semibold text-[10px]"
                          >
                            Archive
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("CHALLENGE", "delete", selectedChallenges)}
                            className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-semibold text-[10px]"
                          >
                            Move to Trash
                          </button>
                          <button 
                            onClick={() => triggerBulkExport("CHALLENGE", selectedChallenges)}
                            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded font-semibold text-[10px]"
                          >
                            Export PDF
                          </button>
                        </div>
                      </div>

                      {activeList.map((c) => (
                        <div key={c.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs font-sans">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={selectedChallenges.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedChallenges([...selectedChallenges, c.id]);
                                else setSelectedChallenges(selectedChallenges.filter(id => id !== c.id));
                              }}
                              className="accent-[#ff7b00]"
                            />
                            <div>
                              <h5 className="font-bold text-white flex items-center gap-2 flex-wrap text-sm font-sans">
                                <span>{c.title}</span>
                                <span className="bg-[#21262d] text-gray-400 font-mono text-[9px] px-1.5 py-0.5 rounded font-normal">ID: {c.id}</span>
                                {c.isPublished === false && <span className="text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-mono font-bold">UNPUBLISHED</span>}
                                {c.isArchived === true && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded font-mono font-bold">ARCHIVED</span>}
                              </h5>
                              <span className="text-[9px] text-[#ff7b00] uppercase font-bold block mt-1">
                                {c.difficulty} Diff • {c.points} XP • {c.category}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditChallengeSelect(c)} className="p-1 hover:bg-[#ff7b00]/10 rounded text-[#ff7b00]" title="Edit Challenge">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteChallenge(c.id)} className="p-1 hover:bg-red-500/10 text-red-500 rounded" title="Delete Challenge">
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 6: QUIZZES */}
          {activeAdminTab === "quizzes" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin-quizzes-creator">
              <form onSubmit={handleQuizSubmit} className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-1.5 uppercase">Draft Assessment Quiz</h4>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase block">Quiz Title:</label>
                  <input
                    type="text"
                    required
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="e.g. TypeScript closures exam"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Pass score (%):</label>
                    <input
                      type="number"
                      value={quizPassScore}
                      onChange={(e) => setQuizPassScore(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Timer (min):</label>
                    <input
                      type="number"
                      value={quizDuration}
                      onChange={(e) => setQuizDuration(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#ff7b00] font-bold block font-mono">Questions definitions ARRAY (json):</label>
                  <textarea
                    rows={6}
                    value={quizQuestionsJson}
                    onChange={(e) => setQuizQuestionsJson(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-xs font-mono rounded-lg p-2 text-white outline-none"
                  />
                </div>

                <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 rounded-lg">
                  Publish Exam Quiz
                </button>
              </form>

              <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-3 max-h-[500px] overflow-y-auto">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2">ACTIVE SYSTEM ASSESSMENTS</h4>
                {adminQuizzes.map((q) => (
                  <div key={q.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <h5 className="font-bold text-white">{q.title}</h5>
                      <span className="text-[9px] font-mono text-gray-400 uppercase">Passing Score: {q.passingScore}% • duration: {q.durationMinutes} minutes</span>
                    </div>
                    <button onClick={() => handleDeleteQuiz(q.id)} className="p-1 hover:bg-red-500/10 text-red-500 rounded">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CERTIFICATE BOARD (MANUAL CREATING OFFICE) */}
          {activeAdminTab === "certificates" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin-certificates-system">
              <form onSubmit={handleManualCertificateSubmit} className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-4">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-[#30363d] pb-2 text-[#ff7b00]">MANUALLY CERTIFY STUDENT OR RECORD SPECIAL ACHIEVEMENT</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-450 uppercase block font-bold">Registered Student Email Address:</label>
                  <input
                    type="email"
                    required
                    value={certStudentEmail}
                    onChange={(e) => setCertStudentEmail(e.target.value)}
                    placeholder="student@powercode.com"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase block font-bold">Achievement course title:</label>
                  <input
                    type="text"
                    required
                    value={certCourseTitle}
                    onChange={(e) => setCertCourseTitle(e.target.value)}
                    placeholder="e.g. Advanced Reactive Component Design"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase block font-bold">Award honors title:</label>
                  <input
                    type="text"
                    value={certAwardType}
                    onChange={(e) => setCertAwardType(e.target.value)}
                    placeholder="Excellence Honors Award"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase block font-bold">Description of Honor merit:</label>
                  <textarea
                    rows={2}
                    value={certAwardDesc}
                    onChange={(e) => setCertAwardDesc(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white"
                  />
                </div>

                <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 rounded-lg">
                  Print Verified Alumni Certificate
                </button>
              </form>

              <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-3 max-h-[500px] overflow-y-auto">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 mb-2">ACTIVE CERTIFICATES LEDGER</h4>
                {adminCertificates.map((c) => (
                  <div key={c.certificateCode} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <h5 className="font-bold text-white font-serif tracking-tight capitalize">{c.userName}</h5>
                      <span className="text-[10px] block mt-0.5 text-orange-400 font-mono font-bold">{c.courseTitle}</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">CREDENTIAL: {c.certificateCode}</span>
                    </div>
                    <div className="flex gap-1.5 shink-0">
                      <button onClick={() => onViewCertificate(c)} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRevokeCertificate(c.certificateCode)} className="p-1 hover:bg-red-500/10 text-red-500 rounded">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: ANNOUNCEMENTS MANAGER board */}
          {activeAdminTab === "announcements" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin-announcements">
              <form onSubmit={handleAnnouncementSubmit} className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-1.5 uppercase">Post a Bullet Board Announcement</h4>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">Announcement Title:</label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Schedule for live coding bootcamps is out"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">Content message:</label>
                  <textarea
                    rows={4}
                    required
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Type details for students..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={annImportant}
                    onChange={(e) => setAnnImportant(e.target.checked)}
                    className="accent-[#ff7b00]"
                  />
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Mark as important</label>
                </div>

                <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 rounded-lg">
                  Broadcast notification
                </button>
              </form>

              <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-3 font-sans overflow-y-auto max-h-[500px]">
                {(() => {
                  const activeList = adminAnnouncements.filter(a => a.isDeleted !== true);
                  return (
                    <>
                      <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 mb-2">ACTIVE ANNOUNCEMENTS ({activeList.length})</h4>
                      
                      {/* BULK ACTION TOOLBAR */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#1b222c] border border-[#2d3846] rounded-xl text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={selectedAnnouncements.length === activeList.length && activeList.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAnnouncements(activeList.map(item => item.id));
                              else setSelectedAnnouncements([]);
                            }}
                            className="accent-[#ff7b00]"
                          />
                          <span className="font-bold text-gray-300 font-mono text-[10px]">
                            SELECTED ({selectedAnnouncements.length}/{activeList.length})
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <button 
                            onClick={() => triggerBulkAction("ANNOUNCEMENT", "publish", selectedAnnouncements)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Publish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("ANNOUNCEMENT", "unpublish", selectedAnnouncements)}
                            className="px-2 py-1 bg-[#ff7b00]/20 hover:bg-[#ff7b00]/30 text-[#ff7b00] rounded font-semibold text-[10px]"
                          >
                            Unpublish
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("ANNOUNCEMENT", "archive", selectedAnnouncements)}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded font-semibold text-[10px]"
                          >
                            Archive
                          </button>
                          <button 
                            onClick={() => triggerBulkAction("ANNOUNCEMENT", "delete", selectedAnnouncements)}
                            className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-semibold text-[10px]"
                          >
                            Move to Trash
                          </button>
                          <button 
                            onClick={() => triggerBulkExport("ANNOUNCEMENT", selectedAnnouncements)}
                            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded font-semibold text-[10px]"
                          >
                            Export PDF
                          </button>
                        </div>
                      </div>

                      {activeList.map((a) => (
                        <div key={a.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-start justify-between gap-2 text-xs font-sans">
                          <div className="flex items-start gap-2.5">
                            <input 
                              type="checkbox"
                              checked={selectedAnnouncements.includes(a.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedAnnouncements([...selectedAnnouncements, a.id]);
                                else setSelectedAnnouncements(selectedAnnouncements.filter(id => id !== a.id));
                              }}
                              className="accent-[#ff7b00] mt-1"
                            />
                            <div>
                              <h5 className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                                <span>{a.title}</span>
                                <span className="bg-[#21262d] text-gray-400 font-mono text-[9px] px-1 px-0.5 rounded font-normal">ID: {a.id}</span>
                                {a.isImportant && <span className="bg-red-500/10 text-red-500 text-[8px] font-bold px-1 rounded border border-red-500/20 font-mono">IMPORTANT</span>}
                                {a.isPublished === false && <span className="text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-mono font-bold">UNPUBLISHED</span>}
                                {a.isArchived === true && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded font-mono font-bold">ARCHIVED</span>}
                              </h5>
                              <p className="text-gray-400 text-[10px] mt-1 leading-relaxed">{a.content}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditAnnouncementSelect(a)} className="p-1 hover:bg-[#ff7b00]/10 text-[#ff7b00] rounded" title="Edit Announcement">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteAnnouncement(a.id)} className="p-1 hover:bg-red-500/10 text-red-500 rounded" title="Delete Announcement">
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 9: LEARNING PATHS */}
          {activeAdminTab === "paths" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin-learning-paths">
              <form onSubmit={handlePathSubmit} className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-[#ff7b00] border-b border-[#30363d] pb-1.5 uppercase">Create Learning Pathway Curricula</h4>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Path Title:</label>
                  <input
                    type="text"
                    required
                    value={pathTitle}
                    onChange={(e) => setPathTitle(e.target.value)}
                    placeholder="e.g. Master React Frontend Engineer"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Pathway outline description:</label>
                  <textarea
                    rows={2}
                    value={pathDesc}
                    onChange={(e) => setPathDesc(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">Course sequence IDs (comma separated):</label>
                  <input
                    type="text"
                    value={pathCourseIds}
                    onChange={(e) => setPathCourseIds(e.target.value)}
                    placeholder="e.g. 1,2,5"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none font-mono"
                  />
                  <p className="text-[8px] text-gray-500 mt-1">Provide integers corresponding to target published course sequence metrics.</p>
                </div>

                <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 rounded-lg">
                  Integrate learning pathway
                </button>
              </form>

              <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-3 overflow-y-auto max-h-[500px]">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2">ACTIVE LEARNING PATHS</h4>
                {adminLearningPaths.map((lp) => (
                  <div key={lp.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <h5 className="font-bold text-white">{lp.title}</h5>
                      <span className="text-[9px] text-orange-400 block mt-1 font-mono uppercase font-bold">Course Sequence IDs: [{lp.courseIds.join(", ")}]</span>
                    </div>
                    <button onClick={() => handleDeletePath(lp.id)} className="p-1 hover:bg-red-500/10 text-red-500 rounded">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: CONFIG SETTINGS PREFERENCES */}
          {activeAdminTab === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto items-start" id="admin-dual-settings-container">
              
              {/* GLOBAL PLATFORM PREFERENCES CARD */}
              <form onSubmit={handleSavePlatformSettings} className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl space-y-5" id="admin-platform-settings">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#ff7b00]" />
                  GLOBAL PLATFORM PREFERENCES
                </h4>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-bold">Academy Branding Label:</label>
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex justify-between items-center bg-[#0d1117] p-3.5 border border-[#30363d] rounded-xl font-sans">
                  <div>
                    <span className="text-xs text-white font-bold block">Open Registration slots</span>
                    <span className="text-[10px] text-gray-500 block">Controls whether guest students can self-register credentials accounts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableRegistration}
                    onChange={(e) => setEnableRegistration(e.target.checked)}
                    className="accent-[#ff7b00] h-4 w-4"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-bold">Site-wide Broadcaster banner alert:</label>
                  <textarea
                    rows={2}
                    value={landingPromoBanner}
                    onChange={(e) => setLandingPromoBanner(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white resize-none"
                  />
                </div>

                {settingsFeedback && (
                  <div className="text-xs font-mono font-bold text-green-400 bg-green-500/10 p-2 border border-green-500/20 rounded-lg">
                    {settingsFeedback}
                  </div>
                )}

                <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-sm text-white font-bold py-2 rounded-lg cursor-pointer transition-colors shadow-md">
                  Commit Preference updates
                </button>
              </form>

              {/* DYNAMIC CERTIFICATE SETTINGS CARD */}
              <CertificateSettings
                user={user}
                onViewCertificate={onViewCertificate}
                dbStatus={dbStatus}
              />

              {/* ADMIN PROFILE & SECURITY SETTINGS */}
              <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl space-y-5 lg:col-span-2" id="admin-profile-security-card">
                <h4 className="text-sm font-bold text-white border-b border-[#30363d] pb-2 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#ff7b00]" />
                  ADMIN SECURITY & PROFILE SETTINGS
                </h4>

                <div className="flex items-center gap-4 py-2">
                  <img
                    src={user.profile_picture_url || user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#ff7b00]"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100";
                    }}
                  />
                  <div>
                    <span className="text-white font-bold text-sm block">{user.name}</span>
                    <span className="text-xs text-gray-400 block font-mono">{user.email}</span>
                    <span className="bg-[#ff7b00]/10 text-[#ff7b00] border border-[#ff7b00]/20 text-[9px] px-1.5 py-0.5 rounded font-bold mt-1 inline-block uppercase">Official Admin Seat</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 uppercase font-bold">Upload Custom Profile Picture:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setFeedback("Optimizing file details...");
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const optimizedBase64 = reader.result as string;
                          try {
                            const res = await fetch("/api/users/profile", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${user.email}`
                              },
                              body: JSON.stringify({ profile_picture_url: optimizedBase64 })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setFeedback("✨ Profile picture updated successfully!");
                              if (onUpdateUser) {
                                onUpdateUser({ ...user, profile_picture_url: optimizedBase64 });
                              }
                              loadPlatformData();
                            } else {
                              setFeedback("❌ Failed to update profile image.");
                            }
                          } catch {
                            setFeedback("❌ Network pipeline error.");
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="text-[10px] text-gray-500 block w-full bg-[#0d1117] border border-[#30363d] p-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 uppercase font-bold text-xs">Or Paste Profile Picture URL:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste image link here..."
                        id="admin-profile-pic-link"
                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none font-mono"
                      />
                      <button
                        onClick={async () => {
                          const linkVal = (document.getElementById("admin-profile-pic-link") as HTMLInputElement)?.value;
                          if (!linkVal) return;
                          setFeedback("Syncing picture link...");
                          try {
                            const res = await fetch("/api/users/profile", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${user.email}`
                              },
                              body: JSON.stringify({ profile_picture_url: linkVal })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setFeedback("✨ Profile link configured!");
                              if (onUpdateUser) {
                                onUpdateUser({ ...user, profile_picture_url: linkVal });
                              }
                              loadPlatformData();
                            }
                          } catch {
                            setFeedback("❌ Picture link failing.");
                          }
                        }}
                        className="bg-[#21262d] text-white hover:bg-[#30363d] border border-[#30363d] text-xs font-bold px-3 rounded-lg"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#30363d] pt-4 space-y-4">
                  <h5 className="text-xs font-bold text-[#ff7b00] uppercase tracking-wide">Update Credentials (Username, Email, Password)</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase font-bold">New Username / Full Name:</label>
                      <input
                        type="text"
                        defaultValue={user.name}
                        id="admin-username-field"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase font-bold">New Email Address:</label>
                      <input
                        type="email"
                        defaultValue={user.email}
                        id="admin-email-field"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase font-bold">New Password (Optional):</label>
                      <input
                        type="password"
                        placeholder="Leave blank to keep current..."
                        id="admin-new-password-field"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const name = (document.getElementById("admin-username-field") as HTMLInputElement)?.value;
                      const email = (document.getElementById("admin-email-field") as HTMLInputElement)?.value;
                      const password = (document.getElementById("admin-new-password-field") as HTMLInputElement)?.value;
                      
                      setFeedback("Applying admin credentials updates...");
                      try {
                        const res = await fetch("/api/users/profile", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${user.email}`
                          },
                          body: JSON.stringify({ name, email, password: password || undefined })
                        });
                        const data = await res.json();
                        if (data.success && data.user) {
                          setFeedback("✨ Credentials saved successfully!");
                          const passwordField = document.getElementById("admin-new-password-field") as HTMLInputElement;
                          if (passwordField) passwordField.value = "";
                          if (onUpdateUser) {
                            onUpdateUser(data.user);
                          }
                          loadPlatformData();
                        } else {
                          setFeedback(`❌ Error: ${data.error || "Execution failed"}`);
                        }
                      } catch (err: any) {
                        setFeedback(`❌ Connection issue: ${err.message}`);
                      }
                    }}
                    className="bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white px-5 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Save Credentials Changes
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 11: TRASH BIN CO-PILOT SYSTEM */}
          {activeAdminTab === "trash" && (
            <TrashManager user={user} loadPlatformData={loadPlatformData} setFeedback={setFeedback} triggerToast={showToast} />
          )}

          {/* TAB media: CONTENT MEDIA MANAGER */}
          {activeAdminTab === "media" && (
            <ContentMediaManager user={user} setFeedback={setFeedback} triggerToast={showToast} />
          )}

          {/* TAB 12: ADMINISTRATIVE AUDIT LOGS MONITOR */}
          {activeAdminTab === "logs" && (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4" id="admin-audit-logs">
              <div className="border-b border-[#30363d] pb-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                  ACADEMY AUDIT & SECURITY LOGS
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Immutable server records of authorized administrator database and contents modifications.</p>
              </div>

              {adminActivityLogs.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs font-sans">
                  No administrative actions have been generated or captured yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {adminActivityLogs.slice().reverse().map((log, index) => (
                    <div key={index} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 font-mono text-[11px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[#8b949e]">[{new Date(log.timestamp).toLocaleString()}]</span>
                          <span className="text-white font-bold">{log.adminName}</span>
                          <span className={`px-1.5 py-0.2 text-[9px] rounded font-bold uppercase ${
                            log.actionType === "CREATE" ? "bg-green-500/10 text-green-400" :
                            log.actionType === "EDIT" ? "bg-blue-500/10 text-blue-400" :
                            log.actionType === "DELETE" ? "bg-yellow-500/10 text-yellow-500" :
                            log.actionType === "PERMANENT_DELETE" ? "bg-red-500/15 text-red-500" :
                            "bg-orange-500/15 text-orange-400"
                          }`}>
                            {log.actionType}
                          </span>
                          <span className="text-gray-400 uppercase font-sans text-[10px] font-bold">({log.contentType})</span>
                        </div>
                        <div className="text-gray-300 font-sans text-xs mt-0.5">
                          Affected target content: <strong className="text-[#ff7b00]">{log.contentTitle}</strong>
                        </div>
                      </div>
                      <div className="text-[10px] bg-[#161b22] text-gray-400 py-0.5 px-2 rounded-md self-start md:self-center">
                        IP Reference: {log.ipAddress}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: USER ACCOUNT MANAGEMENT PORTS */}
          {activeAdminTab === "users" && (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4 font-sans animate-fade-in" id="admin-users-tab">
              <div className="border-b border-[#30363d] pb-3 flex justify-between items-center bg-[#0d1117]/30 p-3 rounded-xl border border-[#21262d] mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#ff7b00]" />
                    USER ACCOUNT MANAGEMENT
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Edit, audit profiles or permanently delete student or pilot records from both Memory & PostgreSQL.</p>
                </div>
                <div className="text-xs text-[#8b949e]">
                  Active Registered Accounts: <span className="font-bold text-white">{allUsersList.length}</span>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto divide-y divide-[#21262d] pr-1">
                {allUsersList.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs italic">
                    No registered user portfolios found.
                  </div>
                ) : (
                  allUsersList.map((usr) => (
                    <div key={usr.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={usr.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                          alt={usr.name} 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xl object-cover bg-[#0d1117] border border-[#30363d]" 
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white">{usr.name}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                              usr.role === "ADMIN" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-[#21262d] text-[#8b949e]"
                            }`}>
                              {usr.role}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{usr.email}</p>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-[#8b949e]">
                            <span>Streak: <strong className="text-[#ff7b00]">{usr.learningStreak || 0}d</strong></span>
                            <span>•</span>
                            <span>Score: <strong className="text-white">{usr.score || 0} pts</strong></span>
                          </div>
                        </div>
                      </div>

                      {usr.id !== user.id ? (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to permanently delete user account "${usr.name}" (${usr.email})? This action is irreversible.`)) {
                              try {
                                const response = await fetch(`/api/users/${usr.id}`, {
                                  method: "DELETE",
                                  headers: {
                                    "Authorization": `Bearer ${user.email}`
                                  }
                                });
                                const resData = await response.json();
                                if (resData.success) {
                                  showToast(resData.message || "User successfully deleted.", "success");
                                  setAllUsersList(prev => prev.filter(u => u.id !== usr.id));
                                } else {
                                  showToast(resData.error || "Failed to delete user", "error");
                                }
                              } catch (err) {
                                console.error("Error deleting user:", err);
                                showToast("Failed to delete user account, network error.", "error");
                              }
                            }
                          }}
                          className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash className="w-3 h-3" />
                          Delete User
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#8b949e] italic font-mono pr-2">Your Active Session</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 13: POWERFUL MOBILE MONEY PAYMENTS AUDITING & APPROVAL CONTROL CENTRE */}
          {activeAdminTab === "purchases" && (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4 font-sans animate-fade-in" id="admin-purchases-tab">
              <div className="border-b border-[#30363d] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-400 animate-pulse" />
                    MOBILE MONEY PAYMENTS APPROVAL DASHBOARD
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">Verify screenshot proofs, crosscheck references, and approve courses/premium subscriptions.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-amber-500/10 text-amber-400 font-mono px-2.5 py-1 rounded-lg border border-amber-500/20">
                    Pending Verification: {adminPaymentRequests.filter(p => p.status === "PENDING_APPROVAL" || p.status === "PENDING").length}
                  </span>
                  <span className="text-xs bg-[#1f242c] text-emerald-400 font-mono px-2.5 py-1 rounded-lg border border-[#30363d]">
                    Approved: {adminPaymentRequests.filter(p => p.status === "APPROVED").length}
                  </span>
                </div>
              </div>

              {/* Filtering & Search Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0d1117] p-3 rounded-xl border border-[#21262d]">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={paymentQuery}
                    onChange={(e) => setPaymentQuery(e.target.value)}
                    placeholder="Search by student name, email, transaction phone, reference code..."
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff7b00]"
                  />
                </div>
                <div>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending / Processing</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {(() => {
                const filtered = adminPaymentRequests.filter(p => {
                  const statusMatch = paymentStatusFilter === "ALL" || 
                    (paymentStatusFilter === "PENDING" && (p.status === "PENDING" || p.status === "PENDING_APPROVAL")) ||
                    p.status === paymentStatusFilter;

                  if (!statusMatch) return false;

                  if (paymentQuery) {
                    const q = paymentQuery.toLowerCase();
                    const name = (p.userName || "").toLowerCase();
                    const email = (p.userEmail || "").toLowerCase();
                    const phone = (p.phone || "").toLowerCase();
                    const content = (p.contentTitle || "").toLowerCase();
                    const code = (p.referenceCode || p.refCode || "").toLowerCase();
                    const provider = (p.provider || p.paymentMethod || "").toLowerCase();
                    return name.includes(q) || email.includes(q) || phone.includes(q) || content.includes(q) || code.includes(q) || provider.includes(q);
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-[#30363d] rounded-2xl text-xs text-slate-500 font-mono">
                      No matching payment requests found.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-[#30363d]">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#0d1117] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#30363d]">
                        <tr>
                          <th className="p-3">Student / Batch Info</th>
                          <th className="p-3">Reference Details</th>
                          <th className="p-3">Provider</th>
                          <th className="p-3">Item / Subscription</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]">
                        {filtered.map((p) => (
                          <React.Fragment key={p.id}>
                            <tr className="hover:bg-[#1f242c] transition-colors">
                              <td className="p-3">
                                <div className="font-semibold text-white">{p.userName || "Student Recipient"}</div>
                                <div className="text-[10px] text-[#8b949e] font-mono">{p.userEmail}</div>
                                <div className="text-[9px] text-gray-500 mt-0.5">
                                  {new Date(p.createdAt).toLocaleString()}
                                </div>
                              </td>
                              <td className="p-3 font-mono">
                                <div className="text-white text-xs">{p.phone}</div>
                                {p.referenceCode && (
                                  <div className="text-[10px] text-orange-400 font-bold uppercase mt-0.5" title="Transaction ID">
                                    MOMO ID: {p.referenceCode}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  (p.provider || p.paymentMethod) === "MTN" 
                                    ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20" 
                                    : "bg-red-500/10 text-red-300 border border-red-500/20"
                                }`}>
                                  {p.provider || p.paymentMethod || "MTN"}
                                </span>
                              </td>
                              <td className="p-3 max-w-[200px] truncate">
                                <span className="font-bold text-gray-200 block truncate" title={p.contentTitle}>
                                  {p.contentTitle || "Premium Subscription License"}
                                </span>
                                <span className="text-[9px] text-gray-500 uppercase">{p.contentType}</span>
                              </td>
                              <td className="p-3 font-mono text-emerald-400 font-bold">
                                UGX {Number(p.amountPaid || p.amount || 15000).toLocaleString()}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold" :
                                  p.status === "REJECTED" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                                  "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {p.proofUrl && (
                                    <a
                                      href={p.proofUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-[#21262d] hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded text-[10px] font-mono transition-colors border border-[#30363d]"
                                    >
                                      Preview Proof
                                    </a>
                                  )}
                                  
                                  {(p.status === "PENDING" || p.status === "PENDING_APPROVAL") && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`Are you sure you want to APPROVED payment for "${p.contentTitle}"? This will instantly trigger an in-app and push notification to the student.`)) return;
                                          try {
                                            // Empty payload for PUT request as per current API specs
                                            const payload = {};
                                            console.log("[DEBUG] Approve Click Handler: Initiated");
                                            console.log("[DEBUG] Request Payload:", JSON.stringify(payload));
                                            console.log("[DEBUG] Exact Payment ID being sent to /api/payments/approve:", p.id);

                                            const res = await fetch(`/api/payments/${p.id}/approve`, {
                                              method: "PUT",
                                              headers: {
                                                "Content-Type": "application/json",
                                                "Authorization": `Bearer ${user.email}`
                                              }
                                            });

                                            const resData = await res.json();
                                            console.log("[DEBUG] Full JSON response:", JSON.stringify(resData, null, 2));

                                            if (res.status !== 200) {
                                              alert(resData.error || `Error status code ${res.status}: Failed to approve payment.`);
                                              return;
                                            }

                                            if (resData.success) {
                                              setFeedback(`✅ Verified! Payment approved and premium access unlocked for ${p.userName}.`);
                                              loadPlatformData();
                                            } else {
                                              alert(resData.error || "Approval request failed.");
                                            }
                                          } catch (err: any) {
                                            alert(err.message || "Network exception.");
                                          }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px]"
                                      >
                                        Verify Approve
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          setRejectId(p.id);
                                          setRejectExplanation("");
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px]"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => {
                                      openDeleteConfirmation(
                                        "Move Payment Request to Trash?",
                                        "Are you sure you want to move this request to the Trash Bin (Soft Delete)?",
                                        async () => {
                                          const res = await fetch(`/api/payments/${p.id}`, {
                                            method: "DELETE",
                                            headers: {
                                              "Authorization": `Bearer ${user.email}`
                                            }
                                          });
                                          const resData = await res.json();
                                          if (!resData.success) {
                                            throw new Error(resData.error || "Failed to move payment request to trash");
                                          }
                                          setAdminPaymentRequests(prev => prev.filter(req => req.id !== p.id));
                                          showToast("Payment request moved to the trash archive! 🧹", "success");
                                          loadPlatformData();
                                        }
                                      );
                                    }}
                                    className="bg-transparent hover:bg-slate-800 text-slate-500 hover:text-red-400 p-1 rounded"
                                    title="Move to trash"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* REJECTION FORM DRAWER ROW */}
                            {rejectId === p.id && (
                              <tr>
                                <td colSpan={7} className="p-4 bg-[#0d1117] border border-red-500/20 rounded-b-xl">
                                  <div className="space-y-3 max-w-xl">
                                    <label className="block text-xs font-bold text-red-400 uppercase">
                                      Specify Rejection Reason (Dispatched to Student Notification Feed):
                                    </label>
                                    <textarea
                                      value={rejectExplanation}
                                      onChange={(e) => setRejectExplanation(e.target.value)}
                                      placeholder="e.g. Uploaded screenshot is blurred/blank. Or the Mobile Money reference ID does not exist in our systems. Please re-submit."
                                      className="w-full bg-[#161b22] border border-[#30363d] p-3 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500 h-20 font-sans"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={async () => {
                                          if (!rejectExplanation.trim()) {
                                            alert("Please enter an explanation of rejection for the student first!");
                                            return;
                                          }
                                          try {
                                            const res = await fetch(`/api/payments/${p.id}/reject`, {
                                              method: "PUT",
                                              headers: {
                                                "Content-Type": "application/json",
                                                "Authorization": `Bearer ${user.email}`
                                              },
                                              body: JSON.stringify({ reason: rejectExplanation })
                                            });
                                            const resData = await res.json();
                                            if (resData.success) {
                                              setFeedback(`❌ Marked! Transaction rejected. Feedback sent to ${p.userEmail}.`);
                                              setRejectId(null);
                                              setRejectExplanation("");
                                              loadPlatformData();
                                            } else {
                                              alert(resData.error || "Rejection endpoint failed");
                                            }
                                          } catch (err: any) {
                                            alert(err.message);
                                          }
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded text-xs"
                                      >
                                        Confirm Rejection
                                      </button>
                                      <button
                                        onClick={() => {
                                          setRejectId(null);
                                          setRejectExplanation("");
                                        }}
                                        className="bg-transparent hover:bg-slate-800 text-slate-400 font-sans px-3 py-1.5 rounded text-xs border border-[#30363d]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 14: ADMIN NOTIFICATION SOUNDS CONTROLLER */}
          {activeAdminTab === "sounds" && (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4 font-sans animate-fade-in" id="admin-sounds-tab">
              <div className="border-b border-[#30363d] pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-orange-400" />
                  <span>Notification Alert Sounds Controller</span>
                </h3>
                <p className="text-xs text-[#8b949e]">
                  Upload custom audio files (MP3, WAV, OGG) to play during student milestones, checkouts, warning alerts, and grade notifications.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Sound Upload & Customization console */}
                <div className="bg-[#0d1117] border border-[#21262d] p-5 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-[#ff7b00] uppercase font-mono tracking-wider">
                    Configure Custom Audio Alert
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-bold block font-mono mb-1.5">
                        1. Select Alert Type Channels
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {["success", "info", "warning", "error"].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setAdminSelectedAlertType(type);
                              const existing = notificationSoundsList.find((s) => s.alertType === type);
                              setCustomSoundUploadUrl(existing?.url || "");
                              setCustomSoundFileLabel(existing?.fileName || "");
                            }}
                            className={`py-2 px-1 rounded-lg text-[10.5px] font-bold uppercase transition-all tracking-wide text-center cursor-pointer border ${
                              adminSelectedAlertType === type
                                ? type === "success" ? "bg-green-500/15 text-green-400 border-green-500/40"
                                  : type === "info" ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
                                  : type === "warning" ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                                  : "bg-red-500/15 text-red-500 border-red-500/40"
                                : "bg-[#161b22] text-[#8b949e] border-[#30363d] hover:text-white"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-bold block font-mono mb-1.5">
                        2. Upload Audio Track
                      </label>
                      
                      <div className="space-y-2">
                        <label className="border border-dashed border-[#ff7b00]/30 hover:border-[#ff7b00]/60 bg-[#161b22]/50 hover:bg-[#161b22] py-4 px-3 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all text-center">
                          <Upload className="w-6 h-6 text-[#ff7b00] mb-2 shrink-0" />
                          <span className="text-[11px] font-bold text-[#ff7b00] uppercase tracking-wider">Choose Computer Sound File</span>
                          <span className="text-[9px] text-gray-500 font-mono mt-1">MP3 / WAV / OGG</span>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                setCustomSoundFileLabel(file.name);
                                setFeedback(`Reading local sound file ${file.name}...`);
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const fileUrl = event.target?.result as string;
                                  if (fileUrl) {
                                    setCustomSoundUploadUrl(fileUrl);
                                    setFeedback(`✅ Finished reading track: ${file.name}. Click Preview Chime to listen!`);
                                    setTimeout(() => setFeedback(""), 4000);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>

                        {/* Or direct simulation box link */}
                        <div className="pt-2">
                          <span className="text-[9px] text-[#8b949e] uppercase font-bold block mb-1">Or Paste Direct Audio Endpoint URL:</span>
                          <input
                            type="text"
                            placeholder="https://example.com/chime.mp3"
                            value={customSoundUploadUrl}
                            onChange={(e) => {
                              setCustomSoundUploadUrl(e.target.value);
                              if (e.target.value && !customSoundFileLabel) {
                                setCustomSoundFileLabel("External Audio URL");
                              }
                            }}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#ff7b00]"
                          />
                        </div>
                      </div>
                    </div>

                    {customSoundUploadUrl && (
                      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] text-[#8b949e] font-mono break-all max-w-[70%]">
                            Track: {customSoundFileLabel || "custom_audio.mp3"}
                          </span>
                          <span className="text-[9px] bg-[#ff7b00]/15 text-[#ff7b00] px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                            READY TO TEST
                          </span>
                        </div>

                        {/* Interactive Preview Speaker */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!customSoundUploadUrl) return;
                              setFeedback("🔊 Auditing custom alert playback track...");
                              try {
                                const audioObj = new Audio(customSoundUploadUrl);
                                audioObj.volume = 0.8;
                                audioObj.play().catch((err) => {
                                  console.warn("Audio Context error, falling back to Web Audio API synthesis:", err);
                                  // Fallback to Web Audio synthesis beep since some browser sandboxes deny Base64 audio tags
                                  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                  if (AudioContextClass) {
                                    const ctx = new AudioContextClass();
                                    const osc = ctx.createOscillator();
                                    const gain = ctx.createGain();
                                    osc.connect(gain);
                                    gain.connect(ctx.destination);
                                    osc.frequency.setValueAtTime(adminSelectedAlertType === "success" ? 880 : 440, ctx.currentTime);
                                    gain.gain.setValueAtTime(0.12, ctx.currentTime);
                                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                                    osc.start(ctx.currentTime);
                                    osc.stop(ctx.currentTime + 0.4);
                                  }
                                });
                              } catch (e) {
                                console.warn(e);
                              }
                              setTimeout(() => setFeedback(""), 3555);
                            }}
                            className="w-full bg-[#1c2128] hover:bg-[#2d333b] border border-[#30363d] text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>🔊 PREVIEW AUDIBLE CHIME</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#21262d] flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!customSoundUploadUrl) {
                            alert("Please select or upload an alert audio file first!");
                            return;
                          }
                          try {
                            setFeedback("Saving customized sound configuration...");
                            const res = await fetch("/api/notifications/sounds", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${user.email}`
                              },
                              body: JSON.stringify({
                                alertType: adminSelectedAlertType,
                                url: customSoundUploadUrl,
                                fileName: customSoundFileLabel || `custom_${adminSelectedAlertType}.mp3`
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setFeedback(`✨ Success! Custom sound configured for alert [${adminSelectedAlertType}].`);
                              // Refresh sounds
                              loadPlatformData();
                            } else {
                              alert(`Error: ${data.error}`);
                            }
                          } catch (err: any) {
                            alert(`Network failed: ${err.message}`);
                          }
                        }}
                        className="bg-[#2ea44f] hover:bg-[#2c974b] text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save Chime Sound
                      </button>
                    </div>

                  </div>
                </div>

                {/* Sounds listing desk */}
                <div className="bg-[#0d1117] border border-[#21262d] p-5 rounded-xl space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider mb-2">
                      Active Sound Settings Registries
                    </h4>
                    <p className="text-[10px] text-gray-500 mb-4">
                      The core triggers look for custom files below. If empty, the high-fidelity sound synthesizer fallback handles alert playback immediately.
                    </p>

                    <div className="space-y-2">
                      {["success", "info", "warning", "error"].map((type) => {
                        const boundSound = notificationSoundsList.find((s) => s.alertType === type);
                        return (
                          <div
                            key={type}
                            className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                type === "success" ? "bg-green-500/10 text-green-400"
                                  : type === "info" ? "bg-blue-500/10 text-blue-400"
                                  : type === "warning" ? "bg-amber-500/10 text-amber-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}>
                                {type}
                              </span>
                              <span className="text-[#8b949e] max-w-[150px] truncate font-mono text-[10.5px]">
                                {boundSound ? boundSound.fileName : "Synthesizer Fallback"}
                              </span>
                            </div>

                            {boundSound ? (
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    const audioObj = new Audio(boundSound.url);
                                    audioObj.volume = 0.8;
                                    audioObj.play().catch(() => {
                                      // synthesis fallback
                                      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                      if (AudioContextClass) {
                                        const ctx = new AudioContextClass();
                                        const osc = ctx.createOscillator();
                                        const gain = ctx.createGain();
                                        osc.connect(gain);
                                        gain.connect(ctx.destination);
                                        osc.frequency.setValueAtTime(type === "success" ? 880 : 440, ctx.currentTime);
                                        gain.gain.setValueAtTime(0.12, ctx.currentTime);
                                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                                        osc.start(ctx.currentTime);
                                        osc.stop(ctx.currentTime + 0.4);
                                      }
                                    });
                                  } catch (_) {}
                                }}
                                className="bg-[#21262d] hover:bg-[#30363d] text-slate-200 py-1 px-2.5 rounded border border-[#30363d] text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                              >
                                <span>🔊 Play Chime</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-600 font-mono italic">Offline Default</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[10px] text-blue-400/80 leading-relaxed font-sans font-normal">
                    💡 **Play-it note:** Synthesizer triggers fallback dynamically inside client sessions if Base64 payloads are too heavy for low bandwidth connections.
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 15: ADMIN TRANSACTION HISTORY AUDIT LEDGER */}
          {activeAdminTab === "transactions" && (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4 font-sans animate-fade-in" id="admin-transactions-tab">
              <div className="border-b border-[#30363d] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-[#ff7b00]" />
                    <span>Administrative Transaction History Ledger</span>
                  </h3>
                  <p className="text-xs text-[#8b949e]">
                    Direct historical data from the 'transactions' table including MoMo references, success statuses, student records, and purchase metadata.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadPlatformData();
                    setFeedback("🔄 Transaction ledger synchronized successfully!");
                    setTimeout(() => setFeedback(""), 3000);
                  }}
                  className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>🔄 Refresh Logs</span>
                </button>
              </div>

              {/* Statistical insights headers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase font-mono font-bold block">Aggregated Revenue (SUCCESS)</span>
                  <div className="text-lg font-extrabold text-green-400 mt-1 font-mono">
                    {adminTransactions.filter(t => t.status === "SUCCESS" || t.status === "APPROVED").reduce((sum, current) => sum + (Number(current.amount) || 0), 0).toLocaleString()} UGX
                  </div>
                </div>
                <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase font-mono font-bold block">Settled Transactions Count</span>
                  <div className="text-lg font-extrabold text-white mt-1 font-mono">
                    {adminTransactions.filter(t => t.status === "SUCCESS" || t.status === "APPROVED").length} / {adminTransactions.length}
                  </div>
                </div>
                <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase font-mono font-bold block">Pending Escrow</span>
                  <div className="text-lg font-extrabold text-amber-500 mt-1 font-mono">
                    {adminTransactions.filter(t => t.status === "PENDING").reduce((sum, current) => sum + (Number(current.amount) || 0), 0).toLocaleString()} UGX
                  </div>
                </div>
              </div>

              {/* Filtering console */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0d1117] p-3 rounded-xl border border-[#21262d]">
                <div className="sm:col-span-2">
                  <label className="text-[9px] uppercase font-bold text-[#8b949e] font-mono block mb-1">Search student, content, or reference</label>
                  <input
                    type="text"
                    value={txFilterQuery}
                    onChange={(e) => setTxFilterQuery(e.target.value)}
                    placeholder="Type name, email, item title, or phone reference..."
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff7b00]"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#8b949e] font-mono block mb-1">Settle Status Filter</label>
                  <select
                    value={txFilterStatus}
                    onChange={(e) => setTxFilterStatus(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff7b00]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUCCESS">Success Only</option>
                    <option value="PENDING">Pending Only</option>
                    <option value="FAILED">Failed/Rejected</option>
                  </select>
                </div>
              </div>

              {/* Render dynamic list */}
              {(() => {
                const filtered = adminTransactions.filter(t => {
                  const matchesStatus =
                    txFilterStatus === "ALL" ||
                    (txFilterStatus === "SUCCESS" && (t.status === "SUCCESS" || t.status === "APPROVED")) ||
                    (txFilterStatus === "PENDING" && t.status === "PENDING") ||
                    (txFilterStatus === "FAILED" && (t.status === "FAILED" || t.status === "REJECTED"));

                  const q = txFilterQuery.toLowerCase();
                  const matchesSearch =
                    !q ||
                    (t.id && t.id.toString().includes(q)) ||
                    (t.userName && t.userName.toLowerCase().includes(q)) ||
                    (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
                    (t.contentTitle && t.contentTitle.toLowerCase().includes(q)) ||
                    (t.contentType && t.contentType.toLowerCase().includes(q)) ||
                    (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
                    (t.phone && t.phone.includes(q));

                  return matchesStatus && matchesSearch;
                });

                return (
                  <div className="overflow-x-auto rounded-xl border border-[#30363d] bg-[#0d1117]/30">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#30363d] bg-[#0d1117] text-[#8b949e] font-mono text-[10px] uppercase">
                          <th className="p-3.5">Transaction ID</th>
                          <th className="p-3.5">Student / User</th>
                          <th className="p-3.5">Purchased Content (Metadata)</th>
                          <th className="p-3.5 text-right font-mono">Amount Paid</th>
                          <th className="p-3.5 text-center">Receipt channel</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#21262d]">
                        {filtered.length > 0 ? (
                          filtered.map((item) => (
                            <tr key={item.id} className="hover:bg-[#161b22]/50 transition-colors">
                              <td className="p-3.5 font-mono text-[#ff7b00] font-bold text-[11px]">
                                #TX-{item.id ? item.id.toString().padStart(6, '0') : "000000"}
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                  <span>{item.userName}</span>
                                </div>
                                <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                                  {item.userEmail || "No email address info"}
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-[#21262d] text-[#ff7b00] inline-block mb-1">
                                  {item.contentType || "PREMIUM"}
                                </span>
                                <div className="font-bold text-slate-300 text-[11px] limit-line-1">
                                  {item.contentTitle || "Custom Premium Content"}
                                </div>
                              </td>
                              <td className="p-3.5 text-right font-mono font-bold text-white text-[11px]">
                                {item.amount ? Number(item.amount).toLocaleString() : "0"} UGX
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="font-mono text-[10.5px] uppercase font-bold text-slate-400">
                                  {item.paymentMethod || "MOMO"}
                                </div>
                                {item.phone && (
                                  <div className="text-[9px] text-gray-600 font-mono mt-0.5">
                                    Ref: {item.phone}
                                  </div>
                                )}
                              </td>
                              <td className="p-3.5 text-center">
                                <span className={`inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${
                                  item.status === "SUCCESS" || item.status === "APPROVED"
                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                    : item.status === "FAILED" || item.status === "REJECTED"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                                }`}>
                                  {item.status || "PENDING"}
                                </span>
                              </td>
                              <td className="p-3.5 text-right text-gray-500 font-mono text-[10.5px]">
                                {item.timestamp ? new Date(item.timestamp).toLocaleString(undefined, {
                                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                }) : "Pending queue"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500 text-[11px] italic">
                              No transactions match the specified filters. Try checking other status options or clear your search input!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      ) : (
        /* =========================================================================
           STUDENT PROGRESS OVERLOOK COCKPIT
           ========================================================================= */
        <div className="space-y-6" id="student-learning-cockpit">
          
          {/* Dynamic Learning Pathway Sequence and Course Suggestions */}
          {adminLearningPaths.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <MapPin className="text-[#ff7b00] w-4 h-4" />
                <span>YOUR ACTIVE CURRICULUM PATHWAY</span>
              </h3>
              
              {adminLearningPaths.map((lp) => (
                <div key={lp.id} className="p-4 bg-[#0d1117] border border-[#21262d] rounded-xl space-y-2">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <Star className="text-amber-400 w-4 h-4 fill-current" />
                    <span>{lp.title}</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">{lp.description}</p>
                  
                  {/* Sequence mapping courses cleanly inside pathway */}
                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    {lp.courseIds.map((cId) => {
                      const correlatedCourse = coursesList.find(c => c.id === cId);
                      if (!correlatedCourse) return null;
                      return (
                        <div key={cId} className="flex-1 p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white text-[11px] block">{correlatedCourse.title}</span>
                            <span className="text-[10px] text-gray-500">Course Index: #{cId}</span>
                          </div>
                          {!correlatedCourse.isEnrolled ? (
                            <button
                              onClick={() => onEnrollCourse(cId)}
                              className="text-[10px] bg-[#ff7b00] hover:bg-[#e66f00] text-white py-1 px-3.5 rounded font-bold transition-all shrink-0"
                            >
                              Enroll
                            </button>
                          ) : (
                            <span className="text-green-500 font-mono text-[9px] font-bold bg-green-500/10 px-2.5 py-1 rounded">Active Study</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recharts Student Progress Cohort Chart */}
          {coursesList.filter(c => c.isEnrolled).length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4" id="student-progress-chart-block">
              <div className="flex justify-between items-center pb-2 border-b border-[#21262d]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-[#ff7b00] w-4 h-4" />
                  <span>STUDENT ENROLLMENT MODULAR COMPLETION INDEX</span>
                </h3>
                <span className="text-[10px] font-mono text-gray-500 font-bold bg-[#ff7b00]/10 text-[#ff7b00] px-2.5 py-1 rounded">Live Index Metrics</span>
              </div>
              
              <div className="h-60 w-full" id="recharts-nested-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={coursesList.filter(c => c.isEnrolled).map(c => ({
                      name: c.title.substring(0, 25) + (c.title.length > 25 ? "..." : ""),
                      "Completion %": c.progressPercent,
                    }))}
                    margin={{ top: 15, right: 20, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#8b949e" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={{ stroke: '#30363d' }}
                    />
                    <YAxis 
                      stroke="#8b949e" 
                      domain={[0, 100]} 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={{ stroke: '#30363d' }}
                      unit="%" 
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1d242c", borderColor: "#30363d", borderRadius: "8px", color: "#c9d1d9" }}
                      labelStyle={{ color: "#ffffff", fontWeight: "bold", fontSize: "11px" }}
                      itemStyle={{ color: "#ff7b00", fontSize: "11px" }}
                      cursor={{ fill: 'rgba(255, 123, 0, 0.05)' }}
                    />
                    <Bar dataKey="Completion %" fill="#ff7b00" radius={[4, 4, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* GRID: Student Enrolled Modules, Certified Accomplishments, & Profile Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Active Enrolled Courses list */}
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col justify-between" id="student-enrolled-courses">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <BookMarked className="w-4 h-4 text-[#ff7b00]" />
                  <span>Enrolled Courses</span>
                </h3>

                <div className="space-y-3.5 overflow-y-auto max-h-[350px] pr-1">
                  {coursesList.filter(c => c.isEnrolled).map((c) => (
                    <div key={c.id} className="p-3.5 bg-[#0d1117] border border-[#21262d] rounded-xl space-y-2.5 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white block capitalize">{c.title}</span>
                        <span className="font-mono text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">{c.progressPercent}% Spec</span>
                      </div>
                      
                      {/* Percent bars */}
                      <div className="w-full bg-[#161b22] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#ff7b00] h-full transition-all" style={{ width: `${c.progressPercent}%` }} />
                      </div>
                    </div>
                  ))}

                  {coursesList.filter(c => c.isEnrolled).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-8">Explore our catalog and enroll inside active courses to start tracking progress achievements here!</p>
                  )}
                </div>
              </div>
            </div>

            {/* My Certified PDF board badges */}
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl shadow-inner" id="student-certificates-catalog">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-[#ff7b00]" />
                <span>My Official Certificates</span>
              </h3>

              <div className="space-y-3 max-h-[350px] overflow-y-auto font-sans">
                {adminCertificates.filter(c => c.userId === user.id).map((cert) => (
                  <div key={cert.certificateCode} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-white capitalize leading-tight">{cert.courseTitle}</h4>
                      <span className="text-[10px] text-gray-500 block mt-1 font-mono font-normal">ID Code: {cert.certificateCode}</span>
                    </div>
                    <button
                      onClick={() => onViewCertificate(cert)}
                      className="bg-[#ff7b00]/10 hover:bg-[#ff7b00]/25 text-[#ff7b00] border border-[#ff7b00]/20 rounded-lg p-2 font-semibold transition-all shrink-0 flex items-center gap-1 text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                ))}

                {adminCertificates.filter(c => c.userId === user.id).length === 0 && (
                  <div className="text-center py-10 space-y-2">
                    <Award className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">Score 100% inside course lesson outlines, quizzes or challenges to unlock downloadable PDF graduate certificates signed by our Board!</p>
                  </div>
                )}
              </div>
            </div>

            {/* My Profile Digital Identity Settings Card */}
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col justify-between" id="student-profile-settings">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <Settings className="w-4 h-4 text-[#ff7b00]" />
                  <span>My Profile Settings</span>
                </h3>
                <p className="text-[10px] text-[#8b949e] mb-4">
                  Manage your visual digital identity, uploaded credentials, and student avatar configuration.
                </p>

                <div className="space-y-4">
                  
                  {/* Avatar Previews and Drag & Drop or Custom upload */}
                  <div className="flex flex-col items-center justify-center p-3.5 bg-[#0d1117] border border-[#21262d] rounded-xl text-center space-y-3">
                    <div className="relative group">
                      <img
                        src={user.profile_picture_url || user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                        alt={user.name}
                        className="w-16 h-16 rounded-full border-2 border-[#ff7b00] object-cover bg-neutral-900 shadow-md transition-all group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-[#0d1117] rounded-full" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-white font-mono block uppercase">
                        {user.name}
                      </span>
                      <span className="text-[9px] text-[#8b949e]">
                        {user.email}
                      </span>
                    </div>

                    {/* Drag and Drop File input selector */}
                    <div className="w-full">
                      <label className="border border-dashed border-[#ff7b00]/30 hover:border-[#ff7b00]/60 bg-[#161b22]/50 hover:bg-[#161b22] py-2 px-2.5 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all">
                        <Upload className="w-4 h-4 text-[#ff7b00] mb-1 shrink-0" />
                        <span className="text-[9.5px] font-bold text-[#ff7b00] uppercase tracking-wider">Upload Profile Pic</span>
                        <span className="text-[8px] text-gray-500 font-mono mt-0.5">JPEG / PNG / Base64</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                const fileUrl = event.target?.result as string;
                                if (fileUrl) {
                                  try {
                                    setFeedback("Downscaling image footprint...");
                                    const img = new Image();
                                    img.onload = async () => {
                                      const canvas = document.createElement("canvas");
                                      const maxDim = 150;
                                      let width = img.width;
                                      let height = img.height;
                                      if (width > height) {
                                        if (width > maxDim) {
                                          height = Math.round((height * maxDim) / width);
                                          width = maxDim;
                                        }
                                      } else {
                                        if (height > maxDim) {
                                          width = Math.round((width * maxDim) / height);
                                          height = maxDim;
                                        }
                                      }
                                      canvas.width = width;
                                      canvas.height = height;
                                      const ctx = canvas.getContext("2d");
                                      if (ctx) {
                                        ctx.drawImage(img, 0, 0, width, height);
                                        const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
                                        
                                        setFeedback("Saving optimized avatar to database...");
                                        const res = await fetch("/api/users/profile", {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                            "Authorization": `Bearer ${user.email}`
                                          },
                                          body: JSON.stringify({ profile_picture_url: optimizedBase64 })
                                        });
                                        const data = await res.json();
                                        if (data.success && data.user) {
                                          setFeedback("✨ Profile picture updated successfully!");
                                          if (onUpdateUser) {
                                            onUpdateUser(data.user);
                                          } else {
                                            window.location.reload();
                                          }
                                        } else {
                                          setFeedback(`❌ Error: ${data.error || "Update failed"}`);
                                        }
                                      } else {
                                        setFeedback("❌ Failed to initialize graphic context.");
                                      }
                                    };
                                    img.onerror = () => {
                                      setFeedback("❌ Failed to load source file format.");
                                    };
                                    img.src = fileUrl;
                                  } catch (err: any) {
                                    setFeedback(`❌ Optimization exception: ${err.message || err}`);
                                  }
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                  </div>

                  {/* Direct Input text Url input */}
                  <div className="space-y-1.5 bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                    <label className="text-[9px] text-[#8b949e] uppercase font-bold block">Or Paste Direct Image Link:</label>
                    <div className="flex gap-1.5 justify-start items-center">
                      <input
                        type="text"
                        defaultValue={user.profile_picture_url || ""}
                        placeholder="e.g. https://domain.com/my-pic.jpg"
                        className="flex-1 min-w-0 bg-[#161b22] border border-[#30363d] focus:border-[#ff7b00] text-[10px] rounded p-1.5 text-white outline-none font-mono"
                        id="paste-profile-url-field"
                      />
                      <button
                        onClick={async () => {
                          const field = document.getElementById("paste-profile-url-field") as HTMLInputElement;
                          if (field) {
                            try {
                              setFeedback("Setting profile picture link...");
                              const res = await fetch("/api/users/profile", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${user.email}`
                                },
                                body: JSON.stringify({ profile_picture_url: field.value })
                              });
                              const data = await res.json();
                              if (data.success && data.user) {
                                setFeedback("✨ Profile picture URL updated successfully!");
                                if (onUpdateUser) {
                                  onUpdateUser(data.user);
                                } else {
                                  window.location.reload();
                                }
                              } else {
                                setFeedback(`❌ Error: ${data.error || "Update failed"}`);
                              }
                            } catch (err: any) {
                              setFeedback(`❌ Network issue: ${err.message || err}`);
                            }
                          }
                        }}
                        className="bg-[#ff7b00] hover:bg-orange-600 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        SET URL
                      </button>
                    </div>
                  </div>

                  {/* Student profile credentials update */}
                  <div className="space-y-3 bg-[#0d1117] p-4 rounded-xl border border-[#21262d] mt-4 shadow-inner">
                    <h5 className="text-[10px] font-bold text-[#ff7b00] uppercase tracking-wider block">Update Your Login Credentials</h5>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-[#8b949e] uppercase font-bold block">New Username / Full Name:</label>
                        <input
                          type="text"
                          defaultValue={user.name}
                          id="student-username-field"
                          className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#ff7b00] text-xs rounded p-2 text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-[#8b949e] uppercase font-bold block">New Email Address:</label>
                        <input
                          type="email"
                          defaultValue={user.email}
                          id="student-email-field"
                          className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#ff7b00] text-xs rounded p-2 text-white outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-[#8b949e] uppercase font-bold block">New Password (Optional):</label>
                        <input
                          type="password"
                          placeholder="Type a secure new password..."
                          id="student-new-password-field"
                          className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#ff7b00] text-xs rounded p-2 text-white outline-none font-mono"
                        />
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const name = (document.getElementById("student-username-field") as HTMLInputElement)?.value;
                        const email = (document.getElementById("student-email-field") as HTMLInputElement)?.value;
                        const password = (document.getElementById("student-new-password-field") as HTMLInputElement)?.value;
                        
                        setFeedback("Applying credentials updates...");
                        try {
                          const res = await fetch("/api/users/profile", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${user.email}`
                            },
                            body: JSON.stringify({ name, email, password: password || undefined })
                          });
                          const data = await res.json();
                          if (data.success && data.user) {
                            setFeedback("✨ Your student credentials have been saved and updated successfully.");
                            const passwordField = document.getElementById("student-new-password-field") as HTMLInputElement;
                            if (passwordField) passwordField.value = "";
                            if (onUpdateUser) {
                              onUpdateUser(data.user);
                            }
                          } else {
                            setFeedback(`❌ Error to update: ${data.error || "Save credentials failed"}`);
                          }
                        } catch (err: any) {
                          setFeedback(`❌ Connection issue: ${err.message}`);
                        }
                      }}
                      className="bg-[#ff7b00] hover:bg-[#e66f00] text-white font-extrabold text-[10.5px] w-full py-2 rounded-lg cursor-pointer transition-all mt-1"
                    >
                      Update Profile Credentials
                    </button>
                  </div>

                  {/* Notification Settings Toggle Channels Panel */}
                  <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-3.5 mt-4" id="user-profile-notifications-panel">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-mono tracking-wide">
                      <Settings className="w-3.5 h-3.5 text-orange-400" />
                      Notification Channels Settings
                    </h4>
                    <p className="text-[9.5px] text-gray-500">
                      Select how you want to receive course updates, grades, and premium manual alerts.
                    </p>

                    <div className="space-y-3 pt-1">
                      {/* Email Channel Switch */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-200 block">Email Alerts</span>
                          <span className="text-[9.5px] text-gray-500">Receive inbox briefings on completed credentials.</span>
                        </div>
                        <button
                          onClick={async () => {
                            const updated = {
                              ...userNotificationSettings,
                              emailNotifications: !userNotificationSettings.emailNotifications,
                              email_notifications: !userNotificationSettings.emailNotifications
                            };
                            setUserNotificationSettings(updated);
                            try {
                              const res = await fetch("/api/notifications/settings", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${user.email}`
                                },
                                body: JSON.stringify(updated)
                              });
                              const data = await res.json();
                              if (data.success) {
                                setFeedback("✨ Email notifications preference updated!");
                              }
                            } catch (_) {}
                          }}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                            userNotificationSettings.emailNotifications ? "bg-orange-500" : "bg-[#21262d] border border-[#30363d]"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 bg-white rounded-full transition-all ${
                              userNotificationSettings.emailNotifications ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Push Channel Switch */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-200 block">Push Notifications</span>
                          <span className="text-[9.5px] text-gray-500">Instant notification badges on mobile sync.</span>
                        </div>
                        <button
                          onClick={async () => {
                            const updated = {
                              ...userNotificationSettings,
                              pushNotifications: !userNotificationSettings.pushNotifications,
                              push_notifications: !userNotificationSettings.pushNotifications
                            };
                            setUserNotificationSettings(updated);
                            try {
                              const res = await fetch("/api/notifications/settings", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${user.email}`
                                },
                                body: JSON.stringify(updated)
                              });
                              const data = await res.json();
                              if (data.success) {
                                setFeedback("✨ Push notifications preference updated!");
                              }
                            } catch (_) {}
                          }}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                            userNotificationSettings.pushNotifications ? "bg-orange-500" : "bg-[#21262d] border border-[#30363d]"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 bg-white rounded-full transition-all ${
                              userNotificationSettings.pushNotifications ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* In-App Channel Switch */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-200 block">In-App Alerts & Tones</span>
                          <span className="text-[9.5px] text-gray-500">Control browser live sound system chimes.</span>
                        </div>
                        <button
                          onClick={async () => {
                            const updated = {
                              ...userNotificationSettings,
                              soundNotifications: !userNotificationSettings.soundNotifications,
                              sound_notifications: !userNotificationSettings.soundNotifications,
                              inAppNotifications: !userNotificationSettings.soundNotifications
                            };
                            setUserNotificationSettings(updated);
                            try {
                              const res = await fetch("/api/notifications/settings", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${user.email}`
                                },
                                body: JSON.stringify(updated)
                              });
                              const data = await res.json();
                              if (data.success) {
                                setFeedback("✨ In-App alerts preference updated!");
                              }
                            } catch (_) {}
                          }}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                            userNotificationSettings.soundNotifications ? "bg-orange-500" : "bg-[#21262d] border border-[#30363d]"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 bg-white rounded-full transition-all ${
                              userNotificationSettings.soundNotifications ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>

          {/* Student learning streak stats */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl">
            <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-3">Recent Announcements BOARD</h4>
            <div className="space-y-2.5">
              {adminAnnouncements.slice(0, 3).map((a) => (
                <div key={a.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-start gap-3 text-xs leading-relaxed">
                  <Megaphone className="w-4 h-4 text-[#ff7b00] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {a.title}
                      {a.isImportant && <span className="bg-red-500/15 border border-red-500/20 text-red-500 text-[8px] font-bold rounded px-1 text-[9px]">IMPORTANT BRIEF</span>}
                    </span>
                    <p className="text-gray-400 text-[11px] mt-1 leading-relaxed">{a.content}</p>
                    <span className="text-[9px] text-gray-500 font-mono mt-1 block font-normal">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {adminAnnouncements.length === 0 && (
                <p className="text-[10px] text-gray-500 text-center py-3">No announcements on board.</p>
              )}
            </div>
          </div>

          {/* Student Transaction History View */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl shadow-xl flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#21262d]">
              <div>
                <h4 className="text-xs font-mono font-bold text-gray-400 tracking-wider uppercase">VERIFIED LEDGER</h4>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  <FileText className="text-[#ff7b00] w-4 h-4" />
                  <span>Your Transaction & Premium Access History</span>
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#2ea44f] bg-[#2ea44f]/10 border border-[#2ea44f]/25 px-2.5 py-1 rounded inline-flex items-center gap-1">
                💸 Real-time Ledger
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#21262d] bg-[#0d1117]/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#21262d] bg-[#0d1117] text-[#8b949e] font-mono text-[10px] uppercase">
                    <th className="p-3">Reference / ID</th>
                    <th className="p-3">Purchased Content & Metadata</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3 text-right font-mono">Price</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Settled On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] font-sans">
                  {studentPaymentRequestsList.length > 0 ? (
                    studentPaymentRequestsList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#161b22]/50 transition-colors">
                        <td className="p-3 font-mono text-gray-400 font-bold text-[10.5px]">
                          {tx.id ? `#TX-${tx.id.toString().substring(0, 8)}` : "DEFAULT-STUB"}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-100">{tx.contentTitle || tx.contentType || "Premium Item"}</div>
                          <div className="text-[10px] text-gray-500 font-normal flex items-center gap-1.5 mt-0.5">
                            <span>Phone: {tx.phone || "N/A"}</span>
                            <span>•</span>
                            <span>Proof: {(tx.proofUrl || tx.cloudinaryProofUrl) ? (
                              <a href={tx.proofUrl || tx.cloudinaryProofUrl} target="_blank" rel="noreferrer" className="text-orange-400 hover:underline inline-flex items-center gap-0.5 font-bold">
                                View Proof ↗
                              </a>
                            ) : "None"}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-[10.5px] uppercase font-bold text-slate-300">
                            {tx.paymentMethod || "MOMO"}
                          </span>
                        </td>
                        <td className="p-3 text-right text-white font-mono font-bold">
                          {(tx.amountPaid || tx.amount) ? Number(tx.amountPaid || tx.amount).toLocaleString() : "0"} UGX
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                            tx.status === "APPROVED" || tx.status === "SUCCESS"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : tx.status === "REJECTED" || tx.status === "FAILED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                          }`}>
                            {tx.status || "PENDING"}
                          </span>
                        </td>
                        <td className="p-3 text-right text-gray-500 font-mono text-[10.5px]">
                          {tx.createdAt || tx.timestamp ? new Date(tx.createdAt || tx.timestamp).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          }) : "Queueing"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500 text-[11px] italic">
                        No transactions registered yet. Purchase custom courses, challenges, or PDF books to record ledger history here!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
