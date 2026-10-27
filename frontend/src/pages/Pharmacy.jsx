import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Search, CheckCircle2, ArrowLeft, Loader2, ShieldCheck, Camera, ImageUp } from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import BlockchainStatus from "../components/ui/BlockchainStatus";
import TransferTimeline from "../components/ui/TransferTimeline";
import StatusBadge from "../components/ui/StatusBadge";
import MedicineImage from "../components/ui/MedicineImage";
import CameraScanner from "../components/forms/CameraScanner";
import QRImageUpload from "../components/forms/QRImageUpload";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";

const VERIFY_STEPS = [
  { id: "qr", label: "QR Verification" },
  { id: "db", label: "Database Check" },
  { id: "ocr", label: "OCR Verification" },
  { id: "ai", label: "AI Image Check" },
  { id: "blockchain", label: "Blockchain Verification" },
];

const INPUT_TAB = { MANUAL: "manual", CAMERA: "camera", IMAGE: "image" };

export default function Pharmacy() {
  const { medicines, confirmPharmacyReceipt, verifyMedicineCode } = useApp();
  const navigate = useNavigate();

  const [inputTab, setInputTab] = useState(INPUT_TAB.MANUAL);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [searching, setSearching] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState(-1);
  const [verified, setVerified] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  /* ─── resolve any raw code (camera / image / manual) strictly via backend ─── */
  const resolve = async (raw) => {
    const cleaned = raw.trim();
    let lookup = cleaned;
    try {
      const parsed = JSON.parse(cleaned);
      lookup = parsed.medicineId || parsed.batchId || cleaned;
    } catch {}

    setSearching(true);
    try {
      const res = await verifyMedicineCode(lookup);
      if (res && res.medicine) {
        setFound(res.medicine);
        setNotFound(false);
        setVerifyStep(-1);
        setVerified(false);
        setConfirmed(false);
        setShowCamera(false);
        toast.success("Medicine record verified from DrugChain & MongoDB");
      } else {
        setFound(null);
        setNotFound(true);
        toast.error("No medicine found with this code on DrugChain server");
      }
    } catch (e) {
      setFound(null);
      setNotFound(true);
      toast.error(e.message || "Failed to verify medicine on server");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    setNotFound(false);
    resolve(query);
  };

  const handleVerify = () => {
    setVerifying(true);
    setVerifyStep(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVerifyStep(i);
      if (i >= VERIFY_STEPS.length) {
        clearInterval(interval);
        setVerifying(false);
        setVerified(true);
      }
    }, 500);
  };

  const handleConfirmReceipt = async () => {
    if (!found) return;
    try {
      await confirmPharmacyReceipt(found.id || found.batchId);
      setConfirmed(true);
      toast.success("Receipt confirmed and recorded on blockchain & MongoDB!");
    } catch (e) {
      toast.error(e.message || "Confirmation failed");
    }
  };

  const inputTabs = [
    { id: INPUT_TAB.MANUAL, icon: <Search size={14} />, label: "Enter Code" },
    { id: INPUT_TAB.CAMERA, icon: <Camera size={14} />, label: "Scan Camera" },
    { id: INPUT_TAB.IMAGE, icon: <ImageUp size={14} />, label: "Upload Image" },
  ];

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

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg,#0284C7,#0369A1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(2,132,199,0.25)",
            }}
          >
            <Store size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2rem", fontWeight: 800, color: "#0F172A" }}>
              Pharmacy POS
            </h1>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              Scan, receive and verify medicines before shelf stocking
            </p>
          </div>
        </div>

        {/* ── Scan / Search Panel ── */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 20, padding: 28, marginBottom: 28, boxShadow: "0 4px 20px rgba(15,23,42,0.03)" }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
            {inputTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setInputTab(t.id);
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
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all 0.2s",
                  background: inputTab === t.id ? "#FFFFFF" : "transparent",
                  color: inputTab === t.id ? "#0284C7" : "#64748B",
                  boxShadow: inputTab === t.id ? "0 2px 8px rgba(2,132,199,0.15)" : "none",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Manual input */}
          {inputTab === INPUT_TAB.MANUAL && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748B", marginBottom: 10 }}>
                Enter Batch ID or Medicine ID
              </label>
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  id="pharmacy-scan-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0284C7";
                    e.target.style.boxShadow = "0 0 0 3px rgba(2,132,199,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E2E8F0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  id="pharmacy-search-btn"
                  onClick={handleSearch}
                  disabled={searching}
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Search size={16} /> {searching ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          )}

          {/* Camera scan */}
          {inputTab === INPUT_TAB.CAMERA && (
            <div>
              {!showCamera ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <button
                    id="pharmacy-camera-btn"
                    onClick={() => setShowCamera(true)}
                    className="btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <Camera size={16} /> Open Camera Scanner
                  </button>
                  <p style={{ fontSize: 13, color: "#5F607A", marginTop: 10 }}>
                    Point at the QR code on the medicine package
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

          {/* Image upload */}
          {inputTab === INPUT_TAB.IMAGE && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5F607A", marginBottom: 12 }}>
                Upload QR / Barcode Image
              </label>
              <QRImageUpload onResult={(text) => resolve(text)} />
            </div>
          )}

          {notFound && (
            <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 13, fontWeight: 600, color: "#991B1B" }}>
              ⚠️ Medicine not found. Check the ID or batch number.
            </div>
          )}
        </div>

        {/* ── Results ── */}
        {found && (
          <div style={{ display: "grid", gap: 24 }}>
            {/* Medicine Info — READ ONLY */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 20, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>

              {/* ── Manufacturer Image ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748B", marginBottom: 8 }}>
                  📸 Manufacturer Reference Image
                </div>
                <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E2E8F0", maxHeight: 200 }}>
                  <MedicineImage
                    src={found.medicineImage}
                    alt={`${found.name} packaging`}
                    style={{ height: 200 }}
                    placeholderSize={120}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>

                <div>
                  <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.6rem", fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                    {found.name}
                  </h2>
                  <div style={{ fontSize: 13, color: "#5F607A" }}>
                    Batch: {found.batchId} · {found.company}
                  </div>
                </div>
                <StatusBadge status={found.status} />
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 14px",
                  borderRadius: 100,
                  background: "#F0F9FF",
                  border: "1px solid rgba(2,132,199,0.25)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#0284C7",
                  marginBottom: 18,
                }}
              >
                🔒 Read-Only — Verified manufacturer data
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {[
                  { label: "Medicine ID", value: found.id },
                  { label: "Batch Number", value: found.batchId },
                  { label: "Manufacturer", value: found.manufacturer },
                  { label: "Company", value: found.company },
                  { label: "Manufacturer Code", value: found.manufacturerCode },
                  { label: "Manufacturing Date", value: found.manufacturingDate },
                  { label: "Expiry Date", value: found.expiryDate },
                  { label: "Price (MRP)", value: found.price },
                  { label: "AI Verification", value: found.aiVerification?.status === "MATCHED" ? "✓ Matched" : "⚠ Mismatch" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "12px 14px", borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748B", marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Pipeline */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 20, padding: 28, boxShadow: "0 4px 20px rgba(15,23,42,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.3rem", fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                    Verification Pipeline
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748B" }}>5-layer authenticity check</p>
                </div>
                {!verified && (
                  <button
                    id="pharmacy-verify-btn"
                    onClick={handleVerify}
                    disabled={verifying}
                    className="btn-primary"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {verifying ? (
                      <>
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} /> Verify Medicine
                      </>
                    )}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {VERIFY_STEPS.map((s, i) => {
                  const isDone = verifyStep > i;
                  const isActive = verifyStep === i;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: isDone ? "#F0FDF4" : isActive ? "#F0F9FF" : "#F8FAFC",
                        border: `1px solid ${isDone ? "rgba(16,185,129,0.3)" : isActive ? "rgba(2,132,199,0.3)" : "#E2E8F0"}`,
                        transition: "all 0.3s",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: isDone ? "#059669" : isActive ? "#0284C7" : "#FFFFFF",
                          border: `1px solid ${isDone ? "#059669" : isActive ? "#0284C7" : "#CBD5E1"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: 12,
                          color: isDone || isActive ? "white" : "#64748B",
                          fontWeight: 800,
                        }}
                      >
                        {isDone ? "✓" : isActive ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : i + 1}
                      </div>
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: isDone ? "#065F46" : isActive ? "#0284C7" : "#64748B",
                          flex: 1,
                        }}
                      >
                        {s.label}
                      </span>
                      {isDone && <span style={{ fontSize: 12, color: "#065F46", fontWeight: 800 }}>Passed ✓</span>}
                    </div>
                  );
                })}
              </div>

              {verified && (
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <StatusBadge status={found.status} size="large" />
                </div>
              )}
            </div>

            {/* Blockchain */}
            <BlockchainStatus status="Connected" txHash={found.blockchainTxHash} />

            {/* Transfer History */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 20, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.3rem", fontWeight: 800, color: "#18182E", marginBottom: 20 }}>
                Transfer History
              </h3>
              <TransferTimeline history={found.transferHistory || []} />
            </div>

            {/* Confirm Receipt */}
            {!confirmed ? (
              <button
                id="confirm-receipt-btn"
                className="btn-green"
                onClick={handleConfirmReceipt}
                style={{ width: "100%", padding: 16, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                <CheckCircle2 size={18} /> Confirm Shelf Receipt
              </button>
            ) : (
              <div style={{ padding: 18, borderRadius: 12, background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.3)", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#065F46" }}>
                ✓ Shelf receipt confirmed and recorded on blockchain & MongoDB
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
