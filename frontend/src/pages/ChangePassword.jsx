import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import AuthBackground from "../components/auth/AuthBackground";
import AuthHeader from "../components/auth/AuthHeader";
import FormInput from "../components/auth/FormInput";
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
        toast.success("Permanent password created successfully!");
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
        }, 1200);
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
    <div className="relative min-h-screen flex flex-col justify-between py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-slate-900 select-none">
      <AuthBackground />
      <Toaster position="top-right" />

      {/* ── Brand Header ── */}
      <AuthHeader currentAction="change-password" />

      {/* ── Main Container ── */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-950/10 text-center"
        >
          {/* Shield Badge */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-teal-400 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-sky-600/25">
            <ShieldCheck size={24} />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Create Permanent Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6 leading-relaxed">
            Your application has been approved. For pharmaceutical integrity and account protection,
            please replace your temporary credentials with a secure permanent password.
          </p>

          {success ? (
            <div className="py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Password Successfully Updated!
              </h3>
              <p className="text-xs text-slate-500">
                Redirecting to your authorized workspace...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <FormInput
                label="New Permanent Password"
                type="password"
                required
                icon={Lock}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                helperText="Must be minimum 6 characters with mixed case recommended"
              />

              <FormInput
                label="Confirm Permanent Password"
                type="password"
                required
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                error={
                  confirmPassword && newPassword !== confirmPassword
                    ? "Passwords do not match"
                    : undefined
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Secure Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Set Permanent Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full max-w-md mx-auto mt-6 text-center text-[11px] text-slate-400 font-medium">
        © 2026 MediChainAI — Autonomous Pharmaceutical Blockchain Traceability Network.
      </footer>
    </div>
  );
}
