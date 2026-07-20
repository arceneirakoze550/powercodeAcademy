import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Code, Terminal, Cpu, Globe, Database, Sparkles, BookOpen, Layers, ArrowRight, Play, Server, HelpCircle, CheckCircle } from "lucide-react";

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
  codeIllustration: React.ReactNode;
  visualIllustration: React.ReactNode;
}

export default function HomeSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");

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
      codeIllustration: (
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
      ),
      visualIllustration: (
        <div className="w-full h-full min-h-[230px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-blue-500/5 opacity-40 pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-[10px] text-slate-400 font-mono">
            <span>Visual Concept: Machine Learning Pipeline</span>
            <span className="text-blue-400 font-bold">STEP-BY-STEP</span>
          </div>

          {/* Diagram */}
          <div className="flex-1 py-4 flex flex-col justify-center space-y-3.5 relative z-10">
            <div className="flex items-center justify-between text-center">
              {/* Box 1 */}
              <div className="flex flex-col items-center w-[28%]">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-[10px] font-semibold text-slate-200 mt-1.5">Raw Data</span>
                <span className="text-[8px] text-gray-500 font-mono">CSV / JSON</span>
              </div>

              {/* Arrow 1 */}
              <div className="flex-1 flex flex-col items-center relative">
                <div className="w-full h-[2px] bg-blue-500/30 relative">
                  <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 bg-blue-400 rounded-full animate-ping left-[40%]" />
                </div>
                <span className="text-[7.5px] text-blue-400 font-mono mt-1">Pandas.Fit</span>
              </div>

              {/* Box 2 */}
              <div className="flex flex-col items-center w-[30%]">
                <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-center shadow-lg animate-pulse">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-[10px] font-semibold text-blue-300 mt-1.5">Model Layers</span>
                <span className="text-[8px] text-[#ff7b00] font-mono">TensorFlow</span>
              </div>

              {/* Arrow 2 */}
              <div className="flex-1 flex flex-col items-center relative">
                <div className="w-full h-[2px] bg-blue-500/30 relative">
                  <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 bg-blue-400 rounded-full animate-ping left-[60%]" />
                </div>
                <span className="text-[7.5px] text-blue-400 font-mono mt-1">Predict</span>
              </div>

              {/* Box 3 */}
              <div className="flex flex-col items-center w-[28%]">
                <div className="w-10 h-10 rounded-xl bg-[#161b22] border border-[#ff7b00]/30 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-[#ff7b00]" />
                </div>
                <span className="text-[10px] font-semibold text-slate-200 mt-1.5">Predictions</span>
                <span className="text-[8px] text-emerald-400 font-mono">98% Accuracy</span>
              </div>
            </div>

            {/* Metrics Footer panel */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-2.5 flex items-center justify-between text-[9px] font-mono">
              <span className="text-gray-400">Loss: <span className="text-red-400 font-bold">0.024</span></span>
              <span className="text-gray-400">Weights: <span className="text-blue-400 font-bold">24,512</span></span>
              <span className="text-emerald-400 font-bold">✓ Ready for Deploy</span>
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
      codeIllustration: (
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
      ),
      visualIllustration: (
        <div className="w-full h-full min-h-[230px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-orange-500/5 opacity-40 pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-[10px] text-slate-400 font-mono">
            <span>Visual Concept: CSS Box Model Hierarchy</span>
            <span className="text-orange-400 font-bold">INTERACTIVE</span>
          </div>

          {/* Diagram */}
          <div className="flex-1 py-4 flex flex-col justify-center items-center">
            {/* Box Model visual nesting */}
            <div className="w-full max-w-[240px] border border-orange-500/30 bg-orange-500/5 rounded-xl p-2.5 relative flex flex-col items-center">
              <span className="absolute top-1 left-2 text-[7px] text-orange-400 font-mono uppercase font-bold">Margin (Outer)</span>
              
              <div className="w-full border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-2.5 relative flex flex-col items-center">
                <span className="absolute top-0.5 left-2 text-[7px] text-yellow-400 font-mono uppercase font-bold">Border</span>
                
                <div className="w-full border border-teal-500/30 bg-teal-500/5 rounded-md p-2.5 relative flex flex-col items-center">
                  <span className="absolute top-0.5 left-2 text-[7px] text-teal-400 font-mono uppercase font-bold">Padding</span>
                  
                  <div className="w-full bg-[#161b22] border border-[#30363d] rounded py-2 text-center text-[10px] font-mono text-slate-200 font-bold">
                    &lt;div&gt; Content &lt;/div&gt;
                  </div>
                </div>
              </div>
            </div>

            {/* Quick explanatory banner */}
            <div className="w-full grid grid-cols-3 gap-2 text-center text-[8px] font-mono mt-3.5 pt-2 border-t border-[#21262d] text-gray-400">
              <div>
                <span className="text-orange-400 font-bold block">Margin</span>
                Spacing around Box
              </div>
              <div>
                <span className="text-yellow-400 font-bold block">Border</span>
                Outer frame width
              </div>
              <div>
                <span className="text-teal-400 font-bold block">Padding</span>
                Internal breathing air
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
      codeIllustration: (
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
      ),
      visualIllustration: (
        <div className="w-full h-full min-h-[230px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-yellow-500/5 opacity-40 pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-[10px] text-slate-400 font-mono">
            <span>Visual Concept: JavaScript Single-Threaded Runtime</span>
            <span className="text-yellow-400 font-bold">EVENT LOOP</span>
          </div>

          {/* Diagram */}
          <div className="flex-1 py-3 flex flex-col justify-center space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Stack Block */}
              <div className="bg-[#161b22] border border-[#30363d] p-2 rounded-xl">
                <span className="text-[8px] font-mono text-yellow-400 uppercase tracking-wider block mb-1 font-bold">1. Call Stack</span>
                <div className="space-y-1 font-mono text-[8px]">
                  <div className="bg-yellow-950/40 border border-yellow-500/30 p-1 rounded text-yellow-300 text-center font-bold">renderApp()</div>
                  <div className="bg-slate-800 p-1 rounded text-slate-300 text-center">fetchData()</div>
                  <div className="bg-slate-800 p-1 rounded text-slate-400 text-center text-gray-500">global_init()</div>
                </div>
              </div>

              {/* Web APIs block */}
              <div className="bg-[#161b22] border border-[#30363d] p-2 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-mono text-orange-400 uppercase tracking-wider block mb-1 font-bold">2. Web APIs (Async)</span>
                  <div className="space-y-1 font-mono text-[8px]">
                    <div className="bg-orange-950/20 border border-orange-500/20 p-1 rounded text-orange-300 flex justify-between">
                      <span>setTimeout</span>
                      <span className="text-gray-500">200ms</span>
                    </div>
                    <div className="bg-slate-800 p-1 rounded text-slate-400 flex justify-between">
                      <span>Fetch()</span>
                      <span className="text-emerald-400">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loop indicator and Queue */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-2.5 flex items-center justify-between gap-4">
              {/* Event loop rotating symbol */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#ff7b00] animate-spin flex items-center justify-center font-bold font-mono text-[8.5px] text-[#ff7b00]">
                  ↻
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[8.5px] font-mono font-bold text-slate-200 leading-none">Event Loop</span>
                  <span className="text-[7.5px] text-gray-500 font-mono mt-0.5">Pushing Callbacks</span>
                </div>
              </div>

              {/* Callback Queue preview */}
              <div className="flex-1 flex items-center gap-1 bg-[#0d1117] border border-[#30363d] p-1.5 rounded-lg overflow-hidden">
                <span className="text-[7.5px] text-gray-500 font-mono uppercase rotate-180 select-none [writing-mode:vertical-lr]">QUEUE</span>
                <div className="h-5 bg-yellow-950/20 border border-yellow-500/30 text-yellow-400 px-1.5 rounded text-[8px] font-mono flex items-center shrink-0">
                  onClickCallback()
                </div>
                <div className="h-5 bg-slate-800 text-slate-400 px-1.5 rounded text-[8px] font-mono flex items-center shrink-0">
                  onTimerTick()
                </div>
              </div>
            </div>
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
      codeIllustration: (
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
      ),
      visualIllustration: (
        <div className="w-full h-full min-h-[230px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-green-500/5 opacity-40 pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-[10px] text-slate-400 font-mono">
            <span>Visual Concept: Express Request-Response Middleware pipeline</span>
            <span className="text-green-400 font-bold">EXPRESS SERVER</span>
          </div>

          {/* Diagram */}
          <div className="flex-1 py-4 flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between text-center relative">
              {/* Path line background */}
              <div className="absolute top-[18px] left-[15%] right-[15%] h-[2px] bg-[#30363d] z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-green-500 to-emerald-400 h-full w-[60%] animate-pulse" />
              </div>

              {/* Node 1 Client */}
              <div className="flex flex-col items-center z-10 w-[20%]">
                <div className="w-9 h-9 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center font-mono text-[10px] text-[#ff7b00] font-bold">
                  Client
                </div>
                <span className="text-[8px] text-slate-400 font-mono mt-1">GET Request</span>
              </div>

              {/* Node 2 Middleware */}
              <div className="flex flex-col items-center z-10 w-[24%]">
                <div className="w-9 h-9 rounded-lg bg-[#21262d] border border-blue-500/40 flex flex-col items-center justify-center">
                  <Layers className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-[8px] text-blue-300 font-mono mt-1">Auth Guard</span>
              </div>

              {/* Node 3 Router */}
              <div className="flex flex-col items-center z-10 w-[24%]">
                <div className="w-9 h-9 rounded-lg bg-green-950/40 border border-green-500/40 flex flex-col items-center justify-center">
                  <Server className="w-4 h-4 text-green-400 animate-pulse" />
                </div>
                <span className="text-[8px] text-green-300 font-mono mt-1">Controller</span>
              </div>

              {/* Node 4 DB response */}
              <div className="flex flex-col items-center z-10 w-[20%]">
                <div className="w-9 h-9 rounded-lg bg-[#161b22] border border-emerald-500/30 flex items-center justify-center font-mono text-[10px] text-emerald-400 font-bold">
                  JSON
                </div>
                <span className="text-[8px] text-emerald-400 font-mono mt-1">Response</span>
              </div>
            </div>

            {/* Pipeline logs terminal */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-2.5 font-mono text-[8.5px] text-gray-400 space-y-0.5">
              <p className="text-blue-400">&gt;_ Incoming: GET /api/v1/lessons</p>
              <p className="text-[#8b949e]">&gt;_ Auth check: Header found {"→"} Decoded token successfully</p>
              <p className="text-emerald-400">&gt;_ Response status: 200 OK (elapsed: 14ms)</p>
            </div>
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
      codeIllustration: (
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
      ),
      visualIllustration: (
        <div className="w-full h-full min-h-[230px] rounded-2xl bg-[#0d1117] border border-[#30363d] p-5 flex flex-col justify-between overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-purple-500/5 opacity-40 pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-[10px] text-slate-400 font-mono">
            <span>Visual Concept: Relational Database Joins Mapping</span>
            <span className="text-purple-400 font-bold">SQL DIAGRAM</span>
          </div>

          {/* Diagram */}
          <div className="flex-1 py-3 flex flex-col justify-center space-y-2.5">
            <div className="flex items-center justify-between relative">
              {/* Relationship link line */}
              <div className="absolute top-[35%] left-[45%] right-[45%] border-t-2 border-dashed border-purple-400/40 z-0" />

              {/* Table A: Users */}
              <div className="border border-[#30363d] rounded-xl overflow-hidden font-mono text-[8px] bg-[#161b22] w-[45%] z-10 shadow-lg">
                <div className="bg-purple-950/30 border-b border-[#30363d] px-2 py-1 text-purple-300 font-bold flex justify-between">
                  <span>Users Table</span>
                  <span>PK</span>
                </div>
                <div className="p-1.5 space-y-1">
                  <div className="flex justify-between font-bold text-slate-200">
                    <span>id 🔑</span>
                    <span>INT</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>name</span>
                    <span>VARCHAR</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>email</span>
                    <span>VARCHAR</span>
                  </div>
                </div>
              </div>

              {/* One-to-Many Symbol */}
              <div className="bg-[#21262d] border border-purple-500/30 rounded-full px-1.5 py-0.5 text-[8px] text-purple-300 font-mono z-20 shadow-md">
                1 : N
              </div>

              {/* Table B: Enrolments */}
              <div className="border border-[#30363d] rounded-xl overflow-hidden font-mono text-[8px] bg-[#161b22] w-[45%] z-10 shadow-lg">
                <div className="bg-indigo-950/30 border-b border-[#30363d] px-2 py-1 text-indigo-300 font-bold flex justify-between">
                  <span>Payments</span>
                  <span>FK</span>
                </div>
                <div className="p-1.5 space-y-1">
                  <div className="flex justify-between text-slate-200">
                    <span>id 🔑</span>
                    <span>INT</span>
                  </div>
                  <div className="flex justify-between text-purple-300 font-bold">
                    <span>user_id 🔗</span>
                    <span>INT</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>amount</span>
                    <span>DECIMAL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Query join explanation */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-2.5 font-mono text-[8.5px] text-gray-400 flex items-center justify-between gap-1">
              <span className="text-gray-500">Query:</span>
              <span className="text-slate-300 font-bold">SELECT * FROM users JOIN payments ON users.id = payments.user_id;</span>
            </div>
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
    }, 5500);
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
      {/* Navigation Buttons */}
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
              <p className="text-slate-300 text-xs lg:text-sm leading-relaxed max-w-xl font-medium">
                {activeSlide.subtitle}
              </p>
            </div>

            {/* Checkpoints features list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {activeSlide.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-300 font-mono">
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

          {/* Slide Visual Graphic with toggle tabs */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center w-full space-y-4">
            
            {/* Elegant Tab Controls */}
            <div className="flex bg-[#0d1117] border border-[#30363d] rounded-xl p-1 w-full max-w-xs justify-between">
              <button
                onClick={() => setViewMode("visual")}
                className={`flex-1 py-1.5 text-center text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  viewMode === "visual"
                    ? "bg-[#ff7b00] text-white shadow-md shadow-[#ff7b00]/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Layers className="w-3 h-3" />
                Concept Schema
              </button>
              <button
                onClick={() => setViewMode("code")}
                className={`flex-1 py-1.5 text-center text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  viewMode === "code"
                    ? "bg-[#ff7b00] text-white shadow-md shadow-[#ff7b00]/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Code className="w-3 h-3" />
                Live Playground
              </button>
            </div>

            {/* Active Mode Illustration Display */}
            <div className="w-full max-w-sm transform hover:scale-[1.01] transition-all duration-300">
              {viewMode === "visual" ? activeSlide.visualIllustration : activeSlide.codeIllustration}
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
