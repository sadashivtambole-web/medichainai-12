import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Factory,
  Truck,
  Store,
  User,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Lock,
  Cpu,
  Thermometer,
  QrCode,
  Sparkles,
} from "lucide-react";

/**
 * Interactive Pharmaceutical Supply Chain Journey
 * Visualizes: Manufacturer -> Distributor -> Pharmacy -> User
 * - Interactive stage selection with animated connection beams
 * - Verification checkpoints for each role
 * - Scenario toggle: Legitimate Verified Flow vs. Suspicious / Interrupted Transfer Alert
 */
export default function PharmaceuticalJourney({ realBatchCount = 0 }) {
  const [activeStage, setActiveStage] = useState(0);
  const [scenario, setScenario] = useState("legitimate"); // 'legitimate' | 'suspicious'

  const stages = [
    {
      id: "manufacturer",
      title: "Manufacturer",
      action: "Genesis Minting & Chemical Formulation",
      icon: Factory,
      color: "#0284C7",
      bgColor: "bg-sky-50",
      borderColor: "border-sky-500",
      textColor: "text-sky-600",
      blockLabel: "Genesis Block #108,420",
      summary:
        "The pharmaceutical manufacturer synthesizes the drug, registers the active batch in the database, runs Gemini Vision packaging inspection, and assigns an immutable SHA-256 cryptographic QR code.",
      checkpoints: [
        { label: "Admin-Verified Manufacturer Key", status: "passed" },
        { label: "Gemini Vision Packaging Baseline Uploaded", status: "passed" },
        { label: "Dual-Layer QR Batch Hash Generated", status: "passed" },
        { label: "Genesis Ledger Block Recorded", status: "passed" },
      ],
      suspiciousNote: null,
    },
    {
      id: "distributor",
      title: "Distributor",
      action: "Logistics Handshake & Cold-Chain Transit",
      icon: Truck,
      color: "#0D9488",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-500",
      textColor: "text-teal-600",
      blockLabel: "Relay Block #108,421",
      summary:
        "The authorized distributor scans the inbound shipment upon arrival at the distribution hub. Custody transfer is cryptographically signed and tracked along the transit corridor.",
      checkpoints: [
        { label: "Authorized Distributor Approval Check", status: "passed" },
        {
          label: "Cold-Chain Temperature (2°C - 8°C)",
          status: scenario === "suspicious" ? "failed" : "passed",
        },
        {
          label: "Transit Seal Cryptographic Match",
          status: scenario === "suspicious" ? "warning" : "passed",
        },
        { label: "Custody Handshake Timestamped", status: "passed" },
      ],
      suspiciousNote:
        scenario === "suspicious"
          ? "CRITICAL ALERT: Unauthorized routing detour and temperature excursion detected! Automatic quarantine flag attached to batch."
          : null,
    },
    {
      id: "pharmacy",
      title: "Pharmacy",
      action: "Dispensary Inward & Shelf Inspection",
      icon: Store,
      color: "#2563EB",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-500",
      textColor: "text-blue-600",
      blockLabel: "Retail Block #108,422",
      summary:
        "The licensed dispensary scans the batch into inventory. Expiration dates are checked against registry baselines before the medicine is cleared for patient dispensing.",
      checkpoints: [
        { label: "Licensed Dispensary Identity Validated", status: "passed" },
        { label: "Expiration Date Safety Buffer Verified", status: "passed" },
        { label: "Tamper-Evident Foil Hologram Audited", status: "passed" },
        { label: "Inventory Stock Added to Dispense Registry", status: "passed" },
      ],
      suspiciousNote: null,
    },
    {
      id: "user",
      title: "Patient / Consumer",
      action: "Instant Public Camera QR Verification",
      icon: User,
      color: "#059669",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-500",
      textColor: "text-emerald-600",
      blockLabel: "Public Audit Block #108,423",
      summary:
        "Before consumption, the patient or consumer scans the box using their smartphone camera or web browser. The system verifies end-to-end custody and confirms 100% authenticity.",
      checkpoints: [
        { label: "Proof-of-Authority Consensus Check", status: "passed" },
        { label: "Gemini Vision Blister Morphology Score: 99.8%", status: "passed" },
        { label: "No Duplicate Serial Scan Anomaly", status: "passed" },
        { label: "Official Authenticity Certificate Rendered", status: "passed" },
      ],
      suspiciousNote: null,
    },
  ];

  const currentStage = stages[activeStage];

  return (
    <div className="w-full">
      {/* ══ CONTROLS BAR: SCENARIO TOGGLE ══ */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <GitBranch size={18} className="text-sky-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Supply Chain Simulation Mode:
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScenario("legitimate")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              scenario === "legitimate"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <CheckCircle2 size={13} /> Legitimate Supply Chain
          </button>
          <button
            onClick={() => setScenario("suspicious")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              scenario === "suspicious"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <AlertTriangle size={13} /> Suspicious / Interrupted Intercept
          </button>
        </div>
      </div>

      {/* ══ 4-STAGE PIPELINE CAROUSEL ══ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isSelected = activeStage === idx;
          const isPast = activeStage > idx;

          let badgeColor = "bg-slate-100 text-slate-500";
          if (scenario === "suspicious" && idx === 1) {
            badgeColor = "bg-rose-100 text-rose-700 border border-rose-300";
          } else if (isSelected) {
            badgeColor = "bg-sky-100 text-sky-800 border border-sky-300";
          } else if (isPast) {
            badgeColor = "bg-emerald-100 text-emerald-800 border border-emerald-300";
          }

          return (
            <motion.div
              key={stage.id}
              onClick={() => setActiveStage(idx)}
              whileHover={{ y: -3 }}
              className={`p-5 rounded-2xl cursor-pointer transition-all border text-left relative ${
                isSelected
                  ? "bg-white border-sky-500 shadow-md ring-2 ring-sky-200"
                  : "bg-white/80 border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Top Row: Icon + Step */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: stage.color + "15", color: stage.color }}
                >
                  <Icon size={20} />
                </div>
                <span className="font-mono text-xs font-bold text-slate-400">0{idx + 1}</span>
              </div>

              {/* Title */}
              <h4 className="text-sm font-extrabold text-slate-900">{stage.title}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{stage.action}</p>

              {/* Status Badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {scenario === "suspicious" && idx === 1
                    ? "QUARANTINE"
                    : isSelected
                    ? "INSPECTING"
                    : isPast
                    ? "CONFIRMED"
                    : "QUEUED"}
                </span>

                {isSelected && (
                  <motion.span
                    layoutId="activePointer"
                    className="w-2 h-2 rounded-full bg-sky-500 animate-ping"
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ══ STAGE DEEP DIVE ACCORDION ══ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentStage.id}-${scenario}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className={`p-6 sm:p-8 rounded-3xl border ${
            scenario === "suspicious" && activeStage === 1
              ? "bg-rose-50/70 border-rose-300"
              : "bg-white border-slate-200/90 shadow-sm"
          }`}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                  {currentStage.blockLabel}
                </span>
                {scenario === "suspicious" && activeStage === 1 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center gap-1">
                    <AlertTriangle size={12} /> INTERCEPTED ANOMALY
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> CONSENSUS VERIFIED
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Stage {activeStage + 1}: {currentStage.title} — {currentStage.action}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={activeStage === 0}
                onClick={() => setActiveStage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous Stage
              </button>
              <button
                disabled={activeStage === stages.length - 1}
                onClick={() => setActiveStage((p) => Math.min(stages.length - 1, p + 1))}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold disabled:opacity-40"
              >
                Next Stage →
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
            {/* Description & Narrative */}
            <div className="lg:col-span-6 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Workflow Specification
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed font-normal">
                {currentStage.summary}
              </p>

              {currentStage.suspiciousNote && (
                <div className="p-4 rounded-2xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs font-medium space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <ShieldAlert size={16} /> Interruption Protocol Triggered
                  </div>
                  <p>{currentStage.suspiciousNote}</p>
                  <p className="text-[11px] text-rose-700 font-mono">
                    Notification sent to Admin & Registered Manufacturer via Gmail SMTP.
                  </p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-900">Decentralized Trust Mechanics</p>
                <p className="text-[11px] text-slate-500">
                  Transactions are submitted directly to the Express backend (`/api/transfers`),
                  cryptographically signed with ECDSA keys, and verified against MongoDB ledger states.
                </p>
              </div>
            </div>

            {/* Verification Checkpoints Checklist */}
            <div className="lg:col-span-6 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Verification Checkpoints
              </h4>
              <div className="space-y-2.5">
                {currentStage.checkpoints.map((cp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <span className="font-medium text-slate-700">{cp.label}</span>
                    {cp.status === "passed" && (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <CheckCircle2 size={14} /> Passed
                      </span>
                    )}
                    {cp.status === "warning" && (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <AlertTriangle size={14} /> Warning
                      </span>
                    )}
                    {cp.status === "failed" && (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                        <AlertTriangle size={14} /> Failed (Quarantine)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
