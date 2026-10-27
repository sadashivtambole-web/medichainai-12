import { Clock, ExternalLink } from "lucide-react";

const ROLE_COLORS = {
  Manufacturer: { bg: "#F0F9FF", border: "rgba(2,132,199,0.3)", text: "#0284C7", dot: "#0284C7" },
  Distributor: { bg: "#F0FDFA", border: "rgba(13,148,136,0.3)", text: "#0D9488", dot: "#0D9488" },
  Pharmacy: { bg: "#FEF3C7", border: "rgba(245,158,11,0.3)", text: "#B45309", dot: "#F59E0B" },
  Customer: { bg: "#F0FDF4", border: "rgba(16,185,129,0.3)", text: "#047857", dot: "#10B981" },
};

export default function TransferTimeline({ history = [] }) {
  return (
    <div style={{ padding: "4px 0" }}>
      {history.map((item, index) => {
        const colors = ROLE_COLORS[item.role] || ROLE_COLORS.Manufacturer;
        const isLast = index === history.length - 1;

        return (
          <div key={index} style={{ display: "flex", gap: 16 }}>
            {/* Left: dot + line */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  color: colors.text,
                }}
              >
                {item.step}
              </div>
              {!isLast && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 24,
                    background: "#E8EAF6",
                    margin: "4px 0",
                  }}
                />
              )}
            </div>

            {/* Right: content */}
            <div style={{ paddingBottom: isLast ? 0 : 20, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: colors.text,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    padding: "2px 8px",
                    borderRadius: 100,
                  }}
                >
                  {item.role}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: item.status === "Confirmed" || item.status === "Verified" || item.status === "Registered"
                      ? "#059669"
                      : "#D97706",
                  }}
                >
                  {item.status === "Confirmed" || item.status === "Verified" || item.status === "Registered"
                    ? "✓"
                    : "⏳"}{" "}
                  {item.status}
                </span>
              </div>

              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#18182E", marginBottom: 4 }}>
                {item.actor}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#5F607A" }}>
                  <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                  {item.timestamp}
                </span>
                {item.txHash && (
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#0284C7",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {item.txHash}
                    <ExternalLink size={10} />
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
