export default function StatusBadge({ status, size = "normal" }) {
  const configs = {
    AUTHENTIC: {
      emoji: "🟢",
      label: "AUTHENTIC",
      bg: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.25)",
      color: "#34D399",
      glow: "rgba(16,185,129,0.3)",
    },
    SUSPICIOUS: {
      emoji: "🟠",
      label: "SUSPICIOUS",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.25)",
      color: "#FCD34D",
      glow: "rgba(245,158,11,0.3)",
    },
    FAKE_OR_UNREGISTERED: {
      emoji: "🚨",
      label: "FAKE / COUNTERFEIT DETECTED",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.4)",
      color: "#EF4444",
      glow: "rgba(239,68,68,0.35)",
    },
    COUNTERFEIT: {
      emoji: "🚨",
      label: "COUNTERFEIT DRUG ALERT",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.4)",
      color: "#EF4444",
      glow: "rgba(239,68,68,0.35)",
    },
    UNABLE: {
      emoji: "⚪",
      label: "UNABLE TO VERIFY",
      bg: "rgba(148,163,184,0.08)",
      border: "rgba(148,163,184,0.2)",
      color: "#94A3B8",
      glow: "transparent",
    },
    MATCHED: {
      emoji: "✓",
      label: "MATCHED",
      bg: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.2)",
      color: "#34D399",
      glow: "transparent",
    },
    MISMATCH: {
      emoji: "⚠",
      label: "MISMATCH",
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.2)",
      color: "#FCA5A5",
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
        gap: isLarge ? 12 : 8,
        padding: isLarge ? "16px 28px" : "6px 14px",
        borderRadius: isLarge ? 16 : 100,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: isLarge ? `0 0 40px ${cfg.glow}` : "none",
      }}
    >
      <span style={{ fontSize: isLarge ? 28 : 14 }}>{cfg.emoji}</span>
      <span
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: isLarge ? 20 : 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: cfg.color,
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
