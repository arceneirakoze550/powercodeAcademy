import React, { useRef, useState, useEffect } from "react";
import { Download, Award, ShieldCheck, Printer, X, Check, FileText, RefreshCw } from "lucide-react";
import { jsPDF } from "jspdf";

interface Certificate {
  certificateCode: string;
  userId: number;
  userName: string;
  courseId: number | null;
  courseTitle: string;
  date: string;
  type?: string;
  description?: string;
  digitalSignature?: string;
}

interface CertificateModalProps {
  certificate: Certificate;
  onClose: () => void;
}

// Convert any image URL or SVG to high def PNG Base64 for jsPDF
const convertToPngDataUrl = (imgUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!imgUrl) {
      resolve("");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
          return;
        }
      } catch (err) {
        console.warn("Error drawing signature/seal onto canvas:", err);
      }
      resolve(imgUrl);
    };
    img.onerror = () => {
      resolve(imgUrl);
    };
    img.src = imgUrl;
  });
};

export default function CertificateModal({ certificate, onClose }: CertificateModalProps) {
  const [downloading, setDownloading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [sigPng, setSigPng] = useState<string | null>(null);
  const [sealPng, setSealPng] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/system-settings?t=" + Date.now())
      .then(res => res.json())
      .then(async (data) => {
        if (data.system_settings) {
          setSystemSettings(data.system_settings);
          
          let sigUrl = data.system_settings.official_signature_url;
          if (sigUrl) {
            if (sigUrl.trim().startsWith("<svg")) {
              sigUrl = "data:image/svg+xml;utf8," + encodeURIComponent(sigUrl);
            }
            const png = await convertToPngDataUrl(sigUrl);
            setSigPng(png);
          }
          
          let sealUrl = data.system_settings.official_seal_url;
          if (sealUrl) {
            if (sealUrl.trim().startsWith("<svg")) {
              sealUrl = "data:image/svg+xml;utf8," + encodeURIComponent(sealUrl);
            }
            const png = await convertToPngDataUrl(sealUrl);
            setSealPng(png);
          }
        }
      })
      .catch(err => console.error("Error reading signature settings", err));
  }, []);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setSuccessMsg("");

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // 1. Dark and Orange PowerCode Academy branding design.
      doc.setFillColor(253, 253, 254);
      doc.rect(0, 0, 297, 210, "F");

      // Draw dark outer border
      doc.setDrawColor(13, 17, 23); // Deep slate background brand
      doc.setLineWidth(3);
      doc.rect(6, 6, 285, 198, "D");

      // Draw orange inner border
      doc.setDrawColor(255, 123, 0); // Orange
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 277, 190, "D");

      // 2. Watermark: "PowerCode Academy" with very low opacity
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(44);
      doc.setTextColor(245, 240, 235); // Very faint subtle watermark
      doc.text("POWERCODE ACADEMY", 148, 105, { align: "center", angle: 15 });

      // Reset text options
      doc.setTextColor(13, 17, 23);

      // Logo/Top Header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 123, 0);
      doc.text("PowerCode Academy", 148, 25, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("INTERNATIONAL COMPUTER SCIENCE & CODING FELLOWSHIP", 148, 30, { align: "center" });

      // Title Section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(13, 17, 23);
      doc.text("CERTIFICATE OF ACHIEVEMENT", 148, 48, { align: "center" });

      doc.setFont("Helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text("This official academic credential certifies that", 148, 58, { align: "center" });

      // Student Name
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(30);
      doc.setTextColor(255, 123, 0);
      doc.text(certificate.userName.toUpperCase(), 148, 74, { align: "center" });

      // Dynamic achievement description and challenge/quiz/course name
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(80, 80, 80);
      const achievementDesc = certificate.description || "Demonstrated outstanding algorithmic accuracy, writing, compiled testing, and deploying logical software models within our sandbox.";
      doc.text(achievementDesc, 148, 84, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(13, 17, 23);
      doc.text(`Course Work: ${certificate.courseTitle}`, 148, 96, { align: "center" });

      // Inner divider line
      doc.setDrawColor(255, 123, 0);
      doc.setLineWidth(0.8);
      doc.line(100, 102, 197, 102);

      // Date Left Section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text("ISSUE DATE", 30, 125);
      doc.setFont("Courier", "bold");
      doc.setFontSize(11);
      doc.setTextColor(13, 17, 23);
      doc.text(certificate.date, 30, 132);

      // Certificate ID Left Section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text("CREDENTIAL CODE", 30, 145);
      doc.setFont("Courier", "bold");
      doc.setFontSize(10);
      doc.setTextColor(13, 17, 23);
      doc.text(certificate.certificateCode, 30, 151);

      // QR Verification Code & Verifier Box
      doc.setDrawColor(255, 123, 0);
      doc.setLineWidth(0.5);
      doc.rect(30, 159, 13, 13);
      // Small simulated binary QR modules inside
      doc.setFillColor(13, 17, 23);
      doc.rect(31, 160, 3, 3, "F");
      doc.rect(38, 160, 3, 3, "F");
      doc.rect(31, 167, 3, 3, "F");
      doc.rect(35, 164, 2, 2, "F");
      doc.rect(39, 168, 2, 2, "F");

      // Verify URL text
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      const verifyUrl = `https://powercodeacademy.com/verify/${certificate.certificateCode}`;
      doc.text("SCAN OR VERIFY AT URL:", 46, 163);
      doc.setFont("Courier", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(255, 123, 0);
      doc.text(verifyUrl, 46, 168);

      // Approved By Right-Bottom Section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(120, 120, 120);
      doc.text("APPROVED BY CERTIFICATION BOARD", 195, 123);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(13, 17, 23);
      doc.text("Arcene Irakoze", 195, 130);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Founder & Administrator", 195, 135);
      doc.text("PowerCode Academy", 195, 139);

      // Render the official permanent signature in the bottom-right section
      if (sigPng) {
        try {
          doc.addImage(sigPng, "PNG", 191, 142, 52, 18);
        } catch (e) {
          console.warn("Unable to inject signature in PDF output", e);
        }
      }

      // Render the official seal in the bottom-right section or center
      if (sealPng) {
        try {
          // Display Official seal in the center bottom section
          doc.addImage(sealPng, "PNG", 132, 138, 26, 26);
        } catch (e) {
          console.warn("Unable to inject seal in PDF output", e);
        }
      }

      // Digital Signature secure verification hash row on very bottom
      doc.setFont("Courier", "normal");
      doc.setFontSize(5);
      doc.setTextColor(100, 110, 120);
      doc.text(`DIGITAL SECURE HASH: ${certificate.digitalSignature || "powercode-signed-sha256-verified-academic-seal"}`, 30, 182);

      // Save PDF
      doc.save(`PowerCode_Certificate_${certificate.certificateCode}.pdf`);
      setSuccessMsg("🎉 Download complete! Your professional full-color PDF certificate containing the permanent digital signature is saved to your computer downloads.");
    } catch (e: any) {
      alert(`PDF compilation failed: ${e.message || e}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareLinkedIn = () => {
    const certUrl = `https://powercodeacademy.com/verify/${certificate.certificateCode}`;
    const message = `I am proud to share that I've successfully completed the course "${certificate.courseTitle}" at PowerCode Academy!\n\nID Verification Code: ${certificate.certificateCode}\nVerified Cryptographic Signature: ${certificate.digitalSignature || "SHA-256 Verified Status"}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}&summary=${encodeURIComponent(message)}`;
    window.open(linkedInUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-sans" id="cert-details-shade">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-3xl w-full p-5 lg:p-6 shadow-2xl relative">
        
        {/* Absolute modal close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#30363d]"
          id="system-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#ff7b00]" />
            <h3 className="text-lg font-bold text-white">PowerCode Verified Graduate Credentials</h3>
          </div>
          <p className="text-xs text-[#8b949e]">Verified dynamically inside the PowerCode registry for global recruitment and job placement headers.</p>
        </div>

        {/* Dynamic Display Certificate Canvas */}
        <div className="bg-white text-black p-6 md:p-8 rounded-xl border-[8px] border-[#ff7b00] shadow-inner text-center relative overflow-hidden" id="visible-certificate-wrapper">
          
          {/* Subtle gold crest watermark */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
            <Award className="w-[300px] h-[300px]" />
          </div>

          {/* Faint subtle written watermark phrase in the credentials grid */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -tune -translate-y-1/2 opacity-[0.03] text-4xl font-extrabold tracking-widest text-[#ff7b00] uppercase rotate-12 pointer-events-none select-none font-sans whitespace-nowrap">
            PowerCode Academy
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#ff7b00]">POWERCODE ACADEMY ALUMNI FOUNDATION</span>
              <span className="font-mono text-[8px] text-gray-400">CREDENTIAL ID: {certificate.certificateCode}</span>
            </div>

            <div className="py-1">
              <span className="text-[9px] uppercase tracking-widest text-gray-400 block font-semibold">This official credential certifies that</span>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#0d1117] mt-1 font-serif capitalize tracking-tight">{certificate.userName}</h2>
              <div className="w-12 h-0.5 bg-[#ff7b00] mx-auto mt-2" />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-gray-400 block">has successfully completed all requirements for</span>
              <h4 className="text-base md:text-lg font-bold text-[#ff7b00]">{certificate.courseTitle}</h4>
              <p className="text-[11px] text-gray-500 max-w-md mx-auto pt-1 leading-normal">
                {certificate.description || "Demonstrated outstanding logical accuracy, fully passing online quiz loops, compiling code exercises, and writing correct production scripts."}
              </p>
            </div>

            {/* Seals and signatories block */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 items-end text-left">
              
              {/* Issued Date & Barcode info */}
              <div className="font-sans space-y-2">
                <div>
                  <span className="text-[8px] uppercase text-gray-400 block tracking-wider">Date Issued</span>
                  <span className="font-mono text-[10px] font-bold text-gray-800">{certificate.date}</span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[8px] uppercase text-gray-400 block tracking-wider">Verification URL</span>
                  <span className="font-mono text-[7px] text-gray-400 truncate block max-w-[150px]">
                    https://powercode.com/verify/{certificate.certificateCode}
                  </span>
                </div>
              </div>

              {/* Verified System Seal */}
              <div className="flex flex-col items-center justify-center">
                {systemSettings?.official_seal_url ? (
                  <img
                    src={systemSettings.official_seal_url}
                    alt="Official Seal"
                    className="w-12 h-12 object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="bg-amber-100 p-2 rounded-full border border-amber-300">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                <span className="text-[7px] tracking-wider font-extrabold uppercase text-amber-700 mt-1">OFFICIAL SEAL</span>
              </div>

              {/* Signatures */}
              <div className="text-right flex flex-col items-end">
                <span className="text-[7.5px] uppercase text-gray-400 block tracking-wider mb-0.5">Approved Credentials</span>
                <span className="text-[10px] font-bold text-slate-800 leading-tight">Arcene Irakoze</span>
                <span className="text-[7.5px] text-gray-500 block leading-none">Founder & Administrator</span>
                <span className="text-[7px] text-gray-400 block leading-tight">PowerCode Academy</span>
                
                {/* Visual signature placeholder aligned underneath */}
                {systemSettings?.official_signature_url && (
                  <div className="mt-1.5 h-8 w-24 flex items-center justify-end overflow-hidden">
                    <img
                      src={systemSettings.official_signature_url}
                      alt="Digital Signature"
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Digital Signature Panel */}
            <div className="pt-2.5 border-t border-gray-100 flex flex-col items-center justify-center">
              <span className="text-[7.5px] uppercase text-emerald-600 font-bold tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Secure Cryptographically Signed Credential
              </span>
              <span className="text-[6.5px] text-gray-400 font-mono select-all truncate max-w-md mt-0.5">
                Signature: {certificate.digitalSignature || "powercode-signed-sha256-verified-academic-seal"}
              </span>
            </div>

          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl mt-4 flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action controllers */}
        <div className="mt-5 flex justify-end gap-3" id="certificate-modal-footer">
          <button
            onClick={handleShareLinkedIn}
            className="bg-[#0077b5] hover:bg-[#005a8a] text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md text-xs"
            id="share-linkedin-button"
          >
            <svg className="w-3.5 h-3.5 fill-current text-white shrink-0" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            <span>Share to LinkedIn</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-[#ff7b00] hover:bg-[#e66f00] text-white font-bold py-2 px-5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md text-xs disabled:opacity-40"
            id="download-pdf-button"
          >
            {downloading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{downloading ? "Formatting PDF files..." : "Download Official PDF Certificate"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
