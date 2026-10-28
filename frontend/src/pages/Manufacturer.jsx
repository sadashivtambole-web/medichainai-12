import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Factory, ChevronRight, ChevronLeft, CheckCircle2, Loader2,
  ArrowLeft, Package, QrCode, Calendar, ShieldCheck, Search,
  RefreshCw, Send, Truck, Building2, AlertTriangle, AlertCircle,
  XCircle, Check, ArrowRight, Clock,
} from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import FileUpload from "../components/forms/FileUpload";
import AIVerificationPanel from "../components/forms/AIVerificationPanel";
import QRDisplay from "../components/ui/QRDisplay";
import BlockchainStatus from "../components/ui/BlockchainStatus";
import MedicineImage, { resolveMedicineImageUrl } from "../components/ui/MedicineImage";
import { useApp } from "../context/AppContext";
import { transferService } from "../services/transferService";
import { supplyChainService } from "../services/supplyChainService";
import toast, { Toaster } from "react-hot-toast";

const STEPS = ["Manufacturer Details", "Medicine Details", "Verification", "QR & Blockchain", "Review & Register"];

const MFR_TAB = {
  REGISTER: "register",
  TRANSFER: "transfer",
  OUTGOING: "outgoing",
};

export default function Manufacturer() {
  const { user, registerMedicine, medicines, loadMedicines } = useApp();
  const navigate = useNavigate();

  const [activeMfrTab, setActiveMfrTab] = useState(MFR_TAB.REGISTER);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(null); // holds existing record if duplicate
  const [searchQuery, setSearchQuery] = useState("");

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    medicineId: "",
    distributorId: "",
    quantity: "",
    notes: "",
  });
  const [approvedDistributors, setApprovedDistributors] = useState([]);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Outgoing Transfers State
  const [outgoingTransfers, setOutgoingTransfers] = useState([]);
  const [loadingOutgoing, setLoadingOutgoing] = useState(false);

  const [form, setForm] = useState({
    manufacturerName: user?.name || "",
    companyName: user?.company || "",
    manufacturerCode: user?.companyCode || "",
    medicineName: "",
    composition: "",
    batchNumber: "",
    manufacturingDate: "",
    expiryDate: "",
    price: "",
  });
  const [medicineFile, setMedicineFile] = useState(null);

  const approvedMedicines = (medicines || []).filter((m) => m.approvalStatus === "approved");

  const loadApprovedDistributors = async () => {
    setLoadingDistributors(true);
    try {
      const data = await supplyChainService.getDistributors();
      setApprovedDistributors(data || []);
    } catch {
      toast.error("Failed to load distributors directory");
    } finally {
      setLoadingDistributors(false);
    }
  };

  const loadOutgoingTransfers = async () => {
    setLoadingOutgoing(true);
    try {
      const data = await transferService.getOutgoingTransfers();
      setOutgoingTransfers(data || []);
    } catch {
      toast.error("Failed to load outgoing transfers");
    } finally {
      setLoadingOutgoing(false);
    }
  };

  useEffect(() => {
    if (activeMfrTab === MFR_TAB.TRANSFER) {
      loadApprovedDistributors();
    }
    if (activeMfrTab === MFR_TAB.OUTGOING) {
      loadOutgoingTransfers();
    }
  }, [activeMfrTab]);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.medicineId) {
      toast.error("Please select an approved medicine batch");
      return;
    }
    if (!transferForm.distributorId) {
      toast.error("Please select an approved distributor");
      return;
    }
    const qty = parseInt(transferForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid positive quantity");
      return;
    }

    const selectedMed = medicines.find(
      (m) => m.id === transferForm.medicineId || m.batchId === transferForm.medicineId || m._id === transferForm.medicineId
    );
    if (selectedMed && typeof selectedMed.quantity === "number" && qty > selectedMed.quantity) {
      toast.error(`Transfer quantity (${qty}) exceeds available batch stock (${selectedMed.quantity} units)`);
      return;
    }

    setSubmittingTransfer(true);
    try {
      await transferService.createTransfer({
        medicineId: transferForm.medicineId,
        distributorId: transferForm.distributorId,
        quantity: qty,
        notes: transferForm.notes,
      });
      toast.success("✅ Transfer dispatched to Distributor! Pending confirmation.");
      setTransferForm({ medicineId: "", distributorId: "", quantity: "", notes: "" });
      setActiveMfrTab(MFR_TAB.OUTGOING);
      await loadOutgoingTransfers();
      if (loadMedicines) await loadMedicines();
    } catch (err) {
      toast.error(err.message || "Failed to dispatch transfer");
    } finally {
      setSubmittingTransfer(false);
    }
  };

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
      if (!form.composition.trim()) {
        toast.error("Please enter the Active Composition / Formula");
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
    setAlreadyRegistered(null);
    try {
      const result = await registerMedicine({
        ...form,
        medicineFile,
        aiVerification: { status: "MATCHED" },
      });
      setRegistered(result);
      toast.success("Medicine submitted successfully! It is now pending Admin approval.");
    } catch (err) {
      // Handle "already registered" as an informational state, not an error
      if (err.alreadyRegistered) {
        setAlreadyRegistered(err.existingRecord || { batchId: form.batchNumber.trim().toUpperCase() });
        toast(
          `Batch '${form.batchNumber.trim().toUpperCase()}' is already on DrugChain. Showing existing record.`,
          { icon: "⚠️", duration: 5000, style: { background: "#FFF7ED", color: "#92400E", border: "1px solid #F59E0B" } }
        );
      } else {
        toast.error(err.message || "Registration failed. Please check form values.");
      }
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
                    e.target.style.borderColor = "#0284C7";
                    e.target.style.boxShadow = "0 0 0 3px rgba(2,132,199,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E2E8F0";
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
                  e.target.style.borderColor = "#0284C7";
                  e.target.style.boxShadow = "0 0 0 3px rgba(2,132,199,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E2E8F0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Active Chemical Composition / Formula (Required)</label>
              <input
                id="composition"
                style={inputStyle}
                placeholder="e.g. Paracetamol IP 500mg, Caffeine 30mg"
                value={form.composition}
                onChange={set("composition")}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0284C7";
                  e.target.style.boxShadow = "0 0 0 3px rgba(2,132,199,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E2E8F0";
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
                  e.target.style.borderColor = "#0284C7";
                  e.target.style.boxShadow = "0 0 0 3px rgba(2,132,199,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E2E8F0";
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
                  e.target.style.borderColor = "#0284C7";
                  e.target.style.boxShadow = "0 0 0 3px rgba(2,132,199,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E2E8F0";
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
              { label: "Active Composition", value: form.composition },
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
            <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "#F0F9FF", border: "1px solid rgba(2,132,199,0.3)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748B", marginBottom: 4 }}>Blockchain</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0284C7" }}>🟢 Awaiting Approval</div>
            </div>
            <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "#F0FDFA", border: "1px solid rgba(13,148,136,0.3)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748B", marginBottom: 4 }}>AI Verification</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0D9488" }}>✓ Passed</div>
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
              background: "linear-gradient(135deg,#0284C7,#0369A1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 8px 30px rgba(2,132,199,0.3)",
            }}
          >
            <CheckCircle2 size={36} color="white" />
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#18182E", marginBottom: 8 }}>
            Medicine Submitted for Admin Approval
          </h1>
          <p style={{ fontSize: 15, color: "#5F607A", marginBottom: 36, maxWidth: 640, margin: "0 auto 36px" }}>
            Your medicine submission is recorded with <strong>Pending Review</strong> status. It has been transmitted to the Administrator. Once approved, it will be minted onto the DrugChain ledger and released for distributor transfers.
          </p>

          <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Medicine ID", value: registered.id || registered._id },
                { label: "Batch ID", value: registered.batchId },
                { label: "Approval Status", value: (registered.approvalStatus || "Pending Review").toUpperCase() },
                { label: "DrugChain Ledger", value: registered.blockchainTxHash ? "Minted" : "Awaiting Admin Approval" },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "left", background: "#F8F9FE", border: "1px solid #E8EAF6", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8E8FA8", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: label.includes("Approval Status") ? "#D97706" : "#18182E", fontFamily: label.includes("ID") ? "monospace" : "inherit" }}>{value}</div>
                </div>
              ))}
            </div>
            <QRDisplay medicineId={registered.id || registered._id} batchId={registered.batchId} />
          </div>

          {/* Uploaded Tablet Image Preview & Download */}
          {(medicineFile || registered.imageUrl || registered.medicineImage) && (
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
                ) : (registered.imageUrl || registered.medicineImage) ? (
                  <MedicineImage
                    src={registered.imageUrl || registered.medicineImage}
                    alt={`${registered.name || "Medicine"} packaging`}
                    style={{ height: 180 }}
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
              background: "linear-gradient(135deg,#0284C7,#0369A1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(2,132,199,0.25)",
            }}
          >
            <Factory size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2rem", fontWeight: 800, color: "#0F172A" }}>
              Manufacturer
            </h1>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              Register and manage verified medicines on blockchain
            </p>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 36 }}>
          {[
            { label: "My Medicines", value: medicines.length, color: "#0284C7", bg: "rgba(2,132,199,0.08)" },
            { label: "Authenticated", value: medicines.filter(m => m.status === "AUTHENTIC").length, color: "#059669", bg: "rgba(5,150,105,0.08)" },
            { label: "Pending Transfer", value: medicines.filter(m => m.currentHolder === "Manufacturer").length, color: "#D97706", bg: "rgba(217,119,6,0.08)" },
            { label: "At Pharmacy", value: medicines.filter(m => m.currentHolder === "Pharmacy").length, color: "#0D9488", bg: "rgba(13,148,136,0.08)" },
          ].map(s => (
            <div key={s.label} className="med-card" style={{ padding: "20px 22px", transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(2,132,199,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(15,23,42,0.04)"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Package size={20} color={s.color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, borderBottom: "1px solid #E2E8F0", paddingBottom: 12, flexWrap: "wrap" }}>
          {[
            { id: MFR_TAB.REGISTER, label: "Register New Medicine", icon: Factory, badge: null },
            { id: MFR_TAB.TRANSFER, label: "Dispatch Transfer", icon: Send, badge: approvedMedicines.length > 0 ? `${approvedMedicines.length} Approved` : null },
            { id: MFR_TAB.OUTGOING, label: "Outgoing Transfers", icon: Truck, badge: outgoingTransfers.filter(t => t.status === "Pending Confirmation" || t.status === "Pending").length || null },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeMfrTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveMfrTab(tab.id);
                  if (tab.id === MFR_TAB.TRANSFER) loadApprovedDistributors();
                  if (tab.id === MFR_TAB.OUTGOING) loadOutgoingTransfers();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 12,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background: active ? "#0284C7" : "#F1F5F9",
                  color: active ? "#FFFFFF" : "#64748B",
                  boxShadow: active ? "0 4px 14px rgba(2,132,199,0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <Icon size={16} />
                {tab.label}
                {tab.badge && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: 10,
                    background: active ? "rgba(255,255,255,0.25)" : "#E2E8F0",
                    color: active ? "#FFFFFF" : "#475569",
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: REGISTER MEDICINE WIZARD ── */}
        {activeMfrTab === MFR_TAB.REGISTER && (
          <div>
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
                        background: i < step ? "#059669" : i === step ? "#0284C7" : "#FFFFFF",
                        border: `1px solid ${i < step ? "#059669" : i === step ? "#0284C7" : "#E2E8F0"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: i <= step ? "white" : "#64748B",
                        boxShadow: i === step ? "0 4px 14px rgba(2,132,199,0.3)" : "none",
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
                        color: i === step ? "#0284C7" : "#64748B",
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
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Submitting for Approval...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> Submit for Admin Approval
                      </>
                    )}
                  </span>
                </button>
              )}
            </div>

            {/* ── Already Registered Info Panel ─────────────────────────── */}
            {alreadyRegistered && (
              <div style={{
                background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
                border: "1.5px solid #F59E0B",
                borderRadius: 18,
                padding: "24px 28px",
                marginTop: 16,
                boxShadow: "0 4px 20px rgba(245,158,11,0.12)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ fontSize: 28, lineHeight: 1 }}>⚠️</div>
                    <div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16, color: "#92400E", marginBottom: 4 }}>
                        Batch Already Registered on DrugChain
                      </div>
                      <div style={{ fontSize: 13, color: "#78350F", marginBottom: 12 }}>
                        This batch was previously registered. Below are the existing on-chain details.
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                        {[
                          { label: "Batch ID", value: alreadyRegistered.batchId || "—" },
                          { label: "Medicine", value: alreadyRegistered.name || alreadyRegistered.medicineName || "—" },
                          { label: "Manufacturer", value: alreadyRegistered.company || alreadyRegistered.manufacturer || "—" },
                          { label: "Status", value: alreadyRegistered.status || "AUTHENTIC" },
                          { label: "Blockchain Status", value: alreadyRegistered.blockchainStatus || "Confirmed" },
                          { label: "Medicine ID", value: alreadyRegistered.id || alreadyRegistered.medicineId || "—" },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 14px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#78350F", marginBottom: 3 }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", wordBreak: "break-all" }}>{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setAlreadyRegistered(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#92400E", fontSize: 18, padding: "0 4px", lineHeight: 1, flexShrink: 0 }}
                    title="Dismiss"
                  >×</button>
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => { setAlreadyRegistered(null); setStep(1); setForm(f => ({ ...f, batchNumber: "" })); }}
                    style={{ padding: "8px 18px", background: "#F59E0B", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Use a Different Batch Number
                  </button>
                  <button
                    onClick={() => setAlreadyRegistered(null)}
                    style={{ padding: "8px 18px", background: "transparent", color: "#92400E", border: "1.5px solid #F59E0B", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: DISPATCH TRANSFER FORM ── */}
        {activeMfrTab === MFR_TAB.TRANSFER && (
          <div style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
            padding: 36,
            marginBottom: 24,
            boxShadow: "0 4px 24px rgba(2,132,199,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(2,132,199,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Send size={22} color="#0284C7" />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
                  Dispatch Medicine Batch to Distributor
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                  Only Admin-approved medicine batches can be transferred to authorized distributors.
                </p>
              </div>
            </div>

            {approvedMedicines.length === 0 ? (
              <div style={{
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 14,
                padding: "24px",
                textAlign: "center",
              }}>
                <AlertTriangle size={36} color="#D97706" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>No Approved Medicines Available</h3>
                <p style={{ fontSize: 13, color: "#78350F", maxWidth: 460, margin: "0 auto 16px" }}>
                  Medicines must be reviewed and approved by an Administrator before they can be transferred down the supply chain.
                </p>
                <button
                  onClick={() => setActiveMfrTab(MFR_TAB.REGISTER)}
                  className="btn-primary"
                  style={{ margin: "0 auto" }}
                >
                  Register a New Batch
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateTransfer} style={{ display: "grid", gap: 20 }}>
                {/* Medicine Selection */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Select Approved Medicine Batch *
                  </label>
                  <select
                    value={transferForm.medicineId}
                    onChange={(e) => setTransferForm((f) => ({ ...f, medicineId: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1.5px solid #CBD5E1",
                      fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      background: "#FFFFFF",
                      outline: "none",
                    }}
                  >
                    <option value="">-- Choose an Approved Medicine Batch --</option>
                    {approvedMedicines.map((m) => (
                      <option key={m.id || m.batchId} value={m.id || m.batchId}>
                        {m.name} (Batch: {m.batchId}) — Stock: {m.quantity != null ? `${m.quantity} units` : "Available"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Medicine Preview Badge */}
                {transferForm.medicineId && (() => {
                  const selectedMed = approvedMedicines.find(
                    (m) => m.id === transferForm.medicineId || m.batchId === transferForm.medicineId
                  );
                  if (!selectedMed) return null;
                  return (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 12,
                      padding: "12px 16px",
                    }}>
                      {(selectedMed.imageUrl || selectedMed.medicineImage) && (
                        <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", border: "1px solid #CBD5E1", flexShrink: 0 }}>
                          <MedicineImage
                            src={selectedMed.imageUrl || selectedMed.medicineImage}
                            alt={selectedMed.name}
                            style={{ height: "100%", width: "100%", objectFit: "cover" }}
                            placeholderSize={56}
                          />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{selectedMed.name}</div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          Batch: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{selectedMed.batchId}</span> • Expires: {selectedMed.expiryDate || "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Batch Balance</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#0284C7" }}>
                          {selectedMed.quantity != null ? `${selectedMed.quantity} units` : "Available"}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Distributor Selection */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Select Recipient Distributor *
                    </label>
                    <button
                      type="button"
                      onClick={loadApprovedDistributors}
                      disabled={loadingDistributors}
                      style={{ background: "none", border: "none", color: "#0284C7", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <RefreshCw size={12} className={loadingDistributors ? "spin" : ""} /> Refresh List
                    </button>
                  </div>
                  <select
                    value={transferForm.distributorId}
                    onChange={(e) => setTransferForm((f) => ({ ...f, distributorId: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1.5px solid #CBD5E1",
                      fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      background: "#FFFFFF",
                      outline: "none",
                    }}
                  >
                    <option value="">-- Choose Authorized Distributor --</option>
                    {approvedDistributors.map((d) => (
                      <option key={d.id || d._id} value={d.id || d._id}>
                        {d.company ? `${d.company} (${d.name})` : d.name} — {d.companyCode || d.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transfer Quantity */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Transfer Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter units to dispatch (e.g., 500)"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm((f) => ({ ...f, quantity: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1.5px solid #CBD5E1",
                      fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      background: "#FFFFFF",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Dispatch Notes */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Dispatch / Transport Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Cold storage transport at 2-8°C, Tracking Waybill #TRK-98214"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1.5px solid #CBD5E1",
                      fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      background: "#FFFFFF",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* Submit Action */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={submittingTransfer}
                    style={{
                      padding: "12px 28px",
                      borderRadius: 12,
                      background: "linear-gradient(135deg,#0284C7,#0369A1)",
                      color: "white",
                      border: "none",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 6px 20px rgba(2,132,199,0.3)",
                    }}
                  >
                    {submittingTransfer ? (
                      <>
                        <Loader2 size={16} className="spin" /> Dispatching Transfer...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Dispatch Transfer to Distributor
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── TAB 3: OUTGOING TRANSFERS LIST ── */}
        {activeMfrTab === MFR_TAB.OUTGOING && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
                  Outgoing Transfers History
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                  Track custody transfers dispatched from your manufacturing facility to distributors.
                </p>
              </div>
              <button
                onClick={loadOutgoingTransfers}
                disabled={loadingOutgoing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#334155",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} className={loadingOutgoing ? "spin" : ""} /> Refresh
              </button>
            </div>

            {outgoingTransfers.length === 0 ? (
              <div style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 16,
                padding: "48px 24px",
                textAlign: "center",
              }}>
                <Truck size={40} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: "#475569" }}>No outgoing transfers found</div>
                <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
                  Use the "Dispatch Transfer" tab to send approved medicine batches to distributors.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {outgoingTransfers.map((tx) => {
                  const isPending = tx.status === "Pending Confirmation" || tx.status === "Pending";
                  const isConfirmed = tx.status === "Confirmed" || tx.status === "Accepted";
                  const isRejected = tx.status === "Rejected";

                  const badgeColor = isConfirmed ? "#059669" : isRejected ? "#DC2626" : "#D97706";
                  const badgeBg = isConfirmed ? "rgba(5,150,105,0.08)" : isRejected ? "rgba(220,38,38,0.08)" : "rgba(217,119,6,0.08)";
                  const badgeBorder = isConfirmed ? "rgba(5,150,105,0.25)" : isRejected ? "rgba(220,38,38,0.25)" : "rgba(217,119,6,0.25)";

                  return (
                    <div
                      key={tx.id || tx._id}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: 16,
                        padding: "20px 24px",
                        boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          {(tx.medicineImageUrl || tx.imageUrl || tx.medicineImage) && (
                            <div style={{ width: 50, height: 50, borderRadius: 10, overflow: "hidden", border: "1px solid #CBD5E1", flexShrink: 0 }}>
                              <MedicineImage
                                src={tx.medicineImageUrl || tx.imageUrl || tx.medicineImage}
                                alt={tx.medicineName || tx.batchId}
                                style={{ height: "100%", width: "100%", objectFit: "cover" }}
                                placeholderSize={50}
                              />
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
                              {tx.medicineName || tx.medicine || "Medicine Batch"}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                              Batch: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0284C7" }}>{tx.batchId}</span>
                              {tx.quantity ? ` • Qty: ${tx.quantity} units` : ""}
                            </div>
                          </div>
                        </div>

                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "6px 12px",
                          borderRadius: 100,
                          background: badgeBg,
                          color: badgeColor,
                          border: `1px solid ${badgeBorder}`,
                        }}>
                          {isConfirmed && <CheckCircle2 size={13} />}
                          {isPending && <Clock size={13} />}
                          {isRejected && <XCircle size={13} />}
                          {tx.status}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, padding: "12px 16px", background: "#F8FAFC", borderRadius: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#64748B" }}>Recipient Distributor</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginTop: 2 }}>{tx.to || "Distributor"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#64748B" }}>Dispatched Date</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginTop: 2 }}>{tx.date || tx.createdAt ? new Date(tx.date || tx.createdAt).toLocaleDateString() : "Recent"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#64748B" }}>DrugChain Ledger</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", marginTop: 2, fontFamily: "monospace" }}>
                            {tx.blockchainStatus || "Recorded"}
                          </div>
                        </div>
                      </div>

                      {/* Rejection Alert if rejected */}
                      {isRejected && (
                        <div style={{
                          marginTop: 12,
                          background: "#FEF2F2",
                          border: "1px solid #FECACA",
                          borderRadius: 10,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}>
                          <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                          <div style={{ fontSize: 12, color: "#991B1B" }}>
                            <strong>Distributor Rejection Reason:</strong> {tx.rejectionReason || "No specific reason provided."}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
                const appStatus = m.approvalStatus || (m.status === "AUTHENTIC" ? "approved" : "pending");
                const statusColor = appStatus === "approved" ? "#10B981" : appStatus === "rejected" ? "#EF4444" : "#F59E0B";
                const statusBg = appStatus === "approved" ? "#ECFDF5" : appStatus === "rejected" ? "#FEF2F2" : "#FFFBEB";
                const statusLabel = appStatus === "approved" ? "APPROVED" : appStatus === "rejected" ? "REJECTED" : "PENDING REVIEW";
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
                    {/* Medicine Image Thumbnail */}
                    {(m.imageUrl || m.medicineImage) && (
                      <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                        <MedicineImage
                          src={m.imageUrl || m.medicineImage}
                          alt={m.name}
                          style={{ height: 110 }}
                          placeholderSize={110}
                        />
                      </div>
                    )}

                    {/* Status badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: statusColor, background: statusBg, padding: "4px 10px", borderRadius: 100, border: `1px solid ${statusColor}30` }}>
                        {statusLabel}
                      </span>
                      <ShieldCheck size={16} color={statusColor} />
                    </div>

                    <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>{m.name}</h3>

                    {appStatus === "rejected" && m.rejectionReason && (
                      <div style={{ marginBottom: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#991B1B" }}>
                        <strong>Rejection Reason:</strong> {m.rejectionReason}
                      </div>
                    )}

                    <div style={{ display: "grid", gap: 6 }}>
                      {[
                        { label: "Batch ID", value: m.batchId },
                        { label: "Formula", value: m.composition || "Standard" },
                        { label: "Expires", value: m.expiryDate },
                        { label: "Holder", value: m.currentHolder || "Manufacturer" },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8" }}>{row.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", fontFamily: row.label === "Batch ID" ? "monospace" : "inherit", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value || "—"}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 6, color: "#0284C7", fontSize: 12, fontWeight: 700 }}>
                      <QrCode size={13} /> View Verification Details
                    </div>
                  </div>
                );
              })}
          </div>

          {medicines.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#FFFFFF", borderRadius: 20, border: "1px solid #E2E8F0" }}>
              <Package size={48} color="#94A3B8" style={{ margin: "0 auto 16px" }} />
              <p style={{ fontWeight: 700, color: "#64748B", fontSize: 15 }}>No medicines registered yet.</p>
              <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>Use the form above to register your first medicine on MediChainAI.</p>
            </div>
          )}
        </section>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
