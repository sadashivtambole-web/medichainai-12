import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck, Database, Cpu, Lock, QrCode, Server,
  GitBranch, Zap, ArrowLeft, Globe, ArrowRight,
  CheckCircle2, Users, Mail, Building2, Code2,
  Layers, Brain, Fingerprint, ChevronRight
} from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";

const techStack = [
  {
    category: "Frontend",
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.2)",
    items: [
      { name: "React 19", detail: "Component-based UI framework" },
      { name: "Vite 6", detail: "Lightning-fast dev + build tool" },
      { name: "React Router v6", detail: "Client-side SPA routing" },
      { name: "Framer Motion", detail: "Smooth UI animations" },
      { name: "TailwindCSS v3", detail: "Utility-first CSS system" },
      { name: "Lucide Icons", detail: "Modern SVG icon library" },
      { name: "React Hot Toast", detail: "Elegant notifications" },
      { name: "html5-qrcode", detail: "QR code camera scanner" },
    ],
  },
  {
    category: "Backend",
    color: "#0284C7",
    bg: "rgba(2,132,199,0.08)",
    border: "rgba(2,132,199,0.2)",
    items: [
      { name: "Node.js 24", detail: "JS runtime (ES Modules)" },
      { name: "Express 4", detail: "REST API framework" },
      { name: "MongoDB + Mongoose", detail: "NoSQL document database" },
      { name: "JWT Auth", detail: "Stateless authentication" },
      { name: "bcryptjs", detail: "Password hashing (10 rounds)" },
      { name: "Multer", detail: "File upload middleware" },
      { name: "Nodemailer", detail: "Email notification service" },
      { name: "Helmet + CORS", detail: "Security headers & CORS" },
    ],
  },
  {
    category: "Blockchain",
    color: "#0D9488",
    bg: "rgba(13,148,136,0.08)",
    border: "rgba(13,148,136,0.2)",
    items: [
      { name: "DrugChain PoA", detail: "Custom private blockchain" },
      { name: "SHA-256 Hashing", detail: "Cryptographic data integrity" },
      { name: "Proof-of-Authority", detail: "Validator-based consensus" },
      { name: "Immutable Ledger", detail: "Tamper-evident block chain" },
      { name: "JSON Block Storage", detail: "Persistent chain state" },
      { name: "Chain Validation", detail: "Full audit trail integrity" },
    ],
  },
  {
    category: "AI / Security",
    color: "#10B981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    items: [
      { name: "Gemini Vision API", detail: "AI tablet image analysis" },
      { name: "OCR Extraction", detail: "Auto-reads batch, date, MFR" },
      { name: "OTP Verification", detail: "Email-based 2FA for signup" },
      { name: "RBAC Middleware", detail: "5-role permission system" },
      { name: "QR Code System", detail: "Unique crypto-linked codes" },
      { name: "Anomaly Detection", detail: "QR reuse risk scoring" },
    ],
  },
];

const architectureFlow = [
  { step: 1, title: "User Registration", desc: "Email OTP → Creator approval → Role assignment → Temporary password", color: "#0284C7", icon: Users },
  { step: 2, title: "Medicine Registration", desc: "Tablet image → AI/OCR extraction → Data hash → DrugChain block", color: "#0D9488", icon: Brain },
  { step: 3, title: "QR Code Generation", desc: "Unique QR with medicineId + batchId → Cryptographically signed", color: "#0284C7", icon: QrCode },
  { step: 4, title: "Supply Chain Transfer", desc: "Manufacturer → Distributor → Pharmacy → each step on-chain", color: "#10B981", icon: GitBranch },
  { step: 5, title: "Public Verification", desc: "Scan QR → Backend lookup → Blockchain + AI check → Result", color: "#F59E0B", icon: ShieldCheck },
];

