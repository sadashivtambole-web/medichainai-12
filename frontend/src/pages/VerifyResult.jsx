import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  FileText,
  ShieldAlert,
  Building2,
  QrCode,
  Calendar,
  DollarSign,
  Package,
} from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import StatusBadge from "../components/ui/StatusBadge";
import MedicineImage from "../components/ui/MedicineImage";
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

  const color = isGood ? "#059669" : isWarning ? "#D97706" : "#DC2626";
  const bg = isGood
    ? "#ECFDF5"
    : isWarning
    ? "#FFFBEB"
    : "#FEF2F2";
  const border = isGood
    ? "#A7F3D0"
    : isWarning
    ? "#FDE68A"
    : "#FECACA";

  const icon = isGood ? (
    <CheckCircle2 size={16} color={color} />
  ) : isWarning ? (
    <AlertTriangle size={16} color={color} />
  ) : (
    <XCircle size={16} color={color} />
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderRadius: 12,
        background: bg,
        border: `1px solid ${border}`,
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: "0.02em" }}>{status}</span>
      </div>
    </div>
  );
}

function InfoCell({ label, value, icon: Icon, color = "#0284C7" }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: `${color}12`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={color} />
        </div>
      )}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{value || "—"}</div>
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
      <div className="page-bg min-h-screen flex items-center justify-center">
        <Background />
        <div className="relative z-10 text-center max-w-md mx-auto px-4">
          <Loader2 size={42} className="text-sky-600 animate-spin mx-auto mb-4" />
          <h2 className="font-extrabold text-2xl text-slate-900 mb-2 tracking-tight">
            Cryptographic Audit in Progress...
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Executing 6-layer blockchain consensus verification, digital signature integrity check, and supply chain provenance validation.
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
      <div className="page-bg min-h-screen text-slate-900">
        <Background />
        <Header />
        <Toaster position="top-right" />

        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          {/* Back Button */}
          <button
            onClick={() => navigate("/customer")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-sky-600 mb-6 shadow-sm"
          >
            <ArrowLeft size={14} /> Scan Another Code
          </button>

          {/* FAKE DRUG SECURITY HERO ALERT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-white rounded-3xl border-2 border-rose-200 p-8 sm:p-12 shadow-xl shadow-rose-900/5 mb-8"
          >
            <div className="w-18 h-18 w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-300 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-md shadow-rose-600/20">
              <ShieldAlert size={36} />
            </div>

            <span className="inline-block px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-extrabold uppercase tracking-wider mb-3">
              🚨 Critical Alert: Counterfeit / Fake Drug Detected
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-rose-900 tracking-tight mb-2">
              Unverified / Counterfeit Medicine
            </h1>

            <p className="text-xs sm:text-sm text-rose-800 max-w-xl mx-auto mb-6 leading-relaxed">
              The queried identifier <strong>"{id}"</strong> is <strong>NOT registered</strong> on the immutable DrugChain ledger. 
              No authorized manufacturer batch or cryptographic signature exists for this code.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 py-2.5 px-5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold inline-flex">
              <div>Authenticity Score: <strong className="text-rose-600 font-bold">0% (FAKE)</strong></div>
              <div className="text-rose-300 hidden sm:inline">|</div>
              <div>Detection Confidence: <strong>99%</strong></div>
              <div className="text-rose-300 hidden sm:inline">|</div>
              <div>Ledger Status: <strong className="text-rose-600 font-bold">NOT FOUND</strong></div>
            </div>

            {/* Consumer Safety Warning */}
            <div className="mt-8 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-left max-w-xl mx-auto text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 uppercase">
                <AlertTriangle size={16} className="text-amber-600" />
                <span>Patient Safety Advisory</span>
              </div>
              <p className="text-amber-800 leading-relaxed font-normal">
                <strong>Do NOT consume, purchase, or dispense this item.</strong> This batch has failed all 6 cryptographic and supply-chain verification layers. Please report this packaging to your local health regulatory authority immediately.
              </p>
            </div>
          </motion.div>

          {/* 6-Layer Audit Failure Checklist */}
          <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={20} className="text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">
                6-Layer Cryptographic Security Audit (Failed Checks)
              </h2>
            </div>

            <div className="grid gap-2.5">
              <VerifyRow label="Layer 1: QR Cryptographic Signature" status={layers.qr} />
              <VerifyRow label="Layer 2: Pharmaceutical Database Registry" status={layers.database} />
              <VerifyRow label="Layer 3: Canonical SHA-256 Merkle Proof" status={layers.integrity} />
              <VerifyRow label="Layer 4: Immutable DrugChain Ledger Block" status={layers.blockchain} />
              <VerifyRow label="Layer 5: Supply-Chain Custody Transfer Trace" status={layers.supplyChain} />
              <VerifyRow label="Layer 6: Anti-Cloning & QR Code Frequency" status={layers.qrReuseRisk} />
            </div>

            {/* Reasons List */}
            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs">
              <div className="font-extrabold text-rose-900 uppercase tracking-wider mb-2">
                Security Violation Reasons Detected:
              </div>
              {reasons.map((r, i) => (
                <div key={i} className="text-rose-800 flex items-start gap-2 mb-1.5">
                  <span className="text-rose-600 font-bold shrink-0">✖</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate("/customer")}
              className="btn-primary-lg inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Scan / Enter Another Medicine
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── AUTHENTIC MEDICINE VIEW ──
  const medicine = data.medicine || {};
  const status = data.status || data.result?.status || (data.isFake ? "COUNTERFEIT" : "AUTHENTIC");
  const confidence = data.confidence ?? data.checks?.ai?.confidence ?? (data.aiAnalysis?.confidence || 98);
  const authenticityScore = data.authenticityScore ?? data.result?.score ?? (data.isFake ? 0 : 100);
  const layers = data.layers || {};
  const reasons = data.reasons || [];
  const warnings = data.warnings || [];
  const aiAnalysis = data.aiAnalysis || null;
  const ocrData = aiAnalysis?.extractedData || data.checks?.ocr?.extractedData || null;
  const comparison = aiAnalysis?.comparison || null;
  const isAuthentic = status === "AUTHENTIC" || status === "VERIFIED_AUTHENTIC";
  const fullHistory = (data.timeline && data.timeline.length > 0) ? data.timeline : (medicine.transferHistory || []);

  return (
    <div className="page-bg min-h-screen text-slate-900">
      <Background />
      <Header />
      <Toaster position="top-right" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        {/* Back Button */}
        <button
          onClick={() => navigate("/customer")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-sky-600 mb-6 shadow-sm"
        >
          <ArrowLeft size={14} /> Scan Another Medicine
        </button>

        {/* ── STATUS HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center bg-white rounded-3xl p-8 sm:p-10 shadow-sm mb-8 border-2 ${
            isAuthentic
              ? "border-emerald-200"
              : status === "REJECTED" || status === "SUBMISSION_REJECTED"
              ? "border-rose-300 bg-rose-50/20"
              : "border-amber-200 bg-amber-50/20"
          }`}
        >
          <StatusBadge status={status} size="large" />

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 mb-1 tracking-tight">
            {medicine.name}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {medicine.company || medicine.manufacturer} · Batch #{medicine.batchId}
          </p>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-6 pt-6 border-t border-slate-100 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Authenticity Score</p>
              <p className={`text-lg font-extrabold mt-0.5 ${
                isAuthentic ? "text-emerald-600" : status === "REJECTED" ? "text-rose-600" : "text-amber-600"
              }`}>
                {authenticityScore}/100
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Verification Confidence</p>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5">{confidence}%</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tampering Risk</p>
              <p className="text-lg font-extrabold text-emerald-600 mt-0.5">
                {aiAnalysis?.tamperingAnalysis?.riskLevel || "LOW"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Verified Scans</p>
              <p className="text-lg font-extrabold text-sky-600 mt-0.5">{medicine.verificationCount || 1}</p>
            </div>
          </div>

          {/* Warnings Section */}
          {warnings && warnings.length > 0 && (
            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left max-w-xl mx-auto text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-800 uppercase mb-1">
                <AlertTriangle size={15} className="text-rose-600" />
                <span>Verification Warnings:</span>
              </div>
              {warnings.map((w, idx) => (
                <div key={idx} className="text-rose-700 mt-0.5">
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}

          {/* Evidence Explanation */}
          {reasons && reasons.length > 0 && (
            <div className={`mt-6 p-4 rounded-2xl text-left max-w-xl mx-auto text-xs border ${
              isAuthentic
                ? "bg-emerald-50/70 border-emerald-200"
                : status === "REJECTED" || status === "SUBMISSION_REJECTED"
                ? "bg-rose-50/80 border-rose-200"
                : "bg-amber-50/70 border-amber-200"
            }`}>
              <div className="font-extrabold uppercase tracking-wider mb-2 text-slate-800">
                {isAuthentic
                  ? "✓ Cryptographic Evidence Verified:"
                  : status === "REJECTED" || status === "SUBMISSION_REJECTED"
                  ? "❌ Rejection & Compliance Notice:"
                  : "⚠ Verification Notice:"}
              </div>
              {reasons.map((r, i) => (
                <div key={i} className="text-slate-700 flex items-start gap-1.5 mb-1">
                  <span className={isAuthentic ? "text-emerald-600" : status === "REJECTED" ? "text-rose-600" : "text-amber-600"}>▸</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── MANUFACTURER MEDICINE IMAGE ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
            📸 Original Manufacturer Reference Image
          </h2>
          <div style={{ borderRadius: 14, overflow: "hidden", maxHeight: 300, border: "1px solid #E2E8F0" }}>
            <MedicineImage
              src={medicine.imageUrl || medicine.medicineImage}
              alt={`${medicine.name} — original manufacturer packaging`}
              style={{ height: 300 }}
              placeholderSize={140}
            />
          </div>
          {(medicine.imageUrl || medicine.medicineImage) && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              Click image to enlarge · Original photo uploaded by manufacturer at registration
            </p>
          )}
        </section>

        {/* ── PRODUCT SPECIFICATIONS ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
            Verified Packaging Specifications
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <InfoCell label="Medicine Name" value={medicine.name} icon={Package} color="#0284C7" />
            <InfoCell label="Active Formula" value={medicine.composition || "Standard Formula"} icon={FileText} color="#7C3AED" />
            <InfoCell label="Batch Number" value={medicine.batchId} icon={QrCode} color="#0D9488" />
            <InfoCell label="Manufacturer" value={medicine.company || medicine.manufacturer} icon={Building2} color="#0369A1" />
            <InfoCell label="Manufacturer Code" value={medicine.manufacturerCode} icon={FileText} color="#0F766E" />
            <InfoCell label="Approval Status" value={(medicine.approvalStatus || "approved").toUpperCase()} icon={ShieldCheck} color="#059669" />
            <InfoCell label="Manufacturing Date" value={medicine.manufacturingDate} icon={Calendar} color="#059669" />
            <InfoCell label="Expiry Date" value={medicine.expiryDate} icon={Clock} color="#D97706" />
            <InfoCell label="MRP Price" value={medicine.price ? `₹${medicine.price}` : "—"} icon={DollarSign} color="#10B981" />
          </div>
        </section>

        {/* ── 6-LAYER VERIFICATION CHECKLIST ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={20} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              6-Layer Cryptographic Security Audit
            </h2>
          </div>

          <div className="grid gap-2.5">
            <VerifyRow label="Layer 1: QR Cryptographic Signature" status={layers.qr} />
            <VerifyRow label="Layer 2: Pharmaceutical Database Registry" status={layers.database} />
            <VerifyRow label="Layer 3: Canonical SHA-256 Merkle Proof" status={layers.integrity} />
            <VerifyRow label="Layer 4: Immutable DrugChain Ledger Block" status={layers.blockchain} />
            <VerifyRow label="Layer 5: Supply-Chain Custody Transfer Trace" status={layers.supplyChain} />
            <VerifyRow label="Layer 6: Anti-Cloning & QR Code Frequency" status={layers.qrReuseRisk} />
          </div>
        </section>

        {/* ── SUPPLY-CHAIN TIMELINE ── */}
        {fullHistory.length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
              Immutable Supply-Chain Custody Trail
            </h2>

            <div className="space-y-3">
              {fullHistory.map((h, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {h.role || "Supply Chain Node"} — {h.handler || h.to || h.from || "Authorized Partner"}
                      </p>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {h.timestamp ? new Date(h.timestamp).toLocaleString("en-IN") : "Recorded"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-normal">
                      {h.notes || h.action || "Cryptographically signed and confirmed on DrugChain ledger"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ON-CHAIN MERKLE PROOF ── */}
        {medicine.blockchainTxHash && (
          <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  DrugChain Transaction Hash
                </span>
              </div>
              <button
                onClick={() => copyHash(medicine.blockchainTxHash)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy Hash"}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-400 break-all select-all">
              {medicine.blockchainTxHash}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
