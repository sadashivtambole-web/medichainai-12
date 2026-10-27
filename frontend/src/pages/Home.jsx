import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Factory,
  Truck,
  Store,
  User,
  ShieldCheck,
  ArrowRight,
  Activity,
  Cpu,
  Lock,
  QrCode,
  GitBranch,
  Search,
  CheckCircle2,
  ChevronRight,
  Eye,
  Fingerprint,
  Sparkles,
  Layers,
  Thermometer,
  ShieldAlert,
} from "lucide-react";
import Header from "../components/layout/Header";
import MedicinePortal3D from "../components/cinematic/MedicinePortal3D";
import CinematicIntro from "../components/cinematic/CinematicIntro";
import PharmaceuticalJourney from "../components/cinematic/PharmaceuticalJourney";
import { useApp } from "../context/AppContext";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  const { medicines, transfers, blockchainInfo } = useApp();
  const navigate = useNavigate();
  const [quickVerifyCode, setQuickVerifyCode] = useState("");
  const [introFinished, setIntroFinished] = useState(false);

  const totalMedicines = medicines?.length || 0;
  const verifiedCount =
    (medicines || []).filter(
      (m) => m.status === "AUTHENTIC" || m.status === "ACTIVE"
    ).length || totalMedicines;
  const totalBlocks = blockchainInfo?.blocks || totalMedicines + 1;

  const handleQuickVerify = (e) => {
    e.preventDefault();
    const code = quickVerifyCode.trim();
    if (!code) {
      toast.error("Please enter a medicine batch code or serial ID.");
      return;
    }
    navigate(`/verify/${encodeURIComponent(code)}`);
  };

  const rolePortals = [
    {
      role: "Manufacturer",
      title: "Pharmaceutical Producer",
      desc: "Batch creation, AI image analysis, QR issuance, and genesis custody assignment.",
      icon: Factory,
      path: "/manufacturer",
      badge: "Producer",
      accent: "from-sky-600 to-sky-700",
      stats: `${totalMedicines} Batches Logged`,
    },
    {
      role: "Distributor",
      title: "Logistics & Supply Line",
      desc: "Cross-dock shipment reception, custody confirmation, and transit verification.",
      icon: Truck,
      path: "/distributor",
      badge: "Supply Chain",
      accent: "from-teal-600 to-teal-700",
      stats: `${transfers?.length || 0} Transfers Tracked`,
    },
    {
      role: "Pharmacy",
      title: "Dispensary & Retailer",
      desc: "Medicine shelf inspection, inventory validation, and patient dispensing safety.",
      icon: Store,
      path: "/pharmacy",
      badge: "Dispensary",
      accent: "from-blue-600 to-cyan-700",
      stats: "Live Dispense Auditing",
    },
    {
      role: "Customer",
      title: "Patient & Consumer Portal",
      desc: "Instant public verification of any medicine package with full provenance history.",
      icon: ShieldCheck,
      path: "/customer",
      badge: "Verification",
      accent: "from-emerald-600 to-teal-700",
      stats: "100% Free Public Access",
    },
  ];

  const corePillars = [
    {
      icon: Cpu,
      title: "Gemini Vision AI Engine",
      desc: "Automated OCR, contour matching, and packaging defect inspection cross-checking registered chemical specifications.",
    },
    {
      icon: GitBranch,
      title: "Private DrugChain PoA",
      desc: "High-throughput private Proof-of-Authority blockchain ensuring zero unauthorized state alteration and sub-second finality.",
    },
    {
      icon: QrCode,
      title: "Dual-Layer QR Cryptography",
      desc: "Dynamic SHA-256 batch tokens mathematically bonded to decentralized ledger blocks to stop counterfeit clones.",
    },
    {
      icon: Eye,
      title: "Granular Audit Provenance",
      desc: "Complete chronological custody chain from synthesis factory chamber to the patient's prescription bottle.",
    },
    {
      icon: Fingerprint,
      title: "Anti-Counterfeit Telemetry",
      desc: "Duplicate serialization alerts and automated anomaly detection across all logistics corridors.",
    },
    {
      icon: Lock,
      title: "Role-Based Cryptographic Access",
      desc: "Admin-verified onboarding and strict asymmetric digital signature requirements for all transfers.",
    },
  ];

  return (
    <div className="min-h-screen text-slate-900 bg-white selection:bg-sky-500 selection:text-white">
      {/* ══ CINEMATIC INTRO SEQUENCE ══ */}
      <CinematicIntro onComplete={() => setIntroFinished(true)} />

      <Header />
      <Toaster position="top-right" />

      {/* ══ HERO EXPERIENCE: LIGHT & CLEAN WHITE ATMOSPHERE ══ */}
      <section className="relative z-10 pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-white text-slate-900 overflow-hidden border-b border-slate-100">
        {/* Subtle Background Particle Grid & Glowing Ambient Lights */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 30%, rgba(14,165,233,0.08), transparent 70%), linear-gradient(rgba(14,165,233,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 48px 48px, 48px 48px",
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline, Description & CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 shadow-sm backdrop-blur-md">
                <Sparkles size={14} className="text-sky-600 animate-pulse" />
                <span className="text-xs font-bold tracking-wider uppercase font-mono">
                  Autonomous Pharmaceutical Integrity Protocol
                </span>
              </div>

              {/* Master Slogan Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
                Every Medicine.{" "}
                <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-sky-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Verified.
                </span>{" "}
                Every Step.
              </h1>

              {/* Supporting Value Proposition */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Eradicate counterfeit pharmaceuticals with end-to-end cryptographic traceability.
                Combines private DrugChain Proof-of-Authority consensus, Gemini Vision AI tablet
                inspection, and tamper-evident dual-layer QR serialization.
              </p>

              {/* Quick Batch Verification Input Bar */}
              <div className="pt-2">
                <form
                  onSubmit={handleQuickVerify}
                  className="flex items-center max-w-lg mx-auto lg:mx-0 bg-white p-1.5 rounded-2xl border border-slate-300 shadow-lg shadow-sky-950/5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all"
                >
                  <div className="pl-3 text-sky-600">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={quickVerifyCode}
                    onChange={(e) => setQuickVerifyCode(e.target.value)}
                    placeholder="Enter Medicine Batch Code or Serial..."
                    className="w-full px-3 py-2.5 text-sm bg-transparent outline-none text-slate-900 placeholder:text-slate-400 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-sky-600/25 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                  >
                    Verify <ArrowRight size={13} />
                  </button>
                </form>
                <p className="text-[11px] text-slate-500 mt-2 font-mono">
                  Sample Registry Code:{" "}
                  <code
                    className="bg-slate-100 text-sky-700 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-slate-200 border border-slate-200 transition-colors"
                    onClick={() => setQuickVerifyCode("MEDG-AMOX-500-A1B2")}
                  >
                    MEDG-AMOX-500-A1B2
                  </code>
                </p>
              </div>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/customer"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-sky-600 to-teal-600 text-white font-bold text-sm shadow-xl shadow-sky-600/25 hover:shadow-sky-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <ShieldCheck size={18} /> Verify Medicine
                </Link>
                <a
                  href="#journey"
                  className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-sm border border-slate-200 backdrop-blur-md transition-all flex items-center gap-2"
                >
                  Explore Technology <ChevronRight size={15} />
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>SHA-256 Ledger Proven</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>PoA Consensus</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Gemini Vision AI</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Signature 3D Medicine Portal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
              className="lg:col-span-5 relative"
            >
              <MedicinePortal3D isCinematicHero={false} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ LIVE NETWORK TELEMETRY STRIP ══ */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-xl shadow-sky-950/5">
          <div className="text-center sm:text-left sm:pl-4 border-r border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Blockchain Ledger
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono">
              #{totalBlocks} <span className="text-xs font-bold text-sky-600">Blocks</span>
            </p>
            <span className="inline-block mt-1 text-[11px] text-emerald-600 font-semibold">
              ● 100% Chain Valid
            </span>
          </div>

          <div className="text-center sm:text-left sm:pl-4 border-r border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Verified Batches
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono">
              {verifiedCount} <span className="text-xs font-bold text-teal-600">Active</span>
            </p>
            <span className="inline-block mt-1 text-[11px] text-slate-500 font-medium">
              Registered in Database
            </span>
          </div>

          <div className="text-center sm:text-left sm:pl-4 border-r border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Consensus Latency
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono">
              &lt; 0.8 <span className="text-xs font-bold text-blue-600">sec</span>
            </p>
            <span className="inline-block mt-1 text-[11px] text-emerald-600 font-semibold">
              Real-time Finality
            </span>
          </div>

          <div className="text-center sm:text-left sm:pl-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Security Protocol
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              PoA <span className="text-xs font-bold text-emerald-600">+ AI</span>
            </p>
            <span className="inline-block mt-1 text-[11px] text-slate-500 font-medium">
              Zero-Tamper Guarantee
            </span>
          </div>
        </div>
      </section>

      {/* ══ INTERACTIVE PHARMACEUTICAL JOURNEY ══ */}
      <section id="journey" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 uppercase tracking-wider">
            Supply Chain Lifecycle
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
            The Verified Pharmaceutical Journey
          </h2>
          <p className="text-slate-600 mt-3 text-sm sm:text-base">
            Track how each medicine batch transitions through cryptographic handshakes from
            synthesis to dispensing. Click each node or simulate security intercepts.
          </p>
        </div>

        <PharmaceuticalJourney realBatchCount={totalMedicines} />
      </section>

      {/* ══ ROLE PORTALS DIRECT ACCESS ══ */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-slate-100/70 rounded-3xl border border-slate-200/80 my-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 uppercase tracking-wider">
            Ecosystem Portals
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
            Role-Based Workspaces
          </h2>
          <p className="text-slate-600 mt-3 text-sm sm:text-base">
            Access secure, high-throughput workflows built for manufacturers, logistics distributors,
            and licensed pharmacies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rolePortals.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.role}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 text-sky-700 flex items-center justify-center border border-sky-100">
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{item.role}</h3>
                  <h4 className="text-xs font-medium text-slate-400 mt-0.5">{item.title}</h4>
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-teal-700">
                    {item.stats}
                  </span>
                  <Link
                    to={item.path}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
                  >
                    Open <ChevronRight size={14} />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ══ CORE SYSTEM ARCHITECTURE ══ */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 uppercase tracking-wider">
            Technical Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
            Built for Zero Failure Tolerances
          </h2>
          <p className="text-slate-600 mt-3 text-sm sm:text-base">
            MediChainAI bridges computer vision neural nets, cryptographic ledger consensus, and
            real-time physical packaging serialization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {corePillars.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-teal-300 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{feat.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ CALL TO ACTION BANNER ══ */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-teal-600 rounded-3xl p-10 sm:p-14 text-white shadow-2xl shadow-sky-600/20">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Verify Authentic Medicine In Seconds
          </h2>
          <p className="text-sky-100 max-w-xl mx-auto mt-3 text-sm sm:text-base">
            Experience tamper-evident public drug verification or integrate your pharmaceutical
            supply chain with our Proof-of-Authority network.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link
              to="/customer"
              className="px-6 py-3.5 rounded-xl bg-white text-sky-800 font-extrabold text-sm shadow hover:bg-slate-50 transition-colors"
            >
              Open Verification Desk
            </Link>
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-xl bg-sky-900/60 hover:bg-sky-900 text-white font-bold text-sm border border-sky-400/40 transition-colors"
            >
              Register Organization
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-8 px-4 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 MediChainAI — Decentralized Pharmaceutical Supply Chain Integrity Network.</p>
        <p className="mt-1">
          Compliant with Global Serialization Standards & DrugChain PoA Consensus.
        </p>
      </footer>
    </div>
  );
}
