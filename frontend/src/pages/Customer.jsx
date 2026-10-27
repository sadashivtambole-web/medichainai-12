import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Camera,
  ImageUp,
  Search,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info
} from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import CameraScanner from "../components/forms/CameraScanner";
import QRImageUpload from "../components/forms/QRImageUpload";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";

const TAB = { CAMERA: "camera", IMAGE: "image", MANUAL: "manual" };

export default function Customer() {
  const { medicines } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TAB.CAMERA);
  const [query, setQuery] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  /* Resolve decoded string (camera, image upload, or manual entry) → route to real verification engine */
  const resolve = (raw) => {
    const cleaned = (raw || "").trim();
    if (!cleaned) return;

    let lookup = cleaned;
    try {
      const parsed = JSON.parse(cleaned);
      lookup = parsed.batchId || parsed.medicineId || parsed.code || cleaned;
    } catch {}

    navigate(`/verify/${encodeURIComponent(lookup)}`);
  };

  const handleManual = (e) => {
    e?.preventDefault();
    if (!query.trim()) {
      toast.error("Please enter a medicine code or batch number.");
      return;
    }
    resolve(query);
  };

  const tabs = [
    { id: TAB.CAMERA, icon: Camera, label: "Live Camera Scanner" },
    { id: TAB.IMAGE, icon: ImageUp, label: "Upload QR Photo" },
    { id: TAB.MANUAL, icon: Search, label: "Manual Code Entry" },
  ];

  return (
    <div className="page-bg min-h-screen text-slate-900">
      <Background />
      <Header />
      <Toaster position="top-right" />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-sky-600 hover:border-sky-300 transition-colors shadow-sm"
          >
            <ArrowLeft size={14} /> Back to Network Home
          </button>
        </div>

        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-600/20">
            <QrCode size={26} strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Verify Your <span className="gradient-text-primary">Medicine</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Instantly inspect cryptographic provenance, manufacturing certificates, and authenticity records on DrugChain.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Verification Scanner Interface */}
          <div className="lg:col-span-7">
            {/* Tab Selector */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 mb-6 gap-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id);
                      setShowCamera(false);
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      active
                        ? "bg-white text-sky-700 shadow-sm border border-slate-200/60"
                        : "text-slate-600 hover:text-sky-600 hover:bg-slate-50/50"
                    }`}
                  >
                    <Icon size={15} />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scanner Card */}
            <motion.div
              layout
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8"
            >
              <AnimatePresence mode="wait">
                {/* 1. CAMERA SCAN TAB */}
                {activeTab === TAB.CAMERA && (
                  <motion.div
                    key="tab-camera"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-4"
                  >
                    {!showCamera ? (
                      <div className="space-y-4">
                        <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto">
                          <Camera size={28} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            Scan with Device Camera
                          </h3>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Point your webcam or phone camera at the QR code printed on the medicine blister pack or carton.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCamera(true)}
                          className="btn-primary-lg inline-flex items-center gap-2"
                        >
                          <Camera size={16} /> Activate Camera Scanner
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <CameraScanner onScan={(text) => resolve(text)} />
                        <button
                          onClick={() => setShowCamera(false)}
                          className="btn-secondary text-xs"
                        >
                          Cancel Camera
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 2. IMAGE UPLOAD TAB */}
                {activeTab === TAB.IMAGE && (
                  <motion.div
                    key="tab-image"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-sm font-bold text-slate-900">
                        Upload Packaging Photo
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload a photo of the QR code or medicine foil strip.
                      </p>
                    </div>
                    <QRImageUpload onResult={(text) => resolve(text)} />
                  </motion.div>
                )}

                {/* 3. MANUAL CODE ENTRY TAB */}
                {activeTab === TAB.MANUAL && (
                  <motion.div
                    key="tab-manual"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Enter Batch Code or Hash
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Type the serial identifier or batch ID printed beneath the barcode.
                      </p>
                    </div>

                    <form onSubmit={handleManual} className="space-y-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="e.g. MEDG-AMOX-500-A1B2 or SP-BATCH-104"
                          className="form-input text-sm font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn-primary w-full justify-center"
                      >
                        <Search size={16} /> Run Cryptographic Verification
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Reference Sample Codes Box */}
            <div className="mt-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Sparkles size={14} className="text-teal-600" />
                <span>Reference Test Codes (Real Blockchain Proof)</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Click any reference code below to test instant live ledger resolution:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: "MEDG-AMOX-500-A1B2", label: "Genuine Batch (Amoxicillin)", status: "genuine" },
                  { code: "MEDG-PARA-650-C3D4", label: "Expired Batch (Paracetamol)", status: "expired" },
                  { code: "COUNTERFEIT-UNKNOWN-99", label: "Tampered Batch (Unregistered)", status: "counterfeit" },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => resolve(item.code)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700 hover:border-sky-400 hover:bg-sky-50 transition-all text-left"
                  >
                    <span>{item.code}</span>
                    <span
                      className={`text-[9px] font-sans px-1.5 py-0.5 rounded ${
                        item.status === "genuine"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.status === "expired"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Trust Guarantee & Patient Safety Guidelines */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    6-Layer Verification Audit
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Automated cryptographic security checks
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                {[
                  {
                    title: "Immutable Genesis Stamp",
                    desc: "Verifies the batch was registered by a verified, licensed pharmaceutical manufacturer.",
                  },
                  {
                    title: "Custody Handshake Validation",
                    desc: "Audits on-chain distributor delivery receipts and pharmacy shelf acquisition.",
                  },
                  {
                    title: "Gemini Vision AI Analysis",
                    desc: "Checks tablet dimensions, imprint markings, and packaging typography for anomalies.",
                  },
                  {
                    title: "Duplicate QR Code Guard",
                    desc: "Detects if a single QR code is being scanned repeatedly in geographically disparate locations.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consumer Guidance Alert Box */}
            <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-sky-800">
                <Info size={15} />
                <span>Patient Safety Reminder</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-normal">
                Never accept medicine packs with torn seals or missing QR codes. If the verification screen displays <strong className="text-rose-600">COUNTERFEIT</strong> or <strong className="text-amber-600">EXPIRED</strong>, immediately alert the dispensing pharmacy.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
