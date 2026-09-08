import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

export default function QRDisplay({ value, medicineId, batchId }) {
  const qrRef = useRef(null);
  const qrData = value || JSON.stringify({ medicineId, batchId, system: "FakeDrugDetection" });

  const handleDownload = () => {
    try {
      const svgElement = qrRef.current?.querySelector("svg");
      if (!svgElement) {
        toast.error("Unable to capture QR code image");
        return;
      }

      // Convert SVG to XML String
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 3; // 3x high-resolution crisp PNG export
        canvas.width = 160 * scale;
        canvas.height = 160 * scale;
        const context = canvas.getContext("2d");

        // White background for barcode readers
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pngURL = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngURL;
        downloadLink.download = `QR_${batchId || medicineId || "MEDICINE"}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobURL);

        toast.success(`Downloaded QR_${batchId || medicineId || "MEDICINE"}.png`);
      };

      image.src = blobURL;
    } catch (err) {
      console.error("QR Download Error:", err);
      toast.error("Failed to download QR code");
    }
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#475569",
        }}
      >
        QR Code / Barcode
      </div>

      <div
        ref={qrRef}
        style={{
          background: "white",
          padding: 16,
          borderRadius: 12,
          boxShadow: "0 0 30px rgba(59,130,246,0.1)",
        }}
      >
        <QRCodeSVG
          value={qrData}
          size={160}
          level="H"
          includeMargin={false}
          fgColor="#080909"
        />
      </div>

      <div style={{ textAlign: "center" }}>
        {medicineId && (
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#60A5FA", marginBottom: 4 }}>
            {medicineId}
          </div>
        )}
        {batchId && (
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#475569" }}>
            Batch: {batchId}
          </div>
        )}
      </div>

      <button
        id="download-qr-btn"
        onClick={handleDownload}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(59,130,246,0.12)",
          border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 8,
          padding: "8px 18px",
          color: "#60A5FA",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
          fontFamily: "Inter",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(59,130,246,0.25)";
          e.currentTarget.style.color = "#93C5FD";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(59,130,246,0.12)";
          e.currentTarget.style.color = "#60A5FA";
        }}
      >
        <Download size={14} />
        Download QR Image
      </button>
    </div>
  );
}
