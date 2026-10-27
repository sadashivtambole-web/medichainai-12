import { useState, useRef, useEffect } from "react";
import { Camera, X, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * CameraCaptureModal
 * Webcam live identity photo capture modal
 * Features:
 * - High-tech reticle guides
 * - Live snapshot to base64 preview
 * - Retake or confirm selection
 * - Proper device stream teardown
 */
export default function CameraCaptureModal({ isOpen, onClose, onPhotoCaptured }) {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let localStream = null;
    const startCamera = async () => {
      setCameraError("");
      setCapturedImage(null);
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError(
          "Camera access was denied or is not supported on this browser. You can upload a photo file instead."
        );
      }
    };

    startCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      onPhotoCaptured(capturedImage);
      handleClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Camera size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Live Identity Photo</h3>
              <p className="text-[11px] text-slate-400">Position your face inside the frame</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-slate-950 aspect-4/3 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-rose-300 space-y-2">
              <AlertCircle size={32} className="mx-auto text-rose-400" />
              <p className="text-xs font-bold">{cameraError}</p>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured Snapshot"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* High-tech Face Alignment Reticle */}
              <div className="absolute inset-8 border border-sky-400/40 rounded-3xl pointer-events-none flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-teal-400/60 rounded-full border-dashed animate-pulse" />
                <span className="absolute bottom-3 text-[10px] font-mono font-bold text-sky-300 bg-black/50 px-2 py-0.5 rounded-full">
                  ALIGN FACE
                </span>
              </div>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>

          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw size={13} /> Retake
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all"
              >
                <CheckCircle2 size={13} /> Use This Photo
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!!cameraError}
              onClick={handleCapture}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 disabled:opacity-40 transition-all"
            >
              <Camera size={14} /> Capture Snapshot
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
