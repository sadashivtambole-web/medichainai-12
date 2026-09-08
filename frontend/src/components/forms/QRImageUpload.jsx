import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageUp, CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * QRImageUpload — user drops/selects an image, we decode QR/barcode using jsQR.
 * Props:
 *   onResult(decodedText: string)
 */
export default function QRImageUpload({ onResult }) {
  const [status, setStatus] = useState("idle"); // idle | reading | success | error
  const [msg, setMsg] = useState("");

  const decodeImage = async (file) => {
    setStatus("reading");
    setMsg("");
    try {
      const jsQR = (await import("jsqr")).default;
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setStatus("success");
        setMsg("QR code detected — fetching medicine record...");
        onResult(code.data);
      } else {
        setStatus("error");
        setMsg("Could not read a QR code from this image. Try a clearer photo.");
      }
    } catch (e) {
      setStatus("error");
      setMsg("Failed to process the image. Please try another file.");
    }
  };

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) decodeImage(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${
            isDragActive
              ? "rgba(59,130,246,0.5)"
              : status === "success"
              ? "rgba(16,185,129,0.4)"
              : status === "error"
              ? "rgba(239,68,68,0.4)"
              : "rgba(255,255,255,0.1)"
          }`,
          borderRadius: 14,
          padding: "32px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: isDragActive ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s",
        }}
      >
        <input {...getInputProps()} />

        {status === "reading" ? (
          <Loader2
            size={32}
            color="#3B82F6"
            style={{ margin: "0 auto 12px", animation: "spin 1s linear infinite" }}
          />
        ) : status === "success" ? (
          <CheckCircle2 size={32} color="#10B981" style={{ margin: "0 auto 12px" }} />
        ) : status === "error" ? (
          <XCircle size={32} color="#EF4444" style={{ margin: "0 auto 12px" }} />
        ) : (
          <ImageUp
            size={32}
            color={isDragActive ? "#3B82F6" : "#475569"}
            style={{ margin: "0 auto 12px" }}
          />
        )}

        <div
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            fontWeight: 600,
            color:
              status === "success"
                ? "#34D399"
                : status === "error"
                ? "#FCA5A5"
                : status === "reading"
                ? "#60A5FA"
                : "#94A3B8",
            marginBottom: 6,
          }}
        >
          {status === "idle" && (isDragActive ? "Drop image here..." : "Upload QR / Barcode Image")}
          {status === "reading" && "Decoding QR code..."}
          {status === "success" && "QR Code Detected!"}
          {status === "error" && "Detection Failed"}
        </div>

        <div style={{ fontSize: 12, color: "#475569" }}>
          {status === "idle" && "Drag & drop or click to select a photo of the medicine QR/barcode"}
          {(status === "success" || status === "error") && msg}
        </div>
      </div>

      {status === "error" && (
        <button
          onClick={() => setStatus("idle")}
          style={{
            marginTop: 10,
            width: "100%",
            background: "none",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "8px",
            color: "#475569",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "Inter",
          }}
        >
          Try Again
        </button>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
