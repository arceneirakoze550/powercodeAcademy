import React, { useState, useEffect } from "react";
import { Trash, Trash2, RotateCcw, AlertTriangle, Shield, Check, RefreshCw } from "lucide-react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface TrashItem {
  id: number;
  title?: string;
  name?: string;
  status: string;
  deleted_at?: string;
  deleted_by?: string;
  courseTitle?: string;
  moduleTitle?: string;
}

interface TrashData {
  courses: TrashItem[];
  tutorials: TrashItem[];
  lessons: TrashItem[];
  pdfs: TrashItem[];
  quizzes: TrashItem[];
  challenges: TrashItem[];
  announcements: TrashItem[];
}

interface TrashProps {
  user: { email: string; name: string };
  loadPlatformData: () => void;
  setFeedback: (msg: string) => void;
  triggerToast?: (message: string, type?: string) => void;
}

export default function TrashManager({ user, loadPlatformData, setFeedback, triggerToast }: TrashProps) {
  const [trashData, setTrashData] = useState<TrashData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [selectedItems, setSelectedItems] = useState<{ table: string; id: number }[]>([]);

  // REUSABLE CONFIRM DELETE MODAL STATE
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

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trash", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      const data = await res.json();
      if (data.success && data.trash) {
        setTrashData(data.trash);
      } else {
        console.error("Failed to fetch trash data:", data.error);
      }
    } catch (err) {
      console.error("Error loading trash bin logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleToggleSelect = (table: string, id: number) => {
    const exists = selectedItems.some(item => item.table === table && item.id === id);
    if (exists) {
      setSelectedItems(selectedItems.filter(item => !(item.table === table && item.id === id)));
    } else {
      setSelectedItems([...selectedItems, { table, id }]);
    }
  };

  const handleRestoreItem = async (table: string, id: number) => {
    try {
      const res = await fetch("/api/admin/trash/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({ table, id })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback(`✅ Successfully restored entry id ${id} from ${table}`);
        fetchTrash();
        loadPlatformData();
      } else {
        alert(data.error || "Restoration failure");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDeleteItem = (table: string, id: number) => {
    openDeleteConfirmation(
      "Permanently Delete Asset?",
      "⚠️ WARNING: Are you sure you want to PERMANENTLY and IRREVERSIBLY delete this entry? This action cannot be revoked.",
      async () => {
        const res = await fetch(`/api/admin/tables/${table}/${id}?permanent=true`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user.email}` }
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to permanently delete asset");
        }

        setFeedback(`🧹 Standard purge successful: ${table} row deleted permanent.`);
        
        // Immediate local state update via filter operation
        setTrashData(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (table in updated) {
            const key = table as keyof TrashData;
            updated[key] = (updated[key] as TrashItem[]).filter(x => x.id !== id);
          }
          return updated;
        });

        if (triggerToast) {
          triggerToast(`Asset permanently purged from ${table}! 🧹`, "success");
        }
        fetchTrash();
        loadPlatformData();
      }
    );
  };

  const handleBulkRestore = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Restore all ${selectedItems.length} selected items?`)) return;

    try {
      for (const item of selectedItems) {
        await fetch("/api/admin/trash/restore", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.email}`
          },
          body: JSON.stringify({ table: item.table, id: item.id })
        });
      }
      setFeedback(`✅ Restored ${selectedItems.length} items to database drafts.`);
      setSelectedItems([]);
      fetchTrash();
      loadPlatformData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkPurge = () => {
    if (selectedItems.length === 0) return;

    openDeleteConfirmation(
      "Bulk Permanent Deletion?",
      `⚠️ CRITICAL: Permanently and irreversibly purge all ${selectedItems.length} selected items? This cannot be undone.`,
      async () => {
        for (const item of selectedItems) {
          await fetch(`/api/admin/tables/${item.table}/${item.id}?permanent=true`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${user.email}` }
          });
        }
        setFeedback(`🧹 Bulk physical purge completed for ${selectedItems.length} items.`);
        
        // Immediate local state update via filter operation
        setTrashData(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          for (const item of selectedItems) {
            if (item.table in updated) {
              const key = item.table as keyof TrashData;
              updated[key] = (updated[key] as TrashItem[]).filter(x => x.id !== item.id);
            }
          }
          return updated;
        });

        setSelectedItems([]);
        if (triggerToast) {
          triggerToast(`All selected assets successfully purged! 🧹💥`, "success");
        }
        fetchTrash();
        loadPlatformData();
      }
    );
  };

  if (loading) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] p-8 rounded-2xl flex flex-col justify-center items-center gap-3">
        <RefreshCw className="w-6 h-6 text-[#ff7b00] animate-spin" />
        <span className="text-xs text-gray-400 font-sans font-medium">Scanning trash database sectors...</span>
      </div>
    );
  }

  // Flatten items for listing
  const courses = (trashData?.courses || []).map(x => ({ ...x, table: "courses", typeLabel: "Course" }));
  const tutorials = (trashData?.tutorials || []).map(x => ({ ...x, table: "tutorials", typeLabel: "Tutorial" }));
  const pdfs = (trashData?.pdfs || []).map(x => ({ ...x, table: "pdfs", typeLabel: "PDF Book" }));
  const quizzes = (trashData?.quizzes || []).map(x => ({ ...x, table: "quizzes", typeLabel: "Quiz Assessment" }));
  const challenges = (trashData?.challenges || []).map(x => ({ ...x, table: "challenges", typeLabel: "Coding Challenge" }));
  const announcements = (trashData?.announcements || []).map(x => ({ ...x, table: "announcements", typeLabel: "Announcement" }));
  const lessons = (trashData?.lessons || []).map(x => ({ ...x, table: "lessons", typeLabel: "Course Lesson" }));

  const allTrash = [...courses, ...tutorials, ...lessons, ...pdfs, ...quizzes, ...challenges, ...announcements];
  const filteredTrash = activeFilter === "ALL" ? allTrash : allTrash.filter(item => item.table === activeFilter);

  return (
    <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-5 font-sans" id="advanced-trash-bin">
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        description={deleteModal.description}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModal.onConfirm}
      />
      <div className="border-b border-[#30363d] pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Trash className="w-4 h-4 text-red-500 animate-pulse" />
            ACADEMY DELETED TRASH BIN AUDITOR
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">Review soft-deleted curricula assets, identify responsible authors, and perform restore operations.</p>
        </div>
        <button 
          onClick={fetchTrash}
          className="px-2.5 py-1 bg-[#21262d] border border-[#30363d] text-gray-300 rounded hover:text-white hover:bg-[#30363d] text-[11px] flex items-center gap-1.5 font-bold transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-scan
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Category filter:</span>
          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="bg-[#161b22] border border-[#30363d] text-xs text-white rounded px-2 py-1 outline-none font-sans cursor-pointer focus:border-[#ff7b00]"
          >
            <option value="ALL">All Categories</option>
            <option value="courses">Courses</option>
            <option value="lessons">Lessons</option>
            <option value="tutorials">Tutorials</option>
            <option value="pdfs">PDF Books</option>
            <option value="quizzes">Quizzes</option>
            <option value="challenges">Challenges</option>
            <option value="announcements">Announcements</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleBulkRestore}
            disabled={selectedItems.length === 0}
            className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore ({selectedItems.length})
          </button>
          <button 
            onClick={handleBulkPurge}
            disabled={selectedItems.length === 0}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Wipe Permanently ({selectedItems.length})
          </button>
        </div>
      </div>

      {filteredTrash.length === 0 ? (
        <div className="text-center py-8 bg-[#0d1117] border border-[#21262d] rounded-xl text-xs text-gray-400 flex flex-col justify-center items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-gray-500" />
          No soft-deleted curriculum or entries are registered in this division.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
          {filteredTrash.map((item) => {
            const isSelected = selectedItems.some(x => x.table === item.table && x.id === item.id);
            const dateStr = item.deleted_at ? new Date(item.deleted_at).toLocaleString() : "Unknown Timestamp";
            
            return (
              <div 
                key={`${item.table}-${item.id}`} 
                className={`p-3 bg-[#0d1117] border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans transition-all ${
                  isSelected ? "border-[#ff7b00]/50 bg-[#ff7b00]/5" : "border-[#21262d] hover:border-[#30363d]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(item.table, item.id)}
                    className="accent-[#ff7b00] mt-1 cursor-pointer w-4 h-4"
                  />
                  <div>
                    <h5 className="font-bold text-white flex flex-wrap items-center gap-1.5">
                      <span>{item.title || item.name || "Untitled Resource Item"}</span>
                      <span className="bg-[#161b22] text-[#8b949e] font-mono text-[9px] px-1.5 py-0.5 rounded border border-[#21262d]">Row ID: {item.id}</span>
                    </h5>
                    
                    {item.table === "lessons" && (
                      <p className="text-[10px] text-orange-400 mt-1 uppercase tracking-wider font-semibold">
                        Parent Course: {item.courseTitle} &gt; Module: {item.moduleTitle}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-gray-400">
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full text-[9px] uppercase font-bold">
                        {item.typeLabel}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        Deleted: {dateStr}
                      </span>
                      {item.deleted_by && (
                        <span className="flex items-center gap-1 font-mono text-gray-300">
                          By: {item.deleted_by}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 self-end sm:self-center">
                  <button 
                    onClick={() => handleRestoreItem(item.table, item.id)}
                    className="px-2 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 text-[10px] uppercase font-bold tracking-wider rounded-lg border border-green-500/20 transition-all flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                  <button 
                    onClick={() => handlePermanentDeleteItem(item.table, item.id)}
                    className="px-2 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red- hover:text-red-400 text-red-400 text-[10px] uppercase font-bold tracking-wider rounded-lg border border-red-500/20 transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Purge
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
