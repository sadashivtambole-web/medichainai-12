// Ultra-Modern Vivid Mesh Gradient Ambient Background
export default function Background() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        backgroundColor: "#F8FAFC",
      }}
    >
      {/* Top Left Electric Indigo Glow */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "5%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.03) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Top Right Cyan AI Glow */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "5%",
          width: "550px",
          height: "550px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.10) 0%, rgba(59, 130, 246, 0.03) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Center Ambient Subtle Violet Glow */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "900px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.05) 0%, transparent 65%)",
          filter: "blur(70px)",
        }}
      />

      {/* Bottom Emerald Success Glow */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "20%",
          width: "650px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Subtle modern geometric dot grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(99, 102, 241, 0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.45,
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)",
        }}
      />
    </div>
  );
}

