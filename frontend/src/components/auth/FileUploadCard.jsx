import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, X, Image as ImageIcon, Camera } from "lucide-react";

/**
 * FileUploadCard
 * Elegant drag-and-drop upload zone for Identity Photo and Government ID documents
 * Features:
 * - Drag-over active animation
 * - File preview thumbnail or PDF chip
 * - File size and type guidance
 * - Optional camera trigger button
 * - Clear / remove action
 */
export default function FileUploadCard({
  title,
  subtitle,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  file,
  previewUrl,
  onFileSelect,
  onClear,
  onOpenCamera,
  hasCamera = false,
  required = false,
  error,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragover" || e.type === "dragenter") {
      setIsDragOver(true);
    } else if (e.type === "dragleave") {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const isPdf = file?.type === "application/pdf" || file?.name?.endsWith(".pdf");

  return (
    <div className="w-full">
      {/* Label / Title */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
          {title}
          {required && <span className="text-rose-500 font-extrabold">*</span>}
        </label>
        {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* If file is already selected / captured */}
      {file || previewUrl ? (
        <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {previewUrl && !isPdf ? (
              <img
                src={previewUrl}
                alt="Upload Preview"
                className="w-12 h-12 object-cover rounded-xl border border-sky-300 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <FileText size={22} />
              </div>
            )}

            <div className="overflow-hidden">
              <p className="text-xs font-extrabold text-slate-900 truncate">
                {file?.name || "Live Identity Photo Attached"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 size={12} /> Ready for verification
                </span>
                {file?.size && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors shrink-0 ml-2"
            title="Remove file"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={handleDrag}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center select-none ${
            isDragOver
              ? "border-sky-500 bg-sky-50/80"
              : error
              ? "border-rose-300 bg-rose-50/40 hover:bg-rose-50/70"
              : "border-slate-300 hover:border-sky-400 bg-white/70 hover:bg-white"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2.5">
            <Upload size={20} />
          </div>

          <p className="text-xs font-bold text-slate-800">
            Click to upload <span className="text-slate-400 font-normal">or drag & drop</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Supported formats: PDF, JPG, PNG, WEBP (Max 10MB)
          </p>

          {/* Optional Camera Button */}
          {hasCamera && onOpenCamera && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCamera();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02]"
              >
                <Camera size={14} /> Open Live Camera
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
