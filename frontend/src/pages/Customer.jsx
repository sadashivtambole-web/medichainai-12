import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Camera, ImageUp, Search, ArrowLeft } from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import CameraScanner from "../components/forms/CameraScanner";
import QRImageUpload from "../components/forms/QRImageUpload";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";

const TAB = { CAMERA: "camera", IMAGE: "image", MANUAL: "manual" };

export default function Customer() {
  const { medicines, user } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TAB.CAMERA);
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  /* Resolve a decoded string (from camera, image, or manual input) → navigate to real verification */
  const resolve = (raw) => {
    const cleaned = raw.trim();
    if (!cleaned) return;

    // If QR payload is JSON (our generated QR), parse it
    let lookup = cleaned;
    try {
      const parsed = JSON.parse(cleaned);
      lookup = parsed.batchId || parsed.medicineId || cleaned;
    } catch {}

    navigate(`/verify/${encodeURIComponent(lookup)}`);
  };

  const handleManual = () => {
    if (!query.trim()) return;
    setNotFound(false);
    resolve(query);
  };

  const tabs = [
    { id: TAB.CAMERA, icon: <Camera size={16} />, label: "Scan with Camera" },
    { id: TAB.IMAGE, icon: <ImageUp size={16} />, label: "Upload QR Image" },
    { id: TAB.MANUAL, icon: <Search size={16} />, label: "Enter Code" },
  ];

  return (
    <div
      className="page-bg"
      style={{
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <Background />
      <Header />
      <Toaster position="top-right" />

      <main
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1360,
          margin: "0 auto",
          padding: "108px 36px 80px",
        }}
      >
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

        {/* 2-Column Responsive Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 32, alignItems: "start" }}>
          {/* Left Column: Verification Scanner */}
          <div style={{ textAlign: "center" }}>
            {/* Icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
              }}
            >
              <QrCode size={32} color="white" />
            </div>

            {/* Heading */}
            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "2.2rem",
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.15,
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              Verify Your{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #4F46E5 0%, #10B981 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Medicine
              </span>
            </h1>
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14,
                color: "#475569",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Instantly verify if your tablet or packaging is 100% genuine using cryptographic blockchain records.
            </p>

            {/* Tab Switcher */}
            <div
              style={{
                display: "flex",
                background: "rgba(241, 245, 249, 0.9)",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: 4,
                marginBottom: 20,
                gap: 4,
              }}
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id);
                    setShowCamera(false);
                    setNotFound(false);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    transition: "all 0.2s",
                    background: activeTab === t.id ? "#FFFFFF" : "transparent",
                    color: activeTab === t.id ? "#4F46E5" : "#64748B",
                    boxShadow: activeTab === t.id ? "0 2px 8px rgba(99,102,241,0.15)" : "none",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(14px)",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                borderRadius: 20,
                padding: 28,
                textAlign: "left",
                boxShadow: "0 8px 30px rgba(99, 102, 241, 0.05)",
              }}
            >
              {/* ── CAMERA TAB ── */}
              {activeTab === TAB.CAMERA && (
                <div>
                  {!showCamera ? (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "50%",
                          background: "rgba(99, 102, 241, 0.1)",
                          border: "1px solid rgba(99, 102, 241, 0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 16px",
                        }}
                      >
                        <Camera size={28} color="#4F46E5" />
                      </div>
                      <div
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#0F172A",
                          marginBottom: 8,
                        }}
                      >
                        📷 Scan QR / Barcode with Camera
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#475569",
                          lineHeight: 1.6,
                          marginBottom: 20,
                        }}
                      >
                        Works on laptop webcam and mobile camera. Point it at the QR code printed on your medicine package.
                      </p>
                      <button
                        id="open-camera-btn"
                        onClick={() => setShowCamera(true)}
                        className="btn-primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                      >
                        <Camera size={16} /> Open Camera Scanner
                      </button>
                      <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 12 }}>
                        Browser will request camera permission
                      </p>
                    </div>
                  ) : (
                    <CameraScanner
                      onResult={(text) => {
                        setShowCamera(false);
                        resolve(text);
                      }}
                      onClose={() => setShowCamera(false)}
                    />
                  )}
                </div>
              )}

              {/* ── IMAGE UPLOAD TAB ── */}
              {activeTab === TAB.IMAGE && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#475569",
                      marginBottom: 14,
                    }}
                  >
                    Upload QR / Barcode Photo
                  </div>
                  <QRImageUpload onResult={(text) => resolve(text)} />
                  <p style={{ fontSize: 13, color: "#64748B", marginTop: 12 }}>
                    Upload a clear photo of the QR code on your medicine package to verify.
                  </p>
                </div>
              )}

              {/* ── MANUAL ENTRY TAB ── */}
              {activeTab === TAB.MANUAL && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#475569",
                      marginBottom: 12,
                    }}
                  >
                    Enter Medicine / Batch Code
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      id="customer-scan-input"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setNotFound(false);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleManual()}
                      placeholder="e.g. BT001 or MED-2024-001"
                      style={{
                        flex: 1,
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: 12,
                        padding: "12px 16px",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 14,
                        color: "#0F172A",
                        outline: "none",
                      }}
                    />
                    <button
                      id="customer-verify-btn"
                      onClick={handleManual}
                      className="btn-primary"
                      style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Search size={15} /> Verify
                    </button>
                  </div>

                  {notFound && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: "#FEF2F2",
                        border: "1px solid #FECACA",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#991B1B",
                      }}
                    >
                      ⚠️ No medicine found. Check the code printed on the package.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Trust & Verification Guide */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Guide Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(14px)",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                borderRadius: 20,
                padding: "28px 30px",
                boxShadow: "0 8px 30px rgba(99, 102, 241, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <ShieldCheck size={22} color="#10B981" />
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.25rem", fontWeight: 800, color: "#0F172A" }}>
                  How Authenticity Is Guaranteed
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { title: "Immutable Origin Stamping", desc: "Every medicine batch is cryptographically signed at the factory." },
                  { title: "Custody Chain Handshakes", desc: "Distributors and pharmacies confirm receipt with on-chain cryptographic signatures." },
                  { title: "Zero Counterfeit Tamper Proofing", desc: "QR codes cannot be reused or cloned without triggering instant fraud alerts." },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(16,185,129,0.12)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Tip Box */}
            <div
              style={{
                padding: "20px 24px",
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.06) 100%)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "#4F46E5", marginBottom: 4 }}>
                💡 Tip for Consumers
              </div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                Always verify the QR code before opening the foil seal. If the status shows "SUSPICIOUS" or "QR CODE REUSED", report it immediately to your pharmacist.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
