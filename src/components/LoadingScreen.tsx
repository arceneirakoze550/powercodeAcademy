import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame } from "lucide-react";

interface LoadingScreenProps {
  isVisible: boolean;
  message?: string;
}

export default function LoadingScreen({ isVisible, message }: LoadingScreenProps) {
  const [internalVisible, setInternalVisible] = useState(isVisible);
  const [progressPercent, setProgressPercent] = useState(5);

  // Sync isVisible state with internal state for smooth animations
  useEffect(() => {
    if (isVisible) {
      setInternalVisible(true);
      setProgressPercent(5);

      // Start progress simulation
      const interval = setInterval(() => {
        setProgressPercent((oldPercent) => {
          if (oldPercent >= 95) return 95; // Stop just before 100
          const increment = Math.floor(Math.random() * 15) + 5;
          return Math.min(oldPercent + increment, 95);
        });
      }, 200);

      return () => {
        clearInterval(interval);
      };
    } else {
      // Complete bar first on load end, then wait brief period to close
      setProgressPercent(100);
      const timer = setTimeout(() => {
        setInternalVisible(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!internalVisible) return null;

  return (
    <AnimatePresence>
      {internalVisible && (
        <div
          id="powercode-branded-loading-overlay"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d1117] text-white select-none overflow-hidden"
        >
          {/* YouTube-style Top Progress Loading Bar */}
          <div className="fixed top-0 left-0 right-0 h-1 bg-[#1e222b] z-[10000]">
            <motion.div
              className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 shadow-[0_0_8px_rgba(255,123,0,0.5)]"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </div>

          {/* Simple, Clean Gmail/YouTube style loading logo and indicator */}
          <div className="flex flex-col items-center max-w-sm px-6 text-center space-y-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-16 h-16 bg-[#161b22] border border-[#30363d] p-3 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <img 
                src="/powercodeacademy.png" 
                referrerPolicy="no-referrer" 
                alt="PowerCode Academy Logo" 
                className="w-full h-full object-contain" 
              />
            </motion.div>

            <div className="space-y-1">
              <h1 className="text-sm font-bold tracking-widest text-white uppercase font-mono">
                POWERCODE ACADEMY
              </h1>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-mono">
                Learning Workspace
              </p>
            </div>

            {/* Simple subtle loading label */}
            <div className="flex items-center gap-2 bg-[#161b22] border border-[#21262d] rounded-full py-1 px-3">
              <Flame className="w-3 h-3 text-[#ff7b00] animate-pulse shrink-0" />
              <span className="text-[10px] font-bold font-mono text-gray-400">
                {message || "Loading workspace..."}
              </span>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
