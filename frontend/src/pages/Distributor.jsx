import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, CheckCircle2, ArrowLeft, Package, ArrowRight, Clock, Loader2, Send, RotateCcw } from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import BlockchainStatus from "../components/ui/BlockchainStatus";
import TransferTimeline from "../components/ui/TransferTimeline";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";

export default function Distributor() {
  const { transfers, confirmTransfer, forwardToPharmacy } = useApp();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(null);
  const [forwarding, setForwarding] = useState(null);

  const handleConfirm = async (id) => {
    setConfirming(id);
    try {
      await confirmTransfer(id);
      toast.success("✅ Manufacturer → Distributor recorded on blockchain & MongoDB!");
    } catch (err) {
      toast.error(err.message || "Failed to confirm transfer");
    } finally {
      setConfirming(null);
    }
  };

  const handleForward = async (id) => {
    setForwarding(id);
    try {
      await forwardToPharmacy(id);
      toast.success("✅ Distributor → Pharmacy recorded on blockchain & MongoDB!");
    } catch (err) {
      toast.error(err.message || "Failed to forward batch to pharmacy");
    } finally {
      setForwarding(null);
    }
  };

  /* Status helpers */
  const isPending = (t) => t.blockchainStatus === "Pending Confirmation";
  const isConfirmed = (t) => t.blockchainStatus === "Confirmed";
  const isForwarded = (t) => t.blockchainStatus === "Forwarded to Pharmacy";

  const statusColor = (t) =>
    isForwarded(t)
      ? { text: "#065F46", bg: "#F0FDF4", border: "rgba(16,185,129,0.3)" }
      : isConfirmed(t)
      ? { text: "#5855F3", bg: "#EEF0FD", border: "rgba(88,85,243,0.3)" }
      : { text: "#92400E", bg: "#FEF3C7", border: "rgba(245,158,11,0.3)" };

  return (
    <div className="page-bg" style={{ minHeight: "100vh" }}>
      <Background />
      <Header />
      <Toaster position="top-right" />

      <main style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1360, margin: "0 auto", padding: "108px 36px 80px" }}>
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "10px 18px",
            cursor: "pointer",
            color: "#0F172A",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 28,
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            transition: "all 0.2s",
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg,#5855F3,#4743EB)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(88,85,243,0.25)",
            }}
          >
            <Truck size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2rem", fontWeight: 800, color: "#18182E" }}>
              Distributor
            </h1>
            <p style={{ fontSize: 13, color: "#5F607A", marginTop: 2 }}>
              Confirm transfers and relay verified batches to pharmacies via blockchain
            </p>
          </div>
        </div>

        {/* Permission notice */}
        <div
          style={{
            background: "#EEF0FD",
            border: "1px solid rgba(88,85,243,0.2)",
            borderRadius: 14,
            padding: "14px 20px",
            marginBottom: 36,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 16 }}>🔒</span>
          <div style={{ fontSize: 13, color: "#5F607A", lineHeight: 1.6 }}>
            <strong style={{ color: "#5855F3" }}>Distributor permissions:</strong>&nbsp;
            You can only <strong>confirm receipt</strong> and <strong>forward to pharmacy</strong>. Medicine name, batch number, dates, price, manufacturer information and original medicine image are cryptographically immutable.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Pending Transfers", value: transfers.filter(isPending).length, color: "#D97706", bg: "rgba(245,158,11,0.08)", icon: Clock, cls: "amber" },
            { label: "Confirmed Receipt", value: transfers.filter(isConfirmed).length, color: "#6366F1", bg: "rgba(99,102,241,0.08)", icon: CheckCircle2, cls: "indigo" },
            { label: "Forwarded to Pharm", value: transfers.filter(isForwarded).length, color: "#10B981", bg: "rgba(16,185,129,0.08)", icon: Send, cls: "green" },
          ].map(({ label, value, color, bg, icon: Icon, cls }) => (
            <div
              key={label}
              className={`stat-card ${cls}`}
              style={{ transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(99,102,241,0.10)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.04)"; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#8E8FA8" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Transfer Cards */}
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5F607A", marginBottom: 16 }}>
          Incoming Transfers
        </h2>

        <div style={{ display: "grid", gap: 16, marginBottom: 40 }}>
          {transfers.map((t) => {
            const c = statusColor(t);

            return (
              <div
                key={t.id}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${c.border}`,
                  borderRadius: 18,
                  padding: "24px 28px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <Package size={18} color="#5855F3" />
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16, color: "#18182E" }}>
                        {t.medicineName}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: c.text,
                          background: c.bg,
                          border: `1px solid ${c.border}`,
                          padding: "3px 10px",
                          borderRadius: 100,
                        }}
                      >
                        {t.blockchainStatus}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
                      {[
                        { label: "Batch ID", value: t.batchId },
                        { label: "From", value: t.from },
                        { label: "Quantity", value: t.quantity },
                        { label: "Transfer ID", value: t.id },
                        { label: "Timestamp", value: t.timestamp },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8E8FA8", marginBottom: 3 }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#18182E" }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Blockchain chain badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#5855F3", background: "#EEF0FD", border: "1px solid rgba(88,85,243,0.25)", borderRadius: 100, padding: "3px 10px" }}>
                        Manufacturer
                      </span>
                      {(isConfirmed(t) || isForwarded(t)) && (
                        <>
                          <ArrowRight size={12} color="#8E8FA8" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#5855F3", background: "#EEF0FD", border: "1px solid rgba(88,85,243,0.25)", borderRadius: 100, padding: "3px 10px" }}>
                            Distributor ✓
                          </span>
                          {t.confirmTxHash && (
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#5855F3", fontWeight: 600 }}>
                              {t.confirmTxHash}
                            </span>
                          )}
                        </>
                      )}
                      {isForwarded(t) && (
                        <>
                          <ArrowRight size={12} color="#8E8FA8" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#065F46", background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 100, padding: "3px 10px" }}>
                            Pharmacy ✓
                          </span>
                          {t.forwardTxHash && (
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#10B981", fontWeight: 600 }}>
                              {t.forwardTxHash}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 180 }}>
                    {isPending(t) && (
                      <button
                        id={`confirm-btn-${t.id}`}
                        className="btn-green"
                        onClick={() => handleConfirm(t.id)}
                        disabled={confirming === t.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "10px 20px", fontSize: 13 }}
                      >
                        {confirming === t.id ? (
                          <>
                            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Confirming...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} /> Confirm Received
                          </>
                        )}
                      </button>
                    )}

                    {isConfirmed(t) && (
                      <button
                        id={`forward-btn-${t.id}`}
                        className="btn-primary"
                        onClick={() => handleForward(t.id)}
                        disabled={forwarding === t.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "10px 20px", fontSize: 13 }}
                      >
                        {forwarding === t.id ? (
                          <>
                            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Forwarding...
                          </>
                        ) : (
                          <>
                            <Truck size={14} /> Transfer to Pharmacy
                          </>
                        )}
                      </button>
                    )}

                    {isForwarded(t) && (
                      <div style={{ padding: "10px 16px", borderRadius: 10, background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.3)", fontSize: 12, fontWeight: 700, color: "#065F46", textAlign: "center" }}>
                        ✓ Forwarded to Pharmacy
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Blockchain status */}
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5F607A", marginBottom: 16 }}>
          Blockchain Node
        </h2>
        <BlockchainStatus status="Connected" txHash="0xd4e5...9a2c" />

        {/* Chain visualization */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5F607A", marginBottom: 20 }}>
            Supply Chain — Immutable Ledger Record
          </h2>
          <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 18, padding: "24px 28px", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
            <TransferTimeline
              history={[
                { step: 1, role: "Manufacturer", actor: "XYZ Pharma Ltd.", timestamp: "2024-01-20 09:00 AM", status: "Registered", txHash: "0xabc...001" },
                { step: 2, role: "Distributor", actor: "ABC Distributors (You)", timestamp: "2024-02-01 11:30 AM", status: "Confirmed", txHash: "0xabc...002" },
              ]}
            />
          </div>
        </div>
      </main>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
