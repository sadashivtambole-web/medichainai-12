import { useEffect, useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";

/**
 * CameraScanner — uses html5-qrcode to scan QR / barcode from the webcam.
 * Props:
 *   onResult(decodedText: string)  — called when a code is successfully read
 *   onClose()                      — called when the user dismisses the scanner
 */
export default function CameraScanner({ onResult, onClose }) {
  const [status, setStatus] = useState("starting"); // starting | running | error
  const [errorMsg, setErrorMsg] = useState("");
  const scannerRef = useRef(null);
  const divId = "html5qr-scanner-region";

  useEffect(() => {
    let scanner = null;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode(divId);
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setStatus("error");
          setErrorMsg("No camera found. Please allow camera access or use image upload.");
          return;
        }

        await scanner.start(
          { facingMode: "environment" }, // prefer rear camera on mobile
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            onResult(decodedText);
          },
          () => {} // ignore per-frame errors silently
        );
        setStatus("running");
      } catch (err) {
        setStatus("error");
        setErrorMsg(
          err?.message?.includes("Permission")
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : `Camera error: ${err?.message || "Unknown error"}`
        );
      }
    };

    init();

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => scannerRef.current?.clear());
      }
    };
  }, []);

  return (
    <div
      style={{
        background: "rgba(8,9,9,0.95)",
        border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: 20,
        padding: 24,
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Camera size={18} color="#3B82F6" />
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 14,
              color: "#F1F5F9",
            }}
          >
            Camera QR / Barcode Scanner
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "4px 10px",
            color: "#FCA5A5",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "Inter",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <X size={13} /> Close
        </button>
      </div>

      {/* Status */}
      {status === "starting" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            padding: 32,
            color: "#64748B",
            fontSize: 13,
          }}
        >
          <Loader2
            size={18}
            color="#3B82F6"
            style={{ animation: "spin 1s linear infinite" }}
          />
          Starting camera...
        </div>
      )}

      {status === "error" && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#FCA5A5",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Scanner container — html5-qrcode mounts here */}
      <div
        id={divId}
        style={{
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: "#000",
          display: status === "error" ? "none" : "block",
        }}
      />

      {status === "running" && (
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#475569",
            marginTop: 14,
          }}
        >
          Point your camera at the QR code or barcode on the medicine package.
        </p>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
