// Dynamic Audio Synthesizer using Web Audio API for Professional Beeps & Chimes
// Bypasses file loading errors and works on all desktop/mobile browsers instantly.

export function playNotificationSound(type: "success" | "warning" | "info" | "error") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    if (type === "success") {
      // Warm, professional ascending chime
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.1); // D6 fallback
      
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

export const SoundManager = {
  // Play sound based on alertType, checking database-configured sounds first
  async playSound(type: "success" | "warning" | "info" | "error") {
    try {
      const res = await fetch("/api/notifications/sounds");
      const data = await res.json();
      if (data.success && Array.isArray(data.sounds)) {
        const boundSound = data.sounds.find((s: SoundRegistry) => s.alertType === type);
        if (boundSound && boundSound.url) {
          const audioObj = new Audio(boundSound.url);
          audioObj.volume = 0.8;
          await audioObj.play();
          return;
        }
      }
    } catch (err) {
      console.warn("Could not load dynamic sound from registry, falling back to synthesizer:", err);
    }
    
    // Fallback to synthesized audio chimes
    playNotificationSound(type);
  },

  playNewPaymentRequest() {
    this.playSound("info");
  },

  playPaymentApproved() {
    this.playSound("success");
  },

  playPaymentRejected() {
    this.playSound("error");
  },

  playAdminWarning() {
    this.playSound("warning");
  }
};
