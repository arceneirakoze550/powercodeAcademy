import React, { useState, useEffect } from "react";
import { Play, Sparkles, Terminal, FileCode, Save, ShieldAlert, Cpu, Check, HelpCircle, Download, Plus, Folder, Trash, Eye, Settings, Code, RefreshCw } from "lucide-react";
import Editor, { loader } from "@monaco-editor/react";

// Define global MonacoEnvironment before loading monaco to force using a Same-Origin dummy worker
// This cleanly bypasses cross-origin "Failed to execute 'importScripts'" inside sandboxed iframe environments
if (typeof window !== "undefined") {
  (window as any).MonacoEnvironment = {
    getWorker: function (moduleId: any, label: any) {
      const blobCode = `
        self.onmessage = function(e) {
          // Silent local mock worker to prevent CORS/sandbox network errors
        };
      `;
      const blob = new Blob([blobCode], { type: "application/javascript" });
      return new Worker(URL.createObjectURL(blob));
    }
  };
}

// Configure Monaco Editor Loader to use a stable, non-hashed CDN version
// This prevents cross-origin "Failed to execute 'importScripts' on 'WorkerGlobalScope'" errors in iframe sandbox environments
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs"
  }
});

import { User } from "../types";

interface IDEProps {
  user: User | null;
  geminiKeyActive: boolean;
  t: (key: string) => string;
}

interface IDEFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

const defaultFiles: IDEFile[] = [
  { id: "1", name: "main.js", language: "javascript", content: `// JavaScript Programming Workspace\n// PowerCode Academy Compiler Support\n\nfunction findPrimes(limit) {\n  let primes = [];\n  for (let i = 2; i <= limit; i++) {\n    let isPrime = true;\n    for (let j = 2; j <= Math.sqrt(i); j++) {\n      if (i % j === 0) { isPrime = false; break; }\n    }\n    if (isPrime) primes.push(i);\n  }\n  console.log("Found primes:", primes);\n  return primes;\n}\n\nfindPrimes(50);` },
  { id: "2", name: "index.html", language: "html", content: `<!-- Dynamic Web Sandbox Page -->\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>PowerCode Playground</title>\n  <style>\n    body {\n      background-color: #0b132b;\n      color: #38bdf8;\n      font-family: sans-serif;\n      text-align: center;\n      padding: 30px;\n    }\n    h1 { color: #f97316; }\n  </style>\n</head>\n<body>\n  <h1>PowerCode Academy Lives!</h1>\n  <p>Learn CSS, HTML & JS interactively with real-time renders.</p>\n</body>\n</html>` },
  { id: "3", name: "styles.css", language: "css", content: `/* Stylings definition */\nbody {\n  background-color: #0d1117;\n  color: #ffffff;\n  font-family: 'Inter', sans-serif;\n}\n\nh1 {\n  color: #ff7b00;\n  text-shadow: 0 4px 10px rgba(255, 123, 0, 0.25);\n}` },
  { id: "4", name: "app.py", language: "python", content: `# Python Sandboxed Script\n\ndef calculate_factorial(n):\n    if n == 0 or n == 1:\n        return 1\n    return n * calculate_factorial(n - 1)\n\nprint("Factorial of 5 is:")\nprint(calculate_factorial(5))` },
  { id: "5", name: "Fibonacci.ts", language: "typescript", content: `// TypeScript Static Types Sandbox\n\ninterface Stats {\n  durationMs: number;\n  values: number[];\n}\n\nfunction fibonacci(limit: number): Stats {\n  const start = Date.now(); \n  let sequence = [0, 1];\n  while (sequence[sequence.length - 1] + sequence[sequence.length - 2] <= limit) {\n    sequence.push(sequence[sequence.length - 1] + sequence[sequence.length - 2]);\n  }\n  return { durationMs: Date.now() - start, values: sequence };\n}\n\nconsole.log(fibonacci(100));` },
  { id: "6", name: "Main.java", language: "java", content: `// JVM Environment Sandbox\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("JVM program compiled perfectly.");\n        for (int i = 0; i < 5; i++) {\n            System.out.println("Step index count: " + i);\n        }\n    }\n}` },
  { id: "7", name: "main.cpp", language: "cpp", content: `// C++ Native Algorithmic Execution\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Standard C++ stream running cleanly!" << endl;\n    return 0;\n}` },
  { id: "8", name: "main.c", language: "c", content: `// Native C compiler execution\n#include <stdio.h>\n\nint main() {\n    printf("Standard Native C Executable Compiled Successfully.\\n");\n    return 0;\n}` },
  { id: "9", name: "program.cs", language: "csharp", content: `// C# Algorithmic namespace template\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("C# compiler initialized perfectly.");\n    }\n}` },
  { id: "10", name: "index.php", language: "php", content: `<?php\n// PHP Hypertext state code\necho "PHP Sandbox running on PowerCode server.\\n";\n$developer = "Arcene Irakoze";\necho "Mentor: " . $developer;\n?>` },
  { id: "11", name: "main.go", language: "go", content: `// Go concurrent memory programming\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("PowerCode Go Routine Sandbox Active.")\n}` },
  { id: "12", name: "main.rs", language: "rust", content: `// Rust safe memory compiler blocks\nfn main() {\n    println!("Rust macro compiled correctly! Memory safety holds.");\n}` },
  { id: "13", name: "main.kt", language: "kotlin", content: `// Kotlin Mobile/Serverless backend compiler\nfun main() {\n    println("Kotlin runner active. Android runtime prepared.")\n}` },
  { id: "14", name: "main.swift", language: "swift", content: `// Swift static native program code\nprint("Swift native runtime sandbox completed with status 0.")` },
  { id: "15", name: "main.rb", language: "ruby", content: `# Ruby Object-Oriented script block\nputs "Ruby version 3.2 execution active."\n5.times { |i| puts "Iteration #{i}" }` },
  { id: "16", name: "database.sql", language: "sql", content: `-- Relational Structured Queries\nCREATE TABLE students (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100),\n  streak INT\n);\n\nINSERT INTO students (name, streak) VALUES ('Kevine', 42);\n\nSELECT * FROM students WHERE streak > 10;` }
];

