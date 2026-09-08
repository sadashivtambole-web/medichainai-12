import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle2, ShieldCheck, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Background from "../components/layout/Background";
import { authService } from "../services/authService";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.changePassword(newPassword, confirmPassword);
      if (res.success) {
        setSuccess(true);
        toast.success("Password set successfully!");
        if (user) {
          setUser({ ...user, mustChangePassword: false });
        }
        setTimeout(() => {
          const role = (user?.role || "").toLowerCase();
          if (role === "manufacturer") navigate("/manufacturer");
          else if (role === "distributor") navigate("/distributor");
          else if (role === "pharmacy") navigate("/pharmacy");
          else if (role === "creator") navigate("/creator");
          else navigate("/customer");
        }, 1500);
      } else {
        toast.error(res.message || "Failed to update password.");
      }
    } catch (err) {
      toast.error(err.message || "Network error while updating password.");
    } finally {
      setLoading(false);
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
        padding: "32px 20px",
      }}
    >
      <Background />
      <Toaster position="top-right" />

      <div style={{ maxWidth: 460, width: "100%", position: "relative", zIndex: 1 }}>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8EAF6",
            borderRadius: 24,
            padding: "36px 32px",
            boxShadow: "0 12px 40px rgba(88, 85, 243, 0.08)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, #5855F3, #4743EB)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: "0 8px 24px rgba(88,85,243,0.25)",
              }}
            >
              <ShieldCheck size={28} color="white" />
            </div>

            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#18182E",
                marginBottom: 6,
                letterSpacing: "-0.02em",
              }}
            >
              Create Your New Password
            </h1>
            <p style={{ fontSize: 13, color: "#5F607A", lineHeight: 1.5 }}>
              Your account has been approved. For supply-chain security, please replace your temporary password with a secure permanent password.
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#ECFDF5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "#10B981",
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#18182E", marginBottom: 6 }}>
                Password Updated!
              </h3>
              <p style={{ fontSize: 13, color: "#5F607A" }}>
                Redirecting to your authorized dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: 16 }}>
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
                    New Permanent Password *
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
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
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
                    Confirm New Password *
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
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

                <div
                  style={{
                    background: "#F8F9FE",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex",
                    gap: 10,
                    fontSize: 12,
                    color: "#5F607A",
                    lineHeight: 1.4,
                  }}
                >
                  <AlertCircle size={16} color="#5855F3" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>Once updated, your temporary email password will be permanently deactivated.</div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: 15,
                    fontWeight: 800,
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Saving New Password...
                    </>
                  ) : (
                    <>
                      Update Password & Access Dashboard <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
