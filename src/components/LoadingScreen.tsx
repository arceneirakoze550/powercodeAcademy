import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Terminal, Flame, BookOpen } from "lucide-react";

interface LoadingScreenProps {
  isVisible: boolean;
  message?: string;
}

export default function LoadingScreen({ isVisible, message }: LoadingScreenProps) {
  const [internalVisible, setInternalVisible] = useState(isVisible);
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);
  const [progressPercent, setProgressPercent] = useState(5);

  // Sync isVisible state with internal state for smooth animations
  useEffect(() => {
    if (isVisible) {
      setInternalVisible(true);
      setShowLongWaitMessage(false);
      setProgressPercent(5);

      // Start progress simulation
      const interval = setInterval(() => {
        setProgressPercent((oldPercent) => {
          if (oldPercent >= 95) return 95; // Stop just before 100
          const increment = Math.floor(Math.random() * 15) + 5;
          return Math.min(oldPercent + increment, 95);
        });
      }, 350);

      // 3 seconds timer for long wait notice
      const timeout = setTimeout(() => {
        setShowLongWaitMessage(true);
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      // Complete bar first on load end, then wait brief period to close
      setProgressPercent(100);
      const timer = setTimeout(() => {
        setInternalVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!internalVisible) return null;

  return (
    <AnimatePresence>
      {internalVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          id="powercode-branded-loading-overlay"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d1117] text-white select-none overflow-hidden"
        >
          {/* Animated Matrix-like subtle grid lines in background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#161b22_1px,transparent_1px),linear-gradient(to_bottom,#161b22_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

          {/* Glowing background ambiances */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#ff7b00]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

          {/* Central Logo and Spinner Container */}
          <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
            
            {/* Double Rotating Loader Ring Container holding the logo */}
            <div className="relative mb-8 flex items-center justify-center h-40 w-40">
              
              {/* Pulsing Backglow */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-[#ff7b00]/20 to-amber-500/20 blur-xl animate-pulse" />

              {/* Outer Spinner Track */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#21262d]" />

              {/* Outer Spinner Ring (Fast Clockwise) */}
              <motion.div 
                className="absolute inset-0 rounded-full border-t-2 border-[#ff7b00]"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />

              {/* Inner Spinner Ring (Slower Counter-Clockwise) */}
              <motion.div 
                className="absolute inset-3 rounded-full border-b-2 border-amber-400 opacity-60"
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              />

              {/* High-Fidelity Vector Brand Logo Emblem */}
              <motion.div 
                className="absolute z-10 bg-[#161b22] border-2 border-[#30363d] h-24 w-24 rounded-2xl flex items-center justify-center shadow-2xl shadow-[#ff7b00]/15 overflow-hidden p-2"
                animate={{
                  scale: [1, 1.03, 1],
                  boxShadow: ["0px 0px 15px rgba(255, 123, 0, 0.15)", "0px 0px 25px rgba(255, 123, 0, 0.3)", "0px 0px 15px rgba(255, 123, 0, 0.15)"]
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <img 
                  src="/powercodeacademy.png" 
                  referrerPolicy="no-referrer" 
                  alt="PowerCode Academy Logo" 
                  className="w-full h-full object-contain" 
                />
              </motion.div>
            </div>

            {/* Typography / Branding Header */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="space-y-1.5"
            >
              <h1 className="text-xl font-black tracking-[0.25em] text-white uppercase font-sans flex items-center justify-center gap-1.5">
                POWERCODE
                <span className="text-[#ff7b00] h-2 w-2 rounded-full bg-[#ff7b00] animate-ping inline-block shrink-0" />
              </h1>
              <span className="text-[10px] font-bold text-gray-500 tracking-[0.4em] uppercase block font-mono pl-1">
                ACADEMY SYSTEM
              </span>
            </motion.div>

            {/* Dynamic Status Display Message */}
            <div className="mt-8 min-h-[44px] flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={message || "Loading system core..."}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2 bg-[#161b22]/80 border border-[#30363d]/50 rounded-full py-1.5 px-4 shadow-inner"
                >
                  <Flame className="w-3.5 h-3.5 text-[#ff7b00] animate-bounce shrink-0" />
                  <span className="text-xs font-mono font-bold text-gray-300">
                    {message || "Loading system core..."}
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* Long load notice threshold (displayed after 3 seconds) */}
              {showLongWaitMessage && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] text-gray-400 mt-2.5 animate-pulse italic leading-relaxed"
                >
                  Preparing your learning experience... Please hold on.
                </motion.p>
              )}
            </div>

            {/* Progress Bar Container */}
            <div className="w-48 bg-[#161b22] border border-[#21262d] rounded-full h-1.5 mt-5 overflow-hidden p-[1px]">
              <motion.div
                className="bg-gradient-to-r from-[#ff7b00] to-amber-400 h-full rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Micro Badge Footer Info */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-25 flex items-center gap-1 text-[9px] font-mono whitespace-nowrap tracking-wider text-gray-500">
              <Terminal className="w-3 h-3 text-[#ff7b00]" />
              <span>POWERCODE ENGINE BUILD V2026.14</span>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
