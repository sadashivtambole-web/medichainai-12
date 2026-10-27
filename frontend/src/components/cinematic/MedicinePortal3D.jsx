import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Maximize2,
  X,
  Sparkles,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  ArrowRight,
  Fingerprint,
  QrCode,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Signature 3D Medicine Portal Component
 * - 60fps HTML5 Canvas 3D rendering with dual-tone capsule, internal crystalline beads,
 *   molecular particle network, and rotating holographic telemetry rings.
 * - Pointer-driven 3D perspective tilt and interactive lighting.
 * - Smooth click-to-expand transition into full-screen deep inspection chamber.
 * - Pure high-performance code with zero heavy external 3D libraries.
 */
export default function MedicinePortal3D({ isCinematicHero = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("molecular"); // 'molecular' | 'blockchain' | 'ai'

  // Handle pointer tilt
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  // Canvas 3D Capsule & Particle Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const dpr = window.devicePixelRatio || 1;
    const width = 460;
    const height = 460;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let angleX = 0.2;
    let angleY = 0.3;
    let targetAngleX = 0.2;
    let targetAngleY = 0.3;
    let time = 0;
    let scanLineY = 0;

    // Molecular particles
    const particleCount = 24;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: (Math.random() - 0.5) * 320,
      y: (Math.random() - 0.5) * 320,
      z: (Math.random() - 0.5) * 220,
      size: Math.random() * 3 + 1.5,
      speed: Math.random() * 0.02 + 0.008,
      color: i % 2 === 0 ? "rgba(14, 165, 233, " : "rgba(20, 184, 166, ",
      phase: Math.random() * Math.PI * 2,
    }));

    // Inner crystalline active pharmaceutical beads (floating inside bottom translucent half)
    const beadCount = 18;
    const beads = Array.from({ length: beadCount }, () => ({
      x: (Math.random() - 0.5) * 44,
      y: Math.random() * 45 + 10,
      radius: Math.random() * 3.5 + 2,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? "rgba(255, 255, 255, 0.75)" : "rgba(34, 211, 238, 0.8)",
    }));

    const render = () => {
      time += 0.022;
      scanLineY = (scanLineY + 1.8) % 180;
      ctx.clearRect(0, 0, width, height);

      // Target angle follows mouse tilt
      targetAngleX = 0.2 + mousePos.y * 0.35;
      targetAngleY = 0.3 + mousePos.x * 0.45;
      angleX += (targetAngleX - angleX) * 0.08;
      angleY += (targetAngleY - angleY) * 0.08;

      const centerX = width / 2;
      const centerY = height / 2 + Math.sin(time * 1.6) * 7;

      // 1. Draw Molecular Network
      particles.forEach((p) => {
        p.y += Math.sin(time + p.phase) * 0.35;
        p.x += Math.cos(time + p.phase) * 0.25;

        const scale = 260 / (260 + p.z);
        const px = centerX + p.x * scale;
        const py = centerY + p.y * scale;
        const alpha = Math.max(0.12, Math.min(0.7, 0.4 + (p.z / 220) * 0.3));

        ctx.beginPath();
        ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();

        // Connect nearby nodes
        particles.forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 52) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            const scale2 = 260 / (260 + p2.z);
            ctx.lineTo(centerX + p2.x * scale2, centerY + p2.y * scale2);
            ctx.strokeStyle = `rgba(14, 165, 233, ${0.1 * (1 - dist / 52)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });
      });

      // 2. Render 3D Capsule & Holographic HUD
      ctx.save();
      ctx.translate(centerX, centerY);

      const rotY = angleY + time * 0.45;
      const rotX = angleX + Math.sin(time * 0.9) * 0.08;

      ctx.rotate(rotX);
      ctx.rotate(rotY);

      // Ambient Ground Glow
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 140, 75, 18, 0, 0, Math.PI * 2);
      ctx.fillStyle = isCinematicHero ? "rgba(14, 165, 233, 0.22)" : "rgba(2, 132, 199, 0.12)";
      ctx.filter = "blur(14px)";
      ctx.fill();
      ctx.restore();

      // Outer Holographic Verification Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 88, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 12]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Inner Rotating Coordinates Ring
      ctx.save();
      ctx.rotate(-time * 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, 74, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(20, 184, 166, 0.22)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const capRadius = 45;
      const capHeight = 84;

      // ── TOP HALF: Medical Blue Polished Shell ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -capHeight / 2, capRadius, Math.PI, 0, false);
      ctx.lineTo(capRadius, 0);
      ctx.lineTo(-capRadius, 0);
      ctx.closePath();

      const topGradient = ctx.createLinearGradient(-capRadius, -capHeight, capRadius, 0);
      topGradient.addColorStop(0, "#0284C7");
      topGradient.addColorStop(0.3, "#0369A1");
      topGradient.addColorStop(0.7, "#0EA5E9");
      topGradient.addColorStop(1, "#0284C7");
      ctx.fillStyle = topGradient;
      ctx.shadowColor = "rgba(14, 165, 233, 0.5)";
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.restore();

      // Specular Highlight on Top Shell
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-14, -capHeight / 2 - 8, capRadius * 0.52, 10, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fill();
      ctx.restore();

      // ── BOTTOM HALF: Translucent Healthcare Teal Body ──
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-capRadius, 0);
      ctx.lineTo(capRadius, 0);
      ctx.lineTo(capRadius, capHeight / 2);
      ctx.arc(0, capHeight / 2, capRadius, 0, Math.PI, false);
      ctx.closePath();

      const bottomGradient = ctx.createLinearGradient(-capRadius, 0, capRadius, capHeight);
      bottomGradient.addColorStop(0, "rgba(13, 148, 136, 0.95)");
      bottomGradient.addColorStop(0.35, "rgba(20, 184, 166, 0.9)");
      bottomGradient.addColorStop(0.8, "rgba(15, 118, 110, 0.95)");
      bottomGradient.addColorStop(1, "rgba(13, 148, 136, 0.95)");
      ctx.fillStyle = bottomGradient;
      ctx.shadowColor = "rgba(20, 184, 166, 0.4)";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      // Floating internal micro-beads inside bottom capsule
      ctx.save();
      beads.forEach((b) => {
        const bx = b.x + Math.sin(time * 2 + b.phase) * 3;
        const by = b.y + Math.cos(time * 2 + b.phase) * 3;
        ctx.beginPath();
        ctx.arc(bx, by, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
      });
      ctx.restore();

      // Specular Highlight on Bottom Shell
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-12, capHeight / 2 - 10, capRadius * 0.42, 9, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fill();
      ctx.restore();

      // ── Center Seam Band with Security Cross ──
      ctx.save();
      ctx.beginPath();
      ctx.rect(-capRadius - 1.5, -3, (capRadius + 1.5) * 2, 6);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.shadowColor = "rgba(14, 165, 233, 0.4)";
      ctx.shadowBlur = 8;
      ctx.fill();

      // Cyan Cross Emblem
      ctx.fillStyle = "#0284C7";
      ctx.fillRect(-6, -1.5, 12, 3);
      ctx.fillRect(-1.5, -6, 3, 12);
      ctx.restore();

      // ── Laser Scanning Sweep (AI Detection Simulation) ──
      ctx.save();
      const laserY = -capHeight / 2 - capRadius + scanLineY;
      if (laserY >= -capHeight && laserY <= capHeight + capRadius) {
        ctx.beginPath();
        ctx.moveTo(-capRadius - 10, laserY);
        ctx.lineTo(capRadius + 10, laserY);
        ctx.strokeStyle = "rgba(34, 211, 238, 0.75)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#22D3EE";
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos, isCinematicHero]);

  // CSS 3D perspective transforms for the container
  const tiltStyle = {
    transform: `perspective(1000px) rotateX(${-mousePos.y * 12}deg) rotateY(${mousePos.x * 12}deg) scale3d(${
      isHovered ? 1.03 : 1
    }, ${isHovered ? 1.03 : 1}, 1)`,
    transition: "transform 0.18s cubic-bezier(0.2, 0, 0, 1)",
  };

  return (
    <>
      {/* ══ 3D PORTAL HERO CARD ══ */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsExpanded(true)}
        style={tiltStyle}
        className="relative group w-full max-w-[480px] h-[480px] mx-auto select-none cursor-pointer flex items-center justify-center"
      >
        {/* Holographic Glowing Glass Portal Frame */}
        <div
          className={`absolute inset-4 rounded-[40px] transition-all duration-500 pointer-events-none ${
            isCinematicHero
              ? "bg-gradient-to-b from-sky-500/10 via-cyan-500/5 to-transparent border border-cyan-400/30 shadow-[0_0_50px_rgba(2,132,199,0.25)] group-hover:border-cyan-300/60 group-hover:shadow-[0_0_70px_rgba(6,182,212,0.4)]"
              : "bg-white/80 backdrop-blur-xl border border-sky-200/80 shadow-2xl shadow-sky-900/10 group-hover:border-sky-400"
          }`}
        />

        {/* 3D Canvas */}
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", maxWidth: 460, maxHeight: 460 }}
          className="relative z-10 transition-transform duration-300"
        />

        {/* Floating Interactive Badge: Top-Right */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
          className={`absolute top-8 right-6 z-20 px-3.5 py-2 rounded-2xl backdrop-blur-md border transition-all ${
            isCinematicHero
              ? "bg-[#0B172E]/90 border-cyan-500/40 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              : "bg-white/95 border-sky-200/90 text-slate-900 shadow-xl shadow-sky-950/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isCinematicHero ? "text-cyan-400" : "text-sky-700"
                }`}
              >
                PoA Consensus
              </p>
              <p className="text-xs font-black">Block #108,421</p>
            </div>
          </div>
        </motion.div>

        {/* Floating Interactive Badge: Bottom-Left */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.4 }}
          className={`absolute bottom-8 left-6 z-20 px-3.5 py-2 rounded-2xl backdrop-blur-md border transition-all ${
            isCinematicHero
              ? "bg-[#0B172E]/90 border-teal-500/40 text-white shadow-[0_0_20px_rgba(20,184,166,0.25)]"
              : "bg-white/95 border-teal-200/90 text-slate-900 shadow-xl shadow-teal-950/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isCinematicHero ? "text-teal-400" : "text-teal-700"
                }`}
              >
                Gemini Vision AI
              </p>
              <p className="text-xs font-black">99.8% Purity Match</p>
            </div>
          </div>
        </motion.div>

        {/* Center Hover Prompt */}
        <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center pointer-events-none">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md ${
              isCinematicHero
                ? "bg-slate-900/80 text-cyan-300 border border-cyan-400/30"
                : "bg-white/95 text-slate-700 border border-slate-200 shadow-md"
            }`}
          >
            <Maximize2 size={12} /> Click to Expand 3D Inspection Portal
          </span>
        </div>
      </div>

      {/* ══ EXPANDED FULL-SCREEN 3D INSPECTION CHAMBER ══ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-black/80 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-5xl bg-[#030A1A] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_90px_rgba(2,132,199,0.35)] text-white"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center">
                    <Activity size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      3D Pharmaceutical Inspection Chamber
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                        LIVE HUD
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Batch ID: MEDG-AMOX-500-A1B2 • DrugChain PoA Consensus
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chamber Body: 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                {/* Left 3D Viewport Simulation */}
                <div className="lg:col-span-5 bg-gradient-to-b from-[#0A192F] to-[#040D1E] rounded-2xl border border-cyan-500/20 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.18),transparent_70%)]" />

                  {/* High-Tech Reticle */}
                  <div className="w-48 h-48 rounded-full border border-cyan-400/30 border-dashed animate-spin-slow flex items-center justify-center relative">
                    <div className="w-36 h-36 rounded-full border border-teal-400/40 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-500 to-teal-400 opacity-80 blur-md" />
                    </div>
                  </div>

                  <div className="mt-6 text-center z-10">
                    <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-400/40">
                      Amoxicillin Trihydrate 500mg
                    </span>
                    <p className="text-[11px] text-slate-400 mt-2 font-mono">
                      Active Molecule • Synthesis Verified
                    </p>
                  </div>

                  {/* Corner Target Markers */}
                  <div className="absolute top-3 left-3 font-mono text-[9px] text-cyan-400/70">
                    [X: +14.28 | Y: -08.12]
                  </div>
                  <div className="absolute bottom-3 right-3 font-mono text-[9px] text-teal-400/70">
                    SPECTRAL: 99.8% MATCH
                  </div>
                </div>

                {/* Right Diagnostics & Tabs */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                  {/* Tab Selector */}
                  <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                    <button
                      onClick={() => setActiveTab("molecular")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "molecular"
                          ? "bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Layers size={13} /> Molecular Spec
                    </button>
                    <button
                      onClick={() => setActiveTab("blockchain")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "blockchain"
                          ? "bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Lock size={13} /> PoA Ledger
                    </button>
                    <button
                      onClick={() => setActiveTab("ai")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "ai"
                          ? "bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Cpu size={13} /> Gemini Vision AI
                    </button>
                  </div>

                  {/* Tab Content 1: Molecular Spec */}
                  {activeTab === "molecular" && (
                    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white/5">
                          <p className="text-slate-400">Chemical Formula</p>
                          <p className="font-mono font-bold text-white text-sm mt-0.5">
                            C16H19N3O5S • 3H2O
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5">
                          <p className="text-slate-400">Molecular Mass</p>
                          <p className="font-mono font-bold text-white text-sm mt-0.5">
                            419.45 g/mol
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5">
                          <p className="text-slate-400">Excipient Purity</p>
                          <p className="font-mono font-bold text-teal-400 text-sm mt-0.5">
                            99.85% (Grade A USP)
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5">
                          <p className="text-slate-400">Shelf Temperature</p>
                          <p className="font-mono font-bold text-cyan-400 text-sm mt-0.5">
                            15°C – 25°C (Controlled)
                          </p>
                        </div>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px] pt-1">
                        Active pharmaceutical ingredients (API) verified through chemical spectral
                        signature matching. Batch formulation conforms to certified manufacturer
                        monograph.
                      </p>
                    </div>
                  )}

                  {/* Tab Content 2: Blockchain */}
                  {activeTab === "blockchain" && (
                    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs">
                      <div className="space-y-2 font-mono text-[11px]">
                        <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
                          <span className="text-slate-400">Block Hash:</span>
                          <span className="text-cyan-300 font-bold truncate max-w-[260px]">
                            0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1f...
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
                          <span className="text-slate-400">Validator Node:</span>
                          <span className="text-teal-300 font-bold">
                            Apex Pharma Synthesis Hub (0x9A...F4)
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
                          <span className="text-slate-400">Consensus Engine:</span>
                          <span className="text-white font-bold">
                            DrugChain PoA v2.4 (0.8s Finality)
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px] pt-1">
                        Cryptographic ledger immutable snapshot. Zero unauthorized state alteration
                        detected since initial batch minting.
                      </p>
                    </div>
                  )}

                  {/* Tab Content 3: Gemini Vision AI */}
                  {activeTab === "ai" && (
                    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
                          <span className="text-slate-300">Tablet Contour & Embossing</span>
                          <span className="text-emerald-400 font-bold font-mono">
                            99.8% Match (Pass)
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
                          <span className="text-slate-300">Blister Packaging Font & Kerning</span>
                          <span className="text-emerald-400 font-bold font-mono">
                            100% Match (Pass)
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
                          <span className="text-slate-300">Micro-Perforation Tear Integrity</span>
                          <span className="text-emerald-400 font-bold font-mono">
                            Zero Defect (Pass)
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px] pt-1">
                        Neural model analyzed packaging typography, manufacturer seal holography,
                        and pill dimensional aspect ratios against registered CAD baselines.
                      </p>
                    </div>
                  )}

                  {/* Bottom Action Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 size={15} /> All Security Thresholds Cleared
                    </div>

                    <button
                      onClick={() => {
                        setIsExpanded(false);
                        navigate("/customer");
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all"
                    >
                      Launch Verification Desk <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
