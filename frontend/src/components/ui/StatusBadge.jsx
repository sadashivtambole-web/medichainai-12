export default function StatusBadge({ status, size = "normal" }) {
  const configs = {
    AUTHENTIC: {
      emoji: "✓",
      label: "AUTHENTIC",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      color: "#059669",
      glow: "rgba(5,150,105,0.15)",
    },
    VERIFIED_AUTHENTIC: {
      emoji: "✓",
      label: "VERIFIED AUTHENTIC",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      color: "#059669",
      glow: "rgba(5,150,105,0.15)",
    },
    APPROVED: {
      emoji: "✓",
      label: "APPROVED",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      color: "#059669",
      glow: "rgba(5,150,105,0.15)",
    },
    PENDING: {
      emoji: "⏳",
      label: "PENDING APPROVAL",
      bg: "#F0F9FF",
      border: "#BAE6FD",
      color: "#0284C7",
      glow: "rgba(2,132,199,0.12)",
    },
    REVIEW: {
      emoji: "⚠",
      label: "REQUIRES REVIEW",
      bg: "#FFFBEB",
      border: "#FDE68A",
      color: "#D97706",
      glow: "rgba(217,119,6,0.15)",
    },
    SUSPICIOUS: {
      emoji: "⚠",
      label: "SUSPICIOUS BATCH",
      bg: "#FFFBEB",
      border: "#FDE68A",
      color: "#D97706",
      glow: "rgba(217,119,6,0.15)",
    },
    EXPIRED: {
      emoji: "⚠️",
      label: "EXPIRED MEDICINE",
      bg: "#FEF2F2",
      border: "#FECACA",
      color: "#DC2626",
      glow: "rgba(220,38,38,0.15)",
    },
    "LIKELY COUNTERFEIT": {
      emoji: "🚨",
      label: "COUNTERFEIT ALERT",
      bg: "#FEF2F2",
      border: "#FCA5A5",
      color: "#DC2626",
      glow: "rgba(220,38,38,0.2)",
    },
    FAKE_OR_UNREGISTERED: {
      emoji: "🚨",
      label: "FAKE / UNREGISTERED",
      bg: "#FEF2F2",
      border: "#FCA5A5",
      color: "#DC2626",
      glow: "rgba(220,38,38,0.2)",
    },
    COUNTERFEIT: {
      emoji: "🚨",
      label: "COUNTERFEIT ALERT",
      bg: "#FEF2F2",
      border: "#FCA5A5",
      color: "#DC2626",
      glow: "rgba(220,38,38,0.2)",
    },
    REJECTED: {
      emoji: "✖",
      label: "REJECTED",
      bg: "#FEF2F2",
      border: "#FECACA",
      color: "#DC2626",
      glow: "rgba(220,38,38,0.15)",
    },
    UNABLE: {
      emoji: "⚪",
      label: "UNABLE TO VERIFY",
      bg: "#F8FAFC",
      border: "#E2E8F0",
      color: "#64748B",
      glow: "transparent",
    },
    MATCHED: {
      emoji: "✓",
      label: "MATCHED",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      color: "#059669",
      glow: "transparent",
    },
    MISMATCH: {
      emoji: "✖",
      label: "MISMATCH",
      bg: "#FEF2F2",
      border: "#FECACA",
      color: "#DC2626",
      glow: "transparent",
    },
  };

  const cfg = configs[status] || configs["UNABLE"];
  const isLarge = size === "large";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isLarge ? 10 : 6,
        padding: isLarge ? "12px 24px" : "4px 12px",
        borderRadius: isLarge ? 16 : 100,
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        boxShadow: isLarge ? `0 6px 20px ${cfg.glow}` : "none",
      }}
    >
      <span style={{ fontSize: isLarge ? 20 : 12, fontWeight: 900, color: cfg.color }}>{cfg.emoji}</span>
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          fontSize: isLarge ? 15 : 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: cfg.color,
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
