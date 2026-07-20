import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Quote, Sparkles, Star, Award, Briefcase, GraduationCap, CheckCircle } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  companyLogo?: string;
  avatarUrl: string;
  blurb: string;
  highlightPhrase: string;
  stats: { label: string; value: string }[];
  tags: string[];
}

export default function StudentSuccess() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Sarah Jenkins",
      role: "Software Engineer II",
      company: "Google",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      blurb: "PowerCode Academy completely redefined my learning curve. The interactive browser-based compiler and immediate feedback from the Gemini AI Mentor felt like having a senior engineer sitting right next to me. I transitioned from retail management into a core engineering team at Google in less than 9 months!",
      highlightPhrase: "Went from absolute beginner to a Core Engineer at Google in 9 months.",
      stats: [
        { label: "Salary Increase", value: "+140%" },
        { label: "Time to Hire", value: "9 Months" },
        { label: "Lessons Finished", value: "142 Modules" }
      ],
      tags: ["Python AI", "Node.js Backend", "Monaco IDE Sandbox"]
    },
    {
      id: 2,
      name: "Alex Rivera",
      role: "Full-Stack Developer",
      company: "Stripe",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      blurb: "The certification program at PowerCode was the first credential that actually carried weight in my interviews. Employers were incredibly impressed with the physical verified QR links pointing back to my real compiled code sandboxes. I was hired at Stripe within two weeks of receiving my backend certificate!",
      highlightPhrase: "My verified portfolio sandbox landed me an offer at Stripe.",
      stats: [
        { label: "Interviews Booked", value: "8 callbacks" },
        { label: "Starting Role", value: "L4 Engineer" },
        { label: "Compiler Commits", value: "480+ runs" }
      ],
      tags: ["TypeScript", "PostgreSQL Joins", "Verified Credentials"]
    },
    {
      id: 3,
      name: "Mia Chen",
      role: "Frontend Team Lead",
      company: "Netflix",
      avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
      blurb: "I had some basic self-taught experience, but I lacked structured engineering foundations. PowerCode's deep-dives into CSS Box layouts, responsive flex grids, and advanced JavaScript asynchronous promises connected all the dots. Now I lead a team of frontend engineers building global components.",
      highlightPhrase: "Connected the dots to scale my knowledge to a Team Lead position.",
      stats: [
        { label: "Team Managed", value: "6 Engineers" },
        { label: "Promo Cycle", value: "1 Year" },
        { label: "Syllabus Mastery", value: "100%" }
      ],
      tags: ["Responsive Design", "Advanced JS", "CSS Box Masterclass"]
    },
    {
      id: 4,
      name: "Marcus Vance",
      role: "DevOps Architect",
      company: "AWS Partner Network",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
      blurb: "The API engineering modules are peerless. Setting up Express controllers, routing pipelines, middleware authenticators, and relational schemas on the live database was identical to my daily tasks now. It's not just a course; it's a simulated high-throughput production environment.",
      highlightPhrase: "Learned server-side clustering that perfectly mirrors production.",
      stats: [
        { label: "Compiles Done", value: "1,200+" },
        { label: "Placement", value: "AWS Partner" },
        { label: "Tech Stack Size", value: "12 Tools" }
      ],
      tags: ["Node.js Servers", "REST API Schema", "Relational DB"]
    }
  ];

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isHovered, testimonials.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const active = testimonials[currentIndex];

  return (
    <section 
      className="space-y-8 py-4 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id="student-success-testimonials"
    >
      {/* Title block */}
      <div className="text-center max-w-xl mx-auto px-4">
        <span className="text-[10px] uppercase font-mono tracking-widest text-[#ff7b00] bg-[#ff7b00]/10 px-3 py-1 rounded-full border border-[#ff7b00]/20 inline-flex items-center gap-1.5">
          <Award className="w-3 h-3 text-[#ff7b00]" />
          Alumni Milestones
        </span>
        <h2 className="text-3xl font-bold text-white mt-3 font-sans tracking-tight">
          Student Success Stories
        </h2>
        <p className="text-xs text-[#8b949e] mt-2 leading-relaxed max-w-md mx-auto">
          From absolute code beginners to hiring managers. Read how our graduate developers launched high-paying software careers worldwide.
        </p>
      </div>

      {/* Main Slider Panel */}
      <div className="relative max-w-5xl mx-auto px-4 group">
        
        {/* Left Control Arrow */}
        <button
          onClick={handlePrev}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#161b22]/90 hover:bg-[#ff7b00] border border-[#30363d] hover:border-[#ff7b00] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 active:scale-95 cursor-pointer shadow-lg hover:shadow-[#ff7b00]/25"
          title="Previous Testimonial"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right Control Arrow */}
        <button
          onClick={handleNext}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#161b22]/90 hover:bg-[#ff7b00] border border-[#30363d] hover:border-[#ff7b00] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 active:scale-95 cursor-pointer shadow-lg hover:shadow-[#ff7b00]/25"
          title="Next Testimonial"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Main Content Card Container */}
        <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#30363d] rounded-3xl p-6 lg:p-10 transition-all duration-500 overflow-hidden shadow-2xl relative">
          
          {/* Subtle Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Left side: Profile Details, Avatar, Impact Highlight */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5">
              
              {/* Profile Image & Badging Stack */}
              <div className="relative">
                <div className="absolute inset-0 bg-[#ff7b00] rounded-full blur-md opacity-25 animate-pulse" />
                <img 
                  src={active.avatarUrl} 
                  alt={active.name} 
                  className="w-24 h-24 rounded-full border-2 border-[#ff7b00] object-cover relative z-10 shadow-xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-0 right-0 bg-[#ff7b00] border border-[#0d1117] rounded-full p-1.5 z-20 shadow">
                  <GraduationCap className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              {/* Name and Professional details */}
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{active.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 font-mono justify-center lg:justify-start">
                  <Briefcase className="w-3.5 h-3.5 text-[#ff7b00]" />
                  <span>{active.role}</span>
                  <span className="text-[#30363d]">•</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">{active.company}</span>
                </div>
              </div>

              {/* Rating stars */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                ))}
                <span className="text-xs font-bold text-gray-400 ml-1.5 font-mono">5.0 Star Graduate</span>
              </div>

              {/* Core impact statement highlight */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 w-full">
                <span className="text-[10px] font-mono text-[#ff7b00] uppercase tracking-wider font-extrabold block mb-1">Career Highlight</span>
                <p className="text-xs text-white leading-relaxed font-sans font-medium">
                  "{active.highlightPhrase}"
                </p>
              </div>

              {/* Tag Badges */}
              <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start">
                {active.tags.map((tag, i) => (
                  <span key={i} className="text-[9px] font-mono font-bold bg-[#1f242c] text-gray-300 border border-[#30363d] px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right side: Extensive blurb testimony and high-impact metrics */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6 lg:border-l lg:border-[#21262d] lg:pl-10">
              
              {/* Quote text */}
              <div className="relative">
                <Quote className="absolute -top-6 -left-4 w-12 h-12 text-[#ff7b00]/10 select-none pointer-events-none" />
                <p className="text-sm text-slate-300 leading-relaxed font-sans italic relative z-10 pt-2">
                  "{active.blurb}"
                </p>
              </div>

              {/* Stats highlights bento grid */}
              <div className="grid grid-cols-3 gap-3.5 pt-4">
                {active.stats.map((stat, idx) => (
                  <div key={idx} className="bg-[#161b22] border border-[#21262d] rounded-2xl p-3 text-center shadow-inner hover:border-[#ff7b00]/30 transition-all">
                    <span className="text-lg lg:text-2xl font-extrabold text-white block font-mono tracking-tight">{stat.value}</span>
                    <span className="text-[9.5px] text-gray-400 font-mono block mt-1 uppercase tracking-wide leading-none">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Academy Verification Shield */}
              <div className="flex items-center gap-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1 text-left">
                  <span className="text-[10.5px] font-bold text-emerald-300 block font-mono">Academy Certified & Verified</span>
                  <span className="text-[9px] text-gray-400 block leading-tight mt-0.5">This profile corresponds to an authentic student portfolio with verified sandboxes.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bullet Indicator selectors */}
      <div className="flex justify-center gap-2">
        {testimonials.map((t, idx) => (
          <button
            key={t.id}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2.5 rounded-full transition-all cursor-pointer ${
              idx === currentIndex ? "w-8 bg-[#ff7b00]" : "w-2.5 bg-[#21262d] hover:bg-[#ff7b00]/40"
            }`}
            title={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
