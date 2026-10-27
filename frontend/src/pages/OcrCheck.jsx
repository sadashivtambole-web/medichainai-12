import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { ScanText, Loader2, Image as ImageIcon, Info, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { runOcr, parseLabel, OcrUnavailableError } from "../lib/ocr";
import { verifyBatch, verifyPack } from "../lib/verifyPack";
import { verificationService } from "../services/verificationService";
import ResultCard from "../components/ResultCard.jsx";

export default function OcrCheck() {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fields, setFields] = useState(null);
  const [result, setResult] = useState(null);
  const [aiReport, setAiReport] = useState(null);

  const onDrop = useCallback(async (accepted) => {
    const file = accepted?.[0];
    if (!file) return;

    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setFields(null);
    setResult(null);
    setAiReport(null);
    setProgress(0);
    setBusy(true);

    try {
      // 1. Send to Backend AI Vision & OCR service
      let parsed = null;
      try {
        const formData = new FormData();
        formData.append("medicineImage", file);
        const aiRes = await verificationService.verifyAI(formData);
        if (aiRes && aiRes.ocrExtracted) {
          setAiReport(aiRes);
          const ocr = aiRes.ocrExtracted;
          parsed = {
            batch: ocr.batchNumber || null,
            expiry: ocr.expiryDate || null,
            code: ocr.batchNumber || null,
            medicineName: ocr.medicineName || null,
          };
        }
      } catch (serverErr) {
        console.warn("Backend AI inspection note:", serverErr.message);
      }

      // 2. Fallback to client-side OCR if server returned empty
      if (!parsed || (!parsed.batch && !parsed.code)) {
        try {
          const { text } = await runOcr(file, setProgress);
          parsed = parseLabel(text);
        } catch (localErr) {
          if (!parsed) throw localErr;
        }
      }

      setFields(parsed);

      // 3. Verify against DrugChain ledger
      const queryKey = parsed?.code || parsed?.batch || parsed?.medicineName;
      if (queryKey) {
        const res = await verifyPack(queryKey);
        setResult(res);

        if (res.status === "genuine") {
          toast.success("Label matches an authentic registered medicine!");
        } else if (res.status === "expired") {
          toast("Genuine record found, but batch has expired.", { icon: "⚠️" });
        } else {
          toast.error("Label did not match any verified DrugChain record.");
        }
      } else {
        toast("Text scanned, but no batch number detected.", { icon: "🔍" });
      }
    } catch (err) {
      if (err instanceof OcrUnavailableError) {
        toast.error("OCR service temporarily unavailable. Please type batch code manually.");
      } else {
        toast.error("Could not read that image. Please try a clearer, well-lit photo.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: busy,
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
      <Toaster position="top-right" />
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "linear-gradient(135deg,#0284C7,#0369A1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          boxShadow: "0 8px 24px rgba(2,132,199,0.25)",
        }}
      >
        <ScanText size={28} color="white" />
      </div>

      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#0F172A" }}>
        Read Medicine Label
      </h1>
      <p style={{ fontSize: 14, color: "#64748B", maxWidth: 540, margin: "10px auto 28px", lineHeight: 1.6 }}>
        Upload a photo of the medicine box or foil strip. Gemini Vision & OCR extract the batch number, expiry date, and medicine name to cross-check against the immutable MediChainAI registry.
      </p>

      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "#0284C7" : "#CBD5E1"}`,
          borderRadius: 20,
          padding: "40px 24px",
          background: isDragActive ? "#F0F9FF" : "#FFFFFF",
          textAlign: "center",
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.6 : 1,
          transition: "all 0.2s",
          boxShadow: "0 4px 20px rgba(15,23,42,0.02)",
        }}
      >
        <input {...getInputProps()} />
        <ImageIcon size={36} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
          {isDragActive ? "Drop the label photo here..." : "Drag a packaging photo here, or click to choose"}
        </p>
        <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>PNG, JPG or WEBP — max 10MB</p>
      </div>

      {preview && (
        <img
          src={preview}
          alt="Uploaded medicine label"
          style={{
            maxHeight: 240,
            borderRadius: 14,
            border: "1px solid #E2E8F0",
            margin: "24px auto 0",
            objectFit: "contain",
            boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
          }}
        />
      )}

      {busy && (
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#0284C7", fontWeight: 600, fontSize: 14 }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          Analyzing packaging with AI Vision & OCR engine...
        </div>
      )}

      {/* Extracted Fields */}
      {fields && (
        <div
          style={{
            marginTop: 24,
            background: "#FFFFFF",
            border: "1px solid #E8EAF6",
            borderRadius: 16,
            padding: "20px 24px",
            textAlign: "left",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8E8FA8", marginBottom: 12 }}>
            Extracted Label Information
          </div>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px", margin: 0, fontSize: 13 }}>
            <dt style={{ color: "#8E8FA8" }}>Detected Batch</dt>
            <dd style={{ color: "#18182E", fontWeight: 700, fontFamily: "monospace", margin: 0 }}>
              {fields.batch || "—"}
            </dd>
            <dt style={{ color: "#8E8FA8" }}>Detected Expiry</dt>
            <dd style={{ color: "#18182E", fontWeight: 700, margin: 0 }}>
              {fields.expiry || "—"}
            </dd>
            {fields.medicineName && (
              <>
                <dt style={{ color: "#8E8FA8" }}>Detected Medicine</dt>
                <dd style={{ color: "#18182E", fontWeight: 700, margin: 0 }}>
                  {fields.medicineName}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}

      {/* AI Report Findings */}
      {aiReport && aiReport.reasons && aiReport.reasons.length > 0 && (
        <div
          style={{
            marginTop: 16,
            background: "#F8F9FD",
            border: "1px solid #E8EAF6",
            borderRadius: 14,
            padding: "16px 20px",
            textAlign: "left",
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0284C7", fontWeight: 800, marginBottom: 8 }}>
            <Sparkles size={16} /> AI Vision Analysis Findings
          </div>
          {aiReport.reasons.map((r, i) => (
            <div key={i} style={{ color: "#5F607A", marginTop: 4 }}>
              • {r}
            </div>
          ))}
        </div>
      )}

      {result && <ResultCard result={result} />}

      <Link
        to="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 28,
          color: "#0284C7",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={16} /> Back to Home
      </Link>
    </main>
  );
}
