import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Code, Terminal, Cpu, Globe, Database, Sparkles, BookOpen } from "lucide-react";

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  bgGradient: string;
  borderColor: string;
  accentColor: string;
  icon: React.ReactNode;
  codeSnippet: string;
  language: string;
  features: string[];
  illustration: React.ReactNode;
}

export default function HomeSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const slides: SlideData[] = [
    {
      id: 1,
      title: "Python Data Science & AI Systems",
      subtitle: "Learn Python from variables to neural networks. Build algorithms, automated scripts, and interactive tools.",
      badge: "Most Popular",
      bgGradient: "from-blue-600/10 via-indigo-600/5 to-transparent",
      borderColor: "border-blue-500/30",
      accentColor: "text-blue-400",
      icon: <Cpu className="w-5 h-5 text-blue-400" />,
      language: "python",
      codeSnippet: `import tensorflow as tf\n\n# Create neural network\nmodel = tf.keras.Sequential([\n    tf.keras.layers.Dense(128, activation='relu'),\n    tf.keras.layers.Dense(10, activation='softmax')\n])\n\nmodel.compile(optimizer='adam', loss='sparse')\nprint("🤖 AI Training Loop Initiated!")`,
      features: ["Object Oriented Python", "Neural Network Blueprints", "Data Science & Pandas Arrays", "Automation Scripts"],
      illustration: (
        <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            </div>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">python_ai_agent.py</span>
          </div>
          <div className="flex-1 py-4 font-mono text-xs leading-relaxed space-y-2 text-slate-300">
            <p className="text-gray-500"># Model definition and metrics</p>
            <p><span className="text-[#ff7b00]">def</span> <span className="text-blue-400">train_neural_model</span>():</p>
            <p className="pl-4">epochs = <span className="text-[#ff7b00]">100</span></p>
            <p className="pl-4">accuracy = <span className="text-emerald-400">0.985</span></p>
            <p className="pl-4 text-emerald-400">print(f"Metrics: &#123;accuracy*100&#125;% Accuracy")</p>
          </div>
          <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between mt-auto">
            <span className="text-[11px] font-mono text-blue-300 font-bold">Status: Online</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[10px] text-gray-400 font-mono">Epoch 100/100</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "HTML5 & CSS3 Responsive Engineering",
      subtitle: "Construct highly optimized, elegant web layouts, modern typography, grid architectures, and flex systems.",
      badge: "Core Web Stack",
      bgGradient: "from-orange-600/10 via-amber-600/5 to-transparent",
      borderColor: "border-orange-500/30",
      accentColor: "text-orange-400",
      icon: <Globe className="w-5 h-5 text-orange-400" />,
      language: "html",
      codeSnippet: `<div className="grid grid-cols-3 gap-6">\n  <header className="col-span-3 bg-slate-900">\n    <h1 className="text-4xl text-orange-400">PowerCode</h1>\n  </header>\n  <main className="col-span-2 p-6 font-sans">...</main>\n</div>`,
      features: ["Semantic Document Structure", "Tailwind Fluid Layouts", "Flexbox & CSS Grid Mastery", "CSS Transitions & Keyframes"],
      illustration: (
        <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Browser Sandbox</span>
            </div>
            <span className="text-[9.5px] font-mono text-emerald-400">LIVE PREVIEW</span>
          </div>
          {/* Canvas Preview Mockup */}
          <div className="flex-1 py-4 flex flex-col justify-center">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3 shadow-inner">
              <div className="h-4 w-1/3 bg-[#30363d] rounded-md animate-pulse" />
              <div className="h-8 w-full bg-gradient-to-r from-orange-500/20 to-amber-500/10 border border-orange-500/30 rounded-lg flex items-center justify-center">
                <span className="text-[10px] font-mono text-orange-400 font-bold">GRID CONTAINER • RESPONSIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-6 bg-[#21262d] border border-[#30363d] rounded-md flex items-center justify-center text-[9px] text-gray-400 font-mono">Col 1</div>
                <div className="h-6 bg-[#21262d] border border-[#30363d] rounded-md flex items-center justify-center text-[9px] text-gray-400 font-mono">Col 2</div>
                <div className="h-6 bg-[#21262d] border border-[#30363d] rounded-md flex items-center justify-center text-[9px] text-gray-400 font-mono">Col 3</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Interactive JavaScript Applications",
      subtitle: "Unleash client-side interactions, high-speed functions, object state manipulation, events, and dynamic DOM engines.",
      badge: "Dynamic Logic",
      bgGradient: "from-yellow-600/10 via-amber-600/5 to-transparent",
      borderColor: "border-yellow-500/30",
      accentColor: "text-yellow-400",
      icon: <Code className="w-5 h-5 text-yellow-400" />,
      language: "javascript",
      codeSnippet: `const calculateMetrics = (data) => {\n  return data\n    .filter(item => item.completed)\n    .reduce((acc, curr) => acc + curr.score, 0);\n};\n\nconsole.log(calculateMetrics(studentData));`,
      features: ["Asynchronous Promises & Fetch", "Functional Programming", "State Store Management", "Custom Event Loops"],
      illustration: (
        <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff7b00]" />
              <span className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">interactive_state.js</span>
            </div>
            <span className="text-[9px] font-mono text-gray-500">EVENT_EMITTER</span>
          </div>
          <div className="flex-1 py-4 font-mono text-xs leading-relaxed space-y-1.5 text-slate-300">
            <p className="text-gray-500">// Dynamic reactive tracker</p>
            <p><span className="text-yellow-400">window</span>.addEventListener(<span className="text-[#ff7b00]">"click"</span>, () {"=>"} &#123;</p>
            <p className="pl-4">const sound = <span className="text-orange-400">new Audio()</span>;</p>
            <p className="pl-4 text-emerald-400">triggerDynamicUIUpdate();</p>
            <p>&#125;);</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center animate-bounce text-[#0d1117] font-bold text-[10px]">JS</div>
            <span className="text-[10px] font-mono text-yellow-300">Reactive Click Event Listener Loaded!</span>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Node.js Scale Backend Architecture",
      subtitle: "Deconstruct routing engines, Express APIs, request validation, middleware flows, and complete database integrations.",
      badge: "Server Side",
      bgGradient: "from-green-600/10 via-emerald-600/5 to-transparent",
      borderColor: "border-green-500/30",
      accentColor: "text-green-400",
      icon: <Terminal className="w-5 h-5 text-green-400" />,
      language: "javascript",
      codeSnippet: `import express from "express";\nconst app = express();\n\napp.get("/api/v1/students", (req, res) => {\n  res.json({ status: "active", count: 1420 });\n});\n\napp.listen(3000, () => console.log("🚀 Server Ready"));`,
      features: ["Scalable Express Routing", "Middleware Architecture", "JWT Token Authentication", "RESTful API Integration"],
      illustration: (
        <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">production_server.ts</span>
            </div>
            <span className="text-[9.5px] font-mono text-green-400 font-bold">PORT: 3000</span>
          </div>
          <div className="flex-1 py-4 font-mono text-[10.5px] leading-relaxed space-y-1.5 text-slate-300">
            <p className="text-gray-500">[INFO] - Server listening on port 3000</p>
            <p className="text-emerald-400">[GET] /api/v1/courses - 200 OK (24ms)</p>
            <p className="text-blue-400">[POST] /api/v1/payment/submit - 201 CREATED (122ms)</p>
            <p className="text-amber-400">[SOCKET] Client joined: user_session_88b</p>
          </div>
          <div className="bg-emerald-950/20 border border-green-500/20 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-mono text-green-300">Cluster Status: Healthy & Load Balanced</span>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Relational Database & Schema Design",
      subtitle: "Learn tables structure, database migration, index optimization, complex joins, and secure persistent transactions.",
      badge: "Database Stack",
      bgGradient: "from-purple-600/10 via-purple-600/5 to-transparent",
      borderColor: "border-purple-500/30",
      accentColor: "text-purple-400",
      icon: <Database className="w-5 h-5 text-purple-400" />,
      language: "sql",
      codeSnippet: `CREATE TABLE students (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE,\n  is_enrolled BOOLEAN DEFAULT TRUE\n);`,
      features: ["PostgreSQL & Relational Queries", "Index Performance Tuning", "Drizzle ORM Integrations", "Database Backup Strategies"],
      illustration: (
        <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">database_schema.sql</span>
            </div>
            <span className="text-[9.5px] font-mono text-purple-400">POSTGRESQL</span>
          </div>
          <div className="flex-1 py-4 space-y-3">
            {/* Mock Schema Table */}
            <div className="border border-[#30363d] rounded-lg overflow-hidden font-mono text-[9px]">
              <div className="bg-[#161b22] px-2 py-1 text-slate-400 border-b border-[#30363d] flex justify-between">
                <span>Field</span>
                <span>Type</span>
              </div>
              <div className="px-2 py-0.5 text-slate-200 flex justify-between">
                <span className="font-bold text-purple-300">id 🔑</span>
                <span>SERIAL (PK)</span>
              </div>
              <div className="px-2 py-0.5 text-slate-300 flex justify-between border-t border-[#21262d]">
                <span>email</span>
                <span>VARCHAR(255)</span>
              </div>
              <div className="px-2 py-0.5 text-slate-300 flex justify-between border-t border-[#21262d]">
                <span>completed_mods</span>
                <span>INTEGER</span>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-[10px] font-mono text-purple-300 font-bold">Migration Sync Complete</span>
            <span className="text-[9px] text-gray-400 font-mono">1.2ms latency</span>
          </div>
        </div>
      )
    }
  ];

  // Auto scroll effect
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHovered, slides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const activeSlide = slides[currentSlide];

  return (
    <section 
      className="max-w-6xl mx-auto px-4 py-8 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id="homepage-interactive-slider"
    >
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none px-2 z-10">
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-[#161b22]/90 hover:bg-[#ff7b00] border border-[#30363d] hover:border-[#ff7b00] text-gray-400 hover:text-white flex items-center justify-center transition-all pointer-events-auto active:scale-95 cursor-pointer shadow-lg hover:shadow-[#ff7b00]/25"
          title="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-[#161b22]/90 hover:bg-[#ff7b00] border border-[#30363d] hover:border-[#ff7b00] text-gray-400 hover:text-white flex items-center justify-center transition-all pointer-events-auto active:scale-95 cursor-pointer shadow-lg hover:shadow-[#ff7b00]/25"
          title="Next Slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className={`relative rounded-3xl border border-[#30363d] bg-gradient-to-br ${activeSlide.bgGradient} p-6 lg:p-10 transition-all duration-700 overflow-hidden shadow-2xl`}>
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#ff7b00]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Slide Text Content */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <span className="text-[9.5px] uppercase font-mono tracking-widest font-extrabold text-[#ff7b00] bg-[#ff7b00]/10 px-3 py-1.5 rounded-lg border border-[#ff7b00]/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#ff7b00] animate-pulse" />
                {activeSlide.badge}
              </span>
              <span className="text-[10px] font-mono text-gray-400 bg-[#21262d]/50 px-2.5 py-1.5 rounded-lg border border-[#30363d] flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Live Curriculum
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl lg:text-3.5xl font-extrabold text-white tracking-tight leading-tight flex items-center gap-2.5">
                {activeSlide.icon}
                {activeSlide.title}
              </h2>
              <p className="text-slate-300 text-xs lg:text-sm leading-relaxed max-w-xl">
                {activeSlide.subtitle}
              </p>
            </div>

            {/* Checkpoints features list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {activeSlide.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff7b00]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* Micro Code block */}
            <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3.5 mt-2 font-mono text-[10.5px] leading-relaxed text-slate-300 relative shadow-inner">
              <div className="absolute top-2 right-3.5 text-[8.5px] font-mono text-gray-500 uppercase tracking-wider">{activeSlide.language} preview</div>
              <pre className="overflow-x-auto whitespace-pre">{activeSlide.codeSnippet}</pre>
            </div>
          </div>

          {/* Slide Visual Graphic */}
          <div className="lg:col-span-5 flex items-center justify-center w-full">
            <div className="w-full max-w-sm transform hover:rotate-1 hover:scale-[1.02] transition-all duration-300">
              {activeSlide.illustration}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Page Bullets */}
      <div className="flex justify-center gap-2.5 mt-6 relative z-10">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlide(idx)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              idx === currentSlide ? "w-8 bg-[#ff7b00]" : "w-2 bg-[#21262d] hover:bg-[#ff7b00]/40"
            }`}
            title={`Go to Slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
