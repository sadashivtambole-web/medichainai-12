import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function RoleCard({ icon: Icon, title, description, color, route, stats }) {
  const navigate = useNavigate();
  const isBlue = color === "blue";
  const isGreen = color === "green";
  const isYellow = color === "yellow";

  const glowColor = isBlue
    ? "rgba(99, 102, 241, 0.22)"
    : isGreen
    ? "rgba(16, 185, 129, 0.22)"
    : isYellow
    ? "rgba(245, 158, 11, 0.22)"
    : "rgba(139, 92, 246, 0.22)";

  const iconBg = isBlue
    ? "linear-gradient(135deg, #4F46E5, #6366F1)"
    : isGreen
    ? "linear-gradient(135deg, #059669, #10B981)"
    : isYellow
    ? "linear-gradient(135deg, #D97706, #F59E0B)"
    : "linear-gradient(135deg, #7C3AED, #8B5CF6)";

  const statColor = isBlue ? "#4F46E5" : isGreen ? "#059669" : isYellow ? "#D97706" : "#7C3AED";
  const badgeBg = isBlue ? "rgba(99,102,241,0.08)" : isGreen ? "rgba(16,185,129,0.08)" : isYellow ? "rgba(245,158,11,0.08)" : "rgba(139,92,246,0.08)";

  return (
    <button
      id={`role-card-${title.toLowerCase()}`}
      onClick={() => navigate(route)}
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(226, 232, 240, 0.85)",
        borderRadius: 22,
        padding: "32px 28px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        boxShadow: "0 4px 20px rgba(99, 102, 241, 0.04), 0 1px 3px rgba(0,0,0,0.02)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 260,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = `0 20px 40px -10px ${glowColor}, 0 0 0 1px rgba(99, 102, 241, 0.3)`;
        e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(99, 102, 241, 0.04), 0 1px 3px rgba(0,0,0,0.02)";
        e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.85)";
      }}
    >
      <div>
        {/* Top bar with Icon and Arrow */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 20px ${glowColor}`,
            }}
          >
            <Icon size={26} color="white" />
          </div>

          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: badgeBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: statColor,
              transition: "transform 0.2s",
            }}
          >
            <ArrowUpRight size={18} />
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "1.35rem",
            fontWeight: 800,
            color: "#0F172A",
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            color: "#475569",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {description}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 16, paddingTop: 16, borderTop: "1px solid rgba(241, 245, 249, 0.9)" }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{ flex: 1, background: badgeBg, padding: "8px 12px", borderRadius: 10 }}>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 18,
                  color: statColor,
                  lineHeight: 1.1,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#64748B",
                  marginTop: 2,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

