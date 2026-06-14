import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setErrorMsg("");
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-sans" id="confirm-delete-overlay">
      <div className="bg-[#161b22] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button 
          onClick={onClose} 
          disabled={isDeleting} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#30363d] disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center pb-4 border-b border-[#21262d] mb-5">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
            {title}
          </h3>
          <p className="text-xs text-[#8b949e] mt-1.5 leading-relaxed">{description}</p>
        </div>

        {errorMsg && (
          <div className="bg-[#f85149]/10 border border-[#f85149]/20 text-xs text-[#f85149] p-3 rounded-lg flex items-center gap-2 font-mono mb-4">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end gap-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#21262d] text-[#c9d1d9] border border-[#30363d] hover:bg-[#30363d] cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
