import React, { useState, useEffect } from "react";
import { Film, Upload, Film as VideoIcon, Trash2, Edit, RefreshCw, AlertCircle, Play, CheckCircle } from "lucide-react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface MediaItem {
  id: number;
  title: string;
  videoUrl?: string;
  parentName?: string;
  tableType: "lessons" | "tutorials";
  parentId?: number;
  parentCourseId?: number;
}

interface MediaManagerProps {
  user: { email: string };
  setFeedback: (msg: string) => void;
  triggerToast?: (message: string, type?: string) => void;
}

export default function ContentMediaManager({ user, setFeedback, triggerToast }: MediaManagerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

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

  const loadMediaOptions = async () => {
    setLoading(true);
    try {
      // Fetch all courses to drill down to lessons
      const courseRes = await fetch("/api/courses", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      const courseData = await courseRes.json();
      
      const lessonsList: MediaItem[] = [];
      if (Array.isArray(courseData)) {
        courseData.forEach((c: any) => {
          if (Array.isArray(c.modules)) {
            c.modules.forEach((m: any) => {
              if (Array.isArray(m.lessons)) {
                m.lessons.forEach((l: any) => {
                  lessonsList.push({
                    id: l.id,
                    title: l.title,
                    videoUrl: l.videoUrl || "",
                    parentName: `Course: ${c.title} • Module: ${m.title}`,
                    tableType: "lessons",
                    parentCourseId: c.id
                  });
                });
              }
            });
          }
        });
      }

      // Fetch all tutorials
      const tutorialRes = await fetch("/api/tutorials", {
        headers: { "Authorization": `Bearer ${user.email}` }
      });
      const tutorialData = await tutorialRes.json();
      const tutorialsList: MediaItem[] = [];
      if (Array.isArray(tutorialData?.tutorials)) {
        tutorialData.tutorials.forEach((t: any) => {
          tutorialsList.push({
            id: t.id,
            title: t.title,
            videoUrl: t.videoUrl || "",
            parentName: `Tutorial Feed Link`,
            tableType: "tutorials"
          });
        });
      }

      setItems([...lessonsList, ...tutorialsList]);
    } catch (err) {
      console.error("Failed to load platform media files", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMediaOptions();
  }, []);

  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>, item: MediaItem) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(item.id);
    setFeedback(`Uploading "${file.name}" to Cloudinary simulator sandbox...`);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        
        // Trigger Cloudinary Storage Simulator
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: "video",
            fileData: base64Data
          })
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.secure_url) {
          const cloudUrl = uploadData.secure_url;
          
          // Save back into DB via dynamic controllers
          let saveRes;
          if (item.tableType === "lessons") {
            // Update lesson fields on the sub-nesting. 
            // In server.ts PUT /api/admin/tables/lessons/:rowId updates the lesson perfectly
            saveRes = await fetch(`/api/admin/tables/lessons/${item.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${user.email}`
              },
              body: JSON.stringify({
                title: item.title,
                videoUrl: cloudUrl
              })
            });
          } else {
            saveRes = await fetch(`/api/admin/tables/tutorials/${item.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${user.email}`
              },
              body: JSON.stringify({
                videoUrl: cloudUrl
              })
            });
          }

          const saveData = await saveRes.json();
          if (saveData.success) {
            setFeedback(`✅ Media registered! "${file.name}" is now live on our simulated CDN.`);
            loadMediaOptions();
          } else {
            alert(saveData.error || "Save mismatch error");
          }
        } else {
          alert("Cloudinary connection failed inside internal simulator pipeline.");
        }
      } catch (err: any) {
        alert("Upload parsing failure: " + err.message);
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteVideo = (item: MediaItem) => {
    openDeleteConfirmation(
      "Erase Video content reference?",
      `Erase video content reference from "${item.title}"?`,
      async () => {
        let saveRes;
        if (item.tableType === "lessons") {
          saveRes = await fetch(`/api/admin/tables/lessons/${item.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${user.email}`
            },
            body: JSON.stringify({
              title: item.title,
              videoUrl: "" // Clear reference to show empty
            })
          });
        } else {
          saveRes = await fetch(`/api/admin/tables/tutorials/${item.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${user.email}`
            },
            body: JSON.stringify({
              videoUrl: ""
            })
          });
        }

        const saveData = await saveRes.json();
        if (!saveData.success) {
          throw new Error(saveData.error || "Failed to clear video reference");
        }

        setFeedback(`🧹 Video cleared successfully. Reference is empty.`);
        // Update local state immediately via local filter operation
        setItems(prev => prev.filter(x => !(x.id === item.id && x.tableType === item.tableType)));
        if (triggerToast) {
          triggerToast(`Lecture Video reference removed: "${item.title}" 🧹`, "warning");
        }
        loadMediaOptions();
      }
    );
  };

  const filteredItems = activeFilter === "ALL" ? items : items.filter(x => x.tableType === activeFilter);

  if (loading) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] p-8 rounded-2xl flex flex-col justify-center items-center gap-3">
        <RefreshCw className="w-6 h-6 text-[#ff7b00] animate-spin" />
        <span className="text-xs text-gray-400 font-sans font-medium">Scanning catalog lesson videos...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-5 font-sans" id="media-manager-portal">
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
            <Film className="w-4 h-4 text-[#ff7b00]" />
            CLOUDINARY CONTENT MEDIA MANAGER (VIDEOS)
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">Audit, upload, or replace active lesson videos/lectures. Zero hardcoded assets enforced.</p>
        </div>
        <button 
          onClick={loadMediaOptions}
          className="px-2.5 py-1 bg-[#21262d] border border-[#30363d] text-gray-300 rounded hover:text-white hover:bg-[#30363d] text-[11px] flex items-center gap-1.5 font-bold transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload Catalog
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Source category:</span>
          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="bg-[#161b22] border border-[#30363d] text-xs text-white rounded px-2 py-1 outline-none font-sans cursor-pointer focus:border-[#ff7b00]"
          >
            <option value="ALL">All Media Sources (Lessons & Tutorials)</option>
            <option value="lessons">Course Lessons</option>
            <option value="tutorials">Tutorials</option>
          </select>
        </div>
      </div>

      {previewVideoUrl && (
        <div className="bg-[#0d1117] border border-[#ff7b00]/30 p-3 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 uppercase font-bold text-orange-400 animate-pulse flex items-center gap-1">
              <Play className="w-3 h-3 fill-orange-400" /> Active Video Live Preview
            </span>
            <button 
              onClick={() => setPreviewVideoUrl(null)}
              className="text-[#ff7b00] hover:text-white text-[10px] font-bold"
            >
              [Dismiss Preview]
            </button>
          </div>
          <video src={previewVideoUrl} controls className="w-full max-h-[220px] rounded bg-black" autoPlay />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const isHardcodedPlaceholder = !item.videoUrl || item.videoUrl.includes("mov_bbb.mp4") || item.videoUrl === "https://www.w3schools.com/html/mov_bbb.mp4";
          const isEmpty = !item.videoUrl;

          return (
            <div key={`${item.tableType}-${item.id}`} className="p-4 bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] rounded-2xl flex flex-col justify-between gap-3 transition-all">
              <div>
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[9px] bg-[#161b22] border border-[#30363d] text-gray-400 font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                    {item.tableType === "lessons" ? "COURSE LECTURE" : "TUTORIAL"}
                  </span>
                  <span className="text-gray-500 font-mono text-[9px]">ID: {item.id}</span>
                </div>

                <h5 className="font-bold text-white text-sm mt-2">{item.title}</h5>
                <span className="text-[10px] text-gray-400 block mt-0.5">{item.parentName}</span>

                <div className="mt-3 bg-[#161b22] p-2.5 rounded-xl border border-[#21262d]">
                  {isEmpty ? (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>No video uploaded yet</span>
                    </div>
                  ) : isHardcodedPlaceholder ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>Hardcoded standard placeholder</span>
                      </div>
                      <p className="text-[9px] text-gray-500 break-all font-mono select-all mt-0.5">{item.videoUrl}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[#ff7b00] text-xs font-semibold">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-bold uppercase tracking-wider text-[9px] bg-green-500/10 px-1.5 py-0.5 rounded">SIMULATOR live cdn</span>
                      </div>
                      <p className="text-[9.5px] text-gray-400 break-all font-mono leading-relaxed select-all">{item.videoUrl}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#21262d] pt-3 mt-1">
                <div className="flex items-center gap-2">
                  {!isEmpty && (
                    <button 
                      onClick={() => setPreviewVideoUrl(item.videoUrl || null)}
                      className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] rounded font-bold uppercase tracking-wide transition-all"
                    >
                      Preview
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="px-2.5 py-1.5 bg-[#ff7b00]/10 hover:bg-[#ff7b00]/20 text-[#ff7b00] border border-[#ff7b00]/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    {uploadingId === item.id ? "Uploading..." : isEmpty ? "Upload Lecture" : "Replace Lecture"}
                    <input 
                      type="file" 
                      accept="video/*" 
                      onChange={(e) => handleFileUploadChange(e, item)}
                      className="hidden" 
                      disabled={uploadingId !== null}
                    />
                  </label>

                  {!isEmpty && (
                    <button 
                      onClick={() => handleDeleteVideo(item)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all"
                      title="Clear Video Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
