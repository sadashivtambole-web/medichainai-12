import { useState } from "react";
import { ImageOff } from "lucide-react";

/* ── Derive backend origin dynamically from VITE_API_URL (defaults to http://localhost:5000 per spec) ── */
export function getBackendImageHost() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === "string") {
    if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
      try {
        return new URL(envUrl).origin;
      } catch {
        return envUrl.replace(/\/api\/?$/, "");
      }
    }
    // If relative like "/api", in browser use window.location.origin
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
  }
  // Default backend host per project specification when VITE_API_URL is unset
  return "http://localhost:5000";
}

/**
 * Resolves a stored medicineImage path (e.g. "/uploads/foo.png") to a full URL.
 * Preserves valid absolute URLs, data/blob URLs, and resolves relative paths cleanly.
 */
export function resolveMedicineImageUrl(medicineImage) {
  if (!medicineImage || typeof medicineImage !== "string") return null;
  const trimmed = medicineImage.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const host = getBackendImageHost();
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return host ? `${host}${path}` : path;
}

/**
 * MedicineImage — responsive medicine image with lazy loading, broken-image
 * fallback placeholder, and optional click-to-enlarge lightbox.
 *
 * Props:
 *   src            — raw medicineImage value from MongoDB (e.g. "/uploads/foo.png")
 *   alt            — accessible alt text
 *   style          — extra inline styles for the <img>
 *   className      — CSS class for the <img>
 *   enableLightbox — open full-size viewer on click (default: true)
 *   placeholderSize — height in px for the placeholder box (default: 140)
 */
export default function MedicineImage({
  src,
  alt = "Medicine image",
  style = {},
  className = "",
  enableLightbox = true,
  placeholderSize = 140,
}) {
  const resolved = resolveMedicineImageUrl(src);
  const [broken, setBroken] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!resolved || broken) {
    return (
      <div
        style={{
          width: "100%",
          height: placeholderSize,
          borderRadius: 10,
          background: "#F1F5F9",
          border: "1px dashed #CBD5E1",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "#94A3B8",
        }}
      >
        <ImageOff size={22} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>
          Manufacturer image not available
        </span>
      </div>
    );
  }

  return (
    <>
      <img
        src={resolved}
        alt={alt}
        loading="lazy"
        className={className}
        style={{
          width: "100%",
          objectFit: "cover",
          borderRadius: 10,
          display: "block",
          cursor: enableLightbox ? "zoom-in" : "default",
          transition: "transform 0.2s",
          ...style,
        }}
        onError={() => setBroken(true)}
        onClick={() => enableLightbox && setLightboxOpen(true)}
        onMouseEnter={(e) => {
          if (enableLightbox) e.currentTarget.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          if (enableLightbox) e.currentTarget.style.transform = "scale(1)";
        }}
      />

      {/* ── Lightbox overlay ── */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "zoom-out",
          }}
        >
          <img
            src={resolved}
            alt={alt}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              borderRadius: 16,
              objectFit: "contain",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              background: "rgba(255,255,255,0.15)",
              padding: "6px 14px",
              borderRadius: 100,
              userSelect: "none",
            }}
          >
            Click anywhere to close
          </div>
        </div>
      )}
    </>
  );
}
