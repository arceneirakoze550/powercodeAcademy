import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Quote, 
  Sparkles, 
  Star, 
  Award, 
  Briefcase, 
  GraduationCap, 
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Link,
  X,
  Loader2,
  Image as ImageIcon,
  Save,
  Check
} from "lucide-react";

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
  createdByUserId?: number;
  createdAt?: string;
}

export default function StudentSuccess() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formBlurb, setFormBlurb] = useState("");
  const [formHighlight, setFormHighlight] = useState("");
  
  // Custom stats
  const [stat1Label, setStat1Label] = useState("Salary Increase");
  const [stat1Value, setStat1Value] = useState("+100%");
  const [stat2Label, setStat2Label] = useState("Time to Hire");
  const [stat2Value, setStat2Value] = useState("6 Months");
  const [stat3Label, setStat3Label] = useState("Lessons Done");
  const [stat3Value, setStat3Value] = useState("120 Modules");
  
  // Tags (comma separated)
  const [formTags, setFormTags] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Testimonials
  const fetchTestimonials = async () => {
    try {
      const res = await fetch("/api/testimonials");
      if (res.ok) {
        const data = await res.json();
        if (data.testimonials && Array.isArray(data.testimonials)) {
          setTestimonials(data.testimonials);
        }
      }
    } catch (err) {
      console.error("Failed to fetch testimonials:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check Current User Session
  useEffect(() => {
    const stored = localStorage.getItem("powercode_user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (_) {}
    }
    fetchTestimonials();
  }, []);

  // Auto Scroll slider
  useEffect(() => {
    if (isHovered || isModalOpen || testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isHovered, isModalOpen, testimonials.length]);

  const handlePrev = () => {
    if (testimonials.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    if (testimonials.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);

    try {
      const email = currentUser?.email || "";
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${email}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          setFormAvatarUrl(data.url);
          setFormSuccess("Image uploaded successfully!");
          setTimeout(() => setFormSuccess(null), 3000);
        } else {
          setFormError("Upload response was invalid");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.error || "Failed to upload image to server");
      }
    } catch (err) {
      setFormError("Network error uploading image");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Testimonial
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this success story testimonial?")) return;

    try {
      const email = currentUser?.email || "";
      const res = await fetch(`/api/testimonials/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${email}`
        }
      });

      if (res.ok) {
        fetchTestimonials();
        if (currentIndex >= testimonials.length - 1 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      } else {
        alert("Failed to delete testimonial. Admin access or creation ownership required.");
      }
    } catch (err) {
      alert("Error deleting testimonial");
    }
  };

  // Open Form for Adding
  const openAddModal = () => {
    if (!currentUser) {
      alert("Please sign in to PowerCode Academy to share your success story!");
      return;
    }
    setIsEditing(false);
    setEditingId(null);
    setFormName(currentUser.name || "");
    setFormRole("Full-Stack Developer");
    setFormCompany("Tech Corp");
    setFormAvatarUrl(currentUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150");
    setFormBlurb("PowerCode Academy's real code sandboxes and AI Mentor made all the difference...");
    setFormHighlight("Landed my first developer job with verified portfolio sandboxes!");
    setStat1Label("Salary Increase");
    setStat1Value("+80%");
    setStat2Label("Time to Hire");
    setStat2Value("3 Months");
    setStat3Label("Mastered Skills");
    setStat3Value("8 Tags");
    setFormTags("TypeScript, React, Node.js");
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  // Open Form for Editing
  const openEditModal = (t: Testimonial, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(t.id);
    setFormName(t.name);
    setFormRole(t.role);
    setFormCompany(t.company);
    setFormAvatarUrl(t.avatarUrl);
    setFormBlurb(t.blurb);
    setFormHighlight(t.highlightPhrase);
    
    // Stats
    setStat1Label(t.stats?.[0]?.label || "Salary Increase");
    setStat1Value(t.stats?.[0]?.value || "+100%");
    setStat2Label(t.stats?.[1]?.label || "Time to Hire");
    setStat2Value(t.stats?.[1]?.value || "6 Months");
    setStat3Label(t.stats?.[2]?.label || "Lessons Done");
    setStat3Value(t.stats?.[2]?.value || "120 Modules");
    
    setFormTags(t.tags ? t.tags.join(", ") : "");
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  // Submit Testimonial
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formRole.trim() || !formBlurb.trim()) {
      setFormError("Name, role, and success testimonial content are strictly required.");
      return;
    }

    const payload = {
      name: formName,
      role: formRole,
      company: formCompany,
      avatarUrl: formAvatarUrl,
      blurb: formBlurb,
      highlightPhrase: formHighlight,
      stats: [
        { label: stat1Label, value: stat1Value },
        { label: stat2Label, value: stat2Value },
        { label: stat3Label, value: stat3Value }
      ],
      tags: formTags.split(",").map(t => t.trim()).filter(Boolean)
    };

    try {
      const email = currentUser?.email || "";
      const url = isEditing ? `/api/testimonials/${editingId}` : "/api/testimonials";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${email}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFormSuccess(isEditing ? "Success story updated!" : "Success story shared! Thank you!");
        setTimeout(() => {
          setIsModalOpen(false);
          fetchTestimonials();
        }, 1500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.error || "Failed to save testimonial");
      }
    } catch (err) {
      setFormError("Network error. Please try again.");
    }
  };

  const active = testimonials[currentIndex];

  return (
    <section 
      className="space-y-8 py-8 relative bg-gradient-to-b from-transparent to-[#0d1117]/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id="student-success-testimonials"
    >
      {/* Title Block with Interactive Creator Control */}
      <div className="text-center max-w-2xl mx-auto px-4 relative z-10">
        <span className="text-[10px] uppercase font-mono tracking-widest text-[#ff7b00] bg-[#ff7b00]/10 px-3 py-1 rounded-full border border-[#ff7b00]/20 inline-flex items-center gap-1.5">
          <Award className="w-3 h-3 text-[#ff7b00]" />
          Alumni Milestones & Impact
        </span>
        <h2 className="text-3xl font-bold text-white mt-3 font-sans tracking-tight">
          Student Success Stories
        </h2>
        <p className="text-xs text-[#8b949e] mt-2 leading-relaxed max-w-lg mx-auto">
          Read verified career transformations from actual academy graduates, or write and submit your own story directly to our board!
        </p>

        {/* Call to action to add success story */}
        <div className="mt-4 flex justify-center gap-3">
          {currentUser ? (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-gradient-to-r from-[#ff7b00] to-[#e06c00] hover:brightness-110 text-white rounded-xl text-xs font-bold font-sans shadow-lg shadow-[#ff7b00]/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Share Your Success Story
            </button>
          ) : (
            <span className="text-xs text-[#8b949e] bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-lg inline-block">
              🔒 <span className="font-semibold text-white">Log in</span> to write and submit your own success story
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-10 h-[380px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#ff7b00] animate-spin" />
              <span className="text-xs text-[#8b949e] font-mono">Loading success stories database...</span>
            </div>
          </div>
        </div>
      ) : testimonials.length === 0 ? (
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-10 text-center">
            <GraduationCap className="w-12 h-12 text-[#ff7b00] mx-auto opacity-40 mb-3" />
            <h4 className="text-sm font-bold text-white">No Testimonials Found</h4>
            <p className="text-xs text-[#8b949e] mt-1 max-w-md mx-auto">Be the first to share your journey with the academy community!</p>
            {currentUser && (
              <button
                onClick={openAddModal}
                className="mt-4 px-4 py-2 bg-[#ff7b00] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-orange-600 transition"
              >
                Create First Success Story
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative max-w-5xl mx-auto px-4 group">
          
          {/* Left Control Arrow */}
          <button
            onClick={handlePrev}
            className="absolute -left-2 lg:left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#161b22]/90 hover:bg-[#ff7b00] border border-[#30363d] hover:border-[#ff7b00] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 active:scale-95 cursor-pointer shadow-lg hover:shadow-[#ff7b00]/25"
            title="Previous Testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Right Control Arrow */}
          <button
            onClick={handleNext}
            className="absolute -right-2 lg:right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#161b22]/90 hover:bg-[#ff7b00] border border-[#30363d] hover:border-[#ff7b00] text-gray-400 hover:text-white flex items-center justify-center transition-all z-10 active:scale-95 cursor-pointer shadow-lg hover:shadow-[#ff7b00]/25"
            title="Next Testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Main Content Card Container */}
          <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#30363d] rounded-3xl p-6 lg:p-10 transition-all duration-500 overflow-hidden shadow-2xl relative">
            
            {/* Subtle Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            {/* OWNER/ADMIN ACTION CONTROLS ON ACTIVE SLIDE CARD */}
            {currentUser && (currentUser.role === "ADMIN" || active.createdByUserId === currentUser.id) && (
              <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                <button
                  onClick={(e) => openEditModal(active, e)}
                  className="p-2 rounded-lg bg-[#21262d] hover:bg-[#ff7b00] text-gray-400 hover:text-white border border-[#30363d] transition cursor-pointer"
                  title="Edit Success Story"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(active.id, e)}
                  className="p-2 rounded-lg bg-[#21262d] hover:bg-red-600 text-gray-400 hover:text-white border border-[#30363d] transition cursor-pointer"
                  title="Delete Success Story"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              
              {/* Left side: Profile Details, Avatar, Impact Highlight */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5">
                
                {/* Profile Image & Badging Stack */}
                <div className="relative">
                  <div className="absolute inset-0 bg-[#ff7b00] rounded-full blur-md opacity-25" />
                  <img 
                    src={active.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                    alt={active.name} 
                    className="w-24 h-24 rounded-full border-2 border-[#ff7b00] object-cover relative z-10 shadow-xl"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                    }}
                  />
                  <div className="absolute bottom-0 right-0 bg-[#ff7b00] border border-[#0d1117] rounded-full p-1.5 z-20 shadow">
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Name and Professional details */}
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{active.name}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 mt-1 font-mono justify-center lg:justify-start">
                    <Briefcase className="w-3.5 h-3.5 text-[#ff7b00]" />
                    <span>{active.role}</span>
                    {active.company && (
                      <>
                        <span className="text-[#30363d]">•</span>
                        <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">{active.company}</span>
                      </>
                    )}
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
                {active.highlightPhrase && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 w-full">
                    <span className="text-[10px] font-mono text-[#ff7b00] uppercase tracking-wider font-extrabold block mb-1">Career Highlight</span>
                    <p className="text-xs text-white leading-relaxed font-sans font-medium">
                      "{active.highlightPhrase}"
                    </p>
                  </div>
                )}

                {/* Tag Badges */}
                <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start">
                  {active.tags && active.tags.map((tag, i) => (
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
                  {active.stats && active.stats.map((stat, idx) => (
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
      )}

      {/* Bullet Indicator selectors */}
      {testimonials.length > 1 && (
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
      )}

      {/* MODAL OVERLAY: ADD / EDIT ALUMNI SUCCESS STORY TESTIMONIAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] sticky top-0 bg-[#161b22] z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#ff7b00]" />
                <h3 className="text-base font-bold text-white">
                  {isEditing ? "Edit Success Story Testimonial" : "Share Your PowerCode Success Story"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#21262d] transition cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Alert Messaging */}
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-xs text-red-300 font-mono">
                  ⚠️ {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  {formSuccess}
                </div>
              )}

              {/* Grid 1: Basic professional properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-gray-400 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff7b00]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-gray-400 block mb-1">Professional Role / Title</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="e.g. Software Engineer II"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff7b00]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-gray-400 block mb-1">Company / Placement</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff7b00]"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-gray-400 block mb-1">Course Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. TypeScript, Python AI, Node.js"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff7b00]"
                  />
                </div>
              </div>

              {/* Grid 2: IMAGE UPLOADER / AVATAR SELECTOR */}
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-4">
                <span className="text-xs font-mono text-[#ff7b00] uppercase tracking-wide font-bold block">
                  Student Profile Image Upload
                </span>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Current image preview */}
                  <div className="relative">
                    <img
                      src={formAvatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                      alt="Avatar Preview"
                      className="w-20 h-20 rounded-full border border-[#30363d] object-cover shadow bg-[#161b22]"
                      referrerPolicy="no-referrer"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-[#ff7b00] animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Actions wrapper */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      {/* Interactive trigger button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-[#21262d] hover:bg-[#ff7b00]/10 text-xs font-bold text-white border border-[#30363d] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 text-[#ff7b00]" />
                        Upload Student Image
                      </button>

                      {/* Paste custom URL input */}
                      <div className="relative flex-1">
                        <Link className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formAvatarUrl}
                          onChange={(e) => setFormAvatarUrl(e.target.value)}
                          placeholder="Or paste custom image URL..."
                          className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-9 pr-3 py-2 text-[11px] text-white focus:outline-none focus:border-[#ff7b00]"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 block">
                      Choose an image file from your computer (converts to base64 automatically) or paste an image address (e.g. from Unsplash).
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 3: Headline Highlight & Quote Testimony text */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-gray-400 block mb-1">Career Highlight Headline</label>
                  <input
                    type="text"
                    value={formHighlight}
                    onChange={(e) => setFormHighlight(e.target.value)}
                    placeholder="e.g. Transitioned from absolute beginner to L4 developer in 9 months."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff7b00]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-gray-400 block mb-1">Your Full Testimonial Blurb</label>
                  <textarea
                    value={formBlurb}
                    onChange={(e) => setFormBlurb(e.target.value)}
                    rows={4}
                    placeholder="Write your beautiful learning story here. How did the sandbox compilation, lessons structure, and Gemini AI Mentor help you succeed?"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff7b00] resize-none leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* Grid 4: Custom stats bento parameters */}
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-3">
                <span className="text-xs font-mono text-[#ff7b00] uppercase tracking-wide font-bold block">
                  Metric Highlights (Max 3 milestones)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Stat 1 */}
                  <div className="bg-[#161b22] p-2.5 rounded-xl border border-[#30363d] space-y-1">
                    <input
                      type="text"
                      value={stat1Label}
                      onChange={(e) => setStat1Label(e.target.value)}
                      placeholder="Label 1"
                      className="w-full bg-[#0d1117] border border-[#30363d]/50 rounded px-2 py-1 text-[10px] text-gray-400 text-center font-mono focus:outline-none"
                    />
                    <input
                      type="text"
                      value={stat1Value}
                      onChange={(e) => setStat1Value(e.target.value)}
                      placeholder="Value 1"
                      className="w-full bg-[#0d1117] border border-[#30363d]/50 rounded px-2 py-1 text-xs text-white text-center font-bold font-mono focus:outline-none"
                    />
                  </div>

                  {/* Stat 2 */}
                  <div className="bg-[#161b22] p-2.5 rounded-xl border border-[#30363d] space-y-1">
                    <input
                      type="text"
                      value={stat2Label}
                      onChange={(e) => setStat2Label(e.target.value)}
                      placeholder="Label 2"
                      className="w-full bg-[#0d1117] border border-[#30363d]/50 rounded px-2 py-1 text-[10px] text-gray-400 text-center font-mono focus:outline-none"
                    />
                    <input
                      type="text"
                      value={stat2Value}
                      onChange={(e) => setStat2Value(e.target.value)}
                      placeholder="Value 2"
                      className="w-full bg-[#0d1117] border border-[#30363d]/50 rounded px-2 py-1 text-xs text-white text-center font-bold font-mono focus:outline-none"
                    />
                  </div>

                  {/* Stat 3 */}
                  <div className="bg-[#161b22] p-2.5 rounded-xl border border-[#30363d] space-y-1">
                    <input
                      type="text"
                      value={stat3Label}
                      onChange={(e) => setStat3Label(e.target.value)}
                      placeholder="Label 3"
                      className="w-full bg-[#0d1117] border border-[#30363d]/50 rounded px-2 py-1 text-[10px] text-gray-400 text-center font-mono focus:outline-none"
                    />
                    <input
                      type="text"
                      value={stat3Value}
                      onChange={(e) => setStat3Value(e.target.value)}
                      placeholder="Value 3"
                      className="w-full bg-[#0d1117] border border-[#30363d]/50 rounded px-2 py-1 text-xs text-white text-center font-bold font-mono focus:outline-none"
                    />
                  </div>

                </div>
              </div>

              {/* Submit Buttons footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-xs font-bold text-gray-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2 bg-gradient-to-r from-[#ff7b00] to-[#e06c00] hover:brightness-110 text-xs font-bold text-white rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isEditing ? "Save Changes" : "Publish Testimonial"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </section>
  );
}
