import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  X,
  FileText,
  User,
  Phone,
  Building2,
  KeyRound,
  Sparkles,
  Layers,
  Upload,
} from "lucide-react";
import AuthBackground from "../components/auth/AuthBackground";
import AuthHeader from "../components/auth/AuthHeader";
import FormInput from "../components/auth/FormInput";
import FileUploadCard from "../components/auth/FileUploadCard";
import CameraCaptureModal from "../components/auth/CameraCaptureModal";
import OtpInput from "../components/auth/OtpInput";
import { useApp } from "../context/AppContext";
import { authService } from "../services/authService";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const { user, token, login, verifyLoginOtp } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Two-Step Login OTP Verification States
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [loginSessionToken, setLoginSessionToken] = useState("");
  const [otpRole, setOtpRole] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  // Rejection & Resubmission States (Preserved from existing flow)
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
  const [resubmitPhotoBase64, setResubmitPhotoBase64] = useState(null);
  const [resubmitGovIdFile, setResubmitGovIdFile] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

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
      const targetPath = roleDashboardMap[userRole] || "/";
      navigate(targetPath, { replace: true });
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRejectionData(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const loginResult = await login(cleanEmail, password);

      // Two-step Email OTP requirement for Manufacturer, Distributor, Pharmacy
      if (loginResult.requiresOtp) {
        setOtpEmail(loginResult.email || cleanEmail);
        setMaskedEmail(loginResult.maskedEmail || cleanEmail);
        setLoginSessionToken(loginResult.loginSessionToken || "");
        setOtpRole(loginResult.role || "");
        setOtpCode("");
        setOtpStep(true);
        toast.success(`Verification code sent to ${loginResult.maskedEmail || cleanEmail}`);
        return;
      }

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
      }, 400);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("not been approved")) {
        setRejectionData({
          email: cleanEmail,
          reason: err.message,
        });
      }
      toast.error(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Login OTP
  const handleVerifyLoginOtp = async (e) => {
    e?.preventDefault();
    if (otpCode.length < 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const result = await verifyLoginOtp(otpEmail, otpCode, loginSessionToken);

      if (result.mustChangePassword) {
        toast("Please create your permanent password.", { icon: "🔑" });
        navigate("/change-password", { replace: true });
        return;
      }

      toast.success(`Welcome back, ${result.user.name}!`);

      const userRole = (result.user.role || "").toLowerCase().trim();
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
      }, 400);
    } catch (err) {
      toast.error(err.message || "Invalid or expired OTP code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend Login OTP
  const handleResendLoginOtp = async () => {
    setIsResendingOtp(true);
    try {
      const res = await authService.resendOtp(otpEmail, "LOGIN", loginSessionToken);
      if (res.success) {
        if (res.data?.loginSessionToken) {
          setLoginSessionToken(res.data.loginSessionToken);
        }
        toast.success(`A fresh 6-digit code has been dispatched to ${maskedEmail || otpEmail}`);
      } else {
        toast.error(res.message || "Could not resend OTP code.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to resend code.");
    } finally {
      setIsResendingOtp(false);
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

      if (resubmitPhotoFile) {
        formData.append("identityPhoto", resubmitPhotoFile);
      } else if (resubmitPhotoBase64) {
        formData.append("identityPhotoBase64", resubmitPhotoBase64);
      }

      if (resubmitGovIdFile) {
        formData.append("governmentId", resubmitGovIdFile);
      }

      const res = await authService.resubmit(formData);
      if (res.success) {
        toast.success("Application updated and resubmitted for Creator approval!");
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
    <div className="relative min-h-screen flex flex-col justify-between py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-slate-900 select-none">
      <AuthBackground />
      <Toaster position="top-right" />

      {/* ── Brand Header ── */}
      <AuthHeader currentAction="login" />

      {/* ── Main Split Container ── */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Visual Brand Showcase */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-5 bg-gradient-to-br from-white/80 via-sky-50/70 to-teal-50/50 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-sky-950/5"
          >
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-800 text-[11px] font-extrabold uppercase tracking-wider mb-6">
                <Sparkles size={13} className="text-sky-600" />
                <span>Zero-Trust Security Node</span>
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                Secure Access to{" "}
                <span className="bg-gradient-to-r from-sky-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  MediChainAI
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-normal">
                Connect to the cryptographic pharmaceutical verification node. Authorize
                transactions, certify tablet batches, and monitor real-time distribution custody.
              </p>

              {/* Security Pillars Checklist */}
              <div className="space-y-3 pt-2">
                {[
                  {
                    title: "Proof-of-Authority Consensus",
                    desc: "Sub-second immutable validator node ledger logging",
                  },
                  {
                    title: "Gemini Vision AI Inspection",
                    desc: "Automated tablet imprint, contour & packaging verification",
                  },
                  {
                    title: "Role-Separated Authority",
                    desc: "Admin-verified onboarding for all professional participants",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Status Tag */}
            <div className="pt-6 mt-6 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Lock size={12} className="text-teal-600" /> 256-bit Encrypted Session
              </span>
              <span className="font-mono text-slate-400">ISO-Aligned</span>
            </div>
          </motion.div>

          {/* Right Column: Sign In Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="lg:col-span-7 bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-sky-950/10 flex flex-col justify-between"
          >
            <div>
              {otpStep ? (
                /* ── Two-Step OTP Verification View ── */
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <KeyRound size={26} className="text-sky-600" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Two-Step Verification
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                      A 6-digit security code was dispatched to{" "}
                      <strong className="text-slate-800 font-mono font-bold">
                        {maskedEmail || otpEmail}
                      </strong>
                    </p>
                    {otpRole && (
                      <span className="inline-block mt-2.5 px-3 py-1 rounded-full text-[11px] font-black bg-sky-100 text-sky-800 uppercase tracking-wider border border-sky-200">
                        🛡️ {otpRole} Secure Access
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleVerifyLoginOtp} className="space-y-6">
                    <div className="py-2">
                      <OtpInput
                        length={6}
                        value={otpCode}
                        onChange={setOtpCode}
                        onResend={handleResendLoginOtp}
                        isResending={isResendingOtp}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingOtp || otpCode.length < 6}
                      className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-lg shadow-sky-600/25 hover:shadow-sky-600/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Verifying Security Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Access Dashboard</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep(false);
                          setOtpCode("");
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5"
                      >
                        ← Back to Sign In with Password
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                /* ── Standard Email & Password Form ── */
                <>
                  <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Sign In
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Enter your registered credentials to access your authorized workspace.
                    </p>
                  </div>

                  {/* Rejection Banner & Resubmit Trigger */}
                  {rejectionData && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-rose-800">Application Requires Correction</p>
                          <p className="text-rose-700 mt-1 leading-relaxed font-normal">
                            {rejectionData.reason}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsResubmitOpen(true)}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            <RefreshCw size={12} /> Update & Resubmit Application
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <FormInput
                      label="Registered Email Address"
                      type="email"
                      name="email"
                      required
                      icon={Mail}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yourname@pharmaceutical.com"
                      autoComplete="email"
                    />

                    {/* Password Input */}
                    <FormInput
                      label="Password or Temporary Access Key"
                      type="password"
                      name="password"
                      required
                      icon={Lock}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      rightLabelAction={
                        <Link
                          to="/forgot-password"
                          className="text-sky-600 hover:text-sky-800 font-bold transition-colors"
                        >
                          Forgot password?
                        </Link>
                      }
                    />

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-600">
                          Remember this browser session
                        </span>
                      </label>
                    </div>

                    {/* Submit Action Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-lg shadow-sky-600/25 hover:shadow-sky-600/35 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Authenticating Credentials...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Registration Footer */}
            <div className="mt-8 pt-5 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
              Don't have an authorized account?{" "}
              <Link
                to="/register"
                className="text-sky-600 hover:text-sky-800 font-extrabold underline underline-offset-2 ml-1"
              >
                Register Organization
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto mt-6 text-center text-[11px] text-slate-400 font-medium">
        © 2026 MediChainAI — Autonomous Pharmaceutical Blockchain Traceability Network.
      </footer>

      {/* ── APPLICATION RESUBMISSION MODAL ── */}
      <AnimatePresence>
        {isResubmitOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Resubmit Organization Application
                  </h3>
                  <p className="text-xs text-slate-500">
                    Correct required documentation for Creator approval review
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResubmitOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleResubmit} className="space-y-4">
                <FormInput
                  label="Registered Email"
                  type="email"
                  disabled
                  value={email}
                  icon={Mail}
                />

                <FormInput
                  label="Account Password"
                  type="password"
                  required
                  placeholder="Enter your password to authorize updates"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                />

                <FormInput
                  label="Full Name"
                  type="text"
                  placeholder="Updated legal representative name"
                  value={resubmitForm.fullName}
                  onChange={(e) =>
                    setResubmitForm((p) => ({ ...p, fullName: e.target.value }))
                  }
                  icon={User}
                />

                <FormInput
                  label="Contact Phone Number"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={resubmitForm.phone}
                  onChange={(e) =>
                    setResubmitForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  icon={Phone}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Company Name"
                    type="text"
                    placeholder="e.g. Apex Health Ltd."
                    value={resubmitForm.companyName}
                    onChange={(e) =>
                      setResubmitForm((p) => ({ ...p, companyName: e.target.value }))
                    }
                    icon={Building2}
                  />

                  <FormInput
                    label="License / Code"
                    type="text"
                    placeholder="e.g. MFR-SUN-772"
                    value={resubmitForm.companyCode}
                    onChange={(e) =>
                      setResubmitForm((p) => ({ ...p, companyCode: e.target.value }))
                    }
                    icon={KeyRound}
                  />
                </div>

                {/* Identity Photo Update */}
                <FileUploadCard
                  title="Updated Identity Photo (Optional)"
                  subtitle="Capture new selfie or upload JPG/PNG"
                  file={resubmitPhotoFile}
                  previewUrl={resubmitPhotoPreview || resubmitPhotoBase64}
                  hasCamera
                  onOpenCamera={() => setIsCameraOpen(true)}
                  onFileSelect={(file) => {
                    setResubmitPhotoFile(file);
                    setResubmitPhotoBase64(null);
                    const reader = new FileReader();
                    reader.onload = () => setResubmitPhotoPreview(reader.result);
                    reader.readAsDataURL(file);
                  }}
                  onClear={() => {
                    setResubmitPhotoFile(null);
                    setResubmitPhotoPreview(null);
                    setResubmitPhotoBase64(null);
                  }}
                />

                {/* Government ID Document Update */}
                <FileUploadCard
                  title="Updated Government ID Document (Optional)"
                  subtitle="PDF, JPG, or PNG up to 10MB"
                  file={resubmitGovIdFile}
                  onFileSelect={(file) => setResubmitGovIdFile(file)}
                  onClear={() => setResubmitGovIdFile(null)}
                />

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsResubmitOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resubmitLoading}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-sky-600/20 disabled:opacity-50"
                  >
                    {resubmitLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Updating Application...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        <span>Resubmit Application</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Camera Capture Modal ── */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={(base64Data) => {
          setResubmitPhotoBase64(base64Data);
          setResubmitPhotoPreview(base64Data);
          setResubmitPhotoFile(null);
          toast.success("Live photo captured successfully!");
        }}
      />
    </div>
  );
}