const systemModules = [
  { title: "Creator Console", desc: "Master admin with full system visibility: user approvals, all medicines, all transfers, blockchain audit, system health.", icon: Lock, color: "#0284C7" },
  { title: "Manufacturer Portal", desc: "5-step registration wizard: manufacturer details → medicine info → AI/OCR verification → QR preview → blockchain record.", icon: Building2, color: "#0D9488" },
  { title: "Distributor Hub", desc: "Incoming transfer dashboard: confirm receipt → forward to pharmacy. Each step recorded on DrugChain.", icon: Server, color: "#06B6D4" },
  { title: "Pharmacy Dashboard", desc: "Receive batches, scan QR codes, run full verification check, manage medicine shelf inventory.", icon: Database, color: "#10B981" },
  { title: "Customer Verify", desc: "Camera QR scan / image upload / manual code entry → full verification with blockchain proof and supply chain history.", icon: ShieldCheck, color: "#F59E0B" },
  { title: "DrugChain Ledger", desc: "Private PoA blockchain: medicine registration, transfer, receipt, verification blocks. Fully auditable chain validation.", icon: Layers, color: "#EF4444" },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="page-bg" style={{ minHeight: "100vh" }}>
      <Background />
      <Header />

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "108px 36px 80px" }}>

        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: 12, padding: "10px 18px",
            cursor: "pointer", color: "#0F172A", fontSize: 13, fontWeight: 700,
            marginBottom: 40, boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#0284C7"; e.currentTarget.style.color = "#0284C7"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#0F172A"; }}
        >
          <ArrowLeft size={15} /> Back to Home
        </button>

        {/* ── Hero ── */}
        <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 72 }}>
          <div className="section-pill" style={{ marginBottom: 20 }}>
            <Globe size={13} /> System Architecture
          </div>
          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              marginBottom: 18,
            }}
          >
            About{" "}
            <span className="gradient-text-primary">MediChainAI</span>
          </h1>
          <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.7, maxWidth: 700, margin: "0 auto 32px" }}>
            A full-stack pharmaceutical authenticity platform combining private blockchain, AI/OCR tablet analysis, 
            and a 5-role role-based supply chain management system — built for real-world drug counterfeit prevention.
          </p>

          {/* Key facts */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            {[
              { val: "5", label: "Roles & Dashboards", color: "#0284C7" },
              { val: "100+", label: "API Endpoints", color: "#0D9488" },
              { val: "PoA", label: "Blockchain Consensus", color: "#0284C7" },
              { val: "AI", label: "OCR Verification", color: "#059669" },
            ].map(f => (
              <div key={f.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "16px 26px", boxShadow: "0 4px 16px rgba(2,132,199,0.06)", textAlign: "center", minWidth: 130 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: f.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.val}</div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8", marginTop: 4 }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Architecture Flow ── */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="section-pill animate-fade-in-up"><Zap size={13} /> Data Flow</div>
            <h2 className="section-title animate-fade-in-up delay-100" style={{ marginBottom: 12 }}>System Architecture</h2>
            <p className="section-subtitle animate-fade-in-up delay-200" style={{ margin: "0 auto" }}>
              How data flows from registration to real-time verification.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto" }}>
            {architectureFlow.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="animate-fade-in-left"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    display: "flex",
                    gap: 20,
                    alignItems: "flex-start",
                    background: "#FFFFFF",
                    border: `1px solid ${item.color}25`,
                    borderRadius: 20,
                    padding: "24px 28px",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.04)",
                    transition: "all 0.3s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateX(6px)"; e.currentTarget.style.boxShadow = `0 10px 40px ${item.color}15`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.04)"; }}
                >
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, background: item.color, borderRadius: "0 20px 20px 0" }} />
                  
                  <div style={{ width: 52, height: 52, borderRadius: 15, background: `${item.color}13`, border: `1px solid ${item.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={24} color={item.color} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: item.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                        {item.step}
                      </span>
                      <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{item.title}</h3>
                    </div>
                    <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── System Modules ── */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="section-pill animate-fade-in-up"><Layers size={13} /> Modules</div>
            <h2 className="section-title animate-fade-in-up delay-100" style={{ marginBottom: 12 }}>System Modules</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {systemModules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 20,
                    padding: "28px 26px",
                    boxShadow: "0 4px 16px rgba(99,102,241,0.04)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = mod.color + "40"; e.currentTarget.style.boxShadow = `0 20px 50px ${mod.color}12`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.04)"; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${mod.color}13`, border: `1px solid ${mod.color}25`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={22} color={mod.color} />
                  </div>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>{mod.title}</h3>
                  <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.65 }}>{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Tech Stack ── */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="section-pill animate-fade-in-up"><Code2 size={13} /> Technology</div>
            <h2 className="section-title animate-fade-in-up delay-100" style={{ marginBottom: 12 }}>Full Tech Stack</h2>
            <p className="section-subtitle animate-fade-in-up delay-200" style={{ margin: "0 auto" }}>
              Every technology chosen for production-grade performance and security.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {techStack.map((cat, ci) => (
              <div
                key={cat.category}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${ci * 0.1}s`,
                  background: "#FFFFFF",
                  border: `1px solid ${cat.border}`,
                  borderRadius: 22,
                  padding: "28px 24px",
                  boxShadow: "0 4px 20px rgba(99,102,241,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, border: `1px solid ${cat.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color }} />
                  </div>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{cat.category}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {cat.items.map(item => (
                    <div key={item.name} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <CheckCircle2 size={14} color={cat.color} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{item.name}</span>
                        <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 6 }}>— {item.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Developer Card ── */}
        <section style={{ marginBottom: 60 }}>
          <div
            className="animate-fade-in-up"
            style={{
              background: "linear-gradient(135deg, #0284C7 0%, #0369A1 50%, #0D9488 100%)",
              borderRadius: 28,
              padding: "48px 48px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(2,132,199,0.3)",
            }}
          >
            <div style={{ position: "absolute", top: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", bottom: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                width: 80, height: 80,
                borderRadius: 24,
                background: "rgba(255,255,255,0.15)",
                border: "2px solid rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 32, fontWeight: 800, color: "white",
                backdropFilter: "blur(10px)",
              }}>
                S
              </div>

              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: "white", marginBottom: 8 }}>
                Sadashiv Tambole
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 4, fontWeight: 600 }}>
                Project Creator & Lead Developer
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 28 }}>
                DrugChain Network Authority · Creator Role
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                {["Full-Stack Development", "Blockchain Architecture", "AI Integration", "System Design"].map(tag => (
                  <span key={tag} style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 100, padding: "6px 16px", fontSize: 12, fontWeight: 700, color: "white" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Back CTA ── */}
        <div style={{ textAlign: "center" }}>
          <button className="btn-primary" onClick={() => navigate("/")}>
            <ArrowLeft size={16} /> Back to Platform
          </button>
          {" "}
          <button className="btn-secondary" style={{ marginLeft: 12 }} onClick={() => navigate("/login")}>
            Access Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
