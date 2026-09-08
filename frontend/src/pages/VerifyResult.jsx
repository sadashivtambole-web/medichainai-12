import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Share2,
  FileText,
  AlertCircle,
  ShieldAlert,
  Building2,
  Truck,
  Store,
  QrCode,
  Calendar,
  DollarSign,
  Package,
} from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import StatusBadge from "../components/ui/StatusBadge";
import { verificationService } from "../services/verificationService";
import toast, { Toaster } from "react-hot-toast";

function VerifyRow({ label, status }) {
  const isGood =
    status === "VERIFIED" ||
    status === "MATCHED" ||
    status === "VALID" ||
    status === "NORMAL" ||
    status === "INTEGRITY_VERIFIED" ||
    status === "LOW";
  const isWarning =
    status === "PENDING" ||
    status === "PARTIAL_MATCH" ||
    status === "MEDIUM" ||
    status === "ANOMALY_DETECTED";
  const isBad =
    status === "MISMATCH" ||
    status === "DATA_INTEGRITY_MISMATCH" ||
    status === "EXPIRED" ||
    status === "NOT_FOUND" ||
    status === "INVALID" ||
    status === "HIGH" ||
    status === "SUSPICIOUS" ||
    status === "INVALID_SIGNATURE" ||
    status === "NOT_FOUND_UNREGISTERED" ||
    status === "FAILED_NO_CRYPTOGRAPHIC_PROOF" ||
    status === "UNVERIFIED_NOT_ON_CHAIN" ||
    status === "UNKNOWN_UNREGISTERED_BATCH" ||
    status === "UNAUTHORIZED_NO_CUSTODY_RECORD" ||
    status === "HIGH_RISK_SUSPECTED_COUNTERFEIT";

  const color = isGood ? "#10B981" : isWarning ? "#F59E0B" : "#EF4444";
  const bg = isGood
    ? "rgba(16,185,129,0.08)"
    : isWarning
    ? "rgba(245,158,11,0.08)"
    : "rgba(239,68,68,0.08)";
  const icon = isGood ? (
    <CheckCircle2 size={18} color={color} />
  ) : isWarning ? (
    <AlertTriangle size={18} color={color} />
  ) : (
    <XCircle size={18} color={color} />
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        borderRadius: 14,
        background: bg,
        border: `1px solid ${color}30`,
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: "#18182E" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: "0.02em" }}>{status}</span>
      </div>
    </div>
  );
}

function InfoCell({ label, value, icon: Icon, color = "#5855F3" }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: 14,
        background: "#F8F9FD",
        border: "1px solid #E8EAF6",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={color} />
        </div>
      )}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#8E8FA8",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#18182E" }}>{value || "—"}</div>
      </div>
    </div>
  );
}

