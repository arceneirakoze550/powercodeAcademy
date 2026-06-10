import React, { useRef, useState } from "react";
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
}

interface CertificateModalProps {
  certificate: Certificate;
  onClose: () => void;
}

export default function CertificateModal({ certificate, onClose }: CertificateModalProps) {
  const [downloading, setDownloading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");

  const handleDownloadPDF = () => {
    setDownloading(true);
    setSuccessMsg("");

    try {
      // Create landscape A4 landscape
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // Background Border
      doc.setDrawColor(255, 123, 0); // Orange
      doc.setLineWidth(2.5);
      doc.rect(8, 8, 281, 194); // Outer border

      doc.setDrawColor(13, 17, 23); // Slate
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 273, 186); // Inner thin border

      // Branding Header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(13, 17, 23); // Deep Slate
      doc.text("POWERCODE ACADEMY", 148, 32, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 110, 120);
      doc.text("INTERNATIONAL COMPUTER SCIENCE & PROGRAMMING FELLOWSHIP", 148, 38, { align: "center" });

      // Certificate ID
      doc.setFont("Courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(139, 148, 158);
      doc.text(`VERIFICATION CODE: ${certificate.certificateCode}`, 280 - 15, 20, { align: "right" });

      // Title
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text("This official credential certifies that", 148, 62, { align: "center" });

      // Student Name
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(230, 110, 0); // Darker orange
      doc.text(certificate.userName.toUpperCase(), 148, 78, { align: "center" });

      // Line decoration
      doc.setDrawColor(255, 123, 0);
      doc.setLineWidth(1.5);
      doc.line(108, 86, 188, 86);

      // Description text
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text(
        "has successfully demonstrated complete programming proficiency and completed all curricula for",
        148,
        98,
        { align: "center" }
      );

      // Course Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(13, 17, 23);
      doc.text(certificate.courseTitle, 148, 112, { align: "center" });

      // Meta description description text
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const descText = certificate.description || "Demonstrated outstanding algorithmic accuracy, writing, compiled testing, and deploying logical software models within our sandbox.";
      doc.text(descText, 148, 122, { align: "center" });

      // Seal decoration (Drawing vector circular golden seal)
      doc.setDrawColor(255, 123, 0);
      doc.setLineWidth(0.8);
      doc.setFillColor(255, 240, 220);
      doc.circle(148, 160, 14, "FD"); // Seal body
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(200, 80, 0);
      doc.text("OFFICIAL", 148, 158, { align: "center" });
      doc.text("SEAL", 148, 162, { align: "center" });
      doc.setFontSize(5);
      doc.text("POWERCODE", 148, 166, { align: "center" });

      // Date Issued
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("DATE ISSUED", 40, 150);
      doc.setFont("Courier", "bold");
      doc.setFontSize(11);
      doc.setTextColor(13, 17, 23);
      doc.text(certificate.date, 40, 158);

      // Approved Credentials
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("APPROVED BY CERTIFICATION BOARD", 200, 150);

      // Founder Signatures
      doc.setFont("Courier", "italic");
      doc.setFontSize(12);
      doc.setTextColor(255, 123, 0);
      doc.text("Arcene Irakoze", 200, 159); // Sign placeholder

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Founder & Administrator, PowerCode Academy", 200, 165);

      // QR Verification code box representation
      doc.rect(20, 168, 15, 15);
      doc.setFont("Courier", "bold");
      doc.setFontSize(5);
      doc.setTextColor(150, 150, 150);
      doc.text("SECURE", 20, 186);
      doc.text("VERIFIED", 20, 189);

      // Save PDF down
      doc.save(`PowerCode_Certificate_${certificate.certificateCode}.pdf`);
      setSuccessMsg("🎉 Download complete! Your professional PDF certificate is saved to your computer downloads.");
    } catch (e: any) {
      alert(`PDF compiling failed: ${e.message || e}`);
    } finally {
      setDownloading(false);
    }
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
        <div className="bg-white text-black p-6 md:p-10 rounded-xl border-[8px] border-[#ff7b00] shadow-inner text-center relative overflow-hidden" id="visible-certificate-wrapper">
          
          {/* Subtle gold crest watermark watermark */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
            <Award className="w-[300px] h-[300px]" />
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#ff7b00]">POWERCODE ACADEMY ALUMNI FOUNDATION</span>
              <span className="font-mono text-[9px] text-gray-400">CREDENTIAL ID: {certificate.certificateCode}</span>
            </div>

            <div className="py-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 block font-semibold">This official credential certifies that</span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#0d1117] mt-2 font-serif capitalize tracking-tight">{certificate.userName}</h2>
              <div className="w-16 h-0.5 bg-[#ff7b00] mx-auto mt-3" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 block">has successfully completed all requirements for</span>
              <h4 className="text-lg md:text-xl font-bold text-[#ff7b00]">{certificate.courseTitle}</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto pt-2 leading-relaxed">
                {certificate.description || "Demonstrated outstanding logical accuracy, fully passing online quiz loops, compiling code exercises, and writing correct production scripts."}
              </p>
            </div>

            {/* Seals and signatories block */}
            <div className="grid grid-cols-3 gap-2 pt-6 border-t border-gray-100 items-end text-left">
              
              {/* Issued Date */}
              <div className="font-sans">
                <span className="text-[8px] uppercase text-gray-400 block tracking-wider">Date Issued</span>
                <span className="font-mono text-[11px] font-bold text-gray-800">{certificate.date}</span>
              </div>

              {/* Verified System Seal */}
              <div className="flex flex-col items-center justify-center">
                <div className="bg-amber-100 p-2 rounded-full border border-amber-300">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
                </div>
                <span className="text-[8px] tracking-wider font-bold uppercase text-amber-700 mt-1">OFFICIAL GOLD SEAL</span>
              </div>

              {/* Signatures */}
              <div className="text-right">
                <span className="text-[8px] uppercase text-gray-400 block tracking-wider">Approved Credentials</span>
                <span className="font-serif italic text-sm text-[#ff7b00] block">Arcene Irakoze</span>
                <span className="text-[8px] text-gray-500 block leading-tight">Founder, PowerCode Academy</span>
              </div>

            </div>

          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl mt-4 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action controllers */}
        <div className="mt-5 flex justify-end gap-3" id="certificate-modal-footer">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-[#ff7b00] hover:bg-[#e66f00] text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md text-xs disabled:opacity-40"
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

interface ShieldCheckProps {
  className?: string;
}
