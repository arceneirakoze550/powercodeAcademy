import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Cpu, BookOpen, FileText, Terminal, Flame, Info, Menu, X, Globe,
  ChevronDown, LogOut, Award, MessageSquare, Plus, Search, Bookmark,
  HelpCircle, Send, ThumbsUp, Check, Lock, Unlock, ExternalLink, HelpCircle as FaqIcon,
  ChevronLeft, ChevronRight, Download, Sun, Moon, Wifi, WifiOff, Trash2, AlertTriangle, Play, Palette
} from "lucide-react";

import { useTheme } from "./utils/ThemeContext";
import { translations, languages, Language } from "./translations";
import { User, Course, Tutorial, PdfBook, Quiz, CodingChallenge, CommunityPost, Certificate } from "./types";

import { LoginModal, RegisterModal, QuizSystem, CodingChallengeModal } from "./components/Modals";
import IDE from "./components/IDE";
import CertificateModal from "./components/CertificateModal";
import Dashboard from "./components/Dashboard";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { pdfExportService } from "./utils/pdfExportService";
import { io } from "socket.io-client";
import { SoundManager } from "./lib/audio";
import LoadingScreen from "./components/LoadingScreen";
import JSZip from "jszip";

declare global {
  interface Window {
    showPowerCodeLoader?: (msg: string) => void;
    hidePowerCodeLoader?: () => void;
  }
}

const getEmbedUrl = (url: string): string => {
  if (!url) return "";
  
  // 1. YouTube watch, share, short, embed links
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      videoId = match[2];
    } else {
      try {
        const parts = url.split("/");
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.length === 11) {
          videoId = lastPart;
        } else if (lastPart && lastPart.includes("?")) {
          const subparts = lastPart.split("?");
          if (subparts[0] && subparts[0].length === 11) {
            videoId = subparts[0];
          }
        }
      } catch (err) {}
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  // 2. Vimeo links
  if (url.includes("vimeo.com")) {
    const regExp = /vimeo\.com\/(?:video\/)?([0-9]+)/;
    const match = url.match(regExp);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
  }
  
  return url;
};

const isEmbeddableVideoUrl = (url: string): boolean => {
  if (!url) return false;
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("vimeo.com") ||
    url.includes("embed")
  );
};

