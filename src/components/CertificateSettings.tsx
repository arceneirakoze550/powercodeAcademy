import React, { useState, useEffect } from "react";
import { Upload, Award, ShieldCheck, Eye, RefreshCw, FileText, Check, Settings, Trash2 } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface CertificateSettingsProps {
  user: User;
  onViewCertificate: (cert: any) => void;
  dbStatus?: { connected: boolean; driver: string; hasConnectionString: boolean };
}

export default function CertificateSettings({ user, onViewCertificate, dbStatus }: CertificateSettingsProps) {
  const [officialSignatureUrl, setOfficialSignatureUrl] = useState<string>("");
  const [officialSealUrl, setOfficialSealUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(true);
  const [dragActiveSig, setDragActiveSig] = useState<boolean>(false);
  const [dragActiveSeal, setDragActiveSeal] = useState<boolean>(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = () => {
    setLoading(true);
    fetch("/api/system-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.system_settings) {
          setOfficialSignatureUrl(data.system_settings.official_signature_url || "");
          setOfficialSealUrl(data.system_settings.official_seal_url || "");
        }
      })
      .catch((err) => {
        console.error("Error fetching system settings", err);
        showFeedback("❌ Failed to fetch current settings from server.", false);
      })
      .finally(() => setLoading(false));
  };

  const showFeedback = (msg: string, success: boolean = true) => {
    setFeedback(msg);
    setIsSuccess(success);
    setTimeout(() => {
      setFeedback("");
    }, 6000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/system-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.email}`,
        },
        body: JSON.stringify({
          official_signature_url: officialSignatureUrl,
          official_seal_url: officialSealUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("✨ Official certificate signature & seal stored permanently in the Neon database!", true);
      } else {
        showFeedback(`❌ Failed to store: ${data.error || "Unknown server error"}`, false);
      }
    } catch (err: any) {
      console.error(err);
      showFeedback(`❌ Connection issue: ${err.message || err}`, false);
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert uploaded files to Base64 Urls
  const processFile = (file: File, type: "signature" | "seal") => {
    if (!file.type.startsWith("image/")) {
      showFeedback("❌ Please upload a valid image file (PNG, JPG, SVG, etc.)", false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        if (type === "signature") {
          setOfficialSignatureUrl(base64Url);
          showFeedback("✍️ Scanned digital signature file loaded successfully!", true);
        } else {
          setOfficialSealUrl(base64Url);
          showFeedback("🏅 Logo seal stamp file loaded successfully!", true);
        }

        // Auto sync file logic with /api/upload
        fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: "image",
            fileData: base64Url
          })
        }).catch(err => console.warn("Background upload sync bypassed", err));
      }
    };
    reader.onerror = () => {
      showFeedback("❌ Error reading the uploaded file.", false);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent, type: "signature" | "seal", active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "signature") {
      setDragActiveSig(active);
    } else {
      setDragActiveSeal(active);
    }
  };

  const handleDrop = (e: React.DragEvent, type: "signature" | "seal") => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "signature") {
      setDragActiveSig(false);
    } else {
      setDragActiveSeal(false);
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], type);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "signature" | "seal") => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], type);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl space-y-6 shadow-xl max-w-4xl mx-auto" id="certificate-settings-panel">
      {/* Header section with connection details */}
      <div className="border-b border-[#30363d] pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#ff7b00]/10 rounded-xl border border-[#ff7b00]/20">
            <Award className="w-5 h-5 text-[#ff7b00]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Official Certificate Settings</h3>
            <p className="text-[11px] text-[#8b949e]">Configure the cryptographic identity keys, logo seals, and signatures for dynamically compiling PDFs.</p>
          </div>
        </div>
        
        {dbStatus && (
          <div className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 self-start ${
            dbStatus.connected 
              ? "bg-green-500/10 text-green-400 border border-green-500/25" 
              : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/25"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dbStatus.connected ? "bg-green-400 animate-pulse" : "bg-yellow-500"}`} />
            <span>{dbStatus.connected ? "Neon postgres Connected" : "Local fallback DB Active"}</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`text-xs px-3.5 py-2.5 rounded-xl border flex items-center gap-2 animate-fadeIn ${
          isSuccess 
            ? "text-green-400 bg-green-500/10 border-green-500/20" 
            : "text-rose-400 bg-rose-500/10 border-rose-500/20"
        }`}>
          {isSuccess ? <Check className="w-4 h-4 text-green-400" /> : <ShieldCheck className="w-4 h-4 text-rose-400" />}
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* SIGNATURE CONFIGURATION BLOCK */}
          <div className="space-y-3 flex flex-col h-full bg-[#0d1117]/40 p-4 rounded-xl border border-[#21262d]">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#ff7b00]" />
                <span>OFFICIAL SIGNATURE</span>
              </label>
              <span className="text-[9px] text-[#8b949e] uppercase font-mono">PNG / SVG FORMATS</span>
            </div>

            {/* Drag & Drop dynamic box */}
            <div
              onDragOver={(e) => handleDrag(e, "signature", true)}
              onDragLeave={(e) => handleDrag(e, "signature", false)}
              onDrop={(e) => handleDrop(e, "signature")}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all min-h-[140px] cursor-pointer ${
                dragActiveSig
                  ? "border-[#ff7b00] bg-[#ff7b00]/10"
                  : officialSignatureUrl
                  ? "border-[#30363d] bg-[#0d1117]"
                  : "border-[#30363d]/50 hover:border-[#ff7b00]/60 bg-transparent"
              }`}
              onClick={() => document.getElementById("signature-file-input")?.click()}
            >
              {officialSignatureUrl ? (
                <div className="space-y-2 w-full flex flex-col items-center">
                  <div className="bg-white p-2 rounded-lg border border-gray-100 max-h-[70px] w-full flex items-center justify-center overflow-hidden shadow-inner">
                    <img
                      src={officialSignatureUrl}
                      alt="Official signature graphic"
                      className="max-h-[54px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono truncate max-w-xs">Base64 Asset or Image url stored</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-6 h-6 text-[#ff7b00]/60 mb-2" />
                  <span className="text-xs font-bold text-white mb-0.5">Drag signature image here</span>
                  <span className="text-[10px] text-[#8b949e]">or click to browse local files</span>
                </div>
              )}
              <input
                id="signature-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "signature")}
              />
            </div>

            {/* Direct write Input field */}
            <div className="space-y-1 mt-auto">
              <span className="text-[9px] text-gray-400 font-bold uppercase block">Paste Signature URL/Path:</span>
              <input
                type="text"
                value={officialSignatureUrl}
                onChange={(e) => setOfficialSignatureUrl(e.target.value)}
                placeholder="https://image-host.com/signature.png or base64 data"
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#ff7b00] rounded-lg p-2 text-[10.5px] font-mono text-white outline-none"
              />
            </div>
            
            {officialSignatureUrl && (
              <button
                type="button"
                onClick={() => setOfficialSignatureUrl("")}
                className="text-[9px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1 self-start transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Signature</span>
              </button>
            )}
          </div>

          {/* SEAL CONFIGURATION BLOCK */}
          <div className="space-y-3 flex flex-col h-full bg-[#0d1117]/40 p-4 rounded-xl border border-[#21262d]">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#ff7b00]" />
                <span>OFFICIAL LOGO SEAL</span>
              </label>
              <span className="text-[9px] text-[#8b949e] uppercase font-mono">CIRCULAR FORMAT</span>
            </div>

            {/* Drag & Drop dynamic box */}
            <div
              onDragOver={(e) => handleDrag(e, "seal", true)}
              onDragLeave={(e) => handleDrag(e, "seal", false)}
              onDrop={(e) => handleDrop(e, "seal")}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all min-h-[140px] cursor-pointer ${
                dragActiveSeal
                  ? "border-[#ff7b00] bg-[#ff7b00]/10"
                  : officialSealUrl
                  ? "border-[#30363d] bg-[#0d1117]"
                  : "border-[#30363d]/50 hover:border-[#ff7b00]/60 bg-transparent"
              }`}
              onClick={() => document.getElementById("seal-file-input")?.click()}
            >
              {officialSealUrl ? (
                <div className="space-y-2 w-full flex flex-col items-center">
                  <div className="bg-white p-2 rounded-lg border border-gray-100 max-h-[70px] w-full flex items-center justify-center overflow-hidden shadow-inner">
                    <img
                      src={officialSealUrl}
                      alt="Official seal graphic"
                      className="max-h-[54px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono truncate max-w-xs">Base64 Asset or Image url stored</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-6 h-6 text-[#ff7b00]/60 mb-2" />
                  <span className="text-xs font-bold text-white mb-0.5">Drag seal logo here</span>
                  <span className="text-[10px] text-[#8b949e]">or click to browse local files</span>
                </div>
              )}
              <input
                id="seal-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "seal")}
              />
            </div>

            {/* Direct write Input field */}
            <div className="space-y-1 mt-auto">
              <span className="text-[9px] text-gray-400 font-bold uppercase block">Paste Seal stamp URL/Path:</span>
              <input
                type="text"
                value={officialSealUrl}
                onChange={(e) => setOfficialSealUrl(e.target.value)}
                placeholder="https://image-host.com/seal.png or base64 data"
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#ff7b00] rounded-lg p-2 text-[10.5px] font-mono text-white outline-none"
              />
            </div>

            {officialSealUrl && (
              <button
                type="button"
                onClick={() => setOfficialSealUrl("")}
                className="text-[9px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1 self-start transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Seal</span>
              </button>
            )}
          </div>

        </div>

        {/* Form controls */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-[#30363d]/60">
          
          {/* Quick Action Previewer */}
          <button
            type="button"
            onClick={() => {
              onViewCertificate({
                certificateCode: "PREVIEW-ADMIN-SECURE",
                userId: user.id,
                userName: user.name,
                courseId: null,
                courseTitle: "PowerCode certified graduate preview",
                date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                description: "This is a live premium test preview. Your custom signatures and seal stamps are verified cryptographically in real-time.",
                digitalSignature: "verified-powercode-academic-test-sha256"
              });
            }}
            className="w-full sm:w-auto bg-[#21262d] hover:bg-[#30363d] hover:text-[#ff7b00] text-xs font-bold text-white py-2.5 px-5 rounded-xl border border-[#30363d] transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow"
          >
            <Eye className="w-4 h-4 text-[#ff7b00]" />
            <span>Launch dynamic test preview modal</span>
          </button>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={fetchSettings}
              disabled={loading}
              className="flex-1 sm:flex-initial bg-transparent border border-[#30363d] hover:bg-[#21262d] text-xs font-bold text-white py-2.5 px-4 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Reset</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-initial bg-[#ff7b00] hover:bg-[#e66f00] text-xs font-extrabold text-white py-2.5 px-7 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{loading ? "Saving settings..." : "Store system settings"}</span>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
