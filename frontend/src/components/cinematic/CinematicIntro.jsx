import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles, CheckCircle2, ChevronRight, X } from "lucide-react";

/**
 * Cinematic Branded Intro Sequence for MediChainAI
 * - Displays a futuristic medical technology initialization sequence
 * - Assembles the cryptographic shield emblem
 * - Reveals the master slogan: "Every Medicine. Verified. Every Step."
 * - Skippable with button or ESC key
 * - Respects prefers-reduced-motion and session storage
 */
export default function CinematicIntro({ onComplete }) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasSeenIntro = sessionStorage.getItem("medichain_intro_seen");

    if (prefersReducedMotion || hasSeenIntro) {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // Progression timeline
    const timers = [
      setTimeout(() => setStep(1), 400),   // Shield assembly
      setTimeout(() => setStep(2), 1100),  // Telemetry logs
      setTimeout(() => setStep(3), 1800),  // Master slogan reveal
      setTimeout(() => handleFinish(), 3200), // Auto-transition
    ];

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleFinish = () => {
    sessionStorage.setItem("medichain_intro_seen", "true");
    setIsVisible(false);
    setTimeout(() => {
      onComplete?.();
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020817] text-white overflow-hidden select-none"
        >
          {/* Subtle Radial Glow & High-Tech Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(2,132,199,0.28),rgba(2,8,23,0.95))]" />
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(rgba(14,165,233,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.15) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Laser Scan Line Sweep */}
          <motion.div
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40 shadow-[0_0_15px_#06B6D4]"
          />

          {/* Skip Button */}
          <button
            onClick={handleFinish}
            className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold tracking-wider text-slate-300 hover:text-white transition-all backdrop-blur-md"
          >
            <span>SKIP INTRO</span>
            <span className="text-[10px] text-slate-400 uppercase">[ESC]</span>
            <X size={13} className="ml-0.5" />
          </button>

          {/* Centerpiece Content */}
          <div className="relative z-10 max-w-lg mx-auto px-6 text-center">
            {/* Animated Shield Logo Assemble */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center"
            >
              {/* Outer Pulsing Rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-3xl border border-sky-500/30 border-dashed"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-2xl border border-teal-400/30"
              />

              {/* Central Glowing Shield */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-teal-400 flex items-center justify-center shadow-[0_0_40px_rgba(2,132,199,0.6)]">
                <Shield size={32} className="text-white" strokeWidth={2.2} />
              </div>

              {/* Sparkle micro badge */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center shadow-[0_0_12px_#22D3EE]"
              >
                <Sparkles size={12} className="text-slate-900" />
              </motion.div>
            </motion.div>

            {/* Brand Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-white">Medi</span>
                <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">
                  ChainAI
                </span>
              </h2>
              <p className="text-xs tracking-widest uppercase font-mono text-cyan-300/80 mt-1">
                Pharmaceutical Integrity Protocol
              </p>
            </motion.div>

            {/* Stage 1: Terminal Telemetry Stream */}
            <div className="mt-8 h-16 flex flex-col items-center justify-center">
              {step >= 1 && step < 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="font-mono text-xs text-slate-400 space-y-1"
                >
                  <p className="flex items-center gap-2 text-sky-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    Connecting to DrugChain PoA Consortium...
                  </p>
                  {step >= 2 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-teal-300 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={13} className="text-teal-400" />
                      Gemini Vision AI Engine & SHA-256 Ledger Synchronized
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* Stage 3: The Master Slogan Reveal */}
              {step >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="space-y-1"
                >
                  <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Every Medicine.{" "}
                    <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                      Verified.
                    </span>{" "}
                    Every Step.
                  </p>
                  <p className="text-xs text-slate-400">
                    Entering decentralized verification ecosystem...
                  </p>
                </motion.div>
              )}
            </div>

            {/* Quick Enter Action */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-6"
            >
              <button
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-bold text-xs shadow-lg shadow-sky-600/30 hover:shadow-sky-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Launch Experience</span>
                <ChevronRight size={14} />
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