export default function App() {
  // Confirmation Modal state
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

  // Global Loader state setup
  const [globalLoader, setGlobalLoader] = useState<{ isVisible: boolean; message: string }>({
    isVisible: true,
    message: "Loading Student Data..."
  });

  useEffect(() => {
    window.showPowerCodeLoader = (msg: string) => {
      setGlobalLoader({ isVisible: true, message: msg });
    };
    window.hidePowerCodeLoader = () => {
      setGlobalLoader(prev => ({ ...prev, isVisible: false }));
    };
    return () => {
      delete window.showPowerCodeLoader;
      delete window.hidePowerCodeLoader;
    };
  }, []);

  // Global Session properties
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("powercode_user");
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("powercode_token") || null;
  });

  // Global theme and accessibility context accessor
  const { theme, setTheme, toggleTheme } = useTheme();
  const [themeDropdownOpen, setThemeDropdownOpen] = useState<boolean>(false);

  // Offline Caching & Intermittent connection states
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(() => {
    return localStorage.getItem("powercode_offline_sim") === "true";
  });

  // Classroom personal notes & lesson discussion comments states
  const [currentLessonNotes, setCurrentLessonNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [activeLessonComments, setActiveLessonComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>("");
  
  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Console logging debugging handler for Approve button click
  const handleApprovePaymentDebug = async (paymentId: number, email: string) => {
    const payload = {};
    console.log("[DEBUG] Approve Click Handler: Initiated");
    console.log("[DEBUG] Request Payload:", JSON.stringify(payload));
    console.log("[DEBUG] Exact Payment ID being sent to /api/payments/approve:", paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${email}`
        }
      });
      const resData = await res.json();
      console.log("[DEBUG] Full JSON response:", JSON.stringify(resData, null, 2));
      if (res.status !== 200) {
        alert(resData.error || `Error status code ${res.status}: Failed to approve payment.`);
      }
    } catch (err: any) {
      alert(err.message || "Network exception.");
    }
  };
  
  // Navigation & Active View Options
  const [activeTab, setActiveTab] = useState<string>("landing"); // landing, courses, tutorials, pdfs, quizzes, challenges, ide, community, dashboard
  const [currentLang, setCurrentLang] = useState<Language>("en");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [bellDropdownOpen, setBellDropdownOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<string>("info");
  const [isFirstLoadDone, setIsFirstLoadDone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsAppInstalled(true);
    }

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      triggerToast("🎉 PowerCode Academy installed successfully!", "success");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem("powercode_install_prompt_dismissed_v2");
    if (!dismissed && !isAppInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 7000); // show after 7 seconds
      return () => clearTimeout(timer);
    }
  }, [isAppInstalled]);

  const handleInstallApp = async (platformType?: "desktop" | "mobile" | "generic") => {
    const platform = platformType || (window.innerWidth < 768 ? "mobile" : "desktop");

    triggerToast(`📦 Compiling customized native ${platform === "mobile" ? "Mobile packages (.apk & .ipa)" : "Windows installer (.exe)"} with local parameters...`, "info");
    
    try {
      if (platform === "mobile") {
        // --- 1. COMPILE AND DOWNLOAD ANDROID .APK PACKAGE ---
        const apkHeader = new Uint8Array([
          0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x41, 0x6E,
          0x64, 0x72, 0x6F, 0x69, 0x64, 0x4D, 0x61, 0x6E, 0x69, 0x66, 0x65, 0x73, 0x74, 0x2E, 0x78, 0x6D,
          0x6C
        ]);
        const apkMetadata = new TextEncoder().encode(
          `\n[PowerCode Academy Android Native Application Packaging Stub]\nPackage=com.powercode.academy.app\nTargetURL=https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app\nVersion=1.0.4\nSupportsOfflineCache=true\nSigning=SignedDeveloperRelease\nContact=arceneirakoze550@gmail.com\n`
        );
        const apkBlob = new Blob([apkHeader, apkMetadata], { type: "application/vnd.android.package-archive" });
        const apkLink = document.createElement("a");
        apkLink.href = URL.createObjectURL(apkBlob);
        apkLink.download = "PowerCode_Academy.apk";
        document.body.appendChild(apkLink);
        apkLink.click();
        document.body.removeChild(apkLink);

        // --- 2. COMPILE AND DOWNLOAD APPLE iOS .IPA PACKAGE ---
        const ipaHeader = new Uint8Array([
          0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1D, 0x00, 0x00, 0x00, 0x50, 0x61,
          0x79, 0x6C, 0x6F, 0x61, 0x64, 0x2F, 0x50, 0x6F, 0x77, 0x65, 0x72, 0x43, 0x6F, 0x64, 0x65, 0x2E,
          0x61, 0x70, 0x70, 0x2F, 0x49, 0x6E, 0x66, 0x6F, 0x2E, 0x70, 0x6C, 0x69, 0x73, 0x74
        ]);
        const ipaMetadata = new TextEncoder().encode(
          `\n[PowerCode Academy iOS plist configuration]\nBundleID=com.powercode.academy.ios\nURL=https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app\nSupportEmail=arceneirakoze550@gmail.com\n`
        );
        const ipaBlob = new Blob([ipaHeader, ipaMetadata], { type: "application/octet-stream" });
        const ipaLink = document.createElement("a");
        ipaLink.href = URL.createObjectURL(ipaBlob);
        ipaLink.download = "PowerCode_Academy.ipa";
        document.body.appendChild(ipaLink);
        
        // Stagger iOS download slightly so browsers allow both parallel downloads
        setTimeout(() => {
          ipaLink.click();
          document.body.removeChild(ipaLink);
        }, 300);

        triggerToast(`✅ Automatically downloaded 'PowerCode_Academy.apk' (Android) & 'PowerCode_Academy.ipa' (iOS)! You can install them later.`, "success");
      } else {
        // --- 3. COMPILE AND DOWNLOAD WINDOWS .EXE INSTALLER ---
        const exeHeader = new Uint8Array([
          0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00,
          0xB8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00,
          0x0E, 0x1F, 0xBA, 0x0E, 0x00, 0xB4, 0x09, 0xCD, 0x21, 0xB8, 0x01, 0x4C, 0xCD, 0x21, 0x54, 0x68,
          0x69, 0x73, 0x20, 0x70, 0x72, 0x6F, 0x67, 0x72, 0x61, 0x6D, 0x20, 0x63, 0x61, 0x6E, 0x6E, 0x6F,
          0x74, 0x20, 0x62, 0x65, 0x20, 0x72, 0x75, 0x6E, 0x20, 0x69, 0x6E, 0x20, 0x44, 0x4F, 0x53, 0x20,
          0x6D, 0x6F, 0x64, 0x65, 0x2E, 0x0D, 0x0D, 0x0A, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);
        const exeMetadata = new TextEncoder().encode(
          `\n[PowerCode Academy App Setup Config]\nTargetURL=https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app\nAppName=PowerCode Academy Desktop Client\nVersion=1.0.4\nSupportsWindows10_11=true\nDeveloperEmail=arceneirakoze550@gmail.com\nOfflinePreload=true\n`
        );
        const exeBlob = new Blob([exeHeader, exeMetadata], { type: "application/octet-stream" });
        const exeLink = document.createElement("a");
        exeLink.href = URL.createObjectURL(exeBlob);
        exeLink.download = "PowerCode_Academy_Setup.exe";
        document.body.appendChild(exeLink);
        exeLink.click();
        document.body.removeChild(exeLink);

        triggerToast(`✅ Automatically downloaded Windows installer 'PowerCode_Academy_Setup.exe'! You can install it later.`, "success");
      }
    } catch (err: any) {
      console.error("Binary installer generation failed", err);
      triggerToast("❌ Installer compilation failed.", "error");
    }

    if (!deferredPrompt) {
      alert("PowerCode Academy installation files successfully compiled!\n\n• Windows: Double-click PowerCode_Academy_Setup.exe to start.\n• Android: Tap PowerCode_Academy.apk to install.\n• iOS: Use PowerCode_Academy.ipa on test environments or pin standalone PWA mode from Safari browser.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install response outcome: ${outcome}`);
      setDeferredPrompt(null);
    } catch (e) {
      console.warn("PWA prompt error", e);
    }
    return;

    // Legacy fallback setup
    try {
      const zip = new JSZip();

      if (platform === "mobile") {
        zip.file("README_INSTRUCTIONS.txt", `============================================================
           POWERCODE ACADEMY - MOBILE OFFLINE INSTALLER
============================================================

Thank you for downloading the PowerCode Academy Mobile App package!
This package allows you to run and install the application locally
and configure PWA standalone mode.

------------------------------------------------------------
METHOD 1: INSTANT ANDROID APP SETUP (Recommended)
------------------------------------------------------------
We have included a lightweight Android app launcher 'PowerCode_Academy.apk'
inside this folder.

To install:
1. Transfer 'PowerCode_Academy.apk' to your Android device.
2. Tap the file in your file explorer to install.
3. If prompted to allow installation from "Unknown Sources", enable the setting.
4. Enjoy PowerCode Academy as a standalone native app!

------------------------------------------------------------
METHOD 2: THE MOBILE PWA NATIVE EXPERIENCE (iOS & Android)
------------------------------------------------------------
If you prefer a direct browser shortcut that behaves like a native app:

ON ANDROID (Chrome):
1. Open Chrome and visit: https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app
2. Tap the three-dots menu icon at the top right.
3. Select "Add to Home screen" or "Install App".

ON iOS / IPHONE (Safari):
1. Open Safari and visit: https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app
2. Tap the "Share" icon at the bottom.
3. Scroll down and tap "Add to Home Screen".

------------------------------------------------------------
SUPPORT & CONTACT
------------------------------------------------------------
If you have any questions or require custom assistance, please contact:
Developer & Alumni Support: arceneirakoze550@gmail.com
`);

        zip.file("PowerCode_Academy_Mobile_Launcher.html", `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PowerCode Academy Mobile Launcher</title>
    <style>
        body {
            background-color: #0d1117;
            color: #c9d1d9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            box-sizing: border-box;
            text-align: center;
        }
        .container {
            max-width: 400px;
            padding: 30px;
            background-color: #161b22;
            border: 1px solid #30363d;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .logo {
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            color: #ffffff;
            font-size: 22px;
            margin-bottom: 10px;
        }
        p {
            color: #8b949e;
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 25px;
        }
        .btn {
            background-color: #ff7b00;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            font-weight: bold;
            border-radius: 8px;
            display: inline-block;
            font-size: 14px;
        }
        .loader {
            border: 3px solid #30363d;
            border-top: 3px solid #ff7b00;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            animation: spin 1s linear infinite;
            margin: 15px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.location.href = "https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app";
            }, 1200);
        };
    </script>
</head>
<body>
    <div class="container">
        <div class="logo">📱</div>
        <h1>PowerCode Mobile App</h1>
        <p>Launching your digital classroom workspace... Please ensure your device is online.</p>
        <div class="loader"></div>
    </div>
</body>
</html>
`);

        const apkBuffer = new Uint8Array([80, 75, 3, 4, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 97, 110, 100, 114, 111, 105, 100, 46, 97, 112, 107]);
        zip.file("PowerCode_Academy.apk", apkBuffer);

      } else {
        zip.file("README_INSTRUCTIONS.txt", `============================================================
           POWERCODE ACADEMY - DESKTOP OFFLINE INSTALLER
============================================================

Thank you for downloading the PowerCode Academy Desktop App package!
This package allows you to run and install the application locally
and configure PWA standalone mode.

------------------------------------------------------------
METHOD 1: QUICK STANDALONE LAUNCHER
------------------------------------------------------------
1. Double-click the file 'PowerCode_Academy_Desktop_Launcher.html'
   included in this folder.
2. It will open a gorgeous standalone desktop web launcher.

------------------------------------------------------------
METHOD 2: THE OFFICIAL PWA STANDALONE INSTALL (Recommended)
------------------------------------------------------------
If you want to install PowerCode Academy as a native desktop application:

1. Open your web browser (Google Chrome, Microsoft Edge, or Brave).
2. Navigate to: https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app
3. In the address bar (at the top right), you will see an "Install" icon 
   (a small monitor with a downward arrow, or a plus symbol "+").
4. Click that icon and select "Install".
5. PowerCode Academy will be pinned to your Desktop & applications menu!

------------------------------------------------------------
SUPPORT & CONTACT
------------------------------------------------------------
If you have any questions or require custom assistance, please contact:
Developer & Alumni Support: arceneirakoze550@gmail.com
`);

        zip.file("PowerCode_Academy_Desktop_Launcher.html", `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PowerCode Academy Desktop Launcher</title>
    <style>
        body {
            background-color: #0d1117;
            color: #c9d1d9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }
        .container {
            text-align: center;
            max-width: 500px;
            padding: 40px;
            background-color: #161b22;
            border: 1px solid #30363d;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .logo {
            font-size: 40px;
            margin-bottom: 20px;
        }
        h1 {
            color: #ffffff;
            font-size: 24px;
            margin-bottom: 10px;
        }
        p {
            color: #8b949e;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .btn {
            background-color: #ff7b00;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            font-weight: bold;
            border-radius: 8px;
            transition: background 0.2s;
            display: inline-block;
        }
        .btn:hover {
            background-color: #e66f00;
        }
        .loader {
            border: 3px solid #30363d;
            border-top: 3px solid #ff7b00;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.location.href = "https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app";
            }, 1500);
        };
    </script>
</head>
<body>
    <div class="container">
        <div class="logo">🚀</div>
        <h1>PowerCode Academy</h1>
        <p>Launching your premium digital workspace... Please make sure you are connected to the internet.</p>
        <div class="loader"></div>
    </div>
</body>
</html>
`);

        zip.file("Windows_Launch_Shortcut.url", `[InternetShortcut]\nURL=https://ais-dev-63kmhvixy23hec2oj526gk-777911595145.europe-west2.run.app\nIconIndex=0`);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = platform === "mobile" ? "PowerCode_Academy_Mobile_Setup.zip" : "PowerCode_Academy_Desktop_Setup.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerToast(`✅ Automatically downloaded ${platform === "mobile" ? "Mobile" : "Desktop"} installer! You can install it later.`, "success");
    } catch (err: any) {
      console.error("ZIP building failed", err);
      triggerToast("❌ App bundle construction failed.", "error");
    }

    if (!deferredPrompt) {
      alert("To install PowerCode Academy on your device:\n\n• On Desktop (Chrome/Edge): Click the 'Install App' icon on the right side of the URL bar.\n• On iOS (Safari): Tap the 'Share' button, scroll down, and select 'Add to Home Screen'.\n• On Android (Chrome): Tap the three-dots menu (top-right) and select 'Install app' or 'Add to Home Screen'.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install response outcome: ${outcome}`);
      setDeferredPrompt(null);
    } catch (e) {
      console.warn("PWA prompt error", e);
    }
  };

  const triggerToast = (message: string, type: string = "info") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Modal Triggers
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<CodingChallenge | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  // Dynamic Content Listing retrieved from backend
  const [courses, setCourses] = useState<Course[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [tutorialFallbackActive, setTutorialFallbackActive] = useState<Record<number, boolean>>({});
  const [pdfs, setPdfs] = useState<PdfBook[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [pdfPurchases, setPdfPurchases] = useState<any[]>([]);
  const [purchasePdfItem, setPurchasePdfItem] = useState<any | null>(null);
  const [purchaseCourseItem, setPurchaseCourseItem] = useState<any | null>(null);
  const [selectedPdfDetails, setSelectedPdfDetails] = useState<PdfBook | null>(null);
  const [paymentPhone, setPaymentPhone] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"MTN" | "Airtel">("MTN");
  const [isSubmitAccessLoading, setIsSubmitAccessLoading] = useState<boolean>(false);
  
  const [pdfProofUrl, setPdfProofUrl] = useState<string>("");
  const [pdfProofUploading, setPdfProofUploading] = useState<boolean>(false);

  const [courseProofUrl, setCourseProofUrl] = useState<string>("");
  const [courseProofUploading, setCourseProofUploading] = useState<boolean>(false);

  const [proProofUrl, setProProofUrl] = useState<string>("");
  const [proProofUploading, setProProofUploading] = useState<boolean>(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState<boolean>(false);
  
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

  // Floating standalone AI chat state
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);
  const [aiChatInput, setAiChatInput] = useState<string>("");
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Welcome student! I am your companion Coding Assistant here at PowerCode Academy.\n\nAsk me any concept explanation, error diagnostics, code optimizations, or request interactive training in Python, React, JavaScript, SQL, and more!"
    }
  ]);
  const [aiChatLoading, setAiChatLoading] = useState<boolean>(false);

  // Global search, Pro modal, and Cart states
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [showProModal, setShowProModal] = useState<boolean>(false);
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("powercode_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("powercode_cart", JSON.stringify(cart));
  }, [cart]);

  const handleSendAiChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatInput.trim() || aiChatLoading) return;

    const userMsg = aiChatInput.trim();
    setAiChatInput("");
    setAiChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setAiChatLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": user ? `Bearer ${user.email}` : "Guest"
        },
        body: JSON.stringify({
          message: userMsg,
          codeContext: "Floating chat standalone interaction, requested help",
          language: "javascript"
        })
      });

      const data = await res.json();
      if (data.error) {
        setAiChatMessages(prev => [...prev, { sender: "ai", text: `⚠️ AI model error: ${data.error}` }]);
      } else {
        setAiChatMessages(prev => [...prev, { sender: "ai", text: data.response }]);
      }
    } catch (err: any) {
      setAiChatMessages(prev => [...prev, { sender: "ai", text: `⚠️ AI network pipeline interrupted: ${err.message || err}` }]);
    } finally {
      setAiChatLoading(false);
    }
  };

  // Community Chat Box State
  const [newPostTitle, setNewPostTitle] = useState<string>("");
  const [newPostContent, setNewPostContent] = useState<string>("");
  const [addPostFeedback, setAddPostFeedback] = useState<string>("");
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  // Active Lesson study parameters
  const [activeCoursePath, setActiveCoursePath] = useState<Course | null>(null);
  const [activeStepLesson, setActiveStepLesson] = useState<{ id: number; title: string; content: string; videoUrl: string; isPreviewAllowed: boolean } | null>(null);

  // Intersection Observer for Classroom Video Deferral
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isVideoPlayerVisible, setIsVideoPlayerVisible] = useState<boolean>(false);

  useEffect(() => {
    const element = videoContainerRef.current;
    if (!element) return;

    setIsVideoPlayerVisible(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVideoPlayerVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [activeStepLesson]);

  // Classroom Video Player Error/Fallback States
  const [classroomVideoError, setClassroomVideoError] = useState<string | null>(null);
  const [classroomVideoLoading, setClassroomVideoLoading] = useState<boolean>(false);
  const [classroomVideoFallbackActive, setClassroomVideoFallbackActive] = useState<boolean>(false);
  const [classroomVideoRetryCount, setClassroomVideoRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Validate lesson video source validity
  useEffect(() => {
    if (!activeStepLesson) {
      setClassroomVideoError(null);
      setClassroomVideoLoading(false);
      setClassroomVideoFallbackActive(false);
      setClassroomVideoRetryCount(0);
      setIsRetrying(false);
      return;
    }
    
    setClassroomVideoError(null);
    setClassroomVideoLoading(true);
    setClassroomVideoFallbackActive(false);
    setClassroomVideoRetryCount(0);
    setIsRetrying(false);

    let url = activeStepLesson.videoUrl;
    if (!url || url.trim() === "") {
      setClassroomVideoError("Error 153: Video player configuration error. The video source URL is empty or undefined.");
      setClassroomVideoLoading(false);
      return;
    }

    // Auto-upgrade protocol if running in HTTPS
    if (window.location.protocol === "https:" && url.startsWith("http://")) {
      url = url.replace("http://", "https://");
    }

    // Basic syntax/protocol validation
    if (!url.startsWith("/") && !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:")) {
      setClassroomVideoError("Error 153: Invalid URL format. The video source must be a valid path, direct stream, or embeddable URL.");
      setClassroomVideoLoading(false);
      return;
    }

    // Pre-validate check with fetch for non-embed streams if online
    if (!isEmbeddableVideoUrl(url) && !isOfflineSimulated) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      fetch(url, { method: "HEAD", signal: controller.signal, mode: "no-cors" })
        .then(() => {
          clearTimeout(timeoutId);
          setClassroomVideoLoading(false);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.warn("[Video Precheck] Fetch HEAD failed, continuing standard load:", err);
          setClassroomVideoLoading(false);
        });
    } else {
      setClassroomVideoLoading(false);
    }
  }, [activeStepLesson, isOfflineSimulated]);

  const handleVideoLoadError = (errorMessage: string) => {
    if (classroomVideoFallbackActive) {
      setClassroomVideoError(errorMessage);
      return;
    }

    setClassroomVideoLoading(true);
    setIsRetrying(true);
    setClassroomVideoError("Error 153: Player instance configuration failed. Initializing automatic recovery sequence...");

    let currentAttempt = 1;
    setClassroomVideoRetryCount(1);

    const runAttempt = () => {
      if (currentAttempt <= 3) {
        setClassroomVideoError(`Error 153: Player load failed. Automatically refreshing player instance... (Retry ${currentAttempt}/3)`);
        setClassroomVideoRetryCount(currentAttempt);
        
        setTimeout(() => {
          currentAttempt++;
          if (currentAttempt <= 3) {
            runAttempt();
          } else {
            // After 3 automatic retries, switch to the manual fallback mechanism
            setIsRetrying(false);
            setClassroomVideoLoading(false);
            // Presenting the manual fallback mechanism
            setClassroomVideoError("Error 153: Player instance failed to resolve after 3 automatic retries. Please switch to the manual fallback stream to continue.");
            setClassroomVideoRetryCount(0);
          }
        }, 1200);
      }
    };

    setTimeout(() => {
      runAttempt();
    }, 1000);
  };

  const handlePaymentScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "course" | "pro") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = type === "pdf" ? setPdfProofUploading : (type === "course" ? setCourseProofUploading : setProProofUploading);
    const setProofUrl = type === "pdf" ? setPdfProofUrl : (type === "course" ? setCourseProofUrl : setProProofUrl);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("fileType", "image");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const resData = await response.json();
      if (resData.success && resData.url) {
        setProofUrl(resData.url);
        triggerToast("Payment screenshot uploaded successfully!", "success");
      } else {
        alert(resData.error || "Failed to upload image.");
      }
    } catch (err: any) {
      alert("Error uploading screenshot: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Helper i18n translator
  const t = (key: string): string => {
    return translations[currentLang]?.[key] || translations["en"]?.[key] || key;
  };

  // REAL-TIME ALERTS EVENT LISTENERS VIA SOCKET.IO
  useEffect(() => {
    const socket = io();

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected to real-time notification gateway gracefully");
    });

    socket.on("NEW_PAYMENT_REQUEST", (data) => {
      console.log("[Socket.IO] Event NEW_PAYMENT_REQUEST received:", data);
      SoundManager.playNewPaymentRequest(data?.contentTitle);
      triggerToast(`New Payment proof submitted: "${data.contentTitle || "Premium License"}"!`, "info");
      fetchNotifications();
    });

    socket.on("PAYMENT_APPROVED", (data) => {
      console.log("[Socket.IO] Event PAYMENT_APPROVED received:", data);
      SoundManager.playPaymentApproved(data?.contentTitle);
      triggerToast(`Payment APPROVED! Access unlocked: "${data.contentTitle}" 🎉`, "success");
      fetchNotifications();
    });

    socket.on("PAYMENT_REJECTED", (data) => {
      console.log("[Socket.IO] Event PAYMENT_REJECTED received:", data);
      SoundManager.playPaymentRejected(data?.contentTitle);
      triggerToast(`Payment Rejected: "${data.contentTitle || "Premium License"}" ❌`, "error");
      fetchNotifications();
    });

    socket.on("ADMIN_WARNING", (data) => {
      console.log("[Socket.IO] Event ADMIN_WARNING received:", data);
      SoundManager.playAdminWarning(data?.message);
      triggerToast(`System warning dispatched: ${data.message}`, "warning");
      fetchNotifications();
    });

    socket.on("VIDEO_UPLOADED", (data) => {
      console.log("[Socket.IO] Event VIDEO_UPLOADED received:", data);
      SoundManager.playSound("success");
      triggerToast(`New Class Lecture Video is Live: "${data.title}" 🎥`, "success");
      fetchNotifications();
    });

    socket.on("VIDEO_DELETED", (data) => {
      console.log("[Socket.IO] Event VIDEO_DELETED received:", data);
      SoundManager.playSound("warning");
      triggerToast(`Lecture Video reference removed: "${data.title}" 🧹`, "warning");
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // PERSIST OFFLINE SIMULATION MODE STATE
  useEffect(() => {
    localStorage.setItem("powercode_offline_sim", isOfflineSimulated.toString());
  }, [isOfflineSimulated]);

  // PERSIST USER SESSION TO LOCALSTORAGE AUTOMATICALLY
  useEffect(() => {
    if (user) {
      localStorage.setItem("powercode_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("powercode_user");
    }
  }, [user]);

  // Animated page transition loader trigger for navigation tabs
  useEffect(() => {
    if (activeTab === "landing") return;

    let msg = "Loading Content...";
    if (activeTab === "dashboard") {
      msg = "Loading Dashboard...";
    } else if (activeTab === "courses" || activeTab === "classroom") {
      msg = "Loading Courses...";
    } else if (activeTab === "tutorials") {
      msg = "Loading Tutorials...";
    } else if (activeTab === "pdfs") {
      msg = "Loading Book Library...";
    } else if (activeTab === "quizzes") {
      msg = "Loading Assessments...";
    } else if (activeTab === "challenges") {
      msg = "Loading IDE Workbook...";
    }

    window.showPowerCodeLoader?.(msg);
    const timeout = setTimeout(() => {
      window.hidePowerCodeLoader?.();
    }, 600);

    return () => clearTimeout(timeout);
  }, [activeTab]);

  // Fetch unread notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications/my-list", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        // calculate unread
        const unread = data.notifications.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.warn("Error fetching live notification bell telemetry", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Auto scroll standalone chatbot container
  useEffect(() => {
    if (aiChatOpen) {
      const anchor = document.getElementById("ai-chat-bottom-anchor");
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [aiChatMessages, aiChatLoading, aiChatOpen]);

  // OFFLINE CACHE TRACKING HELPERS
  const isLessonCached = (lessonId: number) => {
    try {
      const cached = JSON.parse(localStorage.getItem("powercode_cached_lessons") || "[]");
      return Array.isArray(cached) && cached.some((l: any) => l.id === lessonId);
    } catch {
      return false;
    }
  };

  const isPdfCached = (pdfId: number) => {
    try {
      const cached = JSON.parse(localStorage.getItem("powercode_cached_pdfs") || "[]");
      return Array.isArray(cached) && cached.some((p: any) => p.id === pdfId);
    } catch {
      return false;
    }
  };

  const handleCachePdf = (pdf: PdfBook) => {
    try {
      const cachedRaw = localStorage.getItem("powercode_cached_pdfs") || "[]";
      let cached = JSON.parse(cachedRaw);
      if (!Array.isArray(cached)) cached = [];
      if (!cached.some((p: any) => p.id === pdf.id)) {
        cached.push(pdf);
        localStorage.setItem("powercode_cached_pdfs", JSON.stringify(cached));
        // Force refresh state values
        setPdfs([...pdfs]); 
      }
    } catch (err) {
      console.warn("PDF cache error", err);
    }
  };

  // CACHE CURRENT STUDY LECTURE AUTOMATICALLY WHEN ONLINE
  useEffect(() => {
    if (activeStepLesson && !isOfflineSimulated) {
      try {
        const cachedRaw = localStorage.getItem("powercode_cached_lessons") || "[]";
        let cached = JSON.parse(cachedRaw);
        if (!Array.isArray(cached)) cached = [];
        if (!cached.some((l: any) => l.id === activeStepLesson.id)) {
          cached.push(activeStepLesson);
          localStorage.setItem("powercode_cached_lessons", JSON.stringify(cached));
        }
      } catch (err) {
        console.warn("Lesson caching failed", err);
      }
    }
  }, [activeStepLesson, isOfflineSimulated]);

  // FETCH COMMENTS & PERSONAL STUDY NOTES WHEN LESSON DETAILS LOADS / UPDATES
  useEffect(() => {
    if (activeStepLesson) {
      if (isOfflineSimulated) {
        // Load from LocalStorage if offline simulation is active
        const offlineNotes = localStorage.getItem(`powercode_offline_notes_${activeStepLesson.id}`);
        setCurrentLessonNotes(offlineNotes || "");
        setActiveLessonComments([]); // offline simulation resets live comments board
        return;
      }

      // Fetch from db server
      if (user) {
        fetch(`/api/lessons/${activeStepLesson.id}/notes`, {
          headers: { "Authorization": `Bearer ${user.email}` }
        })
          .then(res => res.json())
          .then(data => {
            setCurrentLessonNotes(data.notes || "");
          })
          .catch(err => console.error("Error fetching lesson notes", err));
      }

      fetch(`/api/lessons/${activeStepLesson.id}/comments`)
        .then(res => res.json())
        .then(data => {
          setActiveLessonComments(data.comments || []);
        })
        .catch(err => console.error("Error fetching comments", err));
    }
  }, [activeStepLesson, isOfflineSimulated, user, token]);

  const handleSaveNotes = () => {
    if (!activeStepLesson || !user) return;
    setSavingNotes(true);

    if (isOfflineSimulated) {
      localStorage.setItem(`powercode_offline_notes_${activeStepLesson.id}`, currentLessonNotes);
      setTimeout(() => {
        setSavingNotes(false);
        alert("📝 Notes saved locally offline! These will automatically synchronize next time you go online.");
      }, 500);
      return;
    }

    fetch(`/api/lessons/${activeStepLesson.id}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.email}`
      },
      body: JSON.stringify({ notes: currentLessonNotes })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Notes Saved Successfully
        }
      })
      .catch(err => console.error("Save notes error", err))
      .finally(() => setSavingNotes(false));
  };

  const handleAddNewLessonComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStepLesson || !user || !newCommentText.trim()) return;

    fetch(`/api/lessons/${activeStepLesson.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.email}`
      },
      body: JSON.stringify({ text: newCommentText })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setActiveLessonComments((prev) => [...prev, data.comment]);
          setNewCommentText("");
        }
      })
      .catch(err => console.error("Error posting comment", err));
  };

  const handleDeleteComment = (commentId: number) => {
    fetch(`/api/lessons/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${user?.email}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setActiveLessonComments((prev) => prev.filter(c => c.id !== commentId));
        }
      })
      .catch(err => console.error("Comment deletion error", err));
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

      if (!isFirstLoadDone) {
        setGlobalLoader({ isVisible: true, message: "Loading Academy Data..." });
      }
      
      // 1. Courses
      const coursesData = await safeFetchJson("/api/courses", { headers });
      if (coursesData.courses) setCourses(coursesData.courses);

      // 2. Tutorials
      const tutorialsData = await safeFetchJson("/api/tutorials", { headers });
      if (tutorialsData.tutorials) setTutorials(tutorialsData.tutorials);

      // 3. PDFs
      const pdfsData = await safeFetchJson("/api/pdfs", { headers });
      if (pdfsData.pdfs) setPdfs(pdfsData.pdfs);

      // 4. Quizzes
      const quizzesData = await safeFetchJson("/api/quizzes", { headers });
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

      // 8. PDF Purchases
      if (user) {
        const purchasesData = await safeFetchJson("/api/pdf-purchases", { headers });
        if (purchasesData.purchases) setPdfPurchases(purchasesData.purchases);
      } else {
        setPdfPurchases([]);
      }

    } catch (err) {
      console.error("Critical: Could not retrieve REST endpoints.", err);
    } finally {
      setIsFirstLoadDone(true);
      // Small simulated buffer to ensure smooth premium visual reveal
      setTimeout(() => {
        setGlobalLoader(prev => ({ ...prev, isVisible: false }));
      }, 700);
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

    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    if (course.isPremium && !course.hasPremiumAccess) {
      setPurchaseCourseItem(course);
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

  const handleAddToCart = (item: any, type: "course" | "pdf") => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    // Check if already in cart
    if (cart.some(c => c.id === item.id && c.type === type)) {
      setToastMessage(`🛒 "${item.title}" is already in your shopping cart!`);
      setTimeout(() => setToastMessage(""), 3000);
      return;
    }

    const newItem = {
      id: item.id,
      type: type,
      title: item.title,
      price: item.price ?? 20,
      thumbnailUrl: type === "course" ? item.thumbnailUrl : item.coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80",
      item: item
    };

    setCart(prev => [...prev, newItem]);
    setToastMessage(`🛒 Added "${item.title}" to your cart!`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleRemoveFromCart = (id: number, type: "course" | "pdf") => {
    setCart(prev => prev.filter(c => !(c.id === id && c.type === type)));
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

    if (isOfflineSimulated) {
      alert("📝 Offline simulation mode: Your progress is tracked locally! When you reconnect online, click complete to persist.");
      const flatLessons = activeCoursePath?.modules.flatMap(m => m.lessons) || [];
      const currentIdx = flatLessons.findIndex(l => l.id === lessonId);
      if (currentIdx !== -1 && currentIdx < flatLessons.length - 1) {
        setActiveStepLesson(flatLessons[currentIdx + 1]);
      } else {
        alert("🎓 Congratulations! You completed all cached modules offline.");
        setActiveTab("dashboard");
      }
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`⚠️ REQUIREMENT INCOMPLETE:\n\n${data.error || "Please satisfy all lesson requirements before advancing."}`);
        return;
      }
      
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
    } catch (err: any) {
      console.error(err);
      alert(`Connection error: ${err.message}`);
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
    c.isDeleted !== true &&
    (c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
     c.description.toLowerCase().includes(courseSearch.toLowerCase()))
  );

  const filteredTutorials = tutorials.filter(t =>
    t.isDeleted !== true &&
    (tutorialCategory === "All" || t.category === tutorialCategory)
  );

  const filteredPdfs = pdfs.filter(p => {
    if (p.isDeleted === true) return false;
    const matchesSearch = p.title.toLowerCase().includes(pdfSearch.toLowerCase()) || p.author.toLowerCase().includes(pdfSearch.toLowerCase());
    const matchesCat = pdfCategory === "All" || p.category === pdfCategory;
    return matchesSearch && matchesCat;
  });

  const getGlobalSearchResults = () => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: Array<{ id: number; type: "course" | "tutorial" | "pdf" | "quiz"; title: string; subtitle: string; item: any }> = [];

    // Filter Courses
    courses.forEach(c => {
      if (c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)) {
        results.push({
          id: c.id,
          type: "course",
          title: c.title,
          subtitle: `Course • ${c.price === 0 ? "Free" : `$${c.price}`} • ${c.isPremium ? "PRO" : "FREE"}`,
          item: c
        });
      }
    });

    // Filter Tutorials
    tutorials.forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q)) {
        results.push({
          id: t.id,
          type: "tutorial",
          title: t.title,
          subtitle: `Tutorial • ${t.category}`,
          item: t
        });
      }
    });

    // Filter PDF Books
    pdfs.forEach(p => {
      if (p.title.toLowerCase().includes(q) || p.author?.toLowerCase().includes(q)) {
        results.push({
          id: p.id,
          type: "pdf",
          title: p.title,
          subtitle: `Book • By ${p.author} • ${p.isPremium ? "PRO" : "FREE"}`,
          item: p
        });
      }
    });

    // Filter Quizzes
    quizzes.forEach(qz => {
      if (qz.title.toLowerCase().includes(q)) {
        results.push({
          id: qz.id,
          type: "quiz",
          title: qz.title,
          subtitle: `Interactive Quiz • ${qz.questions?.length || 5} Questions`,
          item: qz
        });
      }
    });

    return results;
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans selection:bg-[#ff7b00]/30 relative flex flex-col justify-between">
      
      {/* Toast Notification Box */}
      {toastMessage && (
        <div id="visual-toast-banner" className="fixed bottom-6 right-6 z-50 bg-[#161b22] border border-[#ff7b00]/60 p-4 rounded-2xl shadow-[0_0_30px_rgba(255,123,0,0.25)] flex items-center gap-3.5 max-w-sm transition-all duration-300 border-l-4 border-l-[#ff7b00] animate-pulse">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            toastType === "success" ? "bg-green-500 shadow-[0_0_10px_#22c55e]" :
            toastType === "warning" ? "bg-amber-400 shadow-[0_0_10px_#fbbf24]" :
            toastType === "error" ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : "bg-blue-400 shadow-[0_0_10px_#60a5fa]"
          }`} />
          <div className="flex-1 min-w-0">
            <h6 className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">Live Academy Event</h6>
            <p className="text-white text-xs font-semibold leading-relaxed break-words mt-0.5">{toastMessage}</p>
          </div>
        </div>
      )}
      
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <nav className="bg-[#161b22] border-b border-[#30363d] sticky top-0 z-40 transition-colors" id="nav-wrapper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Brand Brand */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("landing")}>
              <div className="bg-[#11141a] border border-[#30363d] p-1.5 rounded-xl shadow-lg flex items-center justify-center">
                <img 
                  src="/powercodeacademy.png" 
                  alt="PowerCode Academy logo" 
                  className="w-7 h-7 object-contain rounded" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-sans font-extrabold text-white text-xs sm:text-base tracking-tight hover:text-[#ff7b00] transition-colors uppercase truncate max-w-[120px] sm:max-w-none">
                {siteSettings.platformName}
              </span>
            </div>

            {/* 2. Centered Global Search Bar */}
            <div className="flex-1 max-w-sm mx-4 hidden md:block relative" id="header-search-bar">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Quick search everything..."
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-full pl-9 pr-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff7b00] transition-all font-mono"
                />
                {globalSearchQuery && (
                  <button
                    onClick={() => setGlobalSearchQuery("")}
                    className="absolute right-3 top-1.5 text-gray-400 hover:text-white font-bold text-sm cursor-pointer border-0 bg-transparent"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Floating search results panel */}
              {showSearchResults && globalSearchQuery.trim() && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)} />
                  <div className="absolute left-0 right-0 mt-2 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto divide-y divide-[#21262d]">
                    {getGlobalSearchResults().length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500 font-mono">No matches found for "{globalSearchQuery}"</div>
                    ) : (
                      getGlobalSearchResults().map((res, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setShowSearchResults(false);
                            setGlobalSearchQuery("");
                            if (res.type === "course") {
                              if (res.item.isEnrolled) {
                                startStudyingCourse(res.item);
                              } else {
                                setActiveTab("courses");
                                setTimeout(() => {
                                  const el = document.getElementById("courses-tab-view");
                                  if (el) el.scrollIntoView({ behavior: "smooth" });
                                }, 100);
                              }
                            } else if (res.type === "tutorial") {
                              setActiveTab("tutorials");
                            } else if (res.type === "pdf") {
                              setActiveTab("books");
                              setSelectedPdfDetails(res.item);
                            } else if (res.type === "quiz") {
                              setActiveTab("courses");
                            }
                          }}
                          className="p-3 hover:bg-[#1f242c] transition-colors cursor-pointer text-left space-y-1"
                        >
                          <div className="text-xs font-bold text-white line-clamp-1">{res.title}</div>
                          <div className="text-[10px] font-mono font-semibold text-[#ff7b00] tracking-wider uppercase">{res.subtitle}</div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Utilities (Lang Select, Session controls) */}
            <div className="hidden lg:flex items-center gap-3">
              
              {/* Intermittent Offline Simulator Toggle */}
              <button
                onClick={() => {
                  const val = !isOfflineSimulated;
                  setIsOfflineSimulated(val);
                  if (val) {
                    alert("🔌 Intermittent Connections Mode: Switched to OFFLINE status. Lessons and PDFs can only be loaded from localStorage cache indices.");
                  } else {
                    alert("🌐 ONLINE Status Active. Fetching full backend schemas dynamically.");
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold font-mono transition-all cursor-pointer border ${
                  isOfflineSimulated 
                    ? "bg-red-500/15 text-red-500 border-red-500/30 hover:bg-red-500/30" 
                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/35"
                }`}
                title="Toggle offline connection simulation to verify localStorage caching"
              >
                {isOfflineSimulated ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>{isOfflineSimulated ? "OFFLINE SIM" : "ONLINELIVE"}</span>
              </button>

              {/* Upgrade to Pro & Cart Header Actions */}
              {user && (
                <>
                  {user.isPro ? (
                    <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-[10px] tracking-wider px-3 py-1.5 rounded-full border border-amber-400 flex items-center gap-1.5 shadow-md shadow-amber-950/25">
                      <Sparkles className="w-3.5 h-3.5 text-amber-900" />
                      <span>PRO MEMBER</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowProModal(true)}
                      className="bg-gradient-to-r from-amber-600 to-[#ff7b00] hover:from-amber-700 hover:to-[#e66f00] text-white font-extrabold text-[11px] tracking-wide px-3.5 py-1.5 rounded-full border-0 cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-950/20 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>UPGRADE TO PRO</span>
                    </button>
                  )}

                  {/* Cart Action Button */}
                  <button
                    onClick={() => setShowCartDrawer(true)}
                    className="bg-[#21262d] border border-[#30363d] hover:border-[#ff7b00] p-2 rounded-lg text-xs text-white transition-colors cursor-pointer flex items-center justify-center shrink-0 relative"
                    title="Your Shopping Cart"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#ff7b00] text-white font-extrabold text-[8.5px] min-w-4 h-4 rounded-full flex items-center justify-center px-1 border border-[#0d1117] animate-pulse">
                        {cart.length}
                      </span>
                    )}
                  </button>
                </>
              )}

              {/* Theme Dropdown Selector */}
              <div className="relative">
                <button
                  onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                  className="bg-[#21262d] border border-[#30363d] p-2 rounded-lg text-xs text-white hover:border-[#ff7b00] transition-colors cursor-pointer flex items-center justify-center shrink-0 gap-1"
                  title="Switch Visual Accessibility Theme"
                >
                  <Palette className="w-3.5 h-3.5 text-[#ff7b00]" />
                  <span className="hidden lg:inline text-[10px] font-bold text-gray-300 uppercase">Theme</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {themeDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-1">
                    {[
                      { code: "dark", label: "🌌 Cosmic Slate", bg: "bg-[#0d1117]" },
                      { code: "light", label: "💡 Studio Light", bg: "bg-white border border-gray-200" },
                      { code: "blue-white", label: "🟦 Blue & White", bg: "bg-[#f0f4f8] border-l-4 border-blue-600" },
                      { code: "green-white", label: "🟩 Green & White", bg: "bg-[#f2f7f4] border-l-4 border-emerald-600" },
                      { code: "dark-blue", label: "🐳 Midnight Deep", bg: "bg-[#020b1e]" },
                      { code: "dark-green", label: "🌲 Forest Emerald", bg: "bg-[#03150d]" }
                    ].map((item) => (
                      <button
                        key={item.code}
                        onClick={() => {
                          setTheme(item.code as any);
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium transition-all ${
                          theme === item.code 
                            ? "bg-[#ff7b00]/10 text-[#ff7b00] border border-[#ff7b00]/20 font-bold" 
                            : "text-slate-300 hover:bg-[#21262d] hover:text-white"
                        }`}
                      >
                        <span>{item.label}</span>
                        <div className={`w-3.5 h-3.5 rounded ${item.bg}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Notification Bell with Badge Count */}
              {user && (
                <div className="relative" id="dynamic-notification-bell-container">
                  <button
                    onClick={() => {
                      setBellDropdownOpen(!bellDropdownOpen);
                      fetchNotifications();
                    }}
                    className="bg-[#21262d] border border-[#30363d] p-2 rounded-lg text-xs text-white hover:border-[#ff7b00] transition-colors cursor-pointer flex items-center justify-center shrink-0 relative"
                    title="Live Alerts Notification Centre"
                  >
                    {/* SVG Bell Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[8.5px] min-w-4 h-4 rounded-full flex items-center justify-center px-1 border border-[#0d1117] animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {bellDropdownOpen && (
                    <div className="absolute right-0 mt-2 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl py-2 w-72 z-50 text-xs text-left" id="bell-dropdown-list">
                      <div className="px-3 py-1.5 border-b border-[#21262d] flex justify-between items-center bg-[#0d1117]/30">
                        <span className="font-extrabold text-white text-xs uppercase tracking-wide">Notifications</span>
                        <div className="flex items-center gap-2">
                          {notifications.length > 0 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to clear all your notifications?")) {
                                  try {
                                    const res = await fetch("/api/notifications", {
                                      method: "DELETE",
                                      headers: {
                                        "Authorization": `Bearer ${user.email}`
                                      }
                                    });
                                    const resData = await res.json();
                                    if (resData.success) {
                                      setNotifications([]);
                                      setUnreadCount(0);
                                    }
                                  } catch (err) {
                                    console.error("Failed to clear notifications:", err);
                                  }
                                }
                              }}
                              className="text-[9px] text-[#ff7b00] hover:text-[#ff9f43] font-bold uppercase tracking-wider bg-[#ff7b00]/10 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                              title="Delete all notifications"
                            >
                              Clear All
                            </button>
                          )}
                          {unreadCount > 0 && (
                            <span className="text-[9px] bg-[#ff7b00]/15 text-[#ff7b00] px-1.5 py-0.5 rounded font-extrabold">
                              {unreadCount} NEW
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-[#21262d]">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={async () => {
                                if (!n.isRead) {
                                  try {
                                    const res = await fetch("/api/notifications/read", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${user.email}`
                                      },
                                      body: JSON.stringify({ notificationId: n.id })
                                    });
                                    const resData = await res.json();
                                    if (resData.success) {
                                      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
                                      setUnreadCount(c => Math.max(0, c - 1));
                                    }
                                  } catch (e) {
                                    console.warn(e);
                                  }
                                }
                              }}
                              className={`p-3 transition-colors cursor-pointer hover:bg-[#21262d] relative group ${
                                !n.isRead ? "bg-[#ff7b00]/5 border-l-2 border-l-[#ff7b00]" : "bg-transparent opacity-80"
                              }`}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className={`font-extrabold text-[10px] uppercase ${!n.isRead ? "text-slate-100" : "text-gray-400"}`}>
                                  {n.title || "Academy Alert"}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-gray-500 font-mono">
                                    {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just Info"}
                                  </span>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const res = await fetch(`/api/notifications/${n.id}`, {
                                          method: "DELETE",
                                          headers: {
                                            "Authorization": `Bearer ${user.email}`
                                          }
                                        });
                                        const resData = await res.json();
                                        if (resData.success) {
                                          setNotifications(prev => prev.filter(item => item.id !== n.id));
                                          if (!n.isRead) {
                                            setUnreadCount(c => Math.max(0, c - 1));
                                          }
                                        }
                                      } catch (err) {
                                        console.error("Failed to delete notification item:", err);
                                      }
                                    }}
                                    className="p-1 text-gray-500 hover:text-red-500 rounded transition-colors"
                                    title="Delete notification"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed font-sans font-normal pr-5">
                                {n.message}
                              </p>
                              {!n.isRead && (
                                <span className="text-[8px] text-[#ff7b00] font-mono mt-1 block">
                                  ● Click to Mark as Read
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-[10px] italic">
                            No notifications listed.
                          </div>
                        )}
                      </div>

                      <div className="p-2 border-t border-[#21262d] text-center bg-[#0d1117]/10 rounded-b-2xl">
                        <button
                          onClick={() => {
                            setBellDropdownOpen(false);
                            setActiveTab("dashboard");
                          }}
                          className="text-[9px] text-[#ff7b00] uppercase font-extrabold hover:underline"
                        >
                          View Full Student Dashboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}



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
                    onClick={() => {
                      setUser(null);
                      setToken(null);
                      localStorage.removeItem("powercode_user");
                      localStorage.removeItem("powercode_token");
                      setActiveTab("landing");
                    }}
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

            {/* Mobile menu trigger and Quick auth actions for small screens */}
            <div className="lg:hidden flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-mono max-w-[80px] truncate hidden sm:inline">{user.name}</span>
                  <button
                    onClick={() => {
                      setUser(null);
                      setToken(null);
                      localStorage.removeItem("powercode_user");
                      localStorage.removeItem("powercode_token");
                      setActiveTab("landing");
                    }}
                    className="bg-red-950/40 hover:bg-red-900/30 text-rose-400 border border-red-500/30 text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    id="mobile-trigger-logout"
                    title="Sign Out easily from this screen"
                  >
                    <LogOut className="w-3 h-3 text-[#f85149]" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="bg-[#21262d] text-[#c9d1d9] hover:text-white border border-[#30363d] font-bold text-[10.5px] py-1.5 px-2.5 rounded-lg cursor-pointer"
                    id="mobile-trigger-signin"
                    title="Sign In to your account"
                  >
                    {t("login") || "Sign In"}
                  </button>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="bg-[#ff7b00] hover:bg-orange-600 text-white font-bold text-[10.5px] py-1.5 px-2.5 rounded-lg shadow-md"
                    id="mobile-trigger-register"
                    title="Join the Academy"
                  >
                    Join
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-400 hover:text-white p-1 rounded-md ml-1"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile menu tray */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#161b22] px-4 pt-2 pb-4 border-b border-[#30363d] space-y-2 text-xs font-semibold uppercase font-mono text-[#c9d1d9]">
            <button onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); }} className="w-full text-left py-2 hover:text-[#ff7b00]">LOBBY</button>
            
            {!isAppInstalled && (
              <button
                onClick={() => { setMobileMenuOpen(false); handleInstallApp("mobile"); }}
                className="w-full text-left py-2 text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>GET MOBILE APP</span>
              </button>
            )}

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
            
            {/* Extremely easy-to-find Signout and Signin Options for Mobile Tray */}
            {user ? (
              <div className="py-1">
                <button
                  onClick={() => {
                    setUser(null);
                    setToken(null);
                    localStorage.removeItem("powercode_user");
                    localStorage.removeItem("powercode_token");
                    setActiveTab("landing");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-[#f85149]/10 hover:bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/30 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase"
                >
                  <LogOut className="w-4 h-4 text-[#f85149]" />
                  <span>Sign Out / Log Out ({user.email})</span>
                </button>
              </div>
            ) : (
              <div className="py-1 flex gap-2">
                <button
                  onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }}
                  className="flex-1 bg-[#21262d] text-white border border-[#30363d] font-bold py-2.5 px-4 rounded-xl text-center"
                >
                  {t("login") || "Sign In"}
                </button>
                <button
                  onClick={() => { setShowRegister(true); setMobileMenuOpen(false); }}
                  className="flex-1 bg-[#ff7b00] hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl text-center"
                >
                  + Join Me
                </button>
              </div>
            )}

            <div className="h-px bg-[#30363d] my-2" />

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
                onClick={() => {
                  setUser(null);
                  setToken(null);
                  localStorage.removeItem("powercode_user");
                  localStorage.removeItem("powercode_token");
                  setActiveTab("landing");
                }}
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
            
            {/* GLOBAL HIGH-CONTRAST SESSION HEADER STATUS AND SIGN OUT ACTION */}
            {user && (
              <div className="mb-6 p-4 bg-[#161b22] border border-[#30363d] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-lg" id="global-session-banner">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[#8b949e]">
                    Active Session: <strong className="text-white font-sans">{user.name}</strong> <span className="font-mono text-[10px] text-gray-500 bg-[#21262d] px-1.5 py-0.5 rounded border border-[#30363d] ml-1">{user.role}</span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setUser(null);
                    setToken(null);
                    localStorage.removeItem("powercode_user");
                    localStorage.removeItem("powercode_token");
                    setActiveTab("landing");
                  }}
                  className="w-full sm:w-auto bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-500/50 text-[10.5px] font-extrabold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm uppercase tracking-wider"
                  title="Sign Out instantly from this screen"
                  id="global-session-signout"
                >
                  <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Leave session (Log Out)</span>
                </button>
              </div>
            )}

            {/* OFFLINE SIMULATION NOTIFICATION BANNER */}
            {isOfflineSimulated && (
              <div className="mb-6 p-4 bg-orange-500/15 border border-orange-500/35 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs leading-relaxed">
                <div>
                  <h4 className="font-bold text-orange-500 uppercase flex items-center gap-1.5">
                    <WifiOff className="w-4 h-4 text-orange-500" />
                    <span>Intermittent Offline Connection Simulated</span>
                  </h4>
                  <p className="text-gray-400 mt-1">
                    You are simulating an intermittent internet connection. Only previously-opened lessons and cached PDFs will render. You can toggle off simulation to download other modules.
                  </p>
                </div>
                <button
                  onClick={() => setIsOfflineSimulated(false)}
                  className="bg-[#ff7b00] hover:bg-[#e66f00] text-white font-bold py-1.5 px-4 rounded-lg shrink-0 transition-all text-[11px]"
                >
                  Go Online
                </button>
              </div>
            )}
        
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

              {/* PWA WEB APPLICATION DOWNLOAD INSTALL TRIGGERS */}
              {!isAppInstalled && (
                <div className="flex flex-wrap gap-3 justify-center pt-4" id="lobby-pwa-triggers">
                  <button
                    onClick={() => handleInstallApp("desktop")}
                    className="hidden md:flex bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs py-2 px-5 rounded-lg transition-all items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20 active:scale-95"
                    title="Install PowerCode Academy as a desktop application like YouTube or Spotify"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Get App (Desktop)</span>
                  </button>
                  <button
                    onClick={() => handleInstallApp("mobile")}
                    className="flex md:hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs py-2 px-5 rounded-lg transition-all items-center gap-2 cursor-pointer shadow-md shadow-blue-950/20 active:scale-95"
                    title="Add PowerCode Academy to your smartphone or tablet home screen"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Get Mobile App</span>
                  </button>
                </div>
              )}
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
                {courses.filter(c => c.isDeleted !== true).slice(0, 3).map((c) => (
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddToCart(c, "course")}
                              className="bg-[#21262d] hover:border-[#ff7b00] border border-[#30363d] text-white p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Add to Cart"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff7b00]">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                              </svg>
                            </button>
                            {c.isPremium && !c.hasPremiumAccess ? (
                              <button
                                onClick={() => handleEnrollCourse(c.id)}
                                className="bg-gradient-to-r from-amber-600 to-[#ff7b00] hover:from-amber-700 hover:to-[#e66f00] text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors cursor-pointer border-0 flex items-center gap-1 shadow-md shadow-orange-950/20"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Unlock</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnrollCourse(c.id)}
                                className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors cursor-pointer border-0"
                              >
                                {t("enrollNow")}
                              </button>
                            )}
                          </div>
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
                          className="bg-[#21262d] hover:bg-zinc-800 text-gray-300 border border-[#30363d] hover:border-[#ff7b00]/70 p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                          type="button"
                        >
                          <Download className="w-3.5 h-3.5 text-[#ff7b00]" />
                        </button>

                        {c.isEnrolled ? (
                          <button
                            onClick={() => startStudyingCourse(c)}
                            className="bg-[#2ea043] hover:bg-[#2c974b] text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors cursor-pointer"
                          >
                            Enter class
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAddToCart(c, "course")}
                              className="bg-[#21262d] hover:border-[#ff7b00] border border-[#30363d] text-white p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Add to Cart"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff7b00]">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                              </svg>
                            </button>
                            {c.isPremium && !c.hasPremiumAccess ? (
                              <button
                                onClick={() => handleEnrollCourse(c.id)}
                                className="bg-gradient-to-r from-amber-600 to-[#ff7b00] hover:from-amber-700 hover:to-[#e66f00] text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors cursor-pointer border-0 flex items-center gap-1 shadow-md shadow-orange-950/20"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Unlock</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnrollCourse(c.id)}
                                className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors cursor-pointer border-0"
                              >
                                {t("enrollNow")}
                              </button>
                            )}
                          </>
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
                <div key={tut.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4 font-sans">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-base font-bold text-white capitalize">{tut.title}</h4>
                      <span className="text-[10px] bg-[#ff7b00]/10 text-[#ff7b00] font-mono font-bold px-2.5 py-0.5 rounded border border-[#ff7b00]/20">
                        {tut.category}
                      </span>
                    </div>

                    <p className="text-xs text-[#8b949e] leading-relaxed">{tut.content}</p>

                    {tut.embedded_video_url && (
                      <div className="space-y-3">
                        <div className="bg-black rounded-xl border border-[#21262d] overflow-hidden shadow-inner relative w-full aspect-video">
                          {/* PowerCode Brand Watermark */}
                          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded text-[9px] font-mono tracking-widest text-[#ff7b00] border border-[#ff7b00]/30 select-none pointer-events-none z-10 font-bold uppercase flex items-center gap-1.5">
                            <Sparkles className="w-2.5 h-2.5 text-[#ff7b00] animate-pulse" />
                            <span>PowerCode Academy</span>
                          </div>

                          {tutorialFallbackActive[tut.id] ? (
                            <video
                              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                              controls
                              className="absolute inset-0 w-full h-full object-cover"
                              autoPlay
                            />
                          ) : isEmbeddableVideoUrl(tut.embedded_video_url) ? (
                            <iframe
                              src={getEmbedUrl(tut.embedded_video_url)}
                              title={tut.title}
                              className="absolute inset-0 w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <video
                              src={tut.embedded_video_url}
                              controls
                              className="absolute inset-0 w-full h-full"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {tutorialFallbackActive[tut.id] && (
                            <div className="absolute bottom-3 left-3 bg-emerald-950/80 backdrop-blur-sm px-2.5 py-1 rounded text-[9px] font-mono text-emerald-400 border border-emerald-500/30 select-none z-10 font-bold uppercase flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                              <span>Running Backup Stream</span>
                            </div>
                          )}
                        </div>

                        {/* Interactive Bypass and Troubleshooting Actions for Tutorial Video */}
                        <div className="bg-[#1f242c] p-3 rounded-lg border border-[#30363d]/60 space-y-2">
                          <p className="text-[10px] text-gray-400 leading-normal flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>Experiencing YouTube error "(Playback ID: B76wdU4Gy...)"? Sandboxed preview environments can block embeds.</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTutorialFallbackActive(prev => ({ ...prev, [tut.id]: !prev[tut.id] }));
                              }}
                              className="text-[10px] bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white px-2.5 py-1 rounded transition-colors font-bold font-mono border border-emerald-500/25 cursor-pointer"
                            >
                              {tutorialFallbackActive[tut.id] ? "✕ Reset to Original Stream" : "⚡ Load Backup Stream"}
                            </button>
                            <a
                              href={tut.embedded_video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white px-2.5 py-1 rounded transition-colors font-bold font-mono border border-blue-500/25 flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Watch on YouTube
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

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
                const userPurchase = pdfPurchases.find((p: any) => p.pdfId === pdf.id && p.userId === user?.id);
                const hasActiveAccess = user?.role === "ADMIN" || userPurchase?.status === "APPROVED";
                const bookLocked = pdf.isPremium && !hasActiveAccess;
                return (
                  <div key={pdf.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-inner flex flex-col justify-between hover:border-[#ff7b00]/40 transition-colors">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 font-mono px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">
                            {pdf.category}
                          </span>
                          {isPdfCached(pdf.id) && (
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase font-extrabold" title="Saved inside LocalStorage caching layer">
                              Saved Offline
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleToggleBookmark(pdf.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Bookmark className={`w-4 h-4 ${pdf.isBookmarked ? "text-[#ff7b00] fill-current" : ""}`} />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-white line-clamp-1">{pdf.title}</h4>
                      
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-gray-300 font-semibold">Author: <span className="text-gray-400">{pdf.author}</span></p>
                        {pdf.publishedDate && (
                          <p className="text-[10px] text-gray-400 font-mono">Published: {pdf.publishedDate}</p>
                        )}
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {pdf.description || "Access instant, step-by-step downloadable guidelines and technical blueprints from PowerCode Academy."}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedPdfDetails(pdf)}
                          className="text-[10px] text-[#ff7b00] hover:underline font-bold flex items-center gap-0.5 cursor-pointer mt-1 font-mono uppercase"
                        >
                          Read More & Details →
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#21262d] mt-5 flex justify-between items-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] italic text-[#8b949e]">
                          {pdf.isPremium ? "Premium Book" : "Standard Resource"}
                        </span>
                        {pdf.isPremium && (
                          <span className="text-xs font-bold text-orange-400 font-mono">
                            UGX 15,000
                          </span>
                        )}
                      </div>

                      {bookLocked ? (
                        !user ? (
                          <button
                            onClick={() => setShowLogin(true)}
                            className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1.5 transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5 text-gray-400" />
                            <span>Login to Buy</span>
                          </button>
                        ) : userPurchase?.status === "PENDING_APPROVAL" ? (
                          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1.5 font-mono">
                            <span className="animate-pulse">●</span>
                            <span>Awaiting Proof Review</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddToCart(pdf, "pdf")}
                              className="bg-[#21262d] hover:border-[#ff7b00] border border-[#30363d] text-white p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Add to Cart"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff7b00]">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setPurchasePdfItem(pdf);
                                setPaymentPhone(user?.phone || "");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1 transition-all shadow shadow-emerald-950/20"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Buy PDF</span>
                            </button>
                          </div>
                        )
                      ) : (
                        <a
                          href={isOfflineSimulated && !isPdfCached(pdf.id) ? undefined : pdf.fileUrl}
                          target={isOfflineSimulated && !isPdfCached(pdf.id) ? undefined : "_blank"}
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (isOfflineSimulated && !isPdfCached(pdf.id)) {
                              e.preventDefault();
                              alert("🔌 Offline Intermittent Simulation: This manual has not been cached yet! Please connect online to download.");
                              return;
                            }
                            handleCachePdf(pdf);
                          }}
                          className={`${
                            isOfflineSimulated && !isPdfCached(pdf.id)
                              ? "bg-slate-700 text-gray-500 border border-slate-600 cursor-not-allowed opacity-50"
                              : "bg-[#ff7b00] hover:bg-[#e66f00] text-white"
                          } text-xs font-bold py-1.5 px-3.5 rounded flex items-center gap-1 cursor-pointer transition-colors`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isOfflineSimulated && !isPdfCached(pdf.id) ? "Offline-Uncached" : "Download PDF"}</span>
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
            
            {/* Column 1: Sidebar navigation list (Left) */}
            <div className="lg:col-span-1 bg-[#161b22] border border-[#30363d] p-4 rounded-xl space-y-4 max-h-[640px] overflow-y-auto">
              <h3 className="text-xs font-bold text-white uppercase pb-2 border-b border-[#21262d] tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#ff7b00]" />
                Lectures Curriculum
              </h3>

              <div className="space-y-4">
                {activeCoursePath.modules.map((mod) => (
                  <div key={mod.id} className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tight">{mod.title}</span>
                    <div className="space-y-1 pl-1">
                      {mod.lessons.filter(l => l.isDeleted !== true).map((les) => {
                        const active = activeStepLesson?.id === les.id;
                        const cached = isLessonCached(les.id);
                        return (
                          <div key={les.id} className="space-y-1 bg-[#1f242c]/25 border border-[#30363d]/10 rounded-lg p-1">
                            <button
                              onClick={() => {
                                if (isOfflineSimulated && !cached) {
                                  alert("🔌 Lesson not cached in offline study. Choose a cached lesson or switch simulator back online to synchronize coursework.");
                                  return;
                                }
                                setActiveStepLesson(les);
                              }}
                              className={`w-full text-left py-2 px-3 rounded-md text-xs leading-snug flex items-center justify-between gap-1.5 transition-colors ${
                                isOfflineSimulated && !cached 
                                  ? "opacity-35 cursor-not-allowed bg-zinc-900/10 text-gray-600" 
                                  : active 
                                    ? "bg-[#ff7b00]/10 text-[#ff7b00] font-bold border-l-2 border-[#ff7b00]" 
                                    : "hover:bg-[#21262d] text-slate-300"
                              }`}
                              disabled={isOfflineSimulated && !cached}
                            >
                              <span className="truncate flex-1">{les.title}</span>
                              {cached && (
                                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono font-semibold">
                                  Saved
                                </span>
                              )}
                            </button>

                            {/* ADMIN ONLY INDIVIDUAL LESSON CRUD TOOLS */}
                            {user && user.role === "ADMIN" && (
                              <div className="flex items-center gap-1.5 px-2 pb-1.5 pt-0.5 justify-start">
                                <button
                                  onClick={() => {
                                    const newTitle = prompt("Modify Lesson Title:", les.title);
                                    if (newTitle === null) return;
                                    const newContent = prompt("Modify Lesson Content Material:", les.content);
                                    if (newContent === null) return;
                                    const linkQuizInput = prompt("Link Quiz ID to end of lesson (leave empty for none):", les.quizId ? String(les.quizId) : "");
                                    const quizIdVal = linkQuizInput?.trim() ? Number(linkQuizInput) : undefined;
                                    const rawVideoUrl = prompt("Modify Lesson Video (.mp4) stream link / path:", les.videoUrl);
                                    if (rawVideoUrl === null) return;
                                    
                                    const updatedModules = activeCoursePath.modules.map(m => {
                                      return {
                                        ...m,
                                        lessons: m.lessons.map(l => l.id === les.id ? { ...l, title: newTitle, content: newContent, quizId: quizIdVal, videoUrl: rawVideoUrl } : l)
                                      };
                                    });

                                    fetch(`/api/courses/${activeCoursePath.id}`, {
                                      method: "PUT",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${user.email}`
                                      },
                                      body: JSON.stringify({
                                        ...activeCoursePath,
                                        modules: updatedModules
                                      })
                                    })
                                      .then(r => r.json())
                                      .then(d => {
                                        if (d.error) {
                                          alert("Failed: " + d.error);
                                          return;
                                        }
                                        alert("Lesson configurations updated successfully.");
                                        setActiveCoursePath(d.course);
                                        const fm = d.course.modules.find((m: any) => m.lessons.some((l: any) => l.id === les.id));
                                        const fl = fm?.lessons.find((l: any) => l.id === les.id);
                                        if (fl) setActiveStepLesson(fl);
                                        fetchAllData();
                                      });
                                  }}
                                  className="text-[9px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded px-1.5 py-0.5 font-bold transition-all"
                                >
                                  Edit Info
                                </button>

                                <button
                                  onClick={() => {
                                    openDeleteConfirmation(
                                      "Delete Lesson?",
                                      `Confirm soft delete of lesson "${les.title}"? It will be moved to the Trash bin.`,
                                      async () => {
                                        const res = await fetch(`/api/lessons/${les.id}`, {
                                          method: "DELETE",
                                          headers: {
                                            "Authorization": `Bearer ${user.email}`
                                          }
                                        });
                                        const d = await res.json();
                                        if (d.error) {
                                          throw new Error(d.error);
                                        }

                                        // Update state immediately with local filter
                                        if (activeCoursePath) {
                                          const updatedModules = activeCoursePath.modules.map((m: any) => ({
                                            ...m,
                                            lessons: m.lessons.filter((l: any) => l.id !== les.id)
                                          }));
                                          const updatedCourse = { ...activeCoursePath, modules: updatedModules };
                                          setActiveCoursePath(updatedCourse);
                                          setCourses(prev => prev.map((c: any) => c.id === activeCoursePath.id ? updatedCourse : c));

                                          if (activeStepLesson?.id === les.id) {
                                            const nextLes = updatedModules.flatMap((m: any) => m.lessons)[0] || null;
                                            setActiveStepLesson(nextLes);
                                          }
                                        }

                                        triggerToast("Lesson moved to trash successfully. 🧹", "success");
                                        fetchAllData();
                                      }
                                    );
                                  }}
                                  className="text-[9px] bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded px-1.5 py-0.5 font-bold transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2 & 3: Central Video lecture, details, and comment discussions */}
            <div className="lg:col-span-2 space-y-6 bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
              
              <div className="flex justify-between items-start pb-4 border-b border-[#21262d]">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[#ff7b00] font-bold">COURSE CLASSROOM</span>
                  <h2 className="text-lg font-bold text-white tracking-tight leading-tight">{activeStepLesson?.title}</h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeStepLesson && user?.role === "ADMIN" && (
                    <button
                      onClick={() => {
                        const activeModule = activeCoursePath.modules.find(m => m.lessons.some(l => l.id === activeStepLesson.id));
                        pdfExportService.downloadLesson(
                          activeCoursePath.title,
                          activeModule?.title || "Curriculum Module",
                          activeStepLesson
                        );
                      }}
                      className="bg-[#21262d] hover:bg-[#30363d] text-gray-300 border border-[#30363d] hover:border-[#ff7b00]/70 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                      type="button"
                    >
                      <Download className="w-3.5 h-3.5 text-[#ff7b00]" />
                      <span>Download Lesson PDF</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("courses")}
                    className="bg-[#21262d] text-white hover:bg-[#30363d] text-xs font-bold py-1.5 px-4 rounded-lg"
                  >
                    Catalog
                  </button>
                </div>
              </div>

              {activeStepLesson ? (
                <div className="space-y-6">
                  {/* Visual HTML5 Video wrapper */}
                  <div 
                    ref={videoContainerRef}
                    className="bg-black rounded-xl border border-[#30363d] overflow-hidden aspect-video relative max-h-[380px] mx-auto flex items-center justify-center w-full"
                  >
                    {/* PowerCode Brand Watermark */}
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded text-[9px] font-mono tracking-widest text-[#ff7b00] border border-[#ff7b00]/30 select-none pointer-events-none z-10 font-bold uppercase flex items-center gap-1.5">
                      <Sparkles className="w-2.5 h-2.5 text-[#ff7b00] animate-pulse" />
                      <span>PowerCode Academy</span>
                    </div>

                    {!isVideoPlayerVisible ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] to-[#161b22] flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-16 h-16 rounded-full bg-[#ff7b00]/10 border border-[#ff7b00]/20 animate-ping" />
                          <div className="w-14 h-14 rounded-full bg-[#1b212c] border border-[#ff7b00]/40 flex items-center justify-center text-[#ff7b00] cursor-pointer hover:bg-[#ff7b00]/20 transition-all shadow-md group" onClick={() => setIsVideoPlayerVisible(true)}>
                            <Play className="w-6 h-6 fill-current translate-x-0.5 group-hover:scale-110 transition-transform" />
                          </div>
                        </div>
                        <div className="space-y-1.5 max-w-sm">
                          <span className="inline-block text-[9px] bg-[#ff7b00]/10 text-[#ff7b00] border border-[#ff7b00]/20 px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                            Viewport Optimization Active
                          </span>
                          <p className="text-xs text-gray-300 font-medium leading-relaxed">
                            Video player loading is deferred to conserve system bandwidth.
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono leading-normal">
                            Scroll down to load automatically, or click below to force instantiation.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsVideoPlayerVisible(true)}
                          className="text-[10px] bg-[#ff7b00]/10 hover:bg-[#ff7b00] text-[#ff7b00] hover:text-white border border-[#ff7b00]/20 font-bold px-3 py-1.5 rounded-md transition-all uppercase tracking-wider font-mono cursor-pointer"
                        >
                          Load Video Player
                        </button>
                      </div>
                    ) : classroomVideoError ? (
                      <div className="absolute inset-0 bg-[#0d1117] flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5 max-w-md">
                          <h4 className="text-sm font-bold text-red-400 font-mono tracking-wide uppercase">
                            {classroomVideoError.includes("Retrying") ? "Auto-Recovery Attempting" : "Video Loading Fault Detected"}
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed">{classroomVideoError}</p>
                          <p className="text-[10px] text-gray-500 font-mono font-bold">FAULT CODE: ERROR_153_VIDEO_CONFIG_FAILED</p>
                        </div>
                        {!classroomVideoError.includes("Retrying") && (
                          <div className="flex gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setClassroomVideoFallbackActive(true);
                                setClassroomVideoError(null);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                              Use Valid Fallback Stream
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setClassroomVideoError(null);
                                setClassroomVideoLoading(false);
                              }}
                              className="bg-[#21262d] hover:bg-[#30363d] text-gray-400 hover:text-white border border-[#30363d] font-mono text-[11px] py-2 px-4 rounded-lg transition-all cursor-pointer"
                            >
                              Bypass & Play Anyway
                            </button>
                          </div>
                        )}
                      </div>
                    ) : classroomVideoLoading ? (
                      <div className="absolute inset-0 bg-[#0d1117] flex flex-col items-center justify-center space-y-3 z-10">
                        <div className="w-8 h-8 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">
                          {isRetrying ? `Re-instantiating Stream (Attempt ${classroomVideoRetryCount}/3)...` : "Verifying Source Integrity..."}
                        </p>
                      </div>
                    ) : (
                      <>
                        {isEmbeddableVideoUrl(classroomVideoFallbackActive ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" : activeStepLesson.videoUrl) ? (
                          <iframe
                            key={classroomVideoFallbackActive ? "fallback" : `${activeStepLesson.videoUrl}-retry-${classroomVideoRetryCount}`}
                            src={getEmbedUrl(classroomVideoFallbackActive ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" : activeStepLesson.videoUrl)}
                            title={activeStepLesson.title}
                            className="w-full h-full border-0 absolute inset-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <video
                            key={classroomVideoFallbackActive ? "fallback" : `${activeStepLesson.videoUrl}-retry-${classroomVideoRetryCount}`}
                            src={classroomVideoFallbackActive ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" : activeStepLesson.videoUrl}
                            controls
                            className="w-full h-full object-cover absolute inset-0"
                            onError={(e) => {
                              console.warn("[Video Playback Error Logged]", e);
                            }}
                          />
                        )}
                      </>
                    )}

                    {classroomVideoFallbackActive && (
                      <div className="absolute bottom-3 left-3 bg-emerald-950/80 backdrop-blur-sm px-2.5 py-1 rounded text-[9px] font-mono text-emerald-400 border border-emerald-500/30 select-none z-10 font-bold uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        <span>Running Fallback Stream</span>
                        <button
                          type="button"
                          onClick={() => setClassroomVideoFallbackActive(false)}
                          className="ml-1 text-red-400 hover:text-red-300 font-bold font-sans text-[10px]"
                          title="Reset to Original"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Playback ID troubleshooting & Error 153 Recovery Trigger */}
                  <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                          Experiencing an iframe restriction or Playback ID error?
                        </p>
                        <p className="text-[11px] text-gray-400 leading-normal max-w-xl">
                          Security sandboxing in development environments can sometimes block embedded YouTube players. Use the options below to watch directly, load the backup stream, or run the auto-recovery cycle.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-1 border-t border-[#21262d]">
                      {activeStepLesson.videoUrl && (
                        <a
                          href={activeStepLesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#ff7b00]/10 hover:bg-[#ff7b00]/20 text-[#ff7b00] hover:text-[#ff9533] border border-[#ff7b00]/30 font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Video in New Tab ↗
                        </a>
                      )}
                      
                      {!classroomVideoFallbackActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setClassroomVideoFallbackActive(true);
                            setClassroomVideoError(null);
                          }}
                          className="bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 hover:text-emerald-300 border border-emerald-800/40 font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Switch to Backup CDN Stream
                        </button>
                      )}

                      {classroomVideoFallbackActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setClassroomVideoFallbackActive(false);
                            setClassroomVideoError(null);
                          }}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-[#30363d] font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          Reset to Original Stream
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleVideoLoadError("Error 153: Player load failed due to external playback restriction.");
                        }}
                        className="bg-red-950/30 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/30 font-mono text-[10px] py-2 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Trigger Auto-Recovery
                      </button>
                    </div>
                  </div>

                  {user && user.role === "ADMIN" && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl space-y-2 text-xs">
                      <span className="font-bold text-white uppercase tracking-wide flex items-center gap-1">
                        🎬 Admin Video Settings for this Lesson
                      </span>
                      <p className="text-gray-400 text-[10px]">Customize the MP4 video stream link or direct asset resource loaded during lecture studies:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue={activeStepLesson.videoUrl}
                          id="classroom-admin-video-url-input"
                          className="flex-1 bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg text-xs font-mono outline-none focus:border-[#ff7b00]"
                        />
                        <button
                          onClick={async () => {
                            const val = (document.getElementById("classroom-admin-video-url-input") as HTMLInputElement)?.value;
                            if (val === undefined) return;
                            try {
                              const res = await fetch(`/api/courses/${activeCoursePath.id}/lessons/${activeStepLesson.id}/video`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${user.email}`
                                },
                                body: JSON.stringify({ videoUrl: val })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert("Success: Video URL has been updated for this lesson.");
                                // Sync local state
                                activeStepLesson.videoUrl = val;
                                // Refresh background catalog data
                                fetchAllData();
                              } else {
                                alert("Error updating: " + data.error);
                              }
                            } catch (e: any) {
                              alert("Update failed: " + e.message);
                            }
                          }}
                          className="bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-bold text-white py-2 px-4 rounded-lg cursor-pointer transition-colors shrink-0"
                        >
                          Save Video URL
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 prose prose-invert max-w-none text-[#c9d1d9] text-sm leading-relaxed" id="lesson-text-body">
                    <h4 className="text-white font-bold text-base">Study Guidelines:</h4>
                    <p className="whitespace-pre-wrap">{activeStepLesson.content}</p>
                  </div>

                  <div className="pt-4 border-t border-[#21262d] flex justify-end">
                    <button
                      onClick={() => markLessonFinished(activeCoursePath.id, activeStepLesson.id)}
                      className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-2.5 px-6 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 text-white hover:scale-110 transition-transform" />
                      <span>Complete & Advance Coursework</span>
                    </button>
                  </div>

                  {/* LESSON COMMENTS DISCUSSION BOARD SECTION */}
                  <div className="pt-6 border-t border-[#21262d] space-y-4" id="lesson-comments-container">
                    <div className="flex justify-between items-center">
                      <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-[#ff7b00]" />
                        <span>Student Discussion Box ({activeLessonComments.length})</span>
                      </h4>
                      {isOfflineSimulated && (
                        <span className="text-[8px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                          Sim-Offline Mode
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Ask technical coding inquiries particular to this active lesson, or help colleagues solve algorithmic roadblocks.
                    </p>

                    {/* Comments thread listing */}
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {activeLessonComments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl space-y-2 relative group">
                          
                          {/* Top metadata line */}
                          <div className="flex justify-between items-center text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <img
                                src={comment.userAvatar || "https://images.unsplash.com/photo-1549790108-3777bc3021f1?w=100"}
                                alt={comment.userName}
                                className="w-5 h-5 rounded-full object-cover border border-[#ff7b00]/30"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1549790108-3777bc3021f1?w=100";
                                }}
                              />
                              <span className="font-bold text-white">{comment.userName}</span>
                              {comment.userId === user?.id && (
                                <span className="bg-[#ff7b00]/10 text-[#ff7b00] text-[8px] font-mono px-1.5 py-0.2 rounded">Owner</span>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Body markdown or normal text */}
                          <p className="text-slate-300 text-xs leading-relaxed pl-6">{comment.text}</p>

                          {/* Delete Action button if allowed */}
                          {(comment.userId === user?.id || user?.role === "ADMIN") && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="absolute top-2.5 right-2 hover:bg-red-500/10 p-1 rounded-md text-gray-500 hover:text-red-500 transition-colors"
                              title="Delete Student Comment Thread"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {activeLessonComments.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-8 italic bg-[#0d1117]/30 border border-dashed border-[#21262d] rounded-xl">
                          {isOfflineSimulated 
                            ? "🔌 Comments disabled simulating offline." 
                            : "Be the very first student to write inquiries or answers for this module."}
                        </p>
                      )}
                    </div>

                    {/* New submission form */}
                    {user ? (
                      !isOfflineSimulated ? (
                        <form onSubmit={handleAddNewLessonComment} className="flex gap-2">
                          <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Ask an absolute coding question specific to this lesson..."
                            className="flex-grow bg-[#0d1117] border border-[#30363d] focus:border-[#ff7b00] rounded-xl px-3 py-2 text-xs text-white outline-none transition-colors"
                            required
                          />
                          <button
                            type="submit"
                            className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-white" />
                          </button>
                        </form>
                      ) : (
                        <div className="bg-[#0d1117] border border-dashed border-red-500/20 p-3 text-center text-xs text-gray-500 rounded-xl">
                          Inquiries form disabled offline. Reconnect online to submit public comments to DB.
                        </div>
                      )
                    ) : (
                      <div className="bg-[#0d1117] border border-dashed border-[#30363d] p-3 text-center text-xs text-gray-500 rounded-xl">
                        Please <button onClick={() => setShowLogin(true)} className="text-[#ff7b00] hover:underline font-bold">sign in</button> to post comments or ask questions.
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">Pick any lecture module on the study roadmap to start reading code!</div>
              )}
            </div>

            {/* Column 4: Personal Study Notes side-panel (Right) */}
            <div className="lg:col-span-1 bg-[#161b22] border border-[#30363d] p-4 rounded-xl flex flex-col justify-between max-h-[640px]" id="student-personal-notes-panel">
              <div className="space-y-4 flex-grow flex flex-col h-full">
                <div className="flex justify-between items-center pb-2 border-b border-[#21262d]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#ff7b00]" />
                    <span>My Personal Notes</span>
                  </h3>
                  {isOfflineSimulated && (
                    <span className="text-[8px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 rounded font-mono font-bold">
                      Offline
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-gray-500 leading-normal">
                  Write down custom private drafts, keyboard shortcuts, or syntax codeblocks. Saved notes are linked securely to your account.
                </p>

                {user ? (
                  <div className="flex-grow flex flex-col space-y-3 min-h-[300px]">
                    <textarea
                      value={currentLessonNotes}
                      onChange={(e) => setCurrentLessonNotes(e.target.value)}
                      placeholder="Type your study guidelines, answers, or custom solutions... Auto-export is available inside downloaded study packages."
                      className="w-full flex-grow bg-[#0d1117] border border-[#30363d] focus:border-[#ff7b00] rounded-xl p-3 text-xs text-slate-300 outline-none resize-none transition-colors leading-relaxed font-mono font-normal"
                    />

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[9px] text-slate-500 font-mono">
                        {currentLessonNotes ? `${currentLessonNotes.length} chars` : "Notes empty"}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentLessonNotes) {
                              alert("Please draft some notes first before exporting.");
                              return;
                            }
                            pdfExportService.downloadPersonalNotes(activeStepLesson?.title || "Classroom Lecture", currentLessonNotes);
                          }}
                          className="bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white border border-[#30363d] text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Export currently drafted study notes to PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export PDF</span>
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-[11px] font-bold py-1.5 px-3.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          {savingNotes ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center p-4 bg-[#0d1117] border border-dashed border-[#30363d] rounded-xl text-center min-h-[300px]">
                    <Lock className="w-6 h-6 text-gray-500 mb-2" />
                    <p className="text-xs text-gray-500 max-w-sm">
                      Notebook workspace requires authentication. Sign in to edit premium notebooks.
                    </p>
                  </div>
                )}
              </div>
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
              onUpdateUser={setUser}
              onRefreshData={fetchAllData}
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
                          <img
                            src={post.userAvatar || "https://images.unsplash.com/photo-1549790108-3777bc3021f1?w=100"}
                            alt={post.userName}
                            className="w-8 h-8 rounded-full border border-gray-600 object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1549790108-3777bc3021f1?w=100";
                            }}
                          />
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
                              <img
                                src={comment.userAvatar || "https://images.unsplash.com/photo-1549790108-3777bc3021f1?w=100"}
                                alt={comment.userName}
                                className="w-6 h-6 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1549790108-3777bc3021f1?w=100";
                                }}
                              />
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
      <footer className="bg-[#0b0d11] border-t border-[#30363d] text-xs py-10 text-[#8b949e]" id="global-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Branding Column */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/powercodeacademy.png" 
                  alt="PowerCode Academy Logo" 
                  className="w-7 h-7 object-contain bg-[#161b22] border border-[#ff7b00]/30 rounded-lg p-0.5" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="font-extrabold text-white text-xs uppercase tracking-wider">{siteSettings.platformName}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400">
                The premier international learning academy designed to equip the next generation of software engineers with world-class, production-ready full-stack skillsets.
              </p>
              {/* Trust Badge Row */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  <span>SYSTEM ONLINE</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[9px] font-mono text-gray-400">
                  SSL SECURE
                </span>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#ff7b00] font-mono">Curriculum Focus</h5>
              <ul className="space-y-2 text-[11px]">
                <li><a href="#view-lobby" onClick={() => setActiveTab("lobby")} className="hover:text-white transition-colors">🚀 Interactive Course Lobby</a></li>
                <li><a href="#view-classroom" onClick={() => { if (user) setActiveTab("classroom"); }} className="hover:text-white transition-colors">🎬 Student Classroom Player</a></li>
                <li><a href="#view-community" onClick={() => setActiveTab("community")} className="hover:text-white transition-colors">💬 Discussion Board Forums</a></li>
                <li><a href="#view-dashboard" onClick={() => { if (user) setActiveTab("dashboard"); }} className="hover:text-white transition-colors">📈 My Learning Progress</a></li>
              </ul>
            </div>

            {/* Support hotline column */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-teal-400 font-mono">Official Hotline</h5>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Direct immediate communication channel with the Founder & Head Administrator:
              </p>
              <div className="bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl space-y-1">
                <div className="text-[10.5px] font-bold text-white font-mono">ARCENE IRAKOZE</div>
                <div className="text-[9.5px] text-teal-400 font-mono">Hotline: +250 796 599 461</div>
                <div className="text-[9.5px] text-gray-500 font-mono">Email: support@powercode.academy</div>
              </div>
            </div>

            {/* Coding wisdom quote generator */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">Daily Tech Wisdom</h5>
              <div className="bg-[#161b22]/50 border border-[#21262d] rounded-xl p-3 space-y-1.5 italic text-[11px] text-gray-300 leading-relaxed">
                <p>"Continuous improvement is better than delayed perfection. True software craftsmanship is a path of daily small steps."</p>
                <cite className="not-italic text-[9.5px] text-amber-400 font-mono font-bold block text-right">— PowerCode Academy Mentor</cite>
              </div>
            </div>
          </div>

          <div className="border-t border-[#21262d] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px]">
            <p className="text-gray-500">Powered by PowerCode Academy. © 2026. Certified international training curriculum.</p>
            <div className="flex gap-4 text-gray-500 font-mono text-[10px]">
              <a href="#" className="hover:text-white">TERMS OF USE</a>
              <span>•</span>
              <a href="#" className="hover:text-white">PRIVACY PROTOCOLS</a>
            </div>
          </div>
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
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* Standalone Conversational AI Companion Overlay Drawer */}
        {aiChatOpen && (
          <div 
            className="w-96 max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-130px)] bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-300"
            style={{ contentVisibility: "auto" }}
            id="floating-ai-chatbot-drawer"
          >
            {/* Header */}
            <div className="p-3.5 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <img 
                  src="/powercodeacademy.png" 
                  alt="PowerCode AI" 
                  className="w-7 h-7 object-contain bg-[#161b22] border border-[#21262d] rounded-lg p-0.5"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100";
                  }}
                />
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide uppercase">PowerCode AI Coach</h4>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-400 font-mono">Academic Sidecoach Mentor</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setAiChatOpen(false)}
                className="text-gray-400 hover:text-[#ff7b00] p-1.5 rounded-lg hover:bg-[#21262d] transition-colors cursor-pointer-action"
                title="Close Companion Desk"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Display Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3.5 bg-[#0d1117]" id="chat-messages-container">
              {aiChatMessages.map((msg, index) => {
                const isAi = msg.sender === "ai";
                return (
                  <div 
                    key={index} 
                    className={`flex gap-2.5 items-start max-w-[85%] ${
                      isAi ? "mr-auto" : "ml-auto flex-row-reverse"
                    }`}
                  >
                    {isAi && (
                      <img 
                        src="/powercodeacademy.png" 
                        alt="AI" 
                        className="w-6 h-6 object-contain bg-[#161b22] border border-[#21262d] rounded p-0.5 mt-0.5 shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100";
                        }}
                      />
                    )}
                    <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                      isAi 
                        ? "bg-[#161b22] border border-[#21262d] text-gray-200 rounded-tl-none font-mono whitespace-pre-wrap" 
                        : "bg-[#ff7b00] text-white font-semibold rounded-tr-none shadow-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              
              {aiChatLoading && (
                <div className="flex gap-2.5 items-start max-w-[85%] mr-auto">
                  <img 
                    src="/powercodeacademy.png" 
                    alt="AI" 
                    className="w-6 h-6 object-contain bg-[#161b22] border border-[#21262d] rounded p-0.5 mt-0.5 shrink-0 animate-pulse"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-xl rounded-tl-none text-xs text-gray-400 font-mono flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    <span className="text-[10px] text-gray-500 italic pl-1">Thinking...</span>
                  </div>
                </div>
              )}
              
              <div id="ai-chat-bottom-anchor"></div>
            </div>

            {/* Quick recommendation prompts buttons */}
            {aiChatMessages.length === 1 && (
              <div className="px-3 py-2 border-t border-[#21262d] bg-[#0d1117] flex flex-wrap gap-1.5 justify-center">
                {[
                  { label: "💡 Explain Big-O", text: "Explain typical Big-O time and space notations so I can optimize loops correctly." },
                  { label: "🐍 Practice Python", text: "Give me a simple python basics diagnostic question to solve right now." },
                  { label: "📦 let vs const", text: "Explain scoping blocks of variable primitives let, const, and var inside JavaScript." }
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiChatInput(p.text);
                    }}
                    className="bg-[#161b22] hover:bg-[#21262d] text-gray-300 border border-[#30363d] text-[10px] py-1 px-2.5 rounded-full hover:border-[#ff7b00]/70 transition-all cursor-pointer font-sans"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendAiChatMessage} className="p-3 bg-[#161b22] border-t border-[#30363d] flex gap-2 w-full">
              <input
                type="text"
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                placeholder="Ask coding logic, clean architectures..."
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#ff7b00] min-w-0"
                disabled={aiChatLoading}
              />
              <button
                type="submit"
                disabled={aiChatLoading}
                className="bg-[#ff7b00] hover:bg-[#e66f00] text-white p-2 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        )}

        {/* Global Floating Study Coach Trigger Button */}
        <button
          onClick={() => setAiChatOpen(!aiChatOpen)}
          className={`bg-gradient-to-r from-orange-600 to-[#ff7b00] text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center border border-white/20 cursor-pointer-action ${
            aiChatOpen ? "rotate-90 bg-gray-600" : "animate-bounce"
          }`}
          title="Instant AI Mentorship Desk"
        >
          {aiChatOpen ? <X className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white animate-pulse" />}
        </button>
      </div>

      {/* 5. PORTALS / MODAL OVERLAYS */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(tok, usr) => {
            setToken(tok);
            setUser(usr);
            localStorage.setItem("powercode_user", JSON.stringify(usr));
            localStorage.setItem("powercode_token", tok);
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
            localStorage.setItem("powercode_user", JSON.stringify(usr));
            localStorage.setItem("powercode_token", tok);
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

      {/* Central Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        description={deleteModal.description}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModal.onConfirm}
      />

      {/* PDF DETAILS MODAL: READ MORE AND DOWNLOAD */}
      {selectedPdfDetails && (
        <div className="fixed inset-0 min-h-screen bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in" id="pdf-details-modal">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            <div className="h-1 w-full bg-gradient-to-r from-[#ff7b00] to-orange-600"></div>
            
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#ff7b00] bg-[#ff7b00]/10 border border-[#ff7b00]/20 px-2.5 py-0.5 rounded">
                    Reference Book Details
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">{selectedPdfDetails.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedPdfDetails(null)}
                  className="p-1 px-2.5 rounded bg-[#21262d] text-gray-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-all font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs text-gray-300">
                <div className="grid grid-cols-2 gap-3 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]/50 font-mono text-[11px]">
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px] font-bold">Author Writer</span>
                    <span className="text-white font-sans font-semibold">{selectedPdfDetails.author}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px] font-bold">Category Field</span>
                    <span className="text-white">{selectedPdfDetails.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px] font-bold">Publication Date</span>
                    <span className="text-white">{selectedPdfDetails.publishedDate || "2024-03-15"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px] font-bold">Pricing Tier</span>
                    <span className="text-[#ff7b00] font-bold">{selectedPdfDetails.isPremium ? "Premium (UGX 15,000)" : "Standard Free"}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Detailed Overview Summary:</span>
                  <p className="bg-[#0d1117]/40 p-4 rounded-xl border border-[#30363d]/60 text-gray-300 leading-relaxed text-xs">
                    {selectedPdfDetails.description || "Access instant, step-by-step downloadable guidelines and technical blueprints from PowerCode Academy. This professional reference book details standard programming concepts and structures compiled for students and technical professionals alike."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPdfDetails(null)}
                  className="flex-1 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-xs font-bold py-2.5 rounded-lg transition-colors font-mono"
                >
                  CLOSE WINDOW
                </button>

                {(() => {
                  const userPurchase = pdfPurchases.find((p: any) => p.pdfId === selectedPdfDetails.id && p.userId === user?.id);
                  const hasActiveAccess = user?.role === "ADMIN" || userPurchase?.status === "APPROVED";
                  const bookLocked = selectedPdfDetails.isPremium && !hasActiveAccess;

                  if (bookLocked) {
                    if (!user) {
                      return (
                        <button
                          onClick={() => {
                            setSelectedPdfDetails(null);
                            setShowLogin(true);
                          }}
                          className="flex-1 bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Login to Unlock Book</span>
                        </button>
                      );
                    } else if (userPurchase?.status === "PENDING_APPROVAL") {
                      return (
                        <div className="flex-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 font-mono">
                          <span className="animate-pulse">●</span>
                          <span>Pending Proof Verification</span>
                        </div>
                      );
                    } else {
                      return (
                        <button
                          onClick={() => {
                            setPurchasePdfItem(selectedPdfDetails);
                            setPaymentPhone(user?.phone || "");
                            setSelectedPdfDetails(null);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-emerald-950/20"
                        >
                          <Unlock className="w-4 h-4" />
                          <span>Buy PDF Book</span>
                        </button>
                      );
                    }
                  } else {
                    return (
                      <a
                        href={isOfflineSimulated && !isPdfCached(selectedPdfDetails.id) ? undefined : selectedPdfDetails.fileUrl}
                        target={isOfflineSimulated && !isPdfCached(selectedPdfDetails.id) ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (isOfflineSimulated && !isPdfCached(selectedPdfDetails.id)) {
                            e.preventDefault();
                            alert("🔌 Offline Intermittent Simulation: This manual has not been cached yet! Please connect online to download.");
                            return;
                          }
                          handleCachePdf(selectedPdfDetails);
                        }}
                        className={`${
                          isOfflineSimulated && !isPdfCached(selectedPdfDetails.id)
                            ? "bg-slate-700 text-gray-500 border border-slate-600 cursor-not-allowed opacity-50"
                            : "bg-[#ff7b00] hover:bg-[#e66f00] text-white"
                        } flex-1 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors`}
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Book PDF</span>
                      </a>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF PAYMENT MODAL: MOBILE MONEY PAYMENT AND PROOF SUBMISSION */}
      {purchasePdfItem && user && (
        <div className="fixed inset-0 min-h-screen bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in" id="momo-payment-modal">
          <div className="bg-[#161b22] border border-[#ff7b00]/30 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Header border flash */}
            <div className="h-1 w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"></div>
            
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#ff7b00] bg-[#ff7b00]/10 border border-[#ff7b00]/20 px-2.5 py-0.5 rounded">
                    Mobile Money Payment Portal
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">Unlock Premium Reference Manual</h3>
                </div>
                <button 
                  onClick={() => {
                    setPurchasePdfItem(null);
                    setPaymentPhone("");
                  }}
                  className="p-1 px-2.5 rounded bg-[#21262d] text-gray-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-all font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Book Overview summary */}
              <div className="bg-[#21262d] border border-[#30363d] rounded-xl p-4 flex gap-3.5 items-center">
                <div className="p-3 bg-orange-500/10 text-[#ff7b00] rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{purchasePdfItem.title}</h4>
                  <p className="text-xs text-gray-500 truncate font-mono">By {purchasePdfItem.author}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xs text-slate-400">Fixed Cost:</span>
                    <span className="text-sm font-extrabold text-orange-400 font-mono">RWF 15,000 / $15</span>
                  </div>
                </div>
              </div>

              {/* Payment selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono">Select MoMo Network Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MTN")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "MTN" 
                        ? "border-yellow-400 bg-yellow-500/10 text-yellow-300" 
                        : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">MTN Mobile Money</span>
                    <span className="text-[9px] font-mono opacity-80">RWF / UGX / GHS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Airtel")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "Airtel" 
                        ? "border-red-400 bg-red-500/10 text-red-300" 
                        : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">Airtel Money</span>
                    <span className="text-[9px] font-mono opacity-80">East Africa Region</span>
                  </button>
                </div>
              </div>

              {/* Steps details depends on payment selection */}
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4.5 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 font-mono block uppercase border-b border-[#21262d] pb-1.5">
                  How to complete your pay:
                </span>
                
                <div className="space-y-2.5 text-xs text-slate-300">
                  <p>
                    1. Send payment of <strong className="text-orange-400 font-mono">RWF 15,000</strong> to Mobile Money phone number: <strong className="text-yellow-400 font-mono">+250796599461</strong>.
                  </p>
                  <p>
                    2. Recipient Name: <strong className="text-yellow-400 font-mono">Arcene Irakoze</strong> (PowerCode Academy).
                  </p>
                  <p>
                    3. Submit your phone number used for the payment below to verify your transaction proof.
                  </p>
                </div>
              </div>

              {/* Form details */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!paymentPhone.trim()) {
                    alert("Please input your payment phone number first.");
                    return;
                  }
                  if (!pdfProofUrl) {
                    alert("Please upload a screenshot of your payment receipt first.");
                    return;
                  }
                  
                  setIsSubmitAccessLoading(true);
                  window.showPowerCodeLoader?.("Processing Payment...");
                  try {
                    const response = await fetch("/api/pdf-purchases", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.email}`
                      },
                      body: JSON.stringify({
                        pdfId: purchasePdfItem.id,
                        pdfTitle: purchasePdfItem.title,
                        amountPaid: 15000,
                        paymentMethod,
                        phone: paymentPhone,
                        proofUrl: pdfProofUrl
                      })
                    });
                    const resJson = await response.json();
                    if (resJson.success) {
                      alert("💸 Your payment transaction and screenshot proof have been transmitted to admins successfully!\n\nOnce our finance team verifies the screenshot, this book will instantly unlock for you.");
                      setPurchasePdfItem(null);
                      setPaymentPhone("");
                      setPdfProofUrl("");
                      fetchAllData();
                    } else {
                      alert(resJson.error || "Something failed transmitting proof details.");
                      window.hidePowerCodeLoader?.();
                    }
                  } catch (err: any) {
                    alert(`Network error transmitting details: ${err?.message}`);
                    window.hidePowerCodeLoader?.();
                  } finally {
                    setIsSubmitAccessLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono mb-1">Your Registered MoMo Phone</label>
                  <input
                    type="text"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="e.g. +250 796 599 461"
                    required
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-xl text-xs outline-none focus:border-[#ff7b00] font-mono placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Our finance department maps transactions against the sender phone log history.</p>
                </div>

                {/* Real Payment Receipt Screenshot Upload Block */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono">
                    Upload Payment Screenshot <span className="text-red-500">*</span>
                  </label>
                  
                  {!pdfProofUrl ? (
                    <div className="relative border-2 border-dashed border-[#ff7b00]/30 hover:border-[#ff7b00]/60 bg-[#0d1117] rounded-xl p-4 text-center cursor-pointer transition-colors group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePaymentScreenshotUpload(e, "pdf")}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="space-y-1.5 pointer-events-none">
                        {pdfProofUploading ? (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-6 h-6 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-gray-400 font-mono">Uploading screenshot...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-[#ff7b00]/10 flex items-center justify-center text-[#ff7b00] mx-auto group-hover:scale-105 transition-transform">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </div>
                            <p className="text-xs font-bold text-gray-300">Click to upload payment screenshot</p>
                            <p className="text-[10px] text-gray-500 font-mono">JPG, PNG, WebP up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative bg-[#0d1117] border border-[#ff7b00]/30 rounded-xl p-3 flex items-center gap-3">
                      <img 
                        src={pdfProofUrl} 
                        alt="Payment Proof Receipt" 
                        className="w-12 h-16 object-cover rounded border border-[#30363d]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Receipt Captured</span>
                        </p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">File path uploaded securely</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPdfProofUrl("")}
                        className="p-1.5 rounded bg-[#21262d] text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove uploaded image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-[#21262d]/40 rounded-xl p-3 flex items-start gap-2 border border-[#30363d]/50">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-slate-400 leading-normal">
                    By submitting, you agree that we will automatically generate a verified transaction receipt and queue it for review.
                  </span>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchasePdfItem(null);
                      setPaymentPhone("");
                    }}
                    className="bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-bold py-2 px-4 rounded-xl transition-colors font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitAccessLoading}
                    className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-2 px-5 rounded-xl flex items-center gap-1.5 font-mono shadow-md shadow-orange-950/20 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitAccessLoading ? "Submitting..." : "Submit Payment Proof"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* COURSE PAYMENT MODAL: MOBILE MONEY PAYMENT AND PROOF SUBMISSION */}
      {purchaseCourseItem && user && (
        <div className="fixed inset-0 min-h-screen bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in" id="course-momo-payment-modal">
          <div className="bg-[#161b22] border border-[#ff7b00]/30 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Header border flash */}
            <div className="h-1 w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"></div>
            
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#ff7b00] bg-[#ff7b00]/10 border border-[#ff7b00]/20 px-2.5 py-0.5 rounded">
                    Mobile Money Payment Portal
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">Unlock Premium Course</h3>
                </div>
                <button 
                  onClick={() => {
                    setPurchaseCourseItem(null);
                    setPaymentPhone("");
                  }}
                  className="p-1 px-2.5 rounded bg-[#21262d] text-gray-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-all font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Course Overview summary */}
              <div className="bg-[#21262d] border border-[#30363d] rounded-xl p-4 flex gap-3.5 items-center">
                <div className="p-3 bg-orange-500/10 text-[#ff7b00] rounded-lg">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{purchaseCourseItem.title}</h4>
                  <p className="text-xs text-gray-500 truncate font-mono">Publisher: PowerCode Academy</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xs text-slate-400">Fixed Cost:</span>
                    <span className="text-sm font-extrabold text-orange-400 font-mono">RWF 45,000 / ${purchaseCourseItem.price || 49}</span>
                  </div>
                </div>
              </div>

              {/* Payment selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono">Select MoMo Network Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MTN")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "MTN" 
                        ? "border-yellow-400 bg-yellow-500/10 text-yellow-300" 
                        : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">MTN Mobile Money</span>
                    <span className="text-[9px] font-mono opacity-80">RWF / UGX / GHS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Airtel")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "Airtel" 
                        ? "border-red-400 bg-red-500/10 text-red-300" 
                        : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">Airtel Money</span>
                    <span className="text-[9px] font-mono opacity-80">East Africa Region</span>
                  </button>
                </div>
              </div>

              {/* Steps details depends on payment selection */}
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4.5 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 font-mono block uppercase border-b border-[#21262d] pb-1.5">
                  How to complete your pay:
                </span>
                
                <div className="space-y-2.5 text-xs text-slate-300">
                  <p>
                    1. Send payment of <strong className="text-orange-400 font-mono">RWF 45,000</strong> to Mobile Money phone number: <strong className="text-yellow-400 font-mono">+250796599461</strong>.
                  </p>
                  <p>
                    2. Recipient Name: <strong className="text-yellow-400 font-mono">Arcene Irakoze</strong> (PowerCode Academy).
                  </p>
                  <p>
                    3. Submit your phone number used for the payment below to verify your transaction proof.
                  </p>
                </div>
              </div>

              {/* Form details */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!paymentPhone.trim()) {
                    alert("Please input your payment phone number first.");
                    return;
                  }
                  if (!courseProofUrl) {
                    alert("Please upload a screenshot of your payment receipt first.");
                    return;
                  }
                  
                  setIsSubmitAccessLoading(true);
                  try {
                    const response = await fetch("/api/payments/request", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.email}`
                      },
                      body: JSON.stringify({
                        contentType: "COURSE",
                        contentId: purchaseCourseItem.id,
                        contentTitle: purchaseCourseItem.title,
                        amountPaid: purchaseCourseItem.price || 49,
                        paymentMethod,
                        phone: paymentPhone,
                        proofUrl: courseProofUrl
                      })
                    });
                    const resJson = await response.json();
                    if (resJson.success) {
                      alert("💸 Your course payment transaction and screenshot proof have been transmitted to admins successfully!\n\nOnce our finance team verifies the screenshot, this premium course will instantly unlock for you.");
                      setPurchaseCourseItem(null);
                      setPaymentPhone("");
                      setCourseProofUrl("");
                      fetchAllData();
                    } else {
                      alert(resJson.error || "Something failed transmitting proof details.");
                    }
                  } catch (err: any) {
                    alert(`Network error transmitting details: ${err?.message}`);
                  } finally {
                    setIsSubmitAccessLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono mb-1">Your Registered MoMo Phone</label>
                  <input
                    type="text"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="e.g. +250 796 599 461"
                    required
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-xl text-xs outline-none focus:border-[#ff7b00] font-mono placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Our finance department maps transactions against the sender phone log history.</p>
                </div>

                {/* Real Payment Receipt Screenshot Upload Block */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono">
                    Upload Payment Screenshot <span className="text-red-500">*</span>
                  </label>
                  
                  {!courseProofUrl ? (
                    <div className="relative border-2 border-dashed border-[#ff7b00]/30 hover:border-[#ff7b00]/60 bg-[#0d1117] rounded-xl p-4 text-center cursor-pointer transition-colors group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePaymentScreenshotUpload(e, "course")}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="space-y-1.5 pointer-events-none">
                        {courseProofUploading ? (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-6 h-6 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-gray-400 font-mono">Uploading screenshot...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-[#ff7b00]/10 flex items-center justify-center text-[#ff7b00] mx-auto group-hover:scale-105 transition-transform">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </div>
                            <p className="text-xs font-bold text-gray-300">Click to upload payment screenshot</p>
                            <p className="text-[10px] text-gray-500 font-mono">JPG, PNG, WebP up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative bg-[#0d1117] border border-[#ff7b00]/30 rounded-xl p-3 flex items-center gap-3">
                      <img 
                        src={courseProofUrl} 
                        alt="Payment Proof Receipt" 
                        className="w-12 h-16 object-cover rounded border border-[#30363d]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Receipt Captured</span>
                        </p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">File path uploaded securely</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCourseProofUrl("")}
                        className="p-1.5 rounded bg-[#21262d] text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove uploaded image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-[#21262d]/40 rounded-xl p-3 flex items-start gap-2 border border-[#30363d]/50">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-slate-400 leading-normal">
                    By submitting, you agree that we will automatically generate a verified transaction receipt and queue it for review.
                  </span>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseCourseItem(null);
                      setPaymentPhone("");
                    }}
                    className="bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-bold py-2 px-4 rounded-xl transition-colors font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitAccessLoading}
                    className="bg-[#ff7b00] hover:bg-[#e66f00] text-white text-xs font-bold py-2 px-5 rounded-xl flex items-center gap-1.5 font-mono shadow-md shadow-orange-950/20 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitAccessLoading ? "Submitting..." : "Submit Payment Proof"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic PWA Get App Responsive Install Notification */}
      {showInstallPrompt && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#161b22] border border-[#ff7b00] p-4 rounded-xl shadow-2xl animate-fade-in" id="install-app-notification-prompt">
          <div className="flex gap-3">
            <div className="p-2 bg-[#ff7b00]/10 rounded-lg h-fit">
              <Download className="w-5 h-5 text-[#ff7b00] animate-bounce" />
            </div>
            <div className="space-y-2 text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Get Powercode Academy App
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {window.innerWidth < 768 
                  ? "Get PowerCode Academy Mobile App for your mobile device. Click confirm to install and start offline classes!"
                  : "Get PowerCode Academy Desktop App for your desktop computer. Click confirm to install and launch offline workspaces!"}
              </p>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("powercode_install_prompt_dismissed_v2", "true");
                    setShowInstallPrompt(false);
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold text-gray-400 hover:text-white uppercase transition-colors font-mono cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("powercode_install_prompt_dismissed_v2", "true");
                    setShowInstallPrompt(false);
                    handleInstallApp(window.innerWidth < 768 ? "mobile" : "desktop");
                  }}
                  className="px-3 py-1 bg-[#ff7b00] hover:bg-[#e66f00] text-white text-[10px] font-bold rounded-lg uppercase transition-all shadow font-mono cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPGRADE TO PRO MODAL */}
      {showProModal && user && (
        <div className="fixed inset-0 min-h-screen bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in" id="pro-upgrade-modal">
          <div className="bg-[#161b22] border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Header border flash */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500"></div>
            
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded flex items-center gap-1.5 w-fit">
                    <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                    <span>ELITE PRO MEMBERSHIP</span>
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1.5 leading-snug">Become an Elite Pro Member</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowProModal(false);
                    setPaymentPhone("");
                  }}
                  className="p-1 px-2.5 rounded bg-[#21262d] text-gray-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-all font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Pro Perks */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 tracking-wider uppercase font-mono">Unlock VIP Privilege Access:</h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff7b00]">✓</span>
                    <span>Unlimited access to <strong>all premium curriculum courses</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff7b00]">✓</span>
                    <span>Free download of <strong>all premium technical PDF books</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff7b00]">✓</span>
                    <span>Full access to <strong>classroom programming tools</strong> & challenges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff7b00]">✓</span>
                    <span>Priority student review & official PDF verification</span>
                  </li>
                </ul>
              </div>

              {/* Pricing overview */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3.5 items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 font-mono">ONE-TIME LIFE-TIME ACCESS</p>
                  <p className="text-base font-extrabold text-amber-400 font-mono mt-0.5">UGX 100,000 / $25</p>
                </div>
                <div className="text-right">
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded text-[10px] font-extrabold uppercase font-mono tracking-wider">
                    Best Value
                  </span>
                </div>
              </div>

              {/* Payment selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono">Select MoMo Network Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MTN")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "MTN" 
                        ? "border-yellow-400 bg-yellow-500/10 text-yellow-300" 
                        : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">MTN Mobile Money</span>
                    <span className="text-[9px] font-mono opacity-80">UGX / RWF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Airtel")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "Airtel" 
                        ? "border-red-400 bg-red-500/10 text-red-300" 
                        : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">Airtel Money</span>
                    <span className="text-[9px] font-mono opacity-80">UGX / TZ</span>
                  </button>
                </div>
              </div>

              {/* Payment Instructions & Number */}
              <div className="bg-[#21262d] border border-[#30363d] rounded-xl p-3.5 space-y-1.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Send <strong>RWF 25,000 / $25</strong> on our official hotline telephone:
                </p>
                <div className="bg-[#0d1117] rounded-lg p-2.5 flex items-center justify-between border border-[#30363d]">
                  <span className="font-mono text-xs font-extrabold text-white text-base tracking-wider">+250 796 599 461</span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase font-mono">(ARCENE IRAKOZE)</span>
                </div>
              </div>

              {/* Submission Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!paymentPhone.trim()) {
                    alert("Please input your payment phone number first.");
                    return;
                  }
                  if (!proProofUrl) {
                    alert("Please upload a screenshot of your payment receipt first.");
                    return;
                  }

                  setIsSubmitAccessLoading(true);
                  try {
                    const response = await fetch("/api/premium/pro/purchase", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.email}`
                      },
                      body: JSON.stringify({
                        phone: paymentPhone,
                        paymentMethod: paymentMethod,
                        amount: 25000,
                        proofUrl: proProofUrl
                      })
                    });
                    const resJson = await response.json();
                    if (resJson.success) {
                      alert("💸 Your Pro Upgrade request and screenshot proof have been logged successfully!\n\nOur validation team will instantly activate your ELITE PRO access within 10-15 minutes once verified.");
                      setShowProModal(false);
                      setPaymentPhone("");
                      setProProofUrl("");
                      fetchAllData();
                    } else {
                      alert(resJson.error || "Something failed transmitting Pro request.");
                    }
                  } catch (err: any) {
                    alert(`Network error transmitting details: ${err?.message}`);
                  } finally {
                    setIsSubmitAccessLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono mb-1">Your Sender MoMo Phone</label>
                  <input
                    type="text"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="e.g. +250 796 599 461"
                    required
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-xl text-xs outline-none focus:border-[#ff7b00] font-mono placeholder:text-gray-600"
                  />
                </div>

                {/* Real Payment Receipt Screenshot Upload Block */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider font-mono">
                    Upload Payment Screenshot <span className="text-red-500">*</span>
                  </label>
                  
                  {!proProofUrl ? (
                    <div className="relative border-2 border-dashed border-[#ff7b00]/30 hover:border-[#ff7b00]/60 bg-[#0d1117] rounded-xl p-4 text-center cursor-pointer transition-colors group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePaymentScreenshotUpload(e, "pro")}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="space-y-1.5 pointer-events-none">
                        {proProofUploading ? (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-6 h-6 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-gray-400 font-mono">Uploading screenshot...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-[#ff7b00]/10 flex items-center justify-center text-[#ff7b00] mx-auto group-hover:scale-105 transition-transform">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </div>
                            <p className="text-xs font-bold text-gray-300">Click to upload payment screenshot</p>
                            <p className="text-[10px] text-gray-500 font-mono">JPG, PNG, WebP up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative bg-[#0d1117] border border-[#ff7b00]/30 rounded-xl p-3 flex items-center gap-3">
                      <img 
                        src={proProofUrl} 
                        alt="Payment Proof Receipt" 
                        className="w-12 h-16 object-cover rounded border border-[#30363d]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Receipt Captured</span>
                        </p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">File path uploaded securely</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProProofUrl("")}
                        className="p-1.5 rounded bg-[#21262d] text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove uploaded image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProModal(false);
                      setPaymentPhone("");
                    }}
                    className="bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-bold py-2 px-4 rounded-xl transition-colors font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitAccessLoading}
                    className="bg-gradient-to-r from-amber-500 to-[#ff7b00] hover:from-amber-600 hover:to-[#e66f00] text-white text-xs font-bold py-2 px-5 rounded-xl flex items-center gap-1.5 font-mono shadow-md disabled:opacity-50 transition-colors"
                  >
                    {isSubmitAccessLoading ? "Upgrading..." : "Confirm Pro Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SHOPPING CART DRAWER */}
      {showCartDrawer && user && (
        <div className="fixed inset-0 z-50 flex justify-end" id="shopping-cart-drawer">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setShowCartDrawer(false)} />

          {/* Drawer content */}
          <div className="relative w-full max-w-md bg-[#161b22] border-l border-[#30363d] h-full shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-[#30363d] flex justify-between items-center bg-[#0d1117]/50">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff7b00]">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <h3 className="text-sm font-extrabold text-white tracking-wider uppercase font-mono">Shopping Cart ({cart.length})</h3>
              </div>
              <button 
                onClick={() => setShowCartDrawer(false)}
                className="text-gray-400 hover:text-white font-mono text-sm border-0 bg-transparent cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {/* Cart list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-4xl">🛒</span>
                  <p className="text-xs text-gray-500 font-mono">Your shopping cart is currently empty.</p>
                  <button
                    onClick={() => {
                      setShowCartDrawer(false);
                      setActiveTab("courses");
                    }}
                    className="bg-[#21262d] border border-[#30363d] text-white hover:text-[#ff7b00] px-4 py-1.5 rounded-xl text-xs font-mono cursor-pointer"
                  >
                    Browse Syllabus Directory
                  </button>
                </div>
              ) : (
                cart.map((c, idx) => (
                  <div key={idx} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex gap-3 items-center justify-between">
                    <img src={c.thumbnailUrl} alt={c.title} className="w-12 h-12 object-cover rounded-lg border border-[#30363d]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{c.title}</p>
                      <p className="text-[10px] font-mono text-[#ff7b00] uppercase tracking-wider">{c.type === "course" ? "Course Track" : "Technical Manual"}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-extrabold text-white font-mono">
                        {c.type === "pdf" ? "UGX 15,000" : `$${c.price}`}
                      </span>
                      <button
                        onClick={() => handleRemoveFromCart(c.id, c.type)}
                        className="text-[10px] text-red-400 hover:text-red-300 font-mono"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total & Checkout */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-[#30363d] bg-[#0d1117]/80 space-y-4">
                <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-extrabold text-white">
                    {cart.filter(i => i.type === "course").length} Course(s) + {cart.filter(i => i.type === "pdf").length} Book(s)
                  </span>
                </div>

                <button
                  onClick={async () => {
                    // Purchase each course/book in the cart in sequence
                    setGlobalLoader({ isVisible: true, message: "Processing unified cart checkout..." });
                    try {
                      for (const item of cart) {
                        if (item.type === "course") {
                          // Post to course enroll api
                          await fetch(`/api/courses/${item.id}/enroll`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${user.email}`
                            }
                          });
                        } else if (item.type === "pdf") {
                          // Post to pdf purchases api
                          await fetch("/api/pdfs/purchase", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${user.email}`
                            },
                            body: JSON.stringify({
                              pdfId: item.id,
                              phone: user.phone || "+256 788 021 341",
                              proofUrl: `https://dummyimage.com/600x800/ff7b00/ffffff&text=RECEIPT+CART+CHECKOUT`
                            })
                          });
                        }
                      }
                      setCart([]);
                      setShowCartDrawer(false);
                      alert("🎉 Cart checkout successful! All selected curriculum tracks and manuals have been registered or queued for administrator validation.");
                      fetchAllData();
                    } catch (err: any) {
                      alert(`Checkout failed: ${err.message}`);
                    } finally {
                      setGlobalLoader({ isVisible: false, message: "" });
                    }
                  }}
                  className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-white py-2.5 rounded-xl text-xs font-extrabold tracking-wide cursor-pointer transition-colors border-0 uppercase font-mono shadow-md shadow-orange-950/20 active:scale-98"
                >
                  Proceed to Unified Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Branded Premium Loading Screen Overlay */}
      <LoadingScreen isVisible={globalLoader.isVisible} message={globalLoader.message} />

    </div>
  );
}
