import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle2 } from "lucide-react";

export default function FileUpload({ label, accept, value, onChange, hint }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) onChange(acceptedFiles[0]);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || { "image/*": [], "application/pdf": [] },
    maxFiles: 1,
  });

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  if (value) {
    return (
      <div
        style={{
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 12,
          padding: "16px 20px",
          background: "#F0FDF4",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <CheckCircle2 size={20} color="#10B981" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#065F46" }}>
            {value.name}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            {(value.size / 1024).toFixed(1)} KB
          </div>
        </div>
        <button
          onClick={handleRemove}
          style={{
            background: "#FEE2E2",
            border: "1px solid #FECACA",
            borderRadius: 6,
            padding: 4,
            cursor: "pointer",
            color: "#DC2626",
            display: "flex",
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      style={{
        border: `1px dashed ${isDragActive ? "#5855F3" : "#D1D5DB"}`,
        borderRadius: 12,
        padding: "28px 20px",
        background: isDragActive ? "#EEF0FD" : "#FFFFFF",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
      }}
    >
      <input {...getInputProps()} />
      <Upload
        size={24}
        color={isDragActive ? "#5855F3" : "#8E8FA8"}
        style={{ margin: "0 auto 10px" }}
      />
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: isDragActive ? "#5855F3" : "#18182E" }}>
        {isDragActive ? "Drop file here..." : `Upload ${label}`}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: "#5F607A", marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}
