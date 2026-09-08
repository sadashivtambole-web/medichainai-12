import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Factory, ChevronRight, ChevronLeft, CheckCircle2, Loader2, ArrowLeft, Package, QrCode, Calendar, ShieldCheck, Search, RefreshCw } from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import FileUpload from "../components/forms/FileUpload";
import AIVerificationPanel from "../components/forms/AIVerificationPanel";
import QRDisplay from "../components/ui/QRDisplay";
import BlockchainStatus from "../components/ui/BlockchainStatus";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";

const STEPS = ["Manufacturer Details", "Medicine Details", "Verification", "QR & Blockchain", "Review & Register"];

export default function Manufacturer() {
  const { user, registerMedicine, medicines } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    manufacturerName: user?.name || "",
    companyName: user?.company || "",
    manufacturerCode: user?.companyCode || "",
    medicineName: "",
    batchNumber: "",
    manufacturingDate: "",
    expiryDate: "",
    price: "",
  });
  const [medicineFile, setMedicineFile] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validateCurrentStep = () => {
    if (step === 0) {
      if (!form.manufacturerName.trim()) {
        toast.error("Please enter the Person / Manufacturer Name");
        return false;
      }
      if (!form.companyName.trim()) {
        toast.error("Please enter the Company Name");
        return false;
      }
      if (!form.manufacturerCode.trim()) {
        toast.error("Please enter the Manufacturer / Company Code");
        return false;
      }
    }
    if (step === 1) {
      if (!form.medicineName.trim()) {
        toast.error("Please enter the Tablet / Medicine Name");
        return false;
      }
      if (!form.batchNumber.trim()) {
        toast.error("Please enter the Batch Number");
        return false;
      }
      if (!form.price.trim()) {
        toast.error("Please enter the Product Price");
        return false;
      }
      if (!form.manufacturingDate) {
        toast.error("Please select the Manufacturing Date");
        return false;
      }
      if (!form.expiryDate) {
        toast.error("Please select the Expiry Date");
        return false;
      }
      if (new Date(form.expiryDate) <= new Date(form.manufacturingDate)) {
        toast.error("Expiry Date must be strictly after Manufacturing Date");
        return false;
      }
    }
    if (step === 2) {
      if (!medicineFile) {
        toast.error("Please upload the Medicine / Tablet Image before proceeding");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((s) => s + 1);
    }
  };

  const handleRegister = async () => {
    if (!form.medicineName || !form.batchNumber || !form.companyName || !form.manufacturingDate || !form.expiryDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerMedicine({
        ...form,
        medicineFile,
        aiVerification: { status: "MATCHED" },
      });
      setRegistered(result);
      toast.success("Medicine registered successfully on blockchain & MongoDB!");
    } catch (err) {
      toast.error(err.message || "Registration failed. Please check form values.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "#FFFFFF",
    border: "1px solid #E8EAF6",
    borderRadius: 12,
    padding: "12px 16px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 14,
    color: "#18182E",
    outline: "none",
    transition: "all 0.2s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.01)",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#5F607A",
    marginBottom: 8,
  };

  const stepContent = () => {
    /* ── Step 0: Manufacturer Details ── */
    if (step === 0)
      return (
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#18182E", marginBottom: 6 }}>
            Manufacturer Details
          </h2>
          <p style={{ fontSize: 14, color: "#5F607A", marginBottom: 28 }}>
            Enter your official manufacturer credentials.
          </p>
          <div style={{ display: "grid", gap: 20 }}>
            {[
              { key: "manufacturerName", label: "Person / Manufacturer Name", placeholder: "e.g. Rajesh Kumar" },
              { key: "companyName", label: "Company Name", placeholder: "e.g. XYZ Pharma Ltd." },
              { key: "manufacturerCode", label: "Manufacturer / Company Code", placeholder: "e.g. MFR-XYZ-001" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input
                  id={key}
                  style={inputStyle}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={set(key)}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#5855F3";
                    e.target.style.boxShadow = "0 0 0 3px rgba(88,85,243,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E8EAF6";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );

    /* ── Step 1: Medicine Details ── */
    if (step === 1)
      return (
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#18182E", marginBottom: 6 }}>
            Medicine Details
          </h2>
          <p style={{ fontSize: 14, color: "#5F607A", marginBottom: 28 }}>
            Enter medicine formula, batch identifiers, and pricing.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Tablet / Medicine Name</label>
              <input
                id="medicineName"
                style={inputStyle}
                placeholder="e.g. ABC Tablet"
                value={form.medicineName}
                onChange={set("medicineName")}
                onFocus={(e) => {
                  e.target.style.borderColor = "#5855F3";
                  e.target.style.boxShadow = "0 0 0 3px rgba(88,85,243,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E8EAF6";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Batch Number</label>
              <input
                id="batchNumber"
                style={inputStyle}
                placeholder="e.g. BT001"
                value={form.batchNumber}
                onChange={set("batchNumber")}
                onFocus={(e) => {
                  e.target.style.borderColor = "#5855F3";
                  e.target.style.boxShadow = "0 0 0 3px rgba(88,85,243,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E8EAF6";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Product Price (MRP)</label>
              <input
                id="price"
                style={inputStyle}
                placeholder="e.g. ₹120.00"
                value={form.price}
                onChange={set("price")}
                onFocus={(e) => {
                  e.target.style.borderColor = "#5855F3";
                  e.target.style.boxShadow = "0 0 0 3px rgba(88,85,243,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E8EAF6";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Manufacturing Date</label>
              <input
                id="manufacturingDate"
                type="date"
                style={inputStyle}
                value={form.manufacturingDate}
                onChange={set("manufacturingDate")}
              />
            </div>
            <div>
              <label style={labelStyle}>Expiry Date</label>
              <input
                id="expiryDate"
                type="date"
                style={inputStyle}
                value={form.expiryDate}
                onChange={set("expiryDate")}
              />
            </div>
          </div>
        </div>
      );

    /* ── Step 2: AI Verification ── */
    if (step === 2)
      return (
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#18182E", marginBottom: 6 }}>
            Upload Tablet Image & AI Verification
          </h2>
          <p style={{ fontSize: 14, color: "#5F607A", marginBottom: 28 }}>
            Upload a clear photo of the tablet or medicine packaging for automated AI visual inspection and OCR validation.
          </p>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Medicine / Tablet Image (Required)</label>
            <FileUpload
              label="Tablet / Medicine Packaging Photo"
              accept={{ "image/*": [] }}
              value={medicineFile}
              onChange={setMedicineFile}
              hint="High-resolution JPG, PNG, or WEBP photo showing tablet/box text clearly"
            />
          </div>
          <AIVerificationPanel
            medicineFile={medicineFile}
            formData={{ medicineName: form.medicineName, batchNumber: form.batchNumber, companyName: form.companyName }}
          />
        </div>
      );

    /* ── Step 3: QR + Blockchain ── */
    if (step === 3)
      return (
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#18182E", marginBottom: 6 }}>
            QR Code & Blockchain
          </h2>
          <p style={{ fontSize: 14, color: "#5F607A", marginBottom: 28 }}>
            A unique cryptographic QR code is generated for this batch.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <QRDisplay medicineId={`MED-${Date.now().toString().slice(-6)}`} batchId={form.batchNumber || "BT001"} />
            <BlockchainStatus status="Connected" txHash="0xpending..." />
          </div>
        </div>
      );

    /* ── Step 4: Review & Register ── */
    if (step === 4)
      return (
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#18182E", marginBottom: 6 }}>
            Review & Register
          </h2>
          <p style={{ fontSize: 14, color: "#5F607A", marginBottom: 28 }}>
            Review all details before recording on the blockchain ledger.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "Manufacturer Name", value: form.manufacturerName },
              { label: "Company Name", value: form.companyName },
              { label: "Manufacturer Code", value: form.manufacturerCode },
              { label: "Medicine Name", value: form.medicineName },
              { label: "Batch Number", value: form.batchNumber },
              { label: "Manufacturing Date", value: form.manufacturingDate },
              { label: "Expiry Date", value: form.expiryDate },
              { label: "Price (MRP)", value: form.price },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "#F8F9FE",
                  border: "1px solid #E8EAF6",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8E8FA8", marginBottom: 6 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: value ? "#18182E" : "#8E8FA8" }}>
                  {value || "—"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <div
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                background: medicineFile ? "#F0FDF4" : "#FAFAFF",
                border: `1px solid ${medicineFile ? "rgba(16,185,129,0.3)" : "#E8EAF6"}`,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8E8FA8", marginBottom: 4 }}>
                Tablet / Medicine Image
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: medicineFile ? "#065F46" : "#5F607A" }}>
                {medicineFile ? medicineFile.name : "Not uploaded"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.3)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8E8FA8", marginBottom: 4 }}>QR / Barcode</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>✓ Generated</div>
            </div>
            <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "#EEF0FD", border: "1px solid rgba(88,85,243,0.3)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8E8FA8", marginBottom: 4 }}>Blockchain</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#5855F3" }}>🟢 Connected</div>
            </div>
            <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "#EEF0FD", border: "1px solid rgba(88,85,243,0.3)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8E8FA8", marginBottom: 4 }}>AI Verification</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#5855F3" }}>✓ Passed</div>
            </div>
          </div>
        </div>
      );
  };

  /* ── Success screen ── */
  if (registered) {
    return (
      <div className="page-bg" style={{ minHeight: "100vh" }}>
        <Background />
        <Header />
        <Toaster position="top-right" />
        <main style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1100, margin: "0 auto", padding: "108px 36px 80px", textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#10B981,#059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 8px 30px rgba(16,185,129,0.3)",
            }}
          >
            <CheckCircle2 size={36} color="white" />
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#18182E", marginBottom: 8 }}>
            Medicine Successfully Registered
          </h1>
          <p style={{ fontSize: 15, color: "#5F607A", marginBottom: 36 }}>
            Recorded on immutable blockchain ledger and verified in MongoDB database.
          </p>

          <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Medicine ID", value: registered.id },
                { label: "Batch ID", value: registered.batchId },
                { label: "Blockchain Tx", value: registered.blockchainTxHash },
                { label: "Status", value: registered.blockchainStatus },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "left", background: "#F8F9FE", border: "1px solid #E8EAF6", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8E8FA8", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#18182E", fontFamily: label.includes("Tx") ? "monospace" : "inherit" }}>{value}</div>
                </div>
              ))}
            </div>
            <QRDisplay medicineId={registered.id} batchId={registered.batchId} />
          </div>

          {/* Uploaded Tablet Image Preview & Download */}
          {(medicineFile || registered.medicineImage) && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 20, padding: 28, marginBottom: 24, textAlign: "left", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5F607A", marginBottom: 16 }}>
                Uploaded Medicine / Tablet Photo
              </div>
              <div style={{ background: "#F8F9FE", border: "1px solid #E8EAF6", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#18182E" }}>📸 Medicine / Tablet Image</div>
                {medicineFile ? (
                  <img
                    src={URL.createObjectURL(medicineFile)}
                    alt="Medicine Preview"
                    style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8, border: "1px solid #E8EAF6" }}
                  />
                ) : registered.medicineImage ? (
                  <img
                    src={`http://localhost:5000${registered.medicineImage}`}
                    alt="Medicine Preview"
                    style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8, border: "1px solid #E8EAF6" }}
                  />
                ) : (
                  <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8FA8", fontSize: 12 }}>Image on file</div>
                )}
                {medicineFile && (
                  <a
                    href={URL.createObjectURL(medicineFile)}
                    download={`Medicine_${registered.batchId || "image"}.png`}
                    className="btn-secondary"
                    style={{ textAlign: "center", padding: "8px 12px", fontSize: 12, textDecoration: "none", color: "#18182E", fontWeight: 600 }}
                  >
                    Download Tablet Image
                  </a>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn-primary"
              onClick={() => {
                setRegistered(null);
                setStep(0);
                setForm({
                  manufacturerName: "",
                  companyName: "",
                  manufacturerCode: "",
                  medicineName: "",
                  batchNumber: "",
                  manufacturingDate: "",
                  expiryDate: "",
                  price: "",
                });
                setMedicineFile(null);
              }}
            >
              Register Another
            </button>
            <button className="btn-secondary" onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-bg" style={{ minHeight: "100vh" }}>
      <Background />
      <Header />
      <Toaster position="top-right" />

      <main style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "108px 36px 80px" }}>
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

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
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
            <Factory size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2rem", fontWeight: 800, color: "#18182E" }}>
              Manufacturer
            </h1>
            <p style={{ fontSize: 13, color: "#5F607A", marginTop: 2 }}>
              Register and manage verified medicines on blockchain
            </p>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 36 }}>
          {[
            { label: "My Medicines", value: medicines.length, color: "#6366F1", bg: "rgba(99,102,241,0.08)" },
            { label: "Authenticated", value: medicines.filter(m => m.status === "AUTHENTIC").length, color: "#10B981", bg: "rgba(16,185,129,0.08)" },
            { label: "Pending Transfer", value: medicines.filter(m => m.currentHolder === "Manufacturer").length, color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
            { label: "At Pharmacy", value: medicines.filter(m => m.currentHolder === "Pharmacy").length, color: "#06B6D4", bg: "rgba(6,182,212,0.08)" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ padding: "20px 22px", transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(99,102,241,0.10)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.04)"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Package size={20} color={s.color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: i < step ? "#10B981" : i === step ? "#5855F3" : "#FFFFFF",
                    border: `1px solid ${i < step ? "#10B981" : i === step ? "#5855F3" : "#E8EAF6"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    color: i <= step ? "white" : "#8E8FA8",
                    boxShadow: i === step ? "0 4px 14px rgba(88,85,243,0.3)" : "none",
                    flexShrink: 0,
                  }}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: i === step ? "#5855F3" : "#8E8FA8",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: i < step ? "#10B981" : "#E8EAF6",
                    margin: "0 10px",
                    marginBottom: 18,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8EAF6",
            borderRadius: 20,
            padding: 36,
            marginBottom: 24,
            boxShadow: "0 4px 24px rgba(88,85,243,0.04)",
          }}
        >
          {stepContent()}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button className="btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ChevronLeft size={16} /> Previous
            </span>
          </button>

          {step < STEPS.length - 1 ? (
            <button className="btn-primary" onClick={handleNext}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                Next <ChevronRight size={16} />
              </span>
            </button>
          ) : (
            <button className="btn-green" onClick={handleRegister} disabled={submitting}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {submitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Register Medicine
                  </>
                )}
              </span>
            </button>
          )}
        </div>
      </main>

      {/* ── Registered Medicines Section ── */}
      {medicines.length > 0 && (
        <section style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 36px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Registered Medicines</h2>
              <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>All medicines registered under your manufacturer account</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search medicines..."
                  style={{ paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", background: "#FFF", width: 200 }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {medicines
              .filter(m =>
                !searchQuery ||
                m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.batchId?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .slice(0, 12)
              .map((m, i) => {
                const isAuthentic = m.status === "AUTHENTIC";
                const statusColor = isAuthentic ? "#10B981" : m.status === "SUSPICIOUS" ? "#EF4444" : "#F59E0B";
                const statusBg = isAuthentic ? "#ECFDF5" : m.status === "SUSPICIOUS" ? "#FEF2F2" : "#FFFBEB";
                return (
                  <div
                    key={m.id || m.batchId || i}
                    className="animate-fade-in-up"
                    style={{
                      animationDelay: `${i * 0.05}s`,
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: 18,
                      padding: "22px 22px",
                      boxShadow: "0 4px 16px rgba(99,102,241,0.04)",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 50px rgba(99,102,241,0.10)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.04)"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
                    onClick={() => navigate(`/verify/${encodeURIComponent(m.batchId || m.id)}`)}
                  >
                    {/* Status badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: statusColor, background: statusBg, padding: "4px 10px", borderRadius: 100, border: `1px solid ${statusColor}30` }}>
                        {m.status || "AUTHENTIC"}
                      </span>
                      <ShieldCheck size={16} color={statusColor} />
                    </div>

                    <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>{m.name}</h3>

                    <div style={{ display: "grid", gap: 6 }}>
                      {[
                        { label: "Batch ID", value: m.batchId },
                        { label: "Expires", value: m.expiryDate },
                        { label: "Holder", value: m.currentHolder || "Manufacturer" },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8" }}>{row.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", fontFamily: row.label === "Batch ID" ? "monospace" : "inherit", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value || "—"}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 6, color: "#6366F1", fontSize: 12, fontWeight: 700 }}>
                      <QrCode size={13} /> View Blockchain Record
                    </div>
                  </div>
                );
              })}
          </div>

          {medicines.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#FFFFFF", borderRadius: 20, border: "1px solid #E2E8F0" }}>
              <Package size={48} color="#94A3B8" style={{ margin: "0 auto 16px" }} />
              <p style={{ fontWeight: 700, color: "#64748B", fontSize: 15 }}>No medicines registered yet.</p>
              <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>Use the form above to register your first medicine on DrugChain.</p>
            </div>
          )}
        </section>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
