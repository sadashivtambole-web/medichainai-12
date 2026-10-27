import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Interactive 3D Medicine Capsule & Molecular Particle Engine
 * High-performance HTML5 Canvas 3D rendering with mouse tilt, realistic specular lighting,
 * and ambient floating bio-particles. Runs at silky 60fps with zero heavy 3D engine overhead.
 */
export default function MedicineCapsule3D() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Handle high DPI screens
    const dpr = window.devicePixelRatio || 1;
    const width = 480;
    const height = 480;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let angleX = 0.25;
    let angleY = 0.35;
    let targetAngleX = 0.25;
    let targetAngleY = 0.35;
    let time = 0;

    // Molecular ambient particles
    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: (Math.random() - 0.5) * 360,
      y: (Math.random() - 0.5) * 360,
      z: (Math.random() - 0.5) * 200,
      size: Math.random() * 3.5 + 1.5,
      speed: Math.random() * 0.015 + 0.005,
      color: i % 2 === 0 ? "rgba(2, 132, 199, " : "rgba(13, 148, 136, ",
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Smooth interpolation towards mouse tilt
      angleX += (targetAngleX - angleX) * 0.05;
      angleY += (targetAngleY - angleY) * 0.05;

      const centerX = width / 2;
      const centerY = height / 2 + Math.sin(time * 1.5) * 8; // Floating animation

      // ── Draw Background Molecular Particles ──────────────────
      particles.forEach((p) => {
        p.y += Math.sin(time + p.phase) * 0.4;
        p.x += Math.cos(time + p.phase) * 0.3;

        const scale = 240 / (240 + p.z);
        const px = centerX + p.x * scale;
        const py = centerY + p.y * scale;
        const alpha = Math.max(0.15, Math.min(0.7, 0.45 + (p.z / 200) * 0.3));

        ctx.beginPath();
        ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();

        // Connect nearby particles with subtle molecular bonds
        particles.forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 48) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            const scale2 = 240 / (240 + p2.z);
            ctx.lineTo(centerX + p2.x * scale2, centerY + p2.y * scale2);
            ctx.strokeStyle = `rgba(2, 132, 199, ${0.12 * (1 - dist / 48)})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        });
      });

      // ── Render 3D Medicine Capsule ───────────────────────────
      ctx.save();
      ctx.translate(centerX, centerY);

      // Apply 3D rotation matrix
      const rotY = angleY + time * 0.4; // Continuous gentle rotation
      const rotX = angleX + Math.sin(time * 0.8) * 0.08;

      ctx.rotate(rotX);
      ctx.rotate(rotY);

      // Capsule Shadow
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 150, 75, 20, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(2, 132, 199, 0.12)";
      ctx.filter = "blur(14px)";
      ctx.fill();
      ctx.restore();

      const capRadius = 46;
      const capHeight = 84;

      // 1. TOP HALF: Medical Blue Capsule Cap
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -capHeight / 2, capRadius, Math.PI, 0, false);
      ctx.lineTo(capRadius, 0);
      ctx.lineTo(-capRadius, 0);
      ctx.closePath();

      const topGradient = ctx.createLinearGradient(-capRadius, -capHeight, capRadius, 0);
      topGradient.addColorStop(0, "#0284C7");
      topGradient.addColorStop(0.35, "#0369A1");
      topGradient.addColorStop(0.7, "#0EA5E9");
      topGradient.addColorStop(1, "#0284C7");
      ctx.fillStyle = topGradient;
      ctx.shadowColor = "rgba(2, 132, 199, 0.4)";
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.restore();

      // Top Specular Gloss Highlight
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-14, -capHeight / 2 - 10, capRadius * 0.55, 12, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fill();
      ctx.restore();

      // 2. BOTTOM HALF: Healthcare Teal Body
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-capRadius, 0);
      ctx.lineTo(capRadius, 0);
      ctx.lineTo(capRadius, capHeight / 2);
      ctx.arc(0, capHeight / 2, capRadius, 0, Math.PI, false);
      ctx.closePath();

      const bottomGradient = ctx.createLinearGradient(-capRadius, 0, capRadius, capHeight);
      bottomGradient.addColorStop(0, "#0D9488");
      bottomGradient.addColorStop(0.35, "#14B8A6");
      bottomGradient.addColorStop(0.75, "#0F766E");
      bottomGradient.addColorStop(1, "#0D9488");
      ctx.fillStyle = bottomGradient;
      ctx.shadowColor = "rgba(13, 148, 136, 0.35)";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      // Bottom Specular Gloss Highlight
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-12, capHeight / 2 - 10, capRadius * 0.45, 10, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
      ctx.fill();
      ctx.restore();

      // 3. CENTER SEAM & MICRO-ENGRAVED BAND
      ctx.beginPath();
      ctx.rect(-capRadius - 1.5, -3, (capRadius + 1.5) * 2, 6);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.shadowColor = "rgba(2, 132, 199, 0.3)";
      ctx.shadowBlur = 6;
      ctx.fill();

      // Medical Plus Symbol on Center Band
      ctx.fillStyle = "#0284C7";
      ctx.fillRect(-6, -1.5, 12, 3);
      ctx.fillRect(-1.5, -6, 3, 12);

      // Micro QR / Blockchain Verification Ring
      ctx.beginPath();
      ctx.arc(0, 0, capRadius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(20, 184, 166, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 1.2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 1.2;
    setMousePos({ x, y });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
      className="relative flex items-center justify-center w-full max-w-[480px] h-[480px] select-none mx-auto"
    >
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", maxWidth: 480, maxHeight: 480 }}
        className="cursor-grab active:cursor-grabbing transition-transform duration-300"
      />

      {/* Floating Status Badges around the capsule */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
        className="absolute top-10 right-4 sm:right-8 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-sky-100 shadow-lg shadow-sky-900/5 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ledger Verified</p>
          <p className="text-xs font-extrabold text-slate-900">SHA-256 Proven</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-12 left-2 sm:left-6 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-teal-100 shadow-lg shadow-teal-900/5 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Vision Score</p>
          <p className="text-xs font-extrabold text-teal-700">99.8% Authentic</p>
        </div>
      </motion.div>
    </div>
  );
}
