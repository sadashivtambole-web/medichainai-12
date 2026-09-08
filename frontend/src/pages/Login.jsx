import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Camera,
  Upload,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";
import Background from "../components/layout/Background";
import { useApp } from "../context/AppContext";
import { authService } from "../services/authService";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const { user, token, login } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Rejection & Resubmission States
  const [rejectionData, setRejectionData] = useState(null);
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitForm, setResubmitForm] = useState({
    fullName: "",
    phone: "",
    companyName: "",
    companyCode: "",
  });
  const [resubmitPhotoFile, setResubmitPhotoFile] = useState(null);
  const [resubmitPhotoPreview, setResubmitPhotoPreview] = useState(null);
  const [resubmitGovIdFile, setResubmitGovIdFile] = useState(null);

  const resubmitPhotoRef = useRef(null);
  const resubmitGovIdRef = useRef(null);

  // If already authenticated and password is set, route to dashboard
  useEffect(() => {
    if (user && token) {
      if (user.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }
      const userRole = (user.role || "").toLowerCase().trim();
      const roleDashboardMap = {
        creator: "/creator",
        manufacturer: "/manufacturer",
        distributor: "/distributor",
        pharmacy: "/pharmacy",
        customer: "/customer",
      };
      const targetPath = roleDashboardMap[userRole] || "/home";
      navigate(targetPath, { replace: true });
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRejectionData(null);

    if (!email.trim() || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const loginResult = await login(email.trim(), password);

      if (loginResult.mustChangePassword) {
        toast("Please create your permanent password.", { icon: "🔑" });
        navigate("/change-password", { replace: true });
        return;
      }

      toast.success(`Welcome back, ${loginResult.user.name}!`);

      const userRole = (loginResult.user.role || "").toLowerCase().trim();
      const roleDashboardMap = {
        creator: "/creator",
        manufacturer: "/manufacturer",
        distributor: "/distributor",
        pharmacy: "/pharmacy",
        customer: "/customer",
      };

      const targetPath = roleDashboardMap[userRole] || "/";
      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 500);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("not been approved")) {
        setRejectionData({
          email: email.trim(),
          reason: err.message,
        });
      }
      toast.error(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error("Password is required to resubmit application.");
      return;
    }

    setResubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email.trim());
      formData.append("password", password);
      if (resubmitForm.fullName) formData.append("fullName", resubmitForm.fullName);
      if (resubmitForm.phone) formData.append("phone", resubmitForm.phone);
      if (resubmitForm.companyName) formData.append("companyName", resubmitForm.companyName);
      if (resubmitForm.companyCode) formData.append("companyCode", resubmitForm.companyCode);
      if (resubmitPhotoFile) formData.append("identityPhoto", resubmitPhotoFile);
      if (resubmitGovIdFile) formData.append("governmentId", resubmitGovIdFile);

      const res = await authService.resubmit(formData);
      if (res.success) {
        toast.success("Application resubmitted successfully for Creator approval!");
        setIsResubmitOpen(false);
        setRejectionData(null);
      } else {
        toast.error(res.message || "Resubmission failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to resubmit application.");
    } finally {
      setResubmitLoading(false);
    }
  };

  return (
    <div
      className="page-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <Background />
      <Toaster position="top-right" />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1120,
          width: "100%",
        }}
      >
        {/* Back Link */}
        <button
          onClick={() => navigate("/home")}
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
            marginBottom: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <ArrowLeft size={16} /> Back to Public Portal
        </button>

        {/* 2-Column Split Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 32, alignItems: "stretch" }}>
          {/* Left Brand Showcase */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(6, 182, 212, 0.06) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: 24,
              padding: "40px 36px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                  boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
                }}
              >
                <Shield size={28} color="white" />
              </div>

              <h2
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "1.9rem",
                  fontWeight: 800,
                  color: "#0F172A",
                  marginBottom: 12,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                Secure Access to{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  DrugChain
                </span>
              </h2>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, marginBottom: 28 }}>
                Connect to the cryptographic pharmaceutical verification node. Authorize transactions, certify tablet batches, and monitor real-time distribution handshakes.
              </p>

              {/* Feature bullets */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { title: "Proof-of-Authority Consensus", desc: "Tamper-proof validator node logging" },
                  { title: "AI Vision & OCR", desc: "Automated tablet imprint and foil verification" },
                  { title: "Strict Multi-Role Security", desc: "Role-separated cryptographic authority" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(16,185,129,0.15)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      ✓
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{item.title}</span>
                      <span style={{ fontSize: 12, color: "#64748B", marginLeft: 6 }}>— {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ paddingTop: 28, marginTop: 28, borderTop: "1px solid rgba(99,102,241,0.15)", fontSize: 12, color: "#64748B" }}>
              🔒 256-bit encrypted authentication session · ISO-aligned traceability
            </div>
          </div>

          {/* Right Card: Login Form */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.94)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(226, 232, 240, 0.9)",
              borderRadius: 24,
              padding: "36px 40px",
              boxShadow: "0 10px 40px rgba(99, 102, 241, 0.06)",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h1
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color: "#0F172A",
                  marginBottom: 6,
                  letterSpacing: "-0.02em",
                }}
              >
                Sign In
              </h1>
              <p style={{ fontSize: 14, color: "#475569" }}>
                Enter your authorized credentials to access your portal
              </p>
            </div>

          {/* Rejection Banner */}
          {rejectionData && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FEE2E2",
                borderRadius: 14,
                padding: "16px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#991B1B" }}>
                    Application Requires Correction
                  </div>
                  <div style={{ fontSize: 12, color: "#7F1D1D", marginTop: 4, lineHeight: 1.4 }}>
                    {rejectionData.reason}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsResubmitOpen(true)}
                    style={{
                      marginTop: 10,
                      background: "#EF4444",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <RefreshCw size={13} /> Update & Resubmit Application
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: 18 }}>
              {/* Email */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#18182E",
                    marginBottom: 6,
                  }}
                >
                  Work / Registered Email *
                </label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={16}
                    color="#8E8FA8"
                    style={{ position: "absolute", left: 14, top: 14 }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@pharma.com"
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 42px",
                      borderRadius: 12,
                      border: "1px solid #E8EAF6",
                      fontSize: 14,
                      color: "#18182E",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#18182E",
                    marginBottom: 6,
                  }}
                >
                  Password (or Temporary Password) *
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={16}
                    color="#8E8FA8"
                    style={{ position: "absolute", left: 14, top: 14 }}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 42px",
                      borderRadius: 12,
                      border: "1px solid #E8EAF6",
                      fontSize: 14,
                      color: "#18182E",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: 14,
                  fontSize: 15,
                  fontWeight: 800,
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid #F1F3FC",
              textAlign: "center",
              fontSize: 13,
              color: "#5F607A",
            }}
          >
            Don't have an authorized account?{" "}
            <Link
              to="/register"
              style={{
                color: "#4F46E5",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Register Here
            </Link>
          </div>
        </div>
        </div>
      </div>

      {/* ── RESUBMISSION MODAL ── */}
      {isResubmitOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              maxWidth: 540,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 16, color: "#18182E" }}>
                <RefreshCw size={18} color="#5855F3" /> Resubmit Application
              </div>
              <button
                type="button"
                onClick={() => setIsResubmitOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8FA8" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#5F607A", marginBottom: 18 }}>
              Update your identity photo, government ID proof, or company details to resubmit for Creator review.
            </p>

            <form onSubmit={handleResubmit}>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 4 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={resubmitForm.fullName}
                    onChange={(e) => setResubmitForm({ ...resubmitForm, fullName: e.target.value })}
                    placeholder="Leave blank to keep existing"
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #E8EAF6", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 4 }}>
                    Company / Entity Name
                  </label>
                  <input
                    type="text"
                    value={resubmitForm.companyName}
                    onChange={(e) => setResubmitForm({ ...resubmitForm, companyName: e.target.value })}
                    placeholder="Leave blank to keep existing"
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #E8EAF6", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 4 }}>
                    New Identity Photo (Optional Update)
                  </label>
                  <input
                    ref={resubmitPhotoRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setResubmitPhotoFile(file);
                        const reader = new FileReader();
                        reader.onload = () => setResubmitPhotoPreview(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 4 }}>
                    New Government ID Proof (Optional Update)
                  </label>
                  <input
                    ref={resubmitGovIdRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setResubmitGovIdFile(file);
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setIsResubmitOpen(false)}
                    style={{ flex: 1, padding: "10px", background: "#F1F5F9", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resubmitLoading}
                    className="btn-primary"
                    style={{ flex: 1, padding: "10px", fontWeight: 800, fontSize: 13 }}
                  >
                    {resubmitLoading ? "Submitting..." : "Submit to Creator"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
