import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Factory, Truck, Store, User, ShieldCheck, ArrowRight, Activity,
  Cpu, Lock, QrCode, GitBranch, Zap, CheckCircle2, Globe,
  ChevronRight, Database, Eye, Fingerprint, Shield
} from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import ApproverBar from "../components/ui/ApproverBar";
import { useApp } from "../context/AppContext";
import { Toaster } from "react-hot-toast";

/* ── Animated Counter ── */
function Counter({ target, duration = 1800, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = target / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Floating Particle ── */
function Particle({ style }) {
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: "50%",
        pointerEvents: "none",
        animation: `particle-float ${4 + Math.random() * 4}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 4}s`,
        ...style,
      }}
    />
  );
}

export default function Home() {
  const { medicines, transfers, blockchainInfo } = useApp();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  const totalMedicines = medicines.length;
  const verifiedCount = (medicines || []).filter((m) => m.status === "AUTHENTIC").length;
  const pendingTransfers = (transfers || []).filter((t) => t.status === "Pending Confirmation").length;
  const confirmedTransfers = (transfers || []).filter((t) => t.blockchainStatus === "Confirmed" || t.blockchainStatus === "Forwarded to Pharmacy" || t.blockchainStatus === "Received").length;

  const roles = [
    {
      icon: Factory,
      title: "Manufacturer",
      description: "Register medicines with AI-verified tablet images, generate unique QR codes and record on immutable blockchain.",
      color: "#6366F1",
      bgColor: "rgba(99,102,241,0.08)",
      borderColor: "rgba(99,102,241,0.2)",
      route: "/manufacturer",
      badge: "Producer",
      stats: [
        { label: "Registered", value: totalMedicines },
        { label: "Verified", value: verifiedCount },
      ],
    },
    {
      icon: Truck,
      title: "Distributor",
      description: "Confirm incoming medicine shipments and relay authenticated batches to pharmacies with blockchain receipts.",
      color: "#8B5CF6",
      bgColor: "rgba(139,92,246,0.08)",
      borderColor: "rgba(139,92,246,0.2)",
      route: "/distributor",
      badge: "Logistics",
      stats: [
        { label: "In Transit", value: pendingTransfers },
        { label: "Transferred", value: confirmedTransfers },
      ],
    },
    {
      icon: Store,
      title: "Pharmacy",
      description: "Receive certified medicines, scan QR codes for real-time authenticity checks and blockchain history.",
      color: "#06B6D4",
      bgColor: "rgba(6,182,212,0.08)",
      borderColor: "rgba(6,182,212,0.2)",
      route: "/pharmacy",
      badge: "Retail",
      stats: [
        { label: "On Shelf", value: medicines.filter(m => m.currentHolder === "Pharmacy").length },
        { label: "Verified", value: verifiedCount },
      ],
    },
    {
      icon: User,
      title: "Customer",
      description: "Instantly verify any medicine's authenticity by scanning its QR code — see the complete custody history.",
      color: "#10B981",
      bgColor: "rgba(16,185,129,0.08)",
      borderColor: "rgba(16,185,129,0.2)",
      route: "/customer",
      badge: "End User",
      stats: null,
    },
  ];

  const features = [
    {
      icon: GitBranch,
      title: "Private Blockchain",
      description: "DrugChain PoA — every medicine registration, transfer, and verification is permanently recorded in an immutable ledger.",
      color: "#6366F1",
      bg: "rgba(99,102,241,0.09)",
    },
    {
      icon: Cpu,
      title: "AI + OCR Verification",
      description: "Gemini Vision API analyzes tablet images, extracts batch details and cross-checks against registered records.",
      color: "#06B6D4",
      bg: "rgba(6,182,212,0.09)",
    },
    {
      icon: QrCode,
      title: "Unique QR Codes",
      description: "Each medicine batch gets a cryptographically unique QR code tied to its blockchain record. Impossible to counterfeit.",
      color: "#8B5CF6",
      bg: "rgba(139,92,246,0.09)",
    },
    {
      icon: Lock,
      title: "Role-Based Access",
      description: "5-tier role system (Creator → Manufacturer → Distributor → Pharmacy → Customer) with JWT authentication.",
      color: "#10B981",
      bg: "rgba(16,185,129,0.09)",
    },
    {
      icon: Eye,
      title: "Full Traceability",
      description: "Track every medicine from production to pharmacy shelf. Real-time custody transfer history with timestamps.",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.09)",
    },
    {
      icon: Fingerprint,
      title: "Cryptographic Proof",
      description: "SHA-256 data integrity hashing, Proof-of-Authority consensus, and tamper-evident block chain validation.",
      color: "#EF4444",
      bg: "rgba(239,68,68,0.09)",
    },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Manufacturer Registers",
      desc: "Upload tablet image, enter batch details. AI extracts & verifies. DrugChain records block.",
      icon: Factory,
      color: "#6366F1",
    },
    {
      step: "02",
      title: "Distributor Confirms",
      desc: "Receive shipment, confirm on-chain. Forward authenticated batch to pharmacy.",
      icon: Truck,
      color: "#8B5CF6",
    },
    {
      step: "03",
      title: "Pharmacy Receives",
      desc: "Scan QR code, verify authenticity. Record receipt on blockchain. Stock on shelf.",
      icon: Store,
      color: "#06B6D4",
    },
    {
      step: "04",
      title: "Customer Verifies",
      desc: "Scan medicine QR. Instant authentic/counterfeit result with full chain history.",
      icon: User,
      color: "#10B981",
    },
  ];

  return (
    <div className="page-bg" style={{ minHeight: "100vh" }}>
      <Background />
      <Header />
      <Toaster position="top-right" />

      {/* ══ HERO SECTION ══ */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1400,
          margin: "0 auto",
          padding: "120px 36px 60px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Floating particles */}
        {[
          { width: 16, height: 16, top: "12%", left: "8%", background: "rgba(99,102,241,0.25)" },
          { width: 12, height: 12, top: "25%", right: "10%", background: "rgba(6,182,212,0.25)" },
          { width: 10, height: 10, top: "60%", left: "5%", background: "rgba(16,185,129,0.22)" },
          { width: 20, height: 20, bottom: "20%", right: "6%", background: "rgba(139,92,246,0.2)" },
          { width: 8, height: 8, top: "40%", right: "15%", background: "rgba(245,158,11,0.2)" },
          { width: 14, height: 14, bottom: "35%", left: "12%", background: "rgba(99,102,241,0.15)" },
        ].map((p, i) => (
          <Particle key={i} style={p} />
        ))}

        {/* Badge */}
        <div
          className="animate-fade-in-down"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
            padding: "8px 22px",
            borderRadius: 100,
            background: "rgba(99, 102, 241, 0.10)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            boxShadow: "0 2px 14px rgba(99, 102, 241, 0.12)",
          }}
        >
          <ShieldCheck size={15} color="#6366F1" />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4F46E5" }}>
            Blockchain-Powered Medicine Authenticity Engine
          </span>
        </div>

        {/* Heading */}
        <h1
          className="animate-fade-in-up delay-100"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "clamp(2.8rem, 5.5vw, 4.6rem)",
            color: "#0F172A",
            lineHeight: 1.1,
            marginBottom: 20,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          Zero Counterfeit.{" "}
          <br />
          <span className="gradient-text-primary">
            100% Verified Supply Chain.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-in-up delay-200"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 17,
            color: "#475569",
            lineHeight: 1.7,
            maxWidth: 680,
            margin: "0 auto 40px",
          }}
        >
          End-to-end cryptographic medicine traceability from certified manufacturer to consumer.
          Powered by custom private blockchain, AI/OCR tablet analysis, and immutable custody records.
        </p>

        {/* CTA Buttons */}
        <div
          className="animate-fade-in-up delay-300"
          style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 56, flexWrap: "wrap" }}
        >
          <button
            className="btn-primary-lg"
            onClick={() => navigate("/login")}
          >
            <Zap size={18} /> Access Dashboard <ArrowRight size={16} />
          </button>
          <Link
            to="/about"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 32px",
              background: "#FFFFFF",
              border: "1.5px solid #E2E8F0",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              color: "#0F172A",
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
              transition: "all 0.25s ease",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.color = "#6366F1"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#0F172A"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <Globe size={16} /> Architecture & Tech Stack
          </Link>
        </div>

        {/* Live Stats Row */}
        <div
          className="animate-fade-in-up delay-400"
          style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}
        >
          {[
            { value: 100, suffix: "%", label: "Blockchain Secured", color: "#4F46E5", bg: "rgba(99,102,241,0.06)" },
            { value: totalMedicines, suffix: "+", label: "Medicines Registered", color: "#06B6D4", bg: "rgba(6,182,212,0.06)" },
            { value: verifiedCount, suffix: "", label: "Authenticity Verified", color: "#10B981", bg: "rgba(16,185,129,0.06)" },
            { value: 4, suffix: "-Stage", label: "Custody Chain", color: "#8B5CF6", bg: "rgba(139,92,246,0.06)" },
          ].map(({ value, suffix, label, color, bg }) => (
            <div
              key={label}
              style={{
                background: "#FFFFFF",
                backdropFilter: "blur(12px)",
                border: "1px solid #E2E8F0",
                borderRadius: 18,
                padding: "18px 28px",
                boxShadow: "0 4px 20px rgba(99, 102, 241, 0.05)",
                textAlign: "center",
                minWidth: 150,
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
                <Counter target={value} suffix={suffix} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", marginTop: 6 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Blockchain status badge */}
        {blockchainInfo && (
          <div
            className="animate-fade-in delay-500"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 700,
              color: "#059669",
            }}
          >
            <span style={{ width: 8, height: 8, background: "#10B981", borderRadius: "50%", display: "inline-block", animation: "pulse-ring 2s ease-in-out infinite" }} />
            DrugChain Live · Block #{blockchainInfo.blockNumber ?? "–"} · {blockchainInfo.status ?? "Connected"}
          </div>
        )}
      </section>

      {/* ══ SUPPLY CHAIN FLOW ══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "20px 36px 48px", maxWidth: 1400, margin: "0 auto" }}>
        <div
          className="animate-fade-in-up delay-200"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            flexWrap: "wrap",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
            padding: "20px 36px",
            boxShadow: "0 4px 24px rgba(99,102,241,0.05)",
          }}
        >
          {["Manufacturer", "Distributor", "Pharmacy", "Customer"].map((step, i, arr) => {
            const colors = ["#6366F1", "#8B5CF6", "#06B6D4", "#10B981"];
            return (
              <div key={step} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 22px",
                    borderRadius: 100,
                    background: `${colors[i]}14`,
                    border: `1px solid ${colors[i]}30`,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i], animation: "pulse-ring 2s ease-in-out infinite", animationDelay: `${i * 0.4}s` }} />
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 800, color: colors[i] }}>{step}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
                    <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${colors[i]}, ${colors[i + 1]})`, opacity: 0.4 }} />
                    <ArrowRight size={14} color={colors[i + 1]} style={{ marginLeft: -4 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ SYSTEM TELEMETRY ══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 36px 48px", maxWidth: 1400, margin: "0 auto" }}>
        <ApproverBar />
      </section>

      {/* ══ ROLE CARDS ══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 36px 80px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="section-pill animate-fade-in-up">
            <Activity size={13} /> System Access Points
          </div>
          <h2 className="section-title animate-fade-in-up delay-100" style={{ marginBottom: 12 }}>
            Role-Based Dashboards
          </h2>
          <p className="section-subtitle animate-fade-in-up delay-200" style={{ margin: "0 auto" }}>
            Each stakeholder gets a purpose-built dashboard with specific permissions on the DrugChain network.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {roles.map((role, i) => {
            const Icon = role.icon;
            return (
              <div
                key={role.title}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  background: "#FFFFFF",
                  border: `1px solid ${role.borderColor}`,
                  borderRadius: 22,
                  padding: "30px 28px",
                  boxShadow: "0 4px 20px rgba(99,102,241,0.04)",
                  cursor: "pointer",
                  transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onClick={() => navigate("/login")}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = `0 24px 60px ${role.color}18`;
                  e.currentTarget.style.borderColor = role.color + "50";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.04)";
                  e.currentTarget.style.borderColor = role.borderColor;
                }}
              >
                {/* Background glow */}
                <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: role.bgColor, filter: "blur(20px)" }} />

                {/* Icon */}
                <div
                  style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: role.bgColor, border: `1px solid ${role.borderColor}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 20, position: "relative",
                  }}
                >
                  <Icon size={26} color={role.color} />
                </div>

                {/* Badge */}
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: role.color, background: role.bgColor, padding: "3px 10px", borderRadius: 100, border: `1px solid ${role.borderColor}` }}>
                    {role.badge}
                  </span>
                </div>

                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: "#0F172A", marginBottom: 10 }}>{role.title}</h3>
                <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.65, marginBottom: role.stats ? 24 : 8 }}>{role.description}</p>

                {/* Stats */}
                {role.stats && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                    {role.stats.map(s => (
                      <div key={s.label} style={{ background: role.bgColor, borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: role.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8", marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 6, color: role.color, fontSize: 13, fontWeight: 700 }}>
                  Login to access <ChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 36px 80px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="section-pill animate-fade-in-up">
            <Zap size={13} /> Process Flow
          </div>
          <h2 className="section-title animate-fade-in-up delay-100" style={{ marginBottom: 12 }}>
            How DrugChain Works
          </h2>
          <p className="section-subtitle animate-fade-in-up delay-200" style={{ margin: "0 auto" }}>
            A 4-stage immutable custody chain ensures every medicine is authenticated from factory to consumer.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
          {howItWorks.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${i * 0.12}s`,
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 22,
                  padding: "32px 26px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(99,102,241,0.04)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 20px 50px rgba(99,102,241,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.04)"; }}
              >
                {/* Step number watermark */}
                <div style={{ position: "absolute", top: -10, right: 16, fontSize: 72, fontWeight: 900, color: `${item.color}09`, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, userSelect: "none" }}>{item.step}</div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: `${item.color}13`, border: `1px solid ${item.color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={24} color={item.color} />
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: item.color, color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{item.step}</div>
                </div>

                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, color: "#0F172A", marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          padding: "60px 36px 80px",
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="section-pill animate-fade-in-up">
            <Shield size={13} /> Core Technology
          </div>
          <h2 className="section-title animate-fade-in-up delay-100" style={{ marginBottom: 12 }}>
            Enterprise-Grade Features
          </h2>
          <p className="section-subtitle animate-fade-in-up delay-200" style={{ margin: "0 auto" }}>
            Built with production-ready technology for real-world pharmaceutical supply chain security.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="feature-card animate-fade-in-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: f.bg, filter: "blur(24px)" }} />
                <div className="feature-icon" style={{ background: f.bg, position: "relative" }}>
                  <Icon size={26} color={f.color} />
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, color: "#0F172A", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.65 }}>{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 36px 100px", maxWidth: 1400, margin: "0 auto" }}>
        <div
          className="animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 40%, #7C3AED 70%, #06B6D4 100%)",
            backgroundSize: "200% 200%",
            animation: "gradient-shift 8s ease infinite",
            borderRadius: 28,
            padding: "60px 60px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(99,102,241,0.35)",
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -50, left: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", bottom: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", top: "50%", right: 80, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)", transform: "translateY(-50%)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", background: "rgba(255,255,255,0.15)", borderRadius: 100, marginBottom: 20, border: "1px solid rgba(255,255,255,0.25)" }}>
              <Database size={13} color="white" />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "white" }}>DrugChain Network</span>
            </div>

            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 800, color: "white", marginBottom: 16, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
              Ready to Secure Your<br />Medicine Supply Chain?
            </h2>

            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
              Join the DrugChain network. Every medicine you register gets an immutable blockchain record and AI-verified identity.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/register")}
                style={{
                  background: "#FFFFFF",
                  color: "#4F46E5",
                  border: "none",
                  borderRadius: 14,
                  padding: "16px 36px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(0,0,0,0.22)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.15)"; }}
              >
                <Zap size={17} /> Register Your Organization
              </button>
              <Link
                to="/about"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "white",
                  border: "1.5px solid rgba(255,255,255,0.35)",
                  borderRadius: 14,
                  padding: "16px 32px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.25s ease",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <Globe size={16} /> Learn Architecture
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER NOTE ══ */}
      <div style={{ textAlign: "center", padding: "0 36px 48px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 28px", borderRadius: 16, background: "rgba(99, 102, 241, 0.07)", border: "1px solid rgba(99, 102, 241, 0.18)" }}>
          <CheckCircle2 size={15} color="#4F46E5" />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#334155" }}>
            All blockchain records on DrugChain are immutable · Zero mock fallbacks · Cryptographically verified
          </span>
        </div>
      </div>
    </div>
  );
}
