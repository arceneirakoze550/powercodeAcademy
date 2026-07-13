import React from "react";
import { Check, Circle } from "lucide-react";
import { Course } from "../types";

interface ModuleProgressBarProps {
  course: Course;
  showDetails?: boolean;
}

export function ModuleProgressBar({ course, showDetails = false }: ModuleProgressBarProps) {
  const modules = course.modules || [];
  const totalModules = modules.length;
  
  if (totalModules === 0) return null;

  // Calculate module completions
  const completedModulesCount = modules.filter(m => m.isCompleted).length;
  const progressPercent = course.progressPercent ?? 0;

  return (
    <div className="space-y-2.5 font-sans">
      {/* Percentage and Text summary */}
      <div className="flex justify-between items-center text-[11px] font-mono">
        <span className="text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <span>{completedModulesCount} of {totalModules} modules finished</span>
        </span>
        <span className="text-[#ff7b00] font-bold">{progressPercent}%</span>
      </div>

      {/* Stepped visual blocks - One pill block per module */}
      <div className="flex gap-1.5 h-2">
        {modules.map((mod, idx) => {
          // A module is completed if isCompleted is true, or if progressPercent is 100
          const isCompleted = mod.isCompleted || progressPercent === 100;
          return (
            <div
              key={mod.id || idx}
              className={`flex-1 rounded-sm h-full transition-all duration-300 relative group ${
                isCompleted 
                  ? "bg-[#ff7b00] shadow-[0_0_8px_rgba(255,123,0,0.4)]" 
                  : "bg-[#21262d]"
              }`}
              title={`${mod.title}: ${isCompleted ? "Completed" : "In Progress"}`}
            >
              {/* Micro tooltips on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-neutral-900 text-[10px] text-white px-2 py-1 rounded border border-[#30363d] whitespace-nowrap z-20 shadow-xl">
                <span className="font-bold text-[#ff7b00]">{mod.title}</span> - {isCompleted ? "Completed" : "In Progress"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional expander details list (perfect for dashboard view) */}
      {showDetails && (
        <div className="mt-2.5 pt-2 border-t border-[#30363d]/40 space-y-1.5">
          {modules.map((mod, idx) => {
            const isCompleted = mod.isCompleted || progressPercent === 100;
            return (
              <div key={mod.id || idx} className="flex items-center justify-between text-[10px] text-gray-400">
                <span className="truncate max-w-[180px] text-gray-300 font-sans">{idx + 1}. {mod.title}</span>
                <span className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
                  {isCompleted ? (
                    <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-emerald-500/20">
                      <Check className="w-2.5 h-2.5" />
                      Completed
                    </span>
                  ) : (
                    <span className="text-gray-500 bg-[#21262d] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Circle className="w-2 h-2 fill-current" />
                      Active
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