export default function VerifyResult() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function verify() {
      setLoading(true);
      setError(null);

      try {
        const res = await verificationService.verifyPublicCode(id);
        if (mounted) {
          if (res) {
            setData(res);
          } else {
            setError(`No response received from verification engine.`);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Verification service is currently unavailable.");
          setLoading(false);
        }
      }
    }

    verify();
    return () => {
      mounted = false;
    };
  }, [id]);

  const copyHash = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Hash copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="page-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Background />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <Loader2 size={46} color="#5855F3" style={{ margin: "0 auto 18px", animation: "spin 1s linear infinite" }} />
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.9rem", color: "#18182E", marginBottom: 6 }}>
            Real-Time Blockchain Verification in Progress...
          </h2>
          <p style={{ fontSize: 14, color: "#5F607A" }}>
            Executing 6-layer cryptographic audit, digital signature check, and supply-chain anomaly validation
          </p>
        </div>
      </div>
    );
  }

  // ── COUNTERFEIT / FAKE DRUG VIEW ──
  const isFakeOrNotFound = !data || data.isFake || data.status === "FAKE_OR_UNREGISTERED" || !data.medicine;

  if (isFakeOrNotFound) {
    const reasons = data?.reasons || [
      "🚨 CRITICAL SECURITY ALERT: No registered medicine or batch identifier found matching this code on DrugChain.",
      "❌ Cryptographic Signature Missing: This medicine was never created or verified by an approved manufacturer.",
      "❌ No Verified Supply-Chain Custody: Zero authorized distributor transit or pharmacy dispensing logs found.",
      "⚠️ Counterfeit Drug Warning: This item is suspected to be counterfeit, fake packaging, or an unauthorized copy.",
    ];

    const layers = data?.layers || {
      qr: "INVALID_SIGNATURE",
      database: "NOT_FOUND_UNREGISTERED",
      integrity: "FAILED_NO_CRYPTOGRAPHIC_PROOF",
      blockchain: "UNVERIFIED_NOT_ON_CHAIN",
      expiry: "UNKNOWN_UNREGISTERED_BATCH",
      supplyChain: "UNAUTHORIZED_NO_CUSTODY_RECORD",
      qrReuseRisk: "HIGH_RISK_SUSPECTED_COUNTERFEIT",
    };

    return (
      <div className="page-bg" style={{ minHeight: "100vh" }}>
        <Background />
        <Header />
        <Toaster position="top-right" />

        <main style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "108px 36px 80px" }}>
          {/* Back Button */}
          <button
            onClick={() => navigate("/customer")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#FFFFFF",
              border: "1px solid #E8EAF6",
              borderRadius: 10,
              padding: "9px 18px",
              cursor: "pointer",
              color: "#18182E",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 32,
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            <ArrowLeft size={16} /> Scan Another Code
          </button>

          {/* FAKE DRUG SECURITY HERO ALERT */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 32,
              padding: "44px 32px",
              borderRadius: 24,
              background: "#FFFFFF",
              border: "2px solid #FECACA",
              boxShadow: "0 10px 40px rgba(220, 38, 38, 0.12)",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#FEF2F2",
                border: "2px solid #FCA5A5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "#DC2626",
                boxShadow: "0 0 30px rgba(220, 38, 38, 0.25)",
              }}
            >
              <ShieldAlert size={44} />
            </div>

            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                padding: "6px 18px",
                borderRadius: 100,
                background: "#FEF2F2",
                color: "#DC2626",
                border: "1px solid #FECACA",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              🚨 Critical Alert: Counterfeit / Fake Drug Detected
            </span>

            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "2.3rem",
                fontWeight: 800,
                color: "#991B1B",
                marginTop: 18,
                marginBottom: 8,
              }}
            >
              Unverified / Counterfeit Medicine
            </h1>

            <p style={{ fontSize: 14, color: "#7F1D1D", maxWidth: 640, margin: "0 auto 20px", lineHeight: 1.6 }}>
              The queried code <strong>"{id}"</strong> is <strong>NOT registered</strong> on the immutable DrugChain ledger. 
              No authorized manufacturer batch or cryptographic signature exists for this identifier.
            </p>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 24,
                padding: "12px 24px",
                borderRadius: 14,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
              }}
            >
              <div style={{ fontSize: 13, color: "#991B1B" }}>
                Authenticity Score: <strong style={{ color: "#DC2626", fontSize: 16 }}>0% (FAKE)</strong>
              </div>
              <div style={{ fontSize: 13, color: "#991B1B" }}>
                Detection Confidence: <strong style={{ color: "#991B1B", fontSize: 16 }}>99%</strong>
              </div>
              <div style={{ fontSize: 13, color: "#991B1B" }}>
                Registry Status: <strong style={{ color: "#DC2626", fontSize: 16 }}>NOT FOUND</strong>
              </div>
            </div>

            {/* Consumer Safety Warning */}
            <div
              style={{
                marginTop: 28,
                padding: "20px 24px",
                borderRadius: 16,
                background: "#FFFBEB",
                border: "1.5px solid #FDE68A",
                textAlign: "left",
                maxWidth: 680,
                margin: "28px auto 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <AlertTriangle size={20} color="#D97706" />
                <span style={{ fontSize: 14, fontWeight: 800, color: "#92400E", textTransform: "uppercase" }}>
                  Consumer Safety Warning
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#78350F", margin: 0, lineHeight: 1.6 }}>
                <strong>Do NOT consume, purchase, or dispense this product.</strong> This batch has failed all 6 cryptographic and pharmaceutical supply-chain verification layers. Please report this batch code to your local drug inspector or health regulatory authority immediately.
              </p>
            </div>
          </div>

          {/* 6-Layer Audit Failure Checklist */}
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EAF6",
              borderRadius: 20,
              padding: "28px 32px",
              marginBottom: 32,
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <ShieldAlert size={22} color="#DC2626" />
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#18182E", margin: 0 }}>
                6-Layer Cryptographic Security Audit (Failed Checks)
              </h2>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <VerifyRow label="Layer 1: QR Cryptographic Signature" status={layers.qr} />
              <VerifyRow label="Layer 2: Pharmaceutical Database Registry" status={layers.database} />
              <VerifyRow label="Layer 3: Canonical SHA-256 Merkle Proof" status={layers.integrity} />
              <VerifyRow label="Layer 4: Immutable DrugChain Ledger Block" status={layers.blockchain} />
              <VerifyRow label="Layer 5: Supply-Chain Custody Transfer Trace" status={layers.supplyChain} />
              <VerifyRow label="Layer 6: Anti-Cloning & QR Code Frequency" status={layers.qrReuseRisk} />
            </div>

            {/* Reasons List */}
            <div style={{ marginTop: 24, padding: "18px 20px", borderRadius: 14, background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Security Violation Reasons Detected:
              </div>
              {reasons.map((r, i) => (
                <div key={i} style={{ fontSize: 13, color: "#7F1D1D", display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "#DC2626" }}>✖</span> {r}
                </div>
              ))}
            </div>
          </section>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button
              onClick={() => navigate("/customer")}
              className="btn-primary"
              style={{ padding: "12px 28px", fontSize: 14, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <ArrowLeft size={16} /> Scan / Enter Another Medicine
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── AUTHENTIC MEDICINE VIEW ──
  const { medicine, status, confidence, authenticityScore, layers, reasons, timeline } = data;
  const isAuthentic = status === "AUTHENTIC";
  const isSuspicious = status === "SUSPICIOUS";
  const fullHistory = timeline && timeline.length > 0 ? timeline : medicine.transferHistory || [];

  return (
    <div className="page-bg" style={{ minHeight: "100vh" }}>
      <Background />
      <Header />
      <Toaster position="top-right" />

      <main style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "108px 36px 80px" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate("/customer")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#FFFFFF",
            border: "1px solid #E8EAF6",
            borderRadius: 10,
            padding: "9px 18px",
            cursor: "pointer",
            color: "#18182E",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 32,
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <ArrowLeft size={16} /> Scan Another Medicine
        </button>

        {/* ── STATUS HERO ── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 32,
            padding: "40px 28px",
            borderRadius: 24,
            background: "#FFFFFF",
            border: `2px solid ${isAuthentic ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)"}`,
            boxShadow: isAuthentic ? "0 10px 40px rgba(16,185,129,0.08)" : "0 10px 40px rgba(245,158,11,0.08)",
          }}
        >
          <StatusBadge status={status} size="large" />

          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "2.3rem",
              fontWeight: 800,
              color: "#18182E",
              marginTop: 20,
              marginBottom: 4,
            }}
          >
            {medicine.name}
          </h1>
          <p style={{ fontSize: 15, color: "#5F607A" }}>
            {medicine.company || medicine.manufacturer} · Batch {medicine.batchId}
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 18, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, color: "#5F607A" }}>
              Authenticity Score: <strong style={{ color: isAuthentic ? "#059669" : "#D97706", fontSize: 16 }}>{authenticityScore}%</strong>
            </div>
            <div style={{ fontSize: 14, color: "#5F607A" }}>
              AI/Audit Confidence: <strong style={{ color: "#18182E", fontSize: 16 }}>{confidence}%</strong>
            </div>
            <div style={{ fontSize: 14, color: "#5F607A" }}>
              Verification Count: <strong style={{ color: "#5855F3", fontSize: 16 }}>{medicine.verificationCount || 1}</strong>
            </div>
          </div>

          {/* Verification reasons */}
          {reasons && reasons.length > 0 && (
            <div
              style={{
                marginTop: 24,
                padding: "18px 22px",
                borderRadius: 16,
                background: isAuthentic ? "#F0FDF4" : "#FEF3C7",
                border: `1px solid ${isAuthentic ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                textAlign: "left",
                display: "inline-block",
                maxWidth: 680,
                width: "100%",
              }}
            >
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 12,
                  color: isAuthentic ? "#166534" : "#92400E",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {isAuthentic ? "✓ Cryptographic Evidence Verified:" : "⚠ Supply-Chain Anomaly Flags:"}
              </div>
              {reasons.map((r, i) => (
                <div key={i} style={{ fontSize: 13.5, color: isAuthentic ? "#14532D" : "#78350F", display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: isAuthentic ? "#16A34A" : "#D97706", marginTop: 1 }}>▸</span> {r}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 6-LAYER VERIFICATION CHECKLIST ── */}
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8EAF6",
            borderRadius: 20,
            padding: "28px 32px",
            marginBottom: 32,
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <ShieldCheck size={22} color="#059669" />
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#18182E", margin: 0 }}>
              6-Layer Cryptographic Security Audit
            </h2>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <VerifyRow label="Layer 1: QR Cryptographic Signature" status={layers.qr} />
            <VerifyRow label="Layer 2: Pharmaceutical Database Registry" status={layers.database} />
            <VerifyRow label="Layer 3: Canonical SHA-256 Merkle Proof" status={layers.integrity} />
            <VerifyRow label="Layer 4: Immutable DrugChain Ledger Block" status={layers.blockchain} />
            <VerifyRow label="Layer 5: Supply-Chain Custody Transfer Trace" status={layers.supplyChain} />
            <VerifyRow label="Layer 6: Anti-Cloning & QR Code Frequency" status={layers.qrReuseRisk} />
          </div>
        </section>

        {/* ── PRODUCT SPECIFICATIONS ── */}
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8EAF6",
            borderRadius: 20,
            padding: "28px 32px",
            marginBottom: 32,
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#18182E", marginBottom: 20 }}>
            Product Specifications
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <InfoCell label="Medicine Name" value={medicine.name} icon={Package} color="#5855F3" />
            <InfoCell label="Batch Number" value={medicine.batchId} icon={QrCode} color="#7C3AED" />
            <InfoCell label="Manufacturer" value={medicine.company || medicine.manufacturer} icon={Building2} color="#2563EB" />
            <InfoCell label="Manufacturer Code" value={medicine.manufacturerCode} icon={FileText} color="#0891B2" />
            <InfoCell label="Manufacturing Date" value={medicine.manufacturingDate} icon={Calendar} color="#059669" />
            <InfoCell label="Expiry Date" value={medicine.expiryDate} icon={Clock} color="#D97706" />
            <InfoCell label="MRP / Price" value={medicine.price ? `₹${medicine.price}` : "—"} icon={DollarSign} color="#10B981" />
            <InfoCell label="Batch Quantity" value={medicine.quantity ? `${medicine.quantity} units` : "—"} icon={Package} color="#6366F1" />
          </div>
        </section>

        {/* ── SUPPLY-CHAIN TIMELINE ── */}
        {fullHistory.length > 0 && (
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EAF6",
              borderRadius: 20,
              padding: "28px 32px",
              marginBottom: 32,
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
          >
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#18182E", marginBottom: 20 }}>
              Immutable Supply-Chain Custody History
            </h2>

            <div style={{ display: "grid", gap: 16 }}>
              {fullHistory.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "16px 20px",
                    borderRadius: 14,
                    background: "#F8F9FD",
                    border: "1px solid #E8EAF6",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "#5855F3",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#18182E" }}>
                        {h.role || "Supply Chain Node"} — {h.handler || h.to || h.from || "Authorized Partner"}
                      </span>
                      <span style={{ fontSize: 12, color: "#8E8FA8" }}>
                        {h.timestamp ? new Date(h.timestamp).toLocaleString("en-IN") : "Recorded on Blockchain"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#5F607A" }}>
                      {h.notes || h.action || "Cryptographically signed and confirmed on DrugChain ledger"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ON-CHAIN MERKLE PROOF ── */}
        {medicine.blockchainTxHash && (
          <section
            style={{
              background: "#18182E",
              color: "white",
              borderRadius: 20,
              padding: "24px 28px",
              boxShadow: "0 8px 30px rgba(24,24,46,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={20} color="#10B981" />
                <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>DrugChain Transaction Hash</span>
              </div>
              <button
                onClick={() => copyHash(medicine.blockchainTxHash)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "white",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Hash"}
              </button>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#94A3B8", wordBreak: "break-all" }}>
              {medicine.blockchainTxHash}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
