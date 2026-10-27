// Clean Healthcare SaaS Ambient Background (White, Medical Blue & Teal)
export default function Background() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* Top Left Medical Blue Gradient Wash */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "2%",
          width: "550px",
          height: "550px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(2, 132, 199, 0.07) 0%, rgba(2, 132, 199, 0.01) 55%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Top Right Healthcare Teal Ambient Glow */}
      <div
        style={{
          position: "absolute",
          top: "-5%",
          right: "5%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13, 148, 136, 0.06) 0%, rgba(20, 184, 166, 0.01) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Center Subtle Sky Glow */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(2, 132, 199, 0.03) 0%, transparent 65%)",
          filter: "blur(70px)",
        }}
      />

      {/* Bottom Emerald/Teal Safety Glow */}
      <div
        style={{
          position: "absolute",
          bottom: "-5%",
          right: "15%",
          width: "550px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(5, 150, 105, 0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Ultra-fine medical dot grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(2, 132, 199, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.6,
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 100%)",
        }}
      />
    </div>
  );
}
