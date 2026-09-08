import { ExternalLink } from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function BlockchainStatus({ status, txHash, compact = false }) {
  const { blockchainInfo } = useApp();
  const currentStatus = status || blockchainInfo?.status || "Connected";
  const isConnected = currentStatus === "Connected" || currentStatus === "Confirmed";

  const networkName = blockchainInfo?.network || "EVM Local / Hardhat";
  const blockHeight = blockchainInfo?.blockNumber ? `#${blockchainInfo.blockNumber}` : "#12,847";
  const confirmations = isConnected ? "12 (Finalized)" : "0";

  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 10,
          background: isConnected ? "#F0FDF4" : "#FEF3C7",
          border: `1px solid ${isConnected ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isConnected ? "#10B981" : "#D97706",
            boxShadow: `0 0 6px ${isConnected ? "#10B981" : "#D97706"}`,
          }}
        />
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: isConnected ? "#065F46" : "#92400E",
          }}
        >
          Blockchain {currentStatus}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E8EAF6",
        borderRadius: 16,
        padding: "20px 24px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isConnected ? "#10B981" : "#D97706",
            boxShadow: `0 0 8px ${isConnected ? "#10B981" : "#D97706"}`,
          }}
        />
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 14,
            color: isConnected ? "#065F46" : "#92400E",
          }}
        >
          🔗 Blockchain {isConnected ? "Connected" : "Pending"}
        </span>
      </div>

      {txHash && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8E8FA8",
              marginBottom: 6,
            }}
          >
            Transaction Hash
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "monospace",
              fontSize: 12,
              fontWeight: 600,
              color: "#5855F3",
              background: "#EEF0FD",
              border: "1px solid rgba(88,85,243,0.2)",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            {txHash}
            <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
        {[
          { label: "Network", value: networkName },
          { label: "Block", value: blockHeight },
          { label: "Confirmations", value: confirmations },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8E8FA8" }}>
              {label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18182E", marginTop: 3 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
