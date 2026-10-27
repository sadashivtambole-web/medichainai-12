import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Atmospheric Healthcare & Blockchain Background
 * Inspired by modern atmospheric UI designs:
 * - Soft layered sky/cyan/white/teal gradients with cloud-like blurred ambient glow
 * - Dynamic 60fps HTML5 Canvas molecular particle network with connected nodes & chemical bonds
 * - Hexagonal precision grid and subtle cryptographic hash particles
 * - Slow, smooth animations that respect prefers-reduced-motion
 */
export default function AuthBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Particle nodes for molecular network
    const count = window.innerWidth < 768 ? 20 : 38;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 2.5 + 1.2,
      color: Math.random() > 0.4 ? "rgba(2, 132, 199, " : "rgba(13, 148, 136, ",
      pulse: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = () => {
      time += 0.015;
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      // Draw and connect molecular nodes
      particles.forEach((p, i) => {
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        const alpha = 0.25 + Math.sin(time + p.pulse) * 0.15;

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();

        // Connect nearby nodes with delicate bond lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist / 110) * 0.14;
            ctx.strokeStyle = `rgba(14, 165, 233, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Base Gradient Canvas: Sky, Teal, and Pale Blue */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F0F9FF] via-[#E6FFFA] to-[#EFF6FF]" />

      {/* 2. Soft Cloud-like Glowing Orbs & Ambient Light */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          x: [0, 24, 0],
          y: [0, -18, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-20 w-[540px] h-[540px] rounded-full bg-gradient-to-br from-sky-300/35 via-cyan-200/25 to-transparent blur-3xl"
      />

      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/3 -right-24 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-teal-200/30 via-emerald-100/25 to-transparent blur-3xl"
      />

      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          x: [0, 15, 0],
          y: [0, 25, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute -bottom-28 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-200/35 via-blue-100/30 to-transparent blur-3xl"
      />

      {/* 3. Subtle Hexagonal Scientific Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, #0284C7 1px, transparent 1px),
            linear-gradient(rgba(2, 132, 199, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(2, 132, 199, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px, 72px 72px, 72px 72px",
        }}
      />

      {/* 4. Canvas Molecular Network */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.85 }}
      />
    </div>
  );
}
