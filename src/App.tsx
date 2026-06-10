import React, { useState, useEffect } from "react";
import {
  Sparkles, Cpu, BookOpen, FileText, Terminal, Flame, Info, Menu, X, Globe,
  ChevronDown, LogOut, Award, MessageSquare, Plus, Search, Bookmark,
  HelpCircle, Send, ThumbsUp, Check, Lock, Unlock, ExternalLink, HelpCircle as FaqIcon,
  ChevronLeft, ChevronRight, Download
} from "lucide-react";

import { translations, languages, Language } from "./translations";
import { User, Course, Tutorial, PdfBook, Quiz, CodingChallenge, CommunityPost, Certificate } from "./types";

import { LoginModal, RegisterModal, QuizSystem, CodingChallengeModal } from "./components/Modals";
import IDE from "./components/IDE";
import CertificateModal from "./components/CertificateModal";
import Dashboard from "./components/Dashboard";
import { pdfExportService } from "./utils/pdfExportService";

export default function App() {
  // Global Session properties
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  
  // Navigation & Active View Options
  const [activeTab, setActiveTab] = useState<string>("landing"); // landing, courses, tutorials, pdfs, quizzes, challenges, ide, community, dashboard
  const [currentLang, setCurrentLang] = useState<Language>("en");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);

  // Modal Triggers
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<CodingChallenge | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  // Dynamic Content Listing retrieved from backend
  const [courses, setCourses] = useState<Course[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [pdfs, setPdfs] = useState<PdfBook[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  
  // Custom Platform State values loaded from settings
  const [siteSettings, setSiteSettings] = useState<{ platformName: string; logoUrl: string; landingPromoBanner: string }>({
    platformName: "PowerCode Academy",
    logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100",
    landingPromoBanner: ""
  });

  // Search & Filtering States
  const [courseSearch, setCourseSearch] = useState<string>("");
  const [tutorialCategory, setTutorialCategory] = useState<string>("All");
  const [pdfSearch, setPdfSearch] = useState<string>("");
  const [pdfCategory, setPdfCategory] = useState<string>("All");

  // Community Chat Box State
  const [newPostTitle, setNewPostTitle] = useState<string>("");
  const [newPostContent, setNewPostContent] = useState<string>("");
  const [addPostFeedback, setAddPostFeedback] = useState<string>("");
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  // Active Lesson study parameters
  const [activeCoursePath, setActiveCoursePath] = useState<Course | null>(null);
  const [activeStepLesson, setActiveStepLesson] = useState<{ id: number; title: string; content: string; videoUrl: string; isPreviewAllowed: boolean } | null>(null);

  // Helper i18n translator
  const t = (key: string): string => {
    return translations[currentLang]?.[key] || translations["en"]?.[key] || key;
  };

  // Fetch full dataset from backend REST routes
  const fetchAllData = async () => {
    const safeFetchJson = async (url: string, init?: RequestInit) => {
      try {
        const res = await fetch(url, init);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return await res.json();
        }
      } catch (err) {
        console.warn(`Failed to fetch / parse JSON from ${url}`, err);
      }
      return {};
    };

    try {
      const headers: Record<string, string> = {};
      if (token && user) {
        headers["Authorization"] = `Bearer ${user.email}`;
      }

      // 1. Courses
      const coursesData = await safeFetchJson("/api/courses", { headers });
      if (coursesData.courses) setCourses(coursesData.courses);

      // 2. Tutorials
      const tutorialsData = await safeFetchJson("/api/tutorials");
      if (tutorialsData.tutorials) setTutorials(tutorialsData.tutorials);

      // 3. PDFs
      const pdfsData = await safeFetchJson("/api/pdfs", { headers });
      if (pdfsData.pdfs) setPdfs(pdfsData.pdfs);

      // 4. Quizzes
      const quizzesData = await safeFetchJson("/api/quizzes");
      if (quizzesData.quizzes) setQuizzes(quizzesData.quizzes);

      // 5. Challenges
      const challengesData = await safeFetchJson("/api/challenges", { headers });
      if (challengesData.challenges) setChallenges(challengesData.challenges);

      // 6. Community Forum
      const commData = await safeFetchJson("/api/community");
      if (commData.posts) setCommunityPosts(commData.posts);

      // 7. Site settings
      const settingsData = await safeFetchJson("/api/settings");
      if (settingsData.settings) setSiteSettings(settingsData.settings);

    } catch (err) {
      console.error("Critical: Could not retrieve REST endpoints.", err);
    }
  };

  // Run initial fetch and update on Auth alterations
  useEffect(() => {
    fetchAllData();
  }, [token, user]);

  // Handle Dynamic Course Enrollment
  const handleEnrollCourse = async (courseId: number) => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        }
      });
      const data = await res.json();
      if (data.message) {
        // Refresh local models
        fetchAllData();
      }
    } catch (err) {
      console.error("Enrollment failed inside backend sandbox router", err);
    }
  };

  // Launch Study Classroom Reader Interface
  const startStudyingCourse = (course: Course) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setActiveCoursePath(course);
    // Auto-select first lesson parameters
    const firstLesson = course.modules?.[0]?.lessons?.[0] || null;
    setActiveStepLesson(firstLesson);
    setActiveTab("classroom");
  };

  const markLessonFinished = async (courseId: number, lessonId: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        }
      });
      if (res.ok) {
        fetchAllData();
        // Advance lesson choice
        const flatLessons = activeCoursePath?.modules.flatMap(m => m.lessons) || [];
        const currentIdx = flatLessons.findIndex(l => l.id === lessonId);
        if (currentIdx !== -1 && currentIdx < flatLessons.length - 1) {
          setActiveStepLesson(flatLessons[currentIdx + 1]);
        } else {
          // Finished the entire course path!
          alert(`🎓 Congratulations! You completed all lessons inside this path. Your certified diploma is now printable from your Student Dashboard!`);
          setActiveTab("dashboard");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle PDF bookmark state
  const handleToggleBookmark = async (pdfId: number) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      const res = await fetch(`/api/pdfs/${pdfId}/bookmark`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.email}`
        }
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Community Feed Actions
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    setAddPostFeedback("Publishing community thread...");
    try {
      const res = await fetch("/api/community/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({ title: newPostTitle, content: newPostContent })
      });
      if (res.ok) {
        setAddPostFeedback("Done! Active thread published.");
        setNewPostTitle("");
        setNewPostContent("");
        fetchAllData();
        setTimeout(() => setAddPostFeedback(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikePost = async (postId: number) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      await fetch("/api/community/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({ postId })
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId: number) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    const txt = commentInputs[postId];
    if (!txt || !txt.trim()) return;

    try {
      const res = await fetch("/api/community/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({ postId, content: txt })
      });
      if (res.ok) {
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Categories lists
  const tutorialCategories = ["All", "React", "Python", "CSS", "PostgreSQL"];
  const pdfCategories = ["All", "JavaScript", "Python", "SQL"];

  // Filter and search variables
  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.description.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const filteredTutorials = tutorials.filter(t =>
    tutorialCategory === "All" || t.category === tutorialCategory
  );

  const filteredPdfs = pdfs.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(pdfSearch.toLowerCase()) || p.author.toLowerCase().includes(pdfSearch.toLowerCase());
    const matchesCat = pdfCategory === "All" || p.category === pdfCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans selection:bg-[#ff7b00]/30 relative flex flex-col justify-between">
      
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <nav className="bg-[#161b22] border-b border-[#30363d] sticky top-0 z-40 transition-colors" id="nav-wrapper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Brand Brand */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("landing")}>
              <div className="bg-gradient-to-tr from-[#ff7b00] to-orange-400 p-2 rounded-xl shadow-lg shadow-[#ff7b00]/15">
                <Cpu className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <span className="font-sans font-extrabold text-white text-base tracking-tight hover:text-[#ff7b00] transition-colors uppercase">
                {siteSettings.platformName}
              </span>
            </div>

            {/* Quick header action indicators - clean workspace style */}
            <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-gray-400">
              <span className="bg-[#ff7b00]/10 text-[#ff7b00] border border-[#ff7b00]/20 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wider">
                Certified Partner Sandbox
              </span>
              <span className="text-gray-600">|</span>
              <span>ALUMNI REGISTRY ACTIVE</span>
            </div>

            {/* Right Utilities (Lang Select, Session controls) */}
            <div className="hidden lg:flex items-center gap-3">
              {/* i18n Language Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="bg-[#21262d] border border-[#30363d] px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 hover:border-[#ff7b00] transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-[#ff7b00]" />
                  <span>{languages.find(l => l.code === currentLang)?.name}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl py-1.5 w-40 z-50 text-xs text-left" id="lang-dropdown">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { setCurrentLang(l.code); setLangDropdownOpen(false); }}
                        className="w-full px-4 py-2 hover:bg-[#21262d] text-[#c9d1d9] hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-left"
                      >
                        <span className="text-sm">{l.flag}</span>
                        <span>{l.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Authentication Panel state */}
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono hidden xl:inline">{user.email}</span>
                  <button
                    onClick={() => { setUser(null); setToken(null); setActiveTab("landing"); }}
                    className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] font-bold text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer-action"
                    id="trigger-logout"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#f85149]" />
                    <span>{t("logout")}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="text-[#c9d1d9] hover:text-white text-xs font-bold px-3 py-1.5"
                    id="trigger-signin-dialog"
                  >
                    {t("login")}
                  </button>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="bg-[#ff7b00] hover:bg-[#e66f00] text-white font-bold text-xs py-1.5 px-4 rounded-lg shadow-md transition-all hover:scale-105"
                    id="trigger-register-dialog"
                  >
                    + join me
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-400 hover:text-white p-1 rounded-md"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile menu tray */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#161b22] px-4 pt-2 pb-4 border-b border-[#30363d] space-y-2 text-xs font-semibold uppercase font-mono text-[#c9d1d9]">
            <button onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">LOBBY</button>
            <button onClick={() => { setActiveTab("courses"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">{t("courses")}</button>
            <button onClick={() => { setActiveTab("tutorials"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">{t("tutorials")}</button>
            <button onClick={() => { setActiveTab("pdfs"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">{t("pdfLibrary")}</button>
            <button onClick={() => { setActiveTab("quizzes"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">{t("quizzes")}</button>
            <button onClick={() => { setActiveTab("challenges"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">{t("challenges")}</button>
            <button onClick={() => { setActiveTab("ide"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">{t("ide")}</button>
            <button onClick={() => { setActiveTab("community"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">{t("community")}</button>
            {user && (
              <button onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00] text-[#ff7b00]">
                {user.role === 'ADMIN' ? t("adminDashboard") : t("studentDashboard")}
              </button>
            )}
            <div className="h-px bg-[#30363d] my-3" />
            <div className="flex justify-between items-center bg-[#21262d] p-3 rounded-xl border border-[#30363d] mb-4">
              <span className="text-[10px] text-gray-400">WhatsApp Help Center:</span>
              <a href="https://wa.me/250796599461" target="_blank" rel="noopener noreferrer" className="text-[#25d366] font-bold text-[10px]">Chat Live</a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500">I18n Language:</span>
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as Language)}
                className="bg-[#21262d] text-white border border-[#30363d] px-2 py-1 text-xs rounded outline-none font-mono"
              >
                {languages.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </nav>

      {/* DUAL COLUMN MULTI-MODULE BODY WORKSPACE */}
      <div className="flex-grow flex flex-col lg:flex-row">
        
        {/* LEFT COLLAPSIBLE SIDEBAR */}
        <aside 
          className={`bg-[#11141a] border-r border-[#30363d] hidden lg:flex flex-col justify-between transition-all duration-300 shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-30 ${
            sidebarCollapsed ? "w-16" : "w-[240px]"
          }`}
        >
          {/* Top section of links */}
          <div className="flex flex-col py-4 overflow-y-auto max-h-[calc(100vh-10rem)] scrollbar-thin">
            {/* Collapse toggle row */}
            <div className={`px-4 mb-4 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
              {!sidebarCollapsed && (
                <span className="text-[10px] font-mono tracking-widest text-[#ff7b00] uppercase font-bold">
                  Syllabus Grid
                </span>
              )}
              <button 
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 px-1.5 hover:bg-[#21262d] rounded border border-[#30363d] text-[#ff7b00] hover:text-white transition-all cursor-pointer"
                title={sidebarCollapsed ? "Expand Sidebar Nav Menu" : "Collapse Sidebar Nav Menu"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Sidebar List Links */}
            <nav className="space-y-1.5 px-3">
              {[
                { tab: "landing", label: "Lobby Home", icon: Cpu },
                { tab: "courses", label: t("courses") || "Courses Directory", icon: BookOpen },
                { tab: "tutorials", label: t("tutorials") || "Tutorials", icon: FileText },
                { tab: "pdfs", label: t("pdfLibrary") || "PDF Library", icon: Bookmark },
                { tab: "quizzes", label: t("quizzes") || "Quizzes", icon: HelpCircle },
                { tab: "challenges", label: t("challenges") || "Algorithmic Challenges", icon: Terminal },
                { tab: "ide", label: t("ide") || "Advanced IDE", icon: Terminal },
                { tab: "community", label: t("community") || "Forum Board", icon: MessageSquare },
              ].map((item) => {
                const IconComp = item.icon;
                const active = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => setActiveTab(item.tab)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      active 
                        ? "bg-[#ff7b00]/10 text-[#ff7b00] border border-[#ff7b00]/20 font-bold" 
                        : "text-[#8b949e] hover:bg-[#161b22] hover:text-white border border-transparent"
                    }`}
                    title={item.label}
                  >
                    <IconComp className={`w-4 h-4 shrink-0 ${active ? "text-[#ff7b00]" : "text-gray-500"}`} />
                    {!sidebarCollapsed && <span className="truncate text-[10px]">{item.label}</span>}
                  </button>
                );
              })}

              {/* Dynamic user role controls */}
              {user && (
                <>
                  <div className="h-px bg-[#30363d] my-3" />
                  
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === "dashboard"
                        ? "bg-[#ff7b00]/20 text-[#ff7b00] border border-[#ff7b00]"
                        : "text-[#ff7b00] bg-[#ff7b00]/5 border border-[#ff7b00]/10 hover:bg-[#ff7b00]/15"
                    }`}
                    title={user.role === 'ADMIN' ? "Admin Panel" : "Student Dashboard"}
                  >
                    <Award className="w-4 h-4 text-[#ff7b00] shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate text-[10px]">
                        {user.role === 'ADMIN' ? t("adminDashboard") || "Admin Control" : t("studentDashboard") || "My Progress"}
                      </span>
                    )}
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Bottom quick contact support line */}
          <div className="p-3 border-t border-[#30363d]">
            {!sidebarCollapsed && (
              <a
                href="https://wa.me/250796599461?text=Hello%20PowerCode%20Academy%20Support!%20I'd%2520like%20to%20learn%20more%20about%20your%20coding%2520curriculum%2520courses."
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 flex items-center justify-center gap-2 p-2 bg-[#25d366]/10 hover:bg-[#25d366]/20 border border-[#25d366]/20 rounded-xl transition-all font-mono text-[9px] uppercase tracking-wider text-[#25d366]"
                title="WhatsApp Support Chat"
              >
                <span>WhatsApp: +250 796 599 461</span>
              </a>
            )}

            {user ? (
              <button
                onClick={() => { setUser(null); setToken(null); setActiveTab("landing"); }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 rounded-lg text-xs font-bold text-[#f85149] transition-all cursor-pointer text-left uppercase"
                title={t("logout")}
              >
                <LogOut className="w-4 h-4 text-[#f85149] shrink-0" />
                {!sidebarCollapsed && <span className="truncate text-[10px]">{t("logout")}</span>}
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="w-full flex items-center gap-3 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg text-xs font-bold text-gray-300 border border-[#30363d] transition-all cursor-pointer text-left uppercase"
                title={t("login")}
              >
                <Award className="w-4 h-4 text-orange-400 shrink-0" />
                {!sidebarCollapsed && <span className="truncate text-[10px]">{t("login")}</span>}
              </button>
            )}
          </div>
        </aside>

        {/* MAIN VIEWPORT LAYOUT WRAPPER */}
        <div className="flex-grow flex flex-col min-w-0">
          
          {/* 2. DYNAMIC BROADCAST ANNOUNCEMENT PROMO BANNER */}
          {siteSettings.landingPromoBanner && (
            <div className="bg-[#ff7b00] text-black font-semibold text-center text-xs px-4 py-2.5 flex items-center justify-center gap-2 shadow-md">
              <Flame className="w-4 h-4 fill-current animation-ping font-extrabold" />
              <span>{siteSettings.landingPromoBanner}</span>
            </div>
          )}

          {/* 3. MAIN WEB APPLICATION VIEWS HANDLERS */}
          <main className="flex-grow px-4 md:px-8 py-8 w-full" id="root-viewport-canvas">
        
        {/* VIEW: LANDING HOME LOBBY */}
        {activeTab === "landing" && (
          <div className="space-y-16" id="view-landing">
            
            {/* HERO SECTION WITH GLOW ACCENTS */}
            <section className="text-center py-10 lg:py-16 space-y-6 max-w-4xl mx-auto relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#ff7b00]/10 rounded-full blur-[120px] pointer-events-none" />
              
              <span className="text-[10px] uppercase font-mono tracking-widest text-orange-500 bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20 shadow-inner inline-block">
                🚀 Multi-language Coding Platform
              </span>

              <h1 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] font-sans">
                {t("heroTitle")}
              </h1>

              <p className="text-base lg:text-lg text-[#8b949e] max-w-2xl mx-auto leading-relaxed">
                {t("heroSubtitle")}
              </p>

              <div className="flex flex-wrap gap-4 justify-center pt-3">
                <button
                  onClick={() => setActiveTab("courses")}
                  className="bg-[#ff7b00] hover:bg-[#e66f00] text-white font-extrabold text-sm py-3 px-8 rounded-xl transition-all shadow-xl shadow-[#ff7b00]/15 cursor-pointer"
                >
                  {t("exploreCourses")}
                </button>
                {!user && (
                  <button
                    onClick={() => setShowRegister(true)}
                    className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] font-bold text-sm py-3 px-8 rounded-xl transition-all cursor-pointer"
                  >
                    {t("startLearning")}
                  </button>
                )}
              </div>
            </section>

            {/* THREE-CARD BENTO FEATURE PLATFORMS */}
            <section className="space-y-4" id="features-lobby">
              <div className="text-center max-w-xl mx-auto mb-10">
                <h3 className="text-sm font-extrabold text-[#ff7b00] uppercase tracking-wider">Features Grid</h3>
                <h2 className="text-2xl font-bold text-white mt-1">Built to turn novices into active developers</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl shadow-md flex flex-col gap-3">
                  <div className="p-3 bg-gradient-to-tr from-[#ff7b00]/10 to-orange-400/5 rounded-xl border border-[#ff7b00]/20 inline-block w-fit">
                    <Terminal className="w-5 h-5 text-[#ff7b00]" />
                  </div>
                  <h4 className="text-base font-bold text-white">Full-fledged Monaco style IDE</h4>
                  <p className="text-xs text-[#8b949e] leading-relaxed">Write Javascript, Python, C++ or Java and check real physical outputs instantly in our compiler workspace.</p>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl shadow-md flex flex-col gap-3">
                  <div className="p-3 bg-[#2ea043]/10 rounded-xl border border-[#2ea043]/20 inline-block w-fit">
                    <Sparkles className="w-5 h-5 text-[#2ea043]" />
                  </div>
                  <h4 className="text-base font-bold text-white">Server-side Gemini AI Mentorship</h4>
                  <p className="text-xs text-[#8b949e] leading-relaxed">Prompt Gemini to check syntax, rewrite algorithms, evaluate complexity limits and explain concepts constructs.</p>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl shadow-md flex flex-col gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 inline-block w-fit">
                    <Award className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">Verified Offical Credentials</h4>
                  <p className="text-xs text-[#8b949e] leading-relaxed">Acquire printable official certificates backed by verified QR codes showing complete syllabus metrics successfully.</p>
                </div>

              </div>
            </section>

            {/* POPULAR COURSES DEMO */}
            <section className="space-y-6" id="popular-lobby-syllabus">
              <div className="flex justify-between items-end border-b border-[#21262d] pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#ff7b00] uppercase tracking-wider">Course curriculum</h3>
                  <h2 className="text-2xl font-bold text-white mt-1">Explore Popular Courses Path</h2>
                </div>
                <button onClick={() => setActiveTab("courses")} className="text-xs text-[#ff7b00] hover:underline font-bold flex items-center gap-1">
                  <span>View All Syllabus</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {courses.slice(0, 3).map((c) => (
                  <div key={c.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg flex flex-col hover:border-[#ff7b00]/50 transition-colors">
                    <img src={c.thumbnailUrl} alt={c.title} className="w-full h-40 object-cover border-b border-[#21262d]" />
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono text-[#ff7b00]">
                          <span className="bg-[#ff7b00]/10 px-2 py-0.5 rounded border border-[#ff7b00]/20 font-bold uppercase">
                            {c.isPremium ? "PRO PREMIUM" : "FREE STANDARD"}
                          </span>
                          <span>{c.modules?.flatMap(m => m.lessons).length || 2} Dynamic Lessons</span>
                        </div>
                        <h4 className="text-base font-bold text-white line-clamp-1">{c.title}</h4>
                        <p className="text-xs text-[#8b949e] line-clamp-2 leading-relaxed">{c.description}</p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#21262d] flex justify-between items-center">
                        <span className="text-sm font-extrabold text-white">
                          {c.price === 0 ? "FREE" : `$${c.price}`}
                        </span>

                        {c.isEnrolled ? (
                          <button
                            onClick={() => startStudyingCourse(c)}
                            className="bg-[#2ea043] hover:bg-[#2c974b] text-white text-xs font-bold py-1.5 px-4.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Enter class
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnrollCourse(c.id)}
                            className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-1.5 px-4.5 rounded-lg transition-colors cursor-pointer border-0"
                          >
                            {t("enrollNow")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FREQUENTLY ASKED QUESTIONS GRID (FAQ) */}
            <section className="space-y-6" id="faq-section">
              <div className="text-center max-w-xl mx-auto mb-8">
                <h3 className="text-sm font-extrabold text-[#ff7b00] uppercase tracking-wider">FAQ</h3>
                <h2 className="text-2xl font-bold text-white mt-1">Frequently Asked Questions</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#ff7b00]" />
                    Is the online compiler safe to execute code?
                  </h4>
                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    Yes! Our compiler parses and runs syntax inside server-side sandboxed runtimes isolated from primary filesystems, preventing risk factors completely.
                  </p>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl space-y-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#ff7b00]" />
                    How do I earn my verification certificate?
                  </h4>
                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    Complete all modules lessons lectures and pass the MCQ tests with higher values (usually &gt;70%) to automatically unlock certification.
                  </p>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* VIEW: ALL SYLLABUS COURSES */}
        {activeTab === "courses" && (
          <div className="space-y-8" id="view-courses">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#30363d] pb-5">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight uppercase">Syllabus Directory Catalog</h2>
                <p className="text-xs text-gray-500">Master React, NodeJS, C++ structures and get printable diplomas.</p>
              </div>

              {/* Course Search Box */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search course tracks..."
                  className="w-full bg-[#161b22] border border-[#30363d] text-white py-1.5 pl-10 pr-4 rounded-lg text-xs outline-none focus:border-[#ff7b00]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredCourses.map((c) => (
                <div key={c.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-[#ff7b00]/50 transition-colors">
                  <img src={c.thumbnailUrl} alt={c.title} className="w-full h-44 object-cover border-b border-[#21262d]" />
                  
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#ff7b00]">
                        <span className="bg-[#ff7b00]/10 px-2 py-0.5 rounded border border-[#ff7b00]/20 font-bold uppercase">
                          {c.isPremium ? "PRO PREMIUM" : "STANDARD"}
                        </span>
                        <span>{c.modules?.length || 1} Modules</span>
                      </div>
                      <h4 className="text-base font-bold text-white line-clamp-1">{c.title}</h4>
                      <p className="text-xs text-[#8b949e] line-clamp-3 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="pt-4 mt-6 border-t border-[#21262d] flex justify-between items-center">
                      <span className="text-sm font-extrabold text-white">
                        {c.price === 0 ? "FREE" : `$${c.price}`}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => pdfExportService.downloadCourse(c)}
                          title="Download Syllabus PDF"
                          className="bg-zinc-850 hover:bg-zinc-800 text-gray-300 border border-zinc-700 hover:border-[#ff7b00]/70 p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                          type="button"
                        >
                          <Download className="w-3.5 h-3.5 text-[#ff7b00]" />
                        </button>

                        {c.isEnrolled ? (
                          <button
                            onClick={() => startStudyingCourse(c)}
                            className="bg-[#2ea043] hover:bg-[#2c974b] text-white text-xs font-bold py-1.5 px-4.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Enter class
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnrollCourse(c.id)}
                            className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-1.5 px-4.5 rounded-lg transition-colors cursor-pointer border-0"
                          >
                            {t("enrollNow")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: TUTORIAL HANDBOOKS CARDS */}
        {activeTab === "tutorials" && (
          <div className="space-y-8" id="view-tutorials">
            <div className="border-b border-[#30363d] pb-5">
              <h2 className="text-xl font-bold text-white tracking-tight uppercase">Programming Tutorials Drawer</h2>
              <p className="text-xs text-gray-500">Quick guides on syntax, structures, modules and algorithms.</p>
            </div>

            {/* Category selection bar */}
            <div className="flex flex-wrap gap-2">
              {tutorialCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTutorialCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${
                    cat === tutorialCategory
                      ? "bg-[#ff7b00] border-[#ff7b00] text-white"
                      : "bg-[#161b22] border-[#30363d] text-gray-300 hover:border-gray-500"
                  }`}
                >
                  {cat === "All" ? "All categories" : cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTutorials.map((tut) => (
                <div key={tut.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-base font-bold text-white capitalize">{tut.title}</h4>
                      <span className="text-[10px] bg-[#ff7b00]/10 text-[#ff7b00] font-mono font-bold px-2.5 py-0.5 rounded border border-[#ff7b00]/20">
                        {tut.category}
                      </span>
                    </div>

                    <p className="text-xs text-[#8b949e] leading-relaxed">{tut.content}</p>

                    {tut.codeSnippet && (
                      <div className="bg-[#0d1117] rounded-xl border border-[#21262d] overflow-hidden">
                        <div className="bg-[#1b212c] py-1.5 px-4 text-[10px] font-mono text-gray-400 border-b border-[#21262d]">
                          Source template:
                        </div>
                        <pre className="p-4 text-xs font-mono text-green-400 overflow-x-auto leading-relaxed max-h-44">
                          <code>{tut.codeSnippet}</code>
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-[#21262d] mt-2">
                    <span className="text-[10px] text-gray-500 font-mono">DOC REF: TUT-{tut.id}</span>
                    <button
                      onClick={() => pdfExportService.downloadTutorial(tut)}
                      className="flex items-center gap-1.5 text-[11px] text-[#ff7b00] hover:text-white bg-[#ff7b00]/10 hover:bg-[#ff7b00] px-3 py-1.5 rounded-lg font-extrabold border border-[#ff7b00]/20 transition-all cursor-pointer"
                      type="button"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>DOWNLOAD PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: PDF REFERENCE MANUAL BOOK LIBRARY */}
        {activeTab === "pdfs" && (
          <div className="space-y-8" id="view-pdfs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#30363d] pb-5">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight uppercase">Downloadable reference PDF library</h2>
                <p className="text-xs text-gray-500 font-mono">Reference manuals and computer science guidelines.</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-fit">
                <select
                  value={pdfCategory}
                  onChange={(e) => setPdfCategory(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] text-white py-1.5 px-3 rounded-lg text-xs outline-none font-mono"
                >
                  {pdfCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
                  ))}
                </select>

                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pdfSearch}
                    onChange={(e) => setPdfSearch(e.target.value)}
                    placeholder="Search titles..."
                    className="w-full bg-[#161b22] border border-[#30363d] text-white py-1.5 pl-10 pr-4 rounded-lg text-xs outline-none focus:border-[#ff7b00]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredPdfs.map((pdf) => {
                const bookLocked = pdf.isPremium && (!user || user.role !== "ADMIN");
                return (
                  <div key={pdf.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-inner flex flex-col justify-between hover:border-[#ff7b00]/40 transition-colors">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 font-mono px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">
                          {pdf.category}
                        </span>
                        
                        <button
                          onClick={() => handleToggleBookmark(pdf.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Bookmark className={`w-4 h-4 ${pdf.isBookmarked ? "text-[#ff7b00] fill-current" : ""}`} />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-white line-clamp-1">{pdf.title}</h4>
                      <p className="text-xs text-slate-500">Author: {pdf.author} </p>
                    </div>

                    <div className="pt-4 border-t border-[#21262d] mt-5 flex justify-between items-center">
                      <span className="text-[10px] italic text-[#8b949e]">
                        {pdf.isPremium ? "Premium Book" : "Standard Resource"}
                      </span>

                      {bookLocked ? (
                        <button
                          onClick={() => setShowLogin(true)}
                          className="bg-[#21262d] text-gray-500 border border-[#30363d] text-xs font-bold py-1 px-3.5 rounded flex items-center gap-1.5 cursor-not-allowed"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Premium Lock</span>
                        </button>
                      ) : (
                        <a
                          href={pdf.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-1 px-3.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-white" />
                          <span>Preview Manual</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: CLASSROOM ACTIVE LESSONS STUDY BOARD */}
        {activeTab === "classroom" && activeCoursePath && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="classroom-workspace">
            
            {/* Sidebar navigation list */}
            <div className="lg:col-span-1 bg-[#161b22] border border-[#30363d] p-4 rounded-xl space-y-4 max-h-[580px] overflow-y-auto">
              <h3 className="text-xs font-bold text-white uppercase pb-2 border-b border-[#21262d] tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#ff7b00]" />
                Lectures Curriculum
              </h3>

              <div className="space-y-4">
                {activeCoursePath.modules.map((mod) => (
                  <div key={mod.id} className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tight">{mod.title}</span>
                    <div className="space-y-1 pl-1">
                      {mod.lessons.map((les) => {
                        const active = activeStepLesson?.id === les.id;
                        return (
                          <button
                            key={les.id}
                            onClick={() => setActiveStepLesson(les)}
                            className={`w-full text-left py-2 px-3 rounded-lg text-xs leading-snug flex items-center gap-2 transition-colors ${
                              active ? "bg-[#ff7b00]/10 text-[#ff7b00] font-bold border-l-2 border-[#ff7b00]" : "hover:bg-[#21262d] text-slate-300"
                            }`}
                          >
                            <span className="truncate">{les.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video lecture & text details content */}
            <div className="lg:col-span-3 space-y-6 bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
              
              <div className="flex justify-between items-start pb-4 border-b border-[#21262d]">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[#ff7b00] font-bold">COURSE CLASSROOM</span>
                  <h2 className="text-lg font-bold text-white tracking-tight">{activeStepLesson?.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  {activeStepLesson && (
                    <button
                      onClick={() => {
                        const activeModule = activeCoursePath.modules.find(m => m.lessons.some(l => l.id === activeStepLesson.id));
                        pdfExportService.downloadLesson(
                          activeCoursePath.title,
                          activeModule?.title || "Curriculum Module",
                          activeStepLesson
                        );
                      }}
                      className="bg-zinc-850 hover:bg-zinc-800 text-gray-300 border border-zinc-700 hover:border-[#ff7b00]/70 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      type="button"
                    >
                      <Download className="w-3.5 h-3.5 text-[#ff7b00]" />
                      <span>Download Notes</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("courses")}
                    className="bg-[#21262d] text-white hover:bg-[#30363d] text-xs font-bold py-1.5 px-4 rounded-lg"
                  >
                    Catalog directory
                  </button>
                </div>
              </div>

              {activeStepLesson ? (
                <div className="space-y-6">
                  {/* Visual HTML5 Video wrapper */}
                  <div className="bg-black rounded-xl border border-[#30363d] overflow-hidden aspect-video relative max-h-[380px] mx-auto flex items-center justify-center">
                    <video
                      src={activeStepLesson.videoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-3 prose prose-invert max-w-none text-[#c9d1d9] text-sm leading-relaxed" id="lesson-text-body">
                    <h4 className="text-white font-bold text-base">Study Guidelines:</h4>
                    <p className="whitespace-pre-wrap">{activeStepLesson.content}</p>
                  </div>

                  <div className="pt-4 border-t border-[#21262d] flex justify-end">
                    <button
                      onClick={() => markLessonFinished(activeCoursePath.id, activeStepLesson.id)}
                      className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-2.5 px-6 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 text-white" />
                      <span>Complete & Advance Coursework</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">Curriculum module lesson completed. Choose another block.</div>
              )}

            </div>
          </div>
        )}

        {/* VIEW: QUIZZES SELECTIONS */}
        {activeTab === "quizzes" && (
          <div className="space-y-8" id="view-quizzes">
            <div className="border-b border-[#30363d] pb-5">
              <h2 className="text-xl font-bold text-white tracking-tight uppercase">Platform assessments & syllabus quizzes</h2>
              <p className="text-xs text-gray-500">Submit MCQ answers to prove logical competencies and get certificates.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => {
                return (
                  <div key={quiz.id} className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col justify-between shadow-md">
                    <div className="space-y-3">
                      <span className="text-[9px] bg-orange-500/10 text-orange-400 font-mono px-2.5 py-0.5 rounded border border-orange-500/20 font-bold uppercase">
                        {quiz.durationMinutes} Minutes time limit
                      </span>

                      <h4 className="text-base font-bold text-white line-clamp-1">{quiz.title}</h4>
                      <p className="text-xs text-[#8b949e]">Target precision check for evaluating block variable structures and scoping rules.</p>
                    </div>

                    <div className="pt-4 border-t border-[#21262d] mt-5 flex justify-between items-center text-xs">
                      <span className="text-xs font-semibold text-[#ff7b00]">
                        Passing mark: {quiz.passingScore}%
                      </span>

                      {user ? (
                        <button
                          onClick={() => setSelectedQuiz(quiz)}
                          className="bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-1.5 px-4.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Start Test
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowLogin(true)}
                          className="bg-[#21262d] hover:bg-[#30363d] text-gray-400 text-xs font-bold py-1.5 px-4.5 border border-[#30363d] rounded-lg cursor-pointer"
                        >
                          Sign in to start
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: CODING CHALLENGES DESK */}
        {activeTab === "challenges" && (
          <div className="space-y-8" id="view-challenges">
            <div className="border-b border-[#30363d] pb-5">
              <h2 className="text-xl font-bold text-white tracking-tight uppercase font-sans">Syllabus coding algorithmic challenges</h2>
              <p className="text-xs text-gray-500 font-mono">Solve core algorithmic structures under timed compilers constraints.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {challenges.map((ch) => {
                return (
                  <div key={ch.id} className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col justify-between hover:border-[#ff7b00]/40 transition-colors">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className={`uppercase font-bold px-2 py-0.5 rounded ${
                          ch.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        }`}>
                          {ch.difficulty} LEVEL
                        </span>
                        <span>+{ch.points} Honor points</span>
                      </div>

                      <h4 className="text-base font-bold text-white line-clamp-1">{ch.title}</h4>
                      <p className="text-xs text-[#8b949e] line-clamp-2 leading-relaxed">{ch.description}</p>
                    </div>

                    <div className="pt-4 border-t border-[#21262d] mt-5 flex justify-between items-center text-xs">
                      <span className="text-[#8b949e] font-mono">Category: {ch.category}</span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => pdfExportService.downloadChallenge(ch)}
                          title="Download Specification PDF"
                          className="bg-zinc-850 hover:bg-zinc-800 text-gray-300 border border-zinc-700 hover:border-[#ff7b00]/70 p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                          type="button"
                        >
                          <Download className="w-3.5 h-3.5 text-[#ff7b00]" />
                        </button>

                        {user ? (
                          <button
                            onClick={() => setSelectedChallenge(ch)}
                            className="bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-1.5 px-4.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Code Solution
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowLogin(true)}
                            className="bg-[#21262d] text-gray-400 hover:bg-[#30363d] border border-[#30363d] text-xs font-bold py-1.5 px-4.5 rounded-lg cursor-pointer"
                          >
                            Sign in to start
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: ONLINE MONACO COMPILER IDE */}
        {activeTab === "ide" && (
          <div className="space-y-6" id="view-ide">
            <div className="border-b border-[#30363d] pb-5">
              <h2 className="text-xl font-bold text-white tracking-tight uppercase">PowerCode IDE Live Sandbox Compiler</h2>
              <p className="text-xs text-gray-500">Compile JavaScript, Python, Java, C or PHP scripts and prompt our Gemini AI sidecoach mentor.</p>
            </div>

            <IDE
              user={user}
              geminiKeyActive={!!process.env.GEMINI_API_KEY}
              t={t}
            />
          </div>
        )}

        {/* VIEW: STUDENT / ADMIN SYSTEM DASHBOARD */}
        {activeTab === "dashboard" && user && (
          <div id="view-dashboard">
            <Dashboard
              user={user}
              onViewCertificate={(cert) => setSelectedCertificate(cert)}
              coursesList={courses}
              onEnrollCourse={handleEnrollCourse}
              t={t}
            />
          </div>
        )}

        {/* VIEW: COMMUNITY DISCUSSION BULLETIN */}
        {activeTab === "community" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="view-community">
            
            {/* Thread lists */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border-b border-[#30363d] pb-5">
                <h2 className="text-xl font-bold text-white tracking-tight uppercase">Community forum boards</h2>
                <p className="text-xs text-gray-500">Ask variables scoping questions, query algorithm tips and code blocks from student alumni.</p>
              </div>

              {communityPosts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No discussion threads active yet. Publish yours now!</div>
              ) : (
                <div className="space-y-4">
                  {communityPosts.map((post) => {
                    return (
                      <div key={post.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-md space-y-4">
                        <div className="flex items-center gap-3">
                          <img src={post.userAvatar} alt={post.userName} className="w-8 h-8 rounded-full border border-gray-600 object-cover" />
                          <div>
                            <h5 className="text-xs font-bold text-white">{post.userName}</h5>
                            <span className="text-[10px] text-gray-500 font-mono">{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pr-2">
                          <h4 className="text-sm font-bold text-white leading-relaxed">{post.title}</h4>
                          <p className="text-xs text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        </div>

                        {/* Thread operations footer */}
                        <div className="flex items-center gap-4 pt-3 border-t border-[#21262d] text-xs">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className="text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                          >
                            <ThumbsUp className="w-4 h-4 text-[#ff7b00]" />
                            <span>Like ({post.likesCount})</span>
                          </button>
                        </div>

                        {/* Comments loop */}
                        <div className="space-y-3 bg-[#0d1117] p-3 rounded-xl border border-[#21262d]" id="comment-list">
                          <span className="text-[10px] text-[#8b949e] uppercase font-bold block tracking-wider">Responses ({post.comments?.length || 0})</span>
                          
                          {post.comments?.map((comment) => (
                            <div key={comment.id} className="flex gap-2.5 items-start text-xs border-b border-[#21262d]/50 pb-2 last:border-b-0 last:pb-0">
                              <img src={comment.userAvatar} alt={comment.userName} className="w-6 h-6 rounded-full object-cover" />
                              <div className="space-y-0.5 flex-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-white text-[11px]">{comment.userName}</span>
                                  <span className="text-[9px] text-[#8b949e] font-mono">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[#c9d1d9] leading-relaxed text-[11px]">{comment.content}</p>
                              </div>
                            </div>
                          ))}

                          {/* Quick reply dialog constructor */}
                          <div className="flex gap-2.5 items-center mt-2 pt-2 border-t border-[#21262d]">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ""}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="Add helpful comment answer..."
                              className="flex-1 bg-[#161b22] border border-[#30363d] text-white py-1.5 px-3.5 rounded-lg text-xs outline-none focus:border-[#ff7b00]"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              className="bg-[#2ea043] hover:bg-[#2c974b] text-white p-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create new thread panel */}
            <form onSubmit={handleCreatePost} className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl shadow-lg space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-[#21262d] flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#ff7b00]" />
                Submit forum thread
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8b949e] font-semibold">Title topic</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g. Scoping variables let vs var?"
                  className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-lg text-xs outline-none focus:border-[#ff7b00]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8b949e] font-semibold">Message contents</label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Ask questions or solution tips..."
                  className="w-full h-24 bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-lg text-xs outline-none focus:border-[#ff7b00] resize-none"
                  required
                />
              </div>

              {addPostFeedback && (
                <div className="text-center text-xs text-orange-400 dark:text-orange-300 font-mono">{addPostFeedback}</div>
              )}

              <button
                type="submit"
                className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-xs text-white font-bold py-2.5 rounded-lg transition-all shadow-md cursor-pointer-action"
              >
                Publish thread
              </button>
            </form>

          </div>
        )}

      </main>

        </div> {/* End of of MAIN VIEWPORT LAYOUT WRAPPER (flex-col min-w-0) */}
      </div> {/* End of DUAL COLUMN MULTI-MODULE BODY WORKSPACE */}

      {/* 4. WEB SITE FOOTER */}
      <footer className="bg-[#11141a] border-t border-[#30363d] text-xs py-8 text-[#8b949e]" id="global-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#ff7b00]" />
            <span className="font-extrabold text-white text-[11px] uppercase tracking-wider">{siteSettings.platformName}</span>
          </div>
          <p className="text-[11px]">Powered by PowerCode Academy Engine • Neon Postgres SQL. © 2026. All rights reserved.</p>
        </div>
      </footer>

      {/* FLOATING WHATSAPP (Bottom Left) */}
      <div className="fixed bottom-6 left-6 z-40">
        {/* WhatsApp Float Card */}
        <a
          href="https://wa.me/250796599461?text=Hello%20PowerCode%20Academy%2520Support!%20I'd%20like%2520to%20learn%20more%20about%20your%20coding%20curriculum."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25d366] hover:bg-[#20ba5a] text-white p-3.5 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center border border-white/20"
          title="Direct WhatsApp Support: +250 796 599 461"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.451 5.405.002 9.801-4.394 9.804-9.805.002-2.617-1.01-5.082-2.86-6.93s-4.316-2.853-6.91-2.853c-5.41 0-9.81 4.397-9.814 9.81-.001 1.773.491 3.5 1.42 5.009l-.491 1.794.417.435zm11.082-7.404c-.3-.15-1.772-.875-2.046-.975-.276-.1-.476-.15-.676.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.413-1.488-.891-.796-1.493-1.778-1.668-2.078-.175-.3-.018-.463.13-.611.135-.133.3-.35.45-.525.15-.175.2-.299.3-.5.1-.201.05-.375-.025-.525-.075-.15-.676-1.628-.926-2.228-.242-.584-.49-.505-.675-.514-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.11 3.224 5.112 4.521.714.308 1.272.492 1.706.63.717.228 1.37.195 1.887.118.577-.087 1.771-.724 2.021-1.423.25-.699.25-1.298.175-1.422-.075-.125-.275-.2-.575-.35z"/>
          </svg>
        </a>
      </div>

      {/* FLOATING AI ASSISTANT (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Global Floating Study Coach Trigger */}
        <button
          onClick={() => setActiveTab("ide")}
          className="bg-gradient-to-r from-orange-600 to-[#ff7b00] text-white p-3.5 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center border border-white/20 animate-bounce cursor-pointer"
          title="Instant AI Mentorship Desk"
        >
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </button>
      </div>

      {/* 5. PORTALS / MODAL OVERLAYS */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(tok, usr) => {
            setToken(tok);
            setUser(usr);
            setActiveTab("dashboard");
            setShowLogin(false);
          }}
          t={t}
        />
      )}

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onSuccess={(tok, usr) => {
            setToken(tok);
            setUser(usr);
            setActiveTab("dashboard");
            setShowRegister(false);
          }}
          t={t}
        />
      )}

      {selectedQuiz && user && (
        <QuizSystem
          quiz={selectedQuiz}
          user={user}
          onClose={() => setSelectedQuiz(null)}
          onFinished={fetchAllData}
        />
      )}

      {selectedChallenge && user && (
        <CodingChallengeModal
          challenge={selectedChallenge}
          user={user}
          onClose={() => setSelectedChallenge(null)}
          onSolved={fetchAllData}
        />
      )}

      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

    </div>
  );
}