const supportedLangOptions = [
  { slug: "javascript", label: "JavaScript (Node/ES6)", ext: ".js" },
  { slug: "typescript", label: "TypeScript (TSX)", ext: ".ts" },
  { slug: "html", label: "HTML5 Canvas/Static", ext: ".html" },
  { slug: "css", label: "Tailwind/CSS", ext: ".css" },
  { slug: "python", label: "Python 3.10", ext: ".py" },
  { slug: "java", label: "Java 17", ext: ".java" },
  { slug: "cpp", label: "C++ (GCC)", ext: ".cpp" },
  { slug: "c", label: "C (Native)", ext: ".c" },
  { slug: "csharp", label: "C# (.NET Core)", ext: ".cs" },
  { slug: "php", label: "PHP 8.2", ext: ".php" },
  { slug: "go", label: "Go (Golang)", ext: ".go" },
  { slug: "rust", language: "rust", label: "Rust (Cargo)", ext: ".rs" },
  { slug: "kotlin", label: "Kotlin", ext: ".kt" },
  { slug: "swift", label: "Swift", ext: ".swift" },
  { slug: "ruby", label: "Ruby", ext: ".rb" },
  { slug: "sql", label: "PostgreSQL/SQL", ext: ".sql" }
];

export default function IDE({ user, geminiKeyActive, t }: IDEProps) {
  const [workspaceFiles, setWorkspaceFiles] = useState<IDEFile[]>(() => {
    const cached = localStorage.getItem("powercode_workspace_files");
    return cached ? JSON.parse(cached) : defaultFiles;
  });

  const [activeFileId, setActiveFileId] = useState<string>("1");
  const [consoleOutput, setConsoleOutput] = useState<string>("PowerCode Academy IDE Terminal Core v2.0\nClick 'Run Code' to compile your active code on Judge0 serverless API sandbox.\nAll outputs and execution details will log here.");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [ideTheme, setIdeTheme] = useState<string>("vs-dark");
  const [explorerSearch, setExplorerSearch] = useState<string>("");

  // Create new file modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>("");
  const [newFileLang, setNewFileLang] = useState<string>("javascript");

  // AI Assistant states
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("Welcome student! I am your companion Coding Assistant inside PowerCode Academy.\n\nUse the prompts below or ask any tailored coding questions, error-traces, or Big O complexity checks!");
  const [aiWorking, setAiWorking] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("powercode_workspace_files", JSON.stringify(workspaceFiles));
  }, [workspaceFiles]);

  const activeFile = workspaceFiles.find(f => f.id === activeFileId) || workspaceFiles[0];

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return;
    setWorkspaceFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: value } : f));
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    // Normalize name & extension
    let name = newFileName.trim();
    const targetOption = supportedLangOptions.find(o => o.slug === newFileLang);
    const correctExt = targetOption ? targetOption.ext : ".js";
    if (!name.endsWith(correctExt)) {
      name = name + correctExt;
    }

    const newId = (workspaceFiles.length ? Math.max(...workspaceFiles.map(f => Number(f.id))) + 1 : 1).toString();
    const createdFile: IDEFile = {
      id: newId,
      name,
      language: newFileLang,
      content: `// Dynamic sandbox code for ${name}\n// Write your scripts here\n`
    };

    setWorkspaceFiles(prev => [...prev, createdFile]);
    setActiveFileId(newId);
    setShowCreateModal(false);
    setNewFileName("");
  };

  const handleDeleteFile = (id: string, name: string) => {
    if (workspaceFiles.length <= 1) {
      alert("At least one active file must remain in your compiler workspace.");
      return;
    }
    if (confirm(`Are you sure you want to remove ${name} from your workspace?`)) {
      const filtered = workspaceFiles.filter(f => f.id !== id);
      setWorkspaceFiles(filtered);
      if (activeFileId === id) {
        setActiveFileId(filtered[0].id);
      }
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveWorkspaceLocally = () => {
    localStorage.setItem("powercode_workspace_files", JSON.stringify(workspaceFiles));
    alert("🙌 Your complete developer sandbox has been saved securely to local storage!");
  };

  const handleRunCode = async () => {
    if (!user) {
      setConsoleOutput("🔒 Error: Please Sign In first to execute code inside the remote Judge0 sandbox.");
      return;
    }

    setIsCompiling(true);
    setConsoleOutput(`[SYSTEM] Syncing active script ${activeFile.name}... \n[SYSTEM] Transpiling ${activeFile.language} package rules...\n[SYSTEM] Communicating parameters with Judge0 execution engine...`);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language
        })
      });

      const data = await res.json();
      if (data.success) {
        setConsoleOutput(`[JUDGE0 SANDBOX EXECUTIVE RESPONSE]\n\n${data.output}\n\n-- Finished successfully --`);
      } else {
        setConsoleOutput(`❌ compilation syntax exception:\n\n${data.output}`);
      }
    } catch (err: any) {
      setConsoleOutput(`❌ sandbox execution connector crash: ${err.message || err}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const assistCodeAi = async (promptType: string, customInstruction?: string) => {
    setAiWorking(true);
    setAiResponse("PowerCode AI Engine loading parameters... Reading current file references.");

    const finalQuery = customInstruction || 
      (promptType === "EXPLAIN" ? "Please fully explain what this active code does, detailing the algorithms, data elements and logical loops." :
       promptType === "DEBUG" ? "Please inspect this code for security vulnerabilities, syntax issues, formatting bugs and fix them precisely." :
       promptType === "OPTIMIZE" ? "Please optimize the Time and Space constraints of this file and explain the updated Big-O complexity." :
       "Help me learn this language concept and advise professional best practices.");

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": user ? `Bearer ${user.email}` : "Guest"
        },
        body: JSON.stringify({
          message: finalQuery,
          codeContext: activeFile.content,
          language: activeFile.language
        })
      });

      const data = await res.json();
      if (data.error) {
        setAiResponse(`⚠️ AI model error: ${data.error}`);
      } else {
        setAiResponse(data.response);
      }
    } catch (err: any) {
      setAiResponse(`⚠️ AI network pipeline interrupted: ${err.message || err}`);
    } finally {
      setAiWorking(false);
    }
  };

  const handleTranslateCode = async (targetLang: string) => {
    assistCodeAi("TRANSLATE", `Please translate the active code directly into the equivalent source code for the following programming language: ${targetLang}. Ensure proper syntax rules, standard libraries, and add comments highlighting key native structure shifts.`);
  };

  const filteredFiles = workspaceFiles.filter(f => f.name.toLowerCase().includes(explorerSearch.toLowerCase()));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 bg-[#0d1117] p-4 rounded-2xl border border-[#30363d] shadow-2xl relative font-sans" id="powercode-compiler-IDE">
      
      {/* COLUMN 1: WORKSPACE FILE EXPLORER */}
      <div className="xl:col-span-1 bg-[#161b22] rounded-xl border border-[#30363d] p-4 flex flex-col justify-between h-[640px]">
        <div>
          {/* Header explorer */}
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Folder className="w-4 h-4 text-[#ff7b00]" />
              <span>FILE EXPLORER</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#ff7b00]/10 hover:bg-[#ff7b00]/20 text-[#ff7b00] border border-[#ff7b00]/30 rounded-lg p-1.5 transition-all"
              title="Create New File"
              id="ide-create-file-trigger"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search file bar */}
          <input
            type="text"
            value={explorerSearch}
            onChange={(e) => setExplorerSearch(e.target.value)}
            placeholder="Search workspace..."
            className="w-full bg-[#0d1117] border border-[#30363d] text-xs py-1.5 px-3 rounded-lg text-white mb-4 outline-none focus:border-[#ff7b00] font-sans"
            id="explorer-search-input"
          />

          {/* Files container */}
          <div className="space-y-1 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin">
            {filteredFiles.map((file) => {
              const active = activeFileId === file.id;
              return (
                <div
                  key={file.id}
                  className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all text-left font-mono text-xs ${
                    active
                      ? "bg-[#ff7b00]/10 border-[#ff7b00]/30 text-white font-bold"
                      : "bg-[#0d1117] border-transparent text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]"
                  }`}
                >
                  <button
                    onClick={() => setActiveFileId(file.id)}
                    className="flex-1 flex items-center gap-2 truncate text-left"
                    id={`active-file-trigger-${file.id}`}
                  >
                    <FileCode className={`w-4 h-4 shrink-0 ${active ? "text-[#ff7b00]" : "text-gray-500"}`} />
                    <span className="truncate">{file.name}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteFile(file.id, file.name)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 bg-red-500/10 rounded transition-all"
                    title="Delete File"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            {filteredFiles.length === 0 && (
              <p className="text-[11px] text-gray-500 text-center py-6">No matching files found</p>
            )}
          </div>
        </div>

        {/* Global IDE Config Controls */}
        <div className="pt-4 border-t border-[#30363d] space-y-3.5">
          <div className="flex items-center justify-between text-xs text-[#8b949e]">
            <span className="flex items-center gap-1">
              <Settings className="w-3.5 h-3.5 text-[#ff7b00]" />
              Editor Theme:
            </span>
            <select
              value={ideTheme}
              onChange={(e) => setIdeTheme(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] px-2 py-1 rounded text-[11px] text-[#c9d1d9] outline-none"
            >
              <option value="vs-dark">Monaco Dark</option>
              <option value="light">Monaco Light</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSaveWorkspaceLocally}
              className="w-full bg-[#30363d] hover:bg-[#ff7b00]/10 hover:text-[#ff7b00] hover:border-[#ff7b00]/30 border border-[#30363d] text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Code</span>
            </button>
            <button
              onClick={handleDownloadFile}
              className="w-full bg-[#1f2937] hover:bg-gray-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border border-[#30363d]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* COLUMN 2 & 3: MAIN EDITOR & SANDBOX TERMINAL CONSOLE */}
      <div className="xl:col-span-2 flex flex-col gap-4 h-[640px]">
        
        {/* Monaco Editor Component Box */}
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden flex flex-col flex-1">
          {/* Header bar */}
          <div className="bg-[#0d1117] px-4 py-2 border-b border-[#30363d] flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff7b00] animate-pulse" />
              <span className="font-mono text-white text-[12px]">{activeFile.name}</span>
              <span className="text-[10px] text-gray-500 bg-[#21262d] px-2 py-0.5 rounded uppercase font-bold">
                {activeFile.language}
              </span>
            </div>

            <button
              onClick={handleRunCode}
              disabled={isCompiling}
              className="bg-[#2ea043] hover:bg-[#2c974b] text-white font-bold py-1 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 text-xs"
              id="sandbox-run-trigger"
            >
              {isCompiling ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isCompiling ? "Compiling..." : "Run Code"}</span>
            </button>
          </div>

          {/* Actual Monaco Editor Instance */}
          <div className="flex-1 w-full relative" id="monaco-canvas-container">
            <Editor
              height="100%"
              language={activeFile.language}
              theme={ideTheme}
              value={activeFile.content}
              onChange={handleEditorChange}
              loading={<div className="text-xs text-orange-500 font-mono flex items-center justify-center h-full gap-2">Loading advanced Monaco text assets...</div>}
              options={{
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                minimap: { enabled: false },
                scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                automaticLayout: true,
                cursorBlinking: "blink",
                cursorSmoothCaretAnimation: "on",
                suggestOnTriggerCharacters: true,
                tabSize: 2,
                wordWrap: "on"
              }}
            />
          </div>
        </div>

        {/* Sandboxed Compilation output console */}
        <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4 h-[180px] flex flex-col font-mono relative">
          <div className="flex justify-between items-center border-b border-[#21262d] pb-2 mb-2">
            <div className="flex items-center gap-2 text-xs text-[#8b949e] font-bold tracking-wider uppercase">
              <Terminal className="w-3.5 h-3.5 text-[#ff7b00]" />
              <span>Compilation Terminal Outputs</span>
            </div>
            {isCompiling && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto text-xs text-[#58a6ff] whitespace-pre-wrap leading-relaxed pr-1 select-text scrollbar-thin font-mono max-h-[120px]">
            {consoleOutput}
          </div>
        </div>

      </div>

      {/* COLUMN 4: POWERCODE AI STUDY SIDECOACH */}
      <div className="xl:col-span-1 bg-[#161b22] rounded-xl border border-[#30363d] p-4 flex flex-col justify-between h-[640px]" id="ide-ai-instructor">
        
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Title */}
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-[#ff7b00]" />
              <span>AI CODING ASSISTANT</span>
            </div>
            {geminiKeyActive ? (
              <span className="text-[9px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                Online
              </span>
            ) : (
              <span className="text-[9px] bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                Fallback Active
              </span>
            )}
          </div>

          {/* AI Response Output Console Area */}
          <div className="flex-1 overflow-y-auto text-xs space-y-3 mb-4 pr-1 text-[#c9d1d9] scrollbar-thin">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 space-y-2 select-text leading-relaxed font-mono text-[11px]">
              {aiResponse}
            </div>

            {/* Quick Helper presets */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Interactive presets:</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => assistCodeAi("EXPLAIN")}
                  disabled={aiWorking}
                  className="bg-[#0d1117] border border-[#30363d] hover:border-[#ff7b00] rounded-lg p-2 text-left hover:text-white transition-all text-[10px] flex flex-col justify-between disabled:opacity-40"
                >
                  <span className="font-bold text-[#ff7b00]">💡 Explain Code</span>
                  <span className="text-gray-500 text-[9px] mt-0.5">Demystify loops & algorithms</span>
                </button>
                <button
                  onClick={() => assistCodeAi("DEBUG")}
                  disabled={aiWorking}
                  className="bg-[#0d1117] border border-[#30363d] hover:border-[#ff7b00] rounded-lg p-2 text-left hover:text-white transition-all text-[10px] flex flex-col justify-between disabled:opacity-40"
                >
                  <span className="font-bold text-[#ff7b00]">🔍 Debug Logic</span>
                  <span className="text-gray-500 text-[9px] mt-0.5">Diagnose & solve issues</span>
                </button>
                <button
                  onClick={() => assistCodeAi("OPTIMIZE")}
                  disabled={aiWorking}
                  className="bg-[#0d1117] border border-[#30363d] hover:border-[#ff7b00] rounded-lg p-2 text-left hover:text-white transition-all text-[10px] flex flex-col justify-between disabled:opacity-40"
                >
                  <span className="font-bold text-[#ff7b00]">⏱️ Complexity Big-O</span>
                  <span className="text-gray-500 text-[9px] mt-0.5">Optimize Time/Space logs</span>
                </button>
                <button
                  onClick={() => assistCodeAi("LEARN", "Explain the core architectural philosophy, benefits, and standard practices of programming in this active language.")}
                  disabled={aiWorking}
                  className="bg-[#0d1117] border border-[#30363d] hover:border-[#ff7b00] rounded-lg p-2 text-left hover:text-white transition-all text-[10px] flex flex-col justify-between disabled:opacity-40"
                >
                  <span className="font-bold text-[#ff7b00]">🎓 Learn Concepts</span>
                  <span className="text-gray-500 text-[9px] mt-0.5">Best practices guide</span>
                </button>
              </div>
            </div>

            {/* Translate code languages drop-down */}
            <div className="pt-2 border-t border-[#30363d] mt-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Convert Code to Language:</span>
              <div className="flex flex-wrap gap-1">
                {["Python", "TypeScript", "C++", "Java", "Rust", "Swift", "Go"].map((l) => (
                  <button
                    key={l}
                    onClick={() => handleTranslateCode(l)}
                    disabled={aiWorking}
                    className="bg-[#0d1117] border border-[#30363d] hover:border-[#ff7b00] text-gray-300 hover:text-white px-2 py-0.5 rounded text-[10px] transition-colors"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Ask Prompt Box */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (aiPrompt.trim()) { assistCodeAi("CUSTOM", aiPrompt.trim()); setAiPrompt(""); } }}
          className="flex gap-1.5 border-t border-[#30363d] pt-3"
        >
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Type custom assistant query..."
            className="flex-1 bg-[#0d1117] border border-[#30363d] text-white py-2 px-3 rounded-xl text-xs outline-none focus:border-[#ff7b00] font-sans"
            id="instructor-ai-prompt"
          />
          <button
            type="submit"
            disabled={aiWorking || !aiPrompt.trim()}
            className="bg-[#ff7b00] hover:bg-[#e66f00] text-white px-3 py-2 rounded-xl transition-colors shrink-0 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* CREATE FILE MODAL (OVERLAY) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl max-w-sm w-full shadow-2xl relative">
            <h3 className="text-white font-bold text-base mb-3 flex items-center gap-2">
              <FileCode className="text-[#ff7b00] w-5 h-5" />
              <span>Create New File</span>
            </h3>

            <form onSubmit={handleCreateFile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-bold">File Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. calculator"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-sm text-white outline-none focus:border-[#ff7b00]"
                  id="target-create-filename-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-bold">Programming Language:</label>
                <select
                  value={newFileLang}
                  onChange={(e) => setNewFileLang(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-sm text-white outline-none"
                >
                  {supportedLangOptions.map((o) => (
                    <option key={o.slug} value={o.slug}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-[#30363d] hover:bg-gray-700 text-[#c9d1d9] px-4 py-1.5 rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#ff7b00] hover:bg-[#e66f00] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
