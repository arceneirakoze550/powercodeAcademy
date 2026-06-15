// Dynamic Audio Synthesizer & Loud Voice Speaking engine using Web Audio and SpeechSynthesis APIs
// Bypasses file loading errors and works on all desktop/mobile browsers instantly.

export function speakNotification(text: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Speech synthesis not supported in this browser environment.");
      return;
    }

    // Cancel any ongoing speaking queues to play the fresh notification immediately
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1.0; // Loud volume
    utterance.rate = 0.95;   // Slightly elegant and clear rate
    utterance.pitch = 1.0;   // Well-balanced pitch

    // Try finding a suitable english speaker voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const bestVoice = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
                        voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("natural")) ||
                        voices.find(v => v.lang.startsWith("en"));
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
    console.log(`[Audio] Notification Speech synthesis spoken out loud: "${text}"`);
  } catch (error) {
    console.warn("Speech synthesis skipped or blocked by browser user gesture policies:", error);
  }
}

export function playNotificationSound(type: "success" | "warning" | "info" | "error") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    if (type === "success") {
      // Warm, professional ascending chime
      const freqs = [523.25, 659.25, 783.99, 1046.55]; // C5, E5, G5, C6
      freqs.forEach((f, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime + index * 0.08);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.3);
        
        osc.start(ctx.currentTime + index * 0.08);
        osc.stop(ctx.currentTime + index * 0.08 + 0.35);
      });
    } else if (type === "info") {
      // Elegant crystal high ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === "warning") {
      // Double urgent minor caution tone
      [0, 0.15].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime + delay);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
        
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } else if (type === "error") {
      // Flat double failure buzz
      [0, 0.12].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, ctx.currentTime + delay); // gritty low hz
        
        gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
        
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    }
  } catch (error) {
    console.warn("AudioContext skipped or blocked by browser user gesture policies:", error);
  }
}

interface SoundRegistry {
  id: number;
  alertType: string;
  url: string;
  fileName: string;
}

let isAudioUnlocked = false;
export function unlockAudio() {
  if (isAudioUnlocked) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
    }
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance("");
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    }
    isAudioUnlocked = true;
    console.log("[Audio] Audio engines and voice synthesis successfully unlocked via user interaction.");
  } catch (err) {
    console.warn("Failed to unlock audio context dynamically:", err);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
}

export const SoundManager = {
  // Play sound based on alertType, checking database-configured sounds first
  async playSound(type: "success" | "warning" | "info" | "error", message?: string) {
    try {
      const res = await fetch("/api/notifications/sounds");
      const data = await res.json();
      if (data.success && Array.isArray(data.sounds)) {
        const boundSound = data.sounds.find((s: SoundRegistry) => s.alertType === type);
        if (boundSound && boundSound.url) {
          const audioObj = new Audio(boundSound.url);
          audioObj.volume = 0.8;
          await audioObj.play();
          if (message) {
            // Also speak the custom message if desired
            speakNotification(message);
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Could not load dynamic sound from registry, falling back to synthesizer:", err);
    }
    
    // Fallback to both synthesizer beep/chime and spoken voice
    if (message) {
      speakNotification(message);
    } else {
      playNotificationSound(type);
    }
  },

  playNewPaymentRequest(contentTitle?: string) {
    const titleText = contentTitle || "Premium Content";
    const speechText = `Attention! New payment proof submitted for: ${titleText}. Please verify.`;
    this.playSound("info", speechText);
  },

  playPaymentApproved(contentTitle?: string) {
    const titleText = contentTitle || "Licensed Material";
    const speechText = `Hooray! Your payment for ${titleText} has been approved. Your premium access is unlocked!`;
    this.playSound("success", speechText);
  },

  playPaymentRejected(contentTitle?: string) {
    const titleText = contentTitle || "Premium Content";
    const speechText = `Attention. Your payment request for ${titleText} was rejected. Please review.`;
    this.playSound("error", speechText);
  },

  playAdminWarning(warningMessage?: string) {
    const speechText = `System warning dispatched! ${warningMessage || "Please review system logs."}`;
    this.playSound("warning", speechText);
  }
};
