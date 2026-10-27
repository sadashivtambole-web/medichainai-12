import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Download, QrCode, ArrowLeft, Loader2, ShieldCheck, Check } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { verificationService } from "../services/verificationService";

export default function GenerateQr() {
  const { medicines } = useApp();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const holderRef = useRef(null);

  // Set initial selected batch when medicines load
  useEffect(() => {
    if (medicines && medicines.length > 0 && !selectedBatch) {
      setSelectedBatch(medicines[0].batchId || medicines[0].id);
    }
  }, [medicines, selectedBatch]);

  // Current active medicine
  const activeCode = customInput.trim() || selectedBatch;
  const currentMed = (medicines || []).find(
    (m) =>
      m.batchId?.toLowerCase() === activeCode.toLowerCase() ||
      m.id?.toLowerCase() === activeCode.toLowerCase()
  );

  // Generate secure HMAC-SHA256 token on backend
  useEffect(() => {
    let mounted = true;
    async function fetchToken() {
      if (!activeCode) {
        setQrToken("");
        return;
      }
      setTokenLoading(true);
      try {
        const medId = currentMed?.id || activeCode;
        const bId = currentMed?.batchId || activeCode;
        const res = await verificationService.generateQR(medId, bId);
        if (mounted && res?.token) {
          setQrToken(res.token);
        }
      } catch (err) {
        // Fallback to raw code string
        if (mounted) setQrToken(activeCode);
      } finally {
        if (mounted) setTokenLoading(false);
      }
    }

    fetchToken();
    return () => {
      mounted = false;
    };
  }, [activeCode, currentMed]);

  function download() {
    const canvas = holderRef.current?.querySelector("canvas");
    if (!canvas) {
      toast.error("Nothing to download yet.");
      return;
    }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `QR_${activeCode || "pack"}.png`;
    link.click();
    toast.success("QR code downloaded");
  }

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
        <QrCode size={28} color="white" />
      </div>

      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#0F172A" }}>
        Generate Pack QR Code
      </h1>
      <p style={{ fontSize: 14, color: "#64748B", maxWidth: 540, margin: "10px auto 28px", lineHeight: 1.6 }}>
        Produce the cryptographically signed HMAC-SHA256 QR code affixed to packaging. Scan it with the camera or verify tool to validate the complete MediChainAI custody loop.
      </p>

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 4px 24px rgba(15,23,42,0.04)",
        }}
      >
        {/* Medicine Selector Pills */}
        {medicines && medicines.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            {medicines.map((m) => (
              <button
                key={m.id || m.batchId}
                type="button"
                onClick={() => {
                  setSelectedBatch(m.batchId || m.id);
                  setCustomInput("");
                }}
                style={{
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.2s",
                  background: activeCode === (m.batchId || m.id) ? "#0284C7" : "#F8FAFC",
                  color: activeCode === (m.batchId || m.id) ? "#FFFFFF" : "#0F172A",
                  borderColor: activeCode === (m.batchId || m.id) ? "#0284C7" : "#E2E8F0",
                }}
              >
                {m.name} ({m.batchId})
              </button>
            ))}
          </div>
        )}

        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Or enter any custom batch or medicine ID..."
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid #E2E8F0",
            padding: "12px 16px",
            textAlign: "center",
            fontFamily: "monospace",
            fontSize: 14,
            outline: "none",
            background: "#F8FAFC",
            color: "#0F172A",
            boxSizing: "border-box",
          }}
        />

        {/* QR Code Canvas */}
        <div ref={holderRef} style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
          {tokenLoading ? (
            <div style={{ padding: "60px 0" }}>
              <Loader2 size={32} color="#0284C7" style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, color: "#64748B" }}>Generating cryptographic HMAC token...</div>
            </div>
          ) : qrToken ? (
            <div style={{ background: "white", padding: 16, borderRadius: 16, border: "1px solid #E8EAF6", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <QRCodeCanvas
                value={qrToken}
                size={220}
                level="M"
                includeMargin
                bgColor="#ffffff"
                fgColor="#080909"
              />
            </div>
          ) : (
            <p style={{ padding: "40px 0", fontSize: 14, color: "#8E8FA8" }}>
              Select or type a medicine code to display its signed QR.
            </p>
          )}
        </div>

        {/* Medicine Details */}
        {currentMed && (
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 16px",
              marginTop: 20,
              padding: "14px 18px",
              background: "#F8F9FD",
              borderRadius: 12,
              border: "1px solid #E8EAF6",
              textAlign: "left",
              fontSize: 13,
            }}
          >
            <dt style={{ color: "#8E8FA8", fontWeight: 600 }}>Medicine</dt>
            <dd style={{ color: "#18182E", fontWeight: 700, margin: 0 }}>{currentMed.name}</dd>
            <dt style={{ color: "#8E8FA8", fontWeight: 600 }}>Batch ID</dt>
            <dd style={{ color: "#18182E", fontWeight: 700, margin: 0, fontFamily: "monospace" }}>{currentMed.batchId}</dd>
            <dt style={{ color: "#8E8FA8", fontWeight: 600 }}>Manufacturer</dt>
            <dd style={{ color: "#18182E", fontWeight: 700, margin: 0 }}>{currentMed.company || currentMed.manufacturer}</dd>
            <dt style={{ color: "#8E8FA8", fontWeight: 600 }}>Expiry Date</dt>
            <dd style={{ color: "#18182E", fontWeight: 700, margin: 0 }}>{currentMed.expiryDate}</dd>
            {currentMed.blockchainTxHash && (
              <>
                <dt style={{ color: "#8E8FA8", fontWeight: 600 }}>Blockchain Tx</dt>
                <dd style={{ color: "#059669", fontWeight: 700, margin: 0, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>
                  {currentMed.blockchainTxHash.slice(0, 18)}...
                </dd>
              </>
            )}
          </dl>
        )}

        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12 }}>
          <button
            type="button"
            onClick={download}
            disabled={!qrToken || tokenLoading}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px" }}
          >
            <Download size={16} /> Download PNG QR Code
          </button>
        </div>
      </div>

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
