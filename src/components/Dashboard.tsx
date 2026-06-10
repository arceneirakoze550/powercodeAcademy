import React, { useState, useEffect } from "react";
import { User, Course, Tutorial, PdfBook, Quiz, CodingChallenge, Certificate, Announcement, LearningPath } from "../types";
import { Users, BookOpen, FileText, Landmark, Award, ShieldAlert, TrendingUp, Settings, Plus, Flame, Sparkles, BookMarked, Eye, Trash, CheckSquare, Clock, Upload, Film, Edit, HelpCircle, Check, MapPin, Megaphone, Star, ChevronRight, CornerDownRight } from "lucide-react";
import { exportSelectedItemsToPdf } from "../utils/pdfService";

interface DashboardProps {
  user: User;
  onViewCertificate: (cert: Certificate) => void;
  coursesList: Course[];
  onEnrollCourse: (courseId: number) => void;
  t: (key: string) => string;
}

type AdminTab = "stats" | "courses" | "tutorials" | "pdfs" | "challenges" | "quizzes" | "certificates" | "announcements" | "paths" | "settings" | "trash" | "logs";

export default function Dashboard({ user, onViewCertificate, coursesList, onEnrollCourse, t }: DashboardProps) {
  const isAdmin = user.role === "ADMIN";

  // ADMIN VIEW CONFIG
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("stats");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // DATABASE/PLATFORM PREFERENCE PRESETS
  const [platformName, setPlatformName] = useState<string>("PowerCode Academy");
  const [enableRegistration, setEnableRegistration] = useState<boolean>(true);
  const [landingPromoBanner, setLandingPromoBanner] = useState<string>("");
  const [settingsFeedback, setSettingsFeedback] = useState<string>("");

  // COLLECTIONS STATE FOR MANAGEMENT
  const [adminCourses, setAdminCourses] = useState<Course[]>([]);
  const [adminTutorials, setAdminTutorials] = useState<Tutorial[]>([]);
  const [adminPdfs, setAdminPdfs] = useState<PdfBook[]>([]);
  const [adminChallenges, setAdminChallenges] = useState<CodingChallenge[]>([]);
  const [adminQuizzes, setAdminQuizzes] = useState<Quiz[]>([]);
  const [adminCertificates, setAdminCertificates] = useState<Certificate[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<Announcement[]>([]);
  const [adminLearningPaths, setAdminLearningPaths] = useState<LearningPath[]>([]);

  // FILE UPLOAD AND SIMULATION HELPER
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // 1. COURSE CREATOR/EDITOR STATE
  const [editCourseId, setEditCourseId] = useState<number | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [courseDesc, setCourseDesc] = useState<string>("");
  const [courseThumbnail, setCourseThumbnail] = useState<string>("");
  const [courseBanner, setCourseBanner] = useState<string>("");
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

  // 3. PDF BOOK CREATOR STATE
  const [pdfTitle, setPdfTitle] = useState<string>("");
  const [pdfAuthor, setPdfAuthor] = useState<string>("");
  const [pdfCategory, setPdfCategory] = useState<string>("Coding");
  const [pdfFileUrl, setPdfFileUrl] = useState<string>("");
  const [pdfPremium, setPdfPremium] = useState<boolean>(false);

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

      // Settings config
      const setData = await safeFetchJson("/api/settings");
      if (setData.settings) {
        setPlatformName(setData.settings.platformName);
        setEnableRegistration(setData.settings.enableRegistration);
        setLandingPromoBanner(setData.settings.landingPromoBanner);
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

      // Admin logs
      const logsData = await safeFetchJson("/api/admin/logs", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      setAdminActivityLogs(logsData.logs || []);

    } catch (e) {
      console.error("Dashboard database synchronization failed", e);
    } finally {
      setLoading(false);
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

    let msg = `Are you sure you want to ${action} ${ids.length} selected items?`;
    if (action === "permanent_delete") {
      msg = `CRITICAL WARNING: This will permanently and irreversibly delete ${ids.length} selected items from the active database! Continue?`;
    }
    if (!confirm(msg)) return;

    setFeedback(`Executing bulk ${action}...`);
    try {
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
        setFeedback(`❌ Bulk action error: ${data.error}`);
      } else {
        setFeedback(`✅ Bulk ${action} completed successfully!`);
        // Clear selection states
        if (contentType === "COURSE") setSelectedCourses([]);
        else if (contentType === "TUTORIAL") setSelectedTutorials([]);
        else if (contentType === "PDF") setSelectedPdfs([]);
        else if (contentType === "CHALLENGE") setSelectedChallenges([]);
        else if (contentType === "ANNOUNCEMENT") setSelectedAnnouncements([]);
        
        loadPlatformData();
      }
    } catch {
      setFeedback("❌ Failed to reach system administration endpoint.");
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

  // LOCAL SECURE COMPUTER FILE UPLOAD SIMULATOR (CLOUDINARY)
  const handleFileSystemUploadSim = async (e: React.ChangeEvent<HTMLInputElement>, fileType: "image" | "video", setterCallback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(`Uploading ${file.name} to Cloudinary Storage...`);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: fileType
        })
      });

      const data = await response.json();
      if (data.success) {
        setterCallback(data.url);
        setUploadProgress(`✅ Successfully linked direct Cloudinary secure URL!`);
      } else {
        setUploadProgress(`❌ File upload pipeline error.`);
      }
    } catch {
      setUploadProgress(`❌ Network pipeline connection error.`);
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

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this course?")) return;
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        loadPlatformData();
      }
    } catch (err) {
      console.error(err);
    }
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
      videoUrl: tutVideoUrl
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
    setFeedback("🛠️ Editing tutorial settings.");
  };

  const handleDeleteTutorial = async (id: number) => {
    if (!confirm("Remove this tutorial?")) return;
    try {
      const res = await fetch(`/api/tutorials/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      loadPlatformData();
    } catch (err) {
      console.error(err);
    }
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
          isPremium: pdfPremium
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
    setFeedback("🛠️ PDF Book selected for edit. Update the fields above.");
  };

  const resetPdfForm = () => {
    setEditPdfId(null);
    setPdfTitle("");
    setPdfAuthor("");
    setPdfFileUrl("");
    setPdfPremium(false);
  };

  const handleDeletePdf = async (id: number) => {
    if (!confirm("Permanently strip this PDF?")) return;
    try {
      await fetch(`/api/pdfs/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
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

  const handleDeleteChallenge = async (id: number) => {
    if (!confirm("Strip challenge?")) return;
    try {
      await fetch(`/api/challenges/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
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

  const handleDeleteQuiz = async (id: number) => {
    if (!confirm("Strip quiz?")) return;
    try {
      await fetch(`/api/quizzes/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
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

  const handleRevokeCertificate = async (code: string) => {
    if (!confirm(`Revoke and delete Certificate credentials code: ${code}?`)) return;
    try {
      await fetch(`/api/certificates/${code}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
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

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
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

  // Helper arrays for dirty clean code formatting
  const modulesJsonStringClean = (str: string) => str.trim();

  return (
    <div className="space-y-6 font-sans select-none" id="powercode-dashboard-engine">
      
      {/* ROLE AND USER GREETINGS ROW */}
      <div className="bg-gradient-to-r from-[#161b22] via-[#21262d] to-[#ff7b00]/10 p-5 rounded-2xl border border-[#30363d] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
              alt={user.name}
              className="w-12 h-12 rounded-full border-2 border-[#ff7b00] object-cover"
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
            {(["stats", "courses", "tutorials", "pdfs", "challenges", "quizzes", "certificates", "announcements", "paths", "settings", "trash", "logs"] as AdminTab[]).map((tab) => (
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
                {tab === "pdfs" ? "PDF Books" : tab === "paths" ? "Learning Paths" : tab === "trash" ? "Trash Bin" : tab === "logs" ? "Activity Logs" : tab}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW METRIC INDICATORS */}
          {activeAdminTab === "stats" && stats && (
            <div className="space-y-6" id="admin-stats-view">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center">
                  <Users className="w-6 h-6 text-[#ff7b00] mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">TOTAL MEMBERS</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{stats.totalUsers || 0}</span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center">
                  <BookOpen className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">COURSES</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{stats.totalCourses || 0}</span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center">
                  <Award className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">CERTIFICATED</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{stats.totalCertificates || 0}</span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center">
                  <FileText className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">TUTORIALS</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{stats.totalTutorials || 0}</span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center">
                  <Landmark className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">REVENUE</span>
                  <span className="text-xl font-extrabold text-green-400 mt-1 block">${stats.revenue || 0}</span>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-center">
                  <Sparkles className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">CHALLENGES</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{adminChallenges.length}</span>
                </div>
              </div>

              {/* Graphics Visual Presentation Card built with purely high contrast CSS elements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-4">WEEKLY RECRUITMENT TREND</h4>
                  <div className="h-40 flex items-end justify-between px-2 pt-4 bg-[#0d1117] rounded-lg border border-[#21262d]">
                    {[4, 10, 15, 27, 45, 62, 85].map((val, idx) => (
                      <div key={idx} className="flex flex-col items-center w-full group">
                        <span className="text-[8px] text-gray-500 hidden group-hover:block transition-all mb-1">{val} refs</span>
                        <div
                          className="bg-[#ff7b00] rounded-t w-6 transition-all"
                          style={{ height: `${val * 1.2}px` }}
                        />
                        <span className="text-[8px] text-gray-400 mt-1.5 font-mono">W{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-3">HIGH-SCORE LEADERBOARD</h4>
                  <div className="space-y-2 mt-4">
                    {stats.streakLeaderboard?.map((u: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[#0d1117] border border-[#21262d] rounded-lg">
                        <span className="text-gray-400 font-mono font-bold">#{idx + 1} {u.name}</span>
                        <span className="text-orange-400 font-mono font-bold">{u.streak} days • {u.score} XP</span>
                      </div>
                    ))}
                  </div>
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
                  <label className="text-[10px] text-gray-400 uppercase font-bold block font-mono">Upload Book or File link:</label>
                  <input
                    type="text"
                    value={pdfFileUrl}
                    onChange={(e) => setPdfFileUrl(e.target.value)}
                    placeholder="Pdf location url"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white outline-none"
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
            <form onSubmit={handleSavePlatformSettings} className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl max-w-lg mx-auto space-y-5" id="admin-platform-settings">
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

              <div className="flex justify-between items-center bg-[#0d1117] p-3.5 border border-[#30363d] rounded-xl">
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
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white"
                />
              </div>

              {settingsFeedback && (
                <div className="text-xs font-mono font-bold text-green-400 bg-green-500/10 p-2 border border-green-500/20 rounded-lg">
                  {settingsFeedback}
                </div>
              )}

              <button type="submit" className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-sm text-white font-bold py-2 rounded-lg">
                Commit Preference updates
              </button>
            </form>
          )}

          {/* TAB 11: TRASH BIN CO-PILOT SYSTEM */}
          {activeAdminTab === "trash" && (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4 font-sans" id="admin-trash-bin">
              <div className="border-b border-[#30363d] pb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trash className="w-4 h-4 text-red-500" />
                    DELETED ARCHIVE CO-PILOT (TRASH BIN)
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Recover or permanently purge soft-deleted academy curricula.</p>
                </div>
              </div>

              {(() => {
                // Gather all trash items
                const coursesTrash = adminCourses.filter(c => c.isDeleted === true).map(c => ({ id: c.id, title: c.title, contentType: "COURSE" as const }));
                const tutorialsTrash = adminTutorials.filter(t => t.isDeleted === true).map(t => ({ id: t.id, title: t.title, contentType: "TUTORIAL" as const }));
                const pdfsTrash = adminPdfs.filter(p => p.isDeleted === true).map(p => ({ id: p.id, title: p.title, contentType: "PDF" as const }));
                const challengesTrash = adminChallenges.filter(c => c.isDeleted === true).map(c => ({ id: c.id, title: c.title, contentType: "CHALLENGE" as const }));
                const announcementsTrash = adminAnnouncements.filter(a => a.isDeleted === true).map(a => ({ id: a.id, title: a.title, contentType: "ANNOUNCEMENT" as const }));

                const fullTrashList = [
                  ...coursesTrash,
                  ...tutorialsTrash,
                  ...pdfsTrash,
                  ...challengesTrash,
                  ...announcementsTrash
                ];

                const [trashSelection, setTrashSelection] = useState<{ id: number; contentType: "COURSE" | "TUTORIAL" | "PDF" | "CHALLENGE" | "ANNOUNCEMENT" }[]>([]);
                const [filterType, setFilterType] = useState<string>("ALL");

                const filteredTrashList = filterType === "ALL" 
                  ? fullTrashList 
                  : fullTrashList.filter(item => item.contentType === filterType);

                const handleToggleTrashItem = (id: number, contentType: "COURSE" | "TUTORIAL" | "PDF" | "CHALLENGE" | "ANNOUNCEMENT") => {
                  const exists = trashSelection.some(x => x.id === id && x.contentType === contentType);
                  if (exists) {
                    setTrashSelection(trashSelection.filter(x => !(x.id === id && x.contentType === contentType)));
                  } else {
                    setTrashSelection([...trashSelection, { id, contentType }]);
                  }
                };

                const handleBulkRestore = async () => {
                  if (trashSelection.length === 0) {
                    alert("Please select at least one trash item to restore.");
                    return;
                  }
                  if (!confirm(`Are you sure you want to restore ${trashSelection.length} selected items?`)) return;

                  setFeedback(`Restoring ${trashSelection.length} items...`);
                  try {
                    // Group by type for easier API processing
                    const typeGroups = trashSelection.reduce((acc, current) => {
                      if (!acc[current.contentType]) acc[current.contentType] = [];
                      acc[current.contentType].push(current.id);
                      return acc;
                    }, {} as Record<string, number[]>);

                    for (const [cType, ids] of Object.entries(typeGroups)) {
                      await fetch("/api/admin/bulk", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${user.email}`
                        },
                        body: JSON.stringify({ contentType: cType, action: "restore", ids })
                      });
                    }

                    setFeedback("✅ Selected items successfully restored!");
                    setTrashSelection([]);
                    loadPlatformData();
                  } catch {
                    setFeedback("❌ Failed to complete restoration operations.");
                  }
                };

                const handleBulkPermanentDelete = async () => {
                  if (trashSelection.length === 0) {
                    alert("Please select at least one item to completely expunge.");
                    return;
                  }
                  if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY and IRREVERSIBLY erase ${trashSelection.length} selected items? This action cannot be undone.`)) return;

                  setFeedback(`Purging ${trashSelection.length} items...`);
                  try {
                    const typeGroups = trashSelection.reduce((acc, current) => {
                      if (!acc[current.contentType]) acc[current.contentType] = [];
                      acc[current.contentType].push(current.id);
                      return acc;
                    }, {} as Record<string, number[]>);

                    for (const [cType, ids] of Object.entries(typeGroups)) {
                      await fetch("/api/admin/bulk", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${user.email}`
                        },
                        body: JSON.stringify({ contentType: cType, action: "permanent_delete", ids })
                      });
                    }

                    setFeedback("✅ Selected items permanently destroyed!");
                    setTrashSelection([]);
                    loadPlatformData();
                  } catch {
                    setFeedback("❌ Complete deletion operations failed.");
                  }
                };

                return (
                  <div className="space-y-4">
                    {/* Filters and Action Buttons Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Filter:</span>
                        <select 
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="bg-[#161b22] border border-[#30363d] text-xs text-white rounded p-1 outline-none font-sans"
                        >
                          <option value="ALL">All Categories</option>
                          <option value="COURSE">Courses</option>
                          <option value="TUTORIAL">Tutorials</option>
                          <option value="PDF">PDF Books</option>
                          <option value="CHALLENGE">Challenges</option>
                          <option value="ANNOUNCEMENT">Announcements</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={handleBulkRestore}
                          disabled={trashSelection.length === 0}
                          className="px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Restore Selected ({trashSelection.length})
                        </button>
                        <button 
                          onClick={handleBulkPermanentDelete}
                          disabled={trashSelection.length === 0}
                          className="px-3 py-1.5 bg-red-400 border border-red-500/20 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Purge Selected ({trashSelection.length})
                        </button>
                      </div>
                    </div>

                    {/* Trash contents */}
                    {filteredTrashList.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs font-sans">
                        No soft-deleted content found inside the Trash Bin system.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {filteredTrashList.map((item, index) => {
                          const isSelected = trashSelection.some(x => x.id === item.id && x.contentType === item.contentType);
                          return (
                            <div key={`${item.contentType}-${item.id}`} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs font-sans">
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleTrashItem(item.id, item.contentType)}
                                  className="accent-[#ff7b00]"
                                />
                                <div>
                                  <h5 className="font-bold text-white flex items-center gap-2">
                                    <span>{item.title}</span>
                                    <span className="bg-[#21262d] text-gray-400 font-mono text-[9px] px-1 py-0.5 rounded">ID: {item.id}</span>
                                  </h5>
                                  <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/10 px-1.5 py-0.5 rounded mt-1 inline-block uppercase font-bold tracking-wider">
                                    {item.contentType}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <button 
                                  onClick={async () => {
                                    if (!confirm(`Are you sure you want to restore this ${item.contentType.toLowerCase()}?`)) return;
                                    await fetch("/api/admin/bulk", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${user.email}`
                                      },
                                      body: JSON.stringify({ contentType: item.contentType, action: "restore", ids: [item.id] })
                                    });
                                    loadPlatformData();
                                  }}
                                  className="px-2 py-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 text-[10px] font-bold rounded"
                                >
                                  Restore
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (!confirm(`CRITICAL WARNING: Permanently destroy this ${item.contentType.toLowerCase()}? This cannot be undone.`)) return;
                                    await fetch("/api/admin/bulk", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${user.email}`
                                      },
                                      body: JSON.stringify({ contentType: item.contentType, action: "permanent_delete", ids: [item.id] })
                                    });
                                    loadPlatformData();
                                  }}
                                  className="px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-bold rounded"
                                >
                                  Purge
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
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

          {/* GRID: Student Enrolled Modules & Certified Accomplishments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
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
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl" id="student-certificates-catalog">
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

        </div>
      )}

    </div>
  );
}
