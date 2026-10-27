import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import AuthBackground from "../components/auth/AuthBackground";
import AuthHeader from "../components/auth/AuthHeader";
import FormInput from "../components/auth/FormInput";
import OtpInput from "../components/auth/OtpInput";
import { authService } from "../services/authService";
import toast, { Toaster } from "react-hot-toast";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(cleanEmail);
      if (res.success) {
        toast.success(`6-digit reset code dispatched to ${cleanEmail}`);
        setStep(2);
      } else {
        toast.error(res.message || "Failed to dispatch reset code.");
      }
    } catch (err) {
      toast.error(err.message || "No account found with this email.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Validate OTP entered
  const handleVerifyOtpStep = (e) => {
    e?.preventDefault();
    if (otp.length < 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }
    setStep(3);
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword(email.trim(), otp.trim(), newPassword, confirmPassword);
      if (res.success) {
        toast.success("Password updated successfully!");
        setStep(4);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        toast.error(res.message || "Password reset failed.");
      }
    } catch (err) {
      toast.error(err.message || "Password reset failed. Check OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-slate-900 select-none">
      <AuthBackground />
      <Toaster position="top-right" />

      {/* ── Brand Header ── */}
      <AuthHeader currentAction="forgot-password" />

      {/* ── Main Container ── */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-950/10 text-center"
        >
          {/* Top Shield Emblem */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-teal-400 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-sky-600/25">
            <KeyRound size={22} />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {step === 1 && "Reset Account Password"}
            {step === 2 && "Enter Verification Code"}
            {step === 3 && "Create New Password"}
            {step === 4 && "Password Reset Complete!"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-6">
            {step === 1 && "Enter your registered email to receive a secure 6-digit cryptographic reset code."}
            {step === 2 && `We've sent a 6-digit numeric verification code to ${email}`}
            {step === 3 && "Choose a strong permanent password for your pharmaceutical portal account."}
            {step === 4 && "Your credentials have been securely updated. Redirecting to sign in..."}
          </p>

          {/* ══ STEP 1: ENTER EMAIL ══ */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4 text-left">
              <FormInput
                label="Registered Work Email"
                type="email"
                required
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. yourname@pharmaceutical.com"
                autoComplete="email"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Dispatching Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ══ STEP 2: ENTER OTP ══ */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtpStep} className="space-y-6">
              <OtpInput
                value={otp}
                onChange={setOtp}
                onResend={handleSendOtp}
                isResending={resending}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={otp.length < 6}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 disabled:opacity-50"
                >
                  Verify Code
                </button>
              </div>
            </form>
          )}

          {/* ══ STEP 3: NEW PASSWORD ══ */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4 text-left">
              <FormInput
                label="New Password"
                type="password"
                required
                icon={Lock}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                helperText="Must be minimum 6 characters with mixed case recommended"
              />

              <FormInput
                label="Confirm New Password"
                type="password"
                required
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                error={
                  confirmPassword && newPassword !== confirmPassword
                    ? "Passwords do not match"
                    : undefined
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm New Password</span>
                    <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ══ STEP 4: SUCCESS ══ */}
          {step === 4 && (
            <div className="py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <p className="text-xs text-slate-500">
                You can now log in using your updated permanent password.
              </p>
            </div>
          )}

          {/* Back to Sign In Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-sky-600 transition-colors"
            >
              <ArrowLeft size={13} /> Return to Sign In
            </Link>
          </div>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full max-w-md mx-auto mt-6 text-center text-[11px] text-slate-400 font-medium">
        © 2026 MediChainAI — Autonomous Pharmaceutical Blockchain Traceability Network.
      </footer>
    </div>
  );
}
