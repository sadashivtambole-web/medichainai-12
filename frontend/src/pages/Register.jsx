import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Building2,
  Server,
  Store,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  Building,
  KeyRound,
  Phone,
  Camera,
  Upload,
  RefreshCw,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  Sparkles,
  Info,
} from "lucide-react";
import AuthBackground from "../components/auth/AuthBackground";
import AuthHeader from "../components/auth/AuthHeader";
import RoleSelector, { AUTH_ROLES } from "../components/auth/RoleSelector";
import FormInput from "../components/auth/FormInput";
import FileUploadCard from "../components/auth/FileUploadCard";
import CameraCaptureModal from "../components/auth/CameraCaptureModal";
import OtpInput from "../components/auth/OtpInput";
import { authService } from "../services/authService";
import toast, { Toaster } from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("Manufacturer");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    companyName: "",
    companyCode: "",
    governmentIdType: "Government Identity Document (Aadhaar / Passport / License)",
  });

  // Identity Photo States
  const [identityPhotoFile, setIdentityPhotoFile] = useState(null);
  const [identityPhotoPreview, setIdentityPhotoPreview] = useState(null);
  const [identityPhotoBase64, setIdentityPhotoBase64] = useState(null);

  // Government ID States
  const [governmentIdFile, setGovernmentIdFile] = useState(null);

  // Camera Modal States
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // OTP Email Verification States with Session Persistence across refreshes
  const [pendingRegId, setPendingRegId] = useState(() => sessionStorage.getItem("pending_reg_id") || "");
  const [pendingEmail, setPendingEmail] = useState(() => sessionStorage.getItem("pending_reg_email") || "");
  const [otpStep, setOtpStep] = useState(() => !!sessionStorage.getItem("pending_reg_id"));
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const isProfessional = selectedRole !== "Customer";
  const selectedRoleConfig =
    AUTH_ROLES.find((r) => r.id === selectedRole) || AUTH_ROLES[0];

  const setField = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  // Trigger Send OTP
  const handleSendOtp = async () => {
    const cleanEmail = formData.email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your email address first.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsOtpSending(true);
    try {
      const res = await authService.sendOtp(cleanEmail, formData.fullName.trim());
      if (res.success) {
        toast.success(`6-digit code sent to ${cleanEmail}`);
        setOtpStep(true);
      } else {
        toast.error(res.message || "Failed to dispatch verification code.");
      }
    } catch (err) {
      toast.error(err.message || "Could not send OTP code.");
    } finally {
      setIsOtpSending(false);
    }
  };

  // Verify Registration OTP & Finalize Account Creation
  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    const activeEmail = (formData.email || pendingEmail || sessionStorage.getItem("pending_reg_email") || "").trim();
    const activeRegId = pendingRegId || sessionStorage.getItem("pending_reg_id") || "";

    setIsOtpVerifying(true);
    try {
      const res = await authService.verifyRegistrationOtp(activeEmail, otpCode, activeRegId);
      if (res.success) {
        sessionStorage.removeItem("pending_reg_id");
        sessionStorage.removeItem("pending_reg_email");
        toast.success("Email verified and application submitted for Creator review!");
        setIsEmailVerified(true);
        setOtpStep(false);
        setSubmittedSuccess(true);
      } else {
        toast.error(res.message || "Invalid or expired OTP code.");
      }
    } catch (err) {
      toast.error(err.message || "OTP verification failed.");
    } finally {
      setIsOtpVerifying(false);
    }
  };

  // Resend Registration OTP
  const handleResendRegistrationOtp = async () => {
    const activeEmail = (formData.email || pendingEmail || sessionStorage.getItem("pending_reg_email") || "").trim();
    const activeRegId = pendingRegId || sessionStorage.getItem("pending_reg_id") || "";

    setIsOtpSending(true);
    try {
      const res = await authService.resendOtp(activeEmail, "REGISTRATION", "", activeRegId);
      if (res.success) {
        if (res.data?.registrationId) {
          setPendingRegId(res.data.registrationId);
          sessionStorage.setItem("pending_reg_id", res.data.registrationId);
        }
        toast.success(`A fresh 6-digit code has been dispatched to ${activeEmail}`);
      } else {
        toast.error(res.message || "Could not resend OTP code.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to resend code.");
    } finally {
      setIsOtpSending(false);
    }
  };

  // Handle Photo File Upload
  const handlePhotoFileUpload = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be less than 10MB");
      return;
    }

    setIdentityPhotoFile(file);
    setIdentityPhotoBase64(null);
    const reader = new FileReader();
    reader.onload = () => setIdentityPhotoPreview(reader.result);
    reader.readAsDataURL(file);
    toast.success("Identity photo attached.");
  };

  // Handle Government ID Upload
  const handleGovernmentIdUpload = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document must be less than 10MB");
      return;
    }

    setGovernmentIdFile(file);
    toast.success("Government ID proof attached.");
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Basic Validation
    if (!formData.fullName.trim()) {
      toast.error("Full Name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email address is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // 2. Professional Specific Validations
    if (isProfessional) {
      if (!formData.phone.trim()) {
        toast.error("Phone Number is required for professional verification");
        return;
      }
      if (!formData.companyName.trim()) {
        toast.error("Organization / Company Name is required");
        return;
      }
      if (!formData.companyCode.trim()) {
        toast.error("Official Organization / License Code is required");
        return;
      }
      if (!identityPhotoFile && !identityPhotoBase64) {
        toast.error("Please provide an Identity Photo (Live Camera or Upload)");
        return;
      }
      if (!governmentIdFile) {
        toast.error("Please upload your Government ID Proof document");
        return;
      }
    }

    setLoading(true);
    try {
      const formPayload = new FormData();
      formPayload.append("fullName", formData.fullName.trim());
      formPayload.append("name", formData.fullName.trim());
      formPayload.append("email", formData.email.trim().toLowerCase());
      formPayload.append("password", formData.password);
      formPayload.append("confirmPassword", formData.confirmPassword);
      formPayload.append("role", selectedRole);
      formPayload.append("phone", formData.phone.trim());
      formPayload.append("company", formData.companyName.trim());
      formPayload.append("companyName", formData.companyName.trim());
      formPayload.append("companyCode", formData.companyCode.trim());
      formPayload.append("governmentIdType", formData.governmentIdType);

      if (identityPhotoFile) {
        formPayload.append("identityPhoto", identityPhotoFile);
      } else if (identityPhotoBase64) {
        formPayload.append("identityPhotoBase64", identityPhotoBase64);
      }

      if (governmentIdFile) {
        formPayload.append("governmentId", governmentIdFile);
      }

      const res = await authService.register(formPayload);

      if (res.success) {
        if (selectedRole === "Customer") {
          toast.success("Account created successfully! Redirecting...");
          setTimeout(() => navigate("/customer"), 800);
        } else if (res.data?.requiresOtp || res.requiresOtp) {
          const regId = res.data?.registrationId || "";
          const cleanEmail = formData.email.trim().toLowerCase();
          setPendingRegId(regId);
          setPendingEmail(cleanEmail);
          if (regId) sessionStorage.setItem("pending_reg_id", regId);
          sessionStorage.setItem("pending_reg_email", cleanEmail);
          setOtpCode("");
          setOtpStep(true);
          toast.success(`Verification code dispatched to ${res.data?.maskedEmail || cleanEmail}`);
        } else {
          setSubmittedSuccess(true);
          toast.success("Application submitted for Creator review!");
        }
      } else {
        toast.error(res.message || "Registration could not be completed.");
      }
    } catch (err) {
      toast.error(err.message || "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-slate-900 select-none">
      <AuthBackground />
      <Toaster position="top-right" />

      {/* ── Brand Header ── */}
      <AuthHeader currentAction="register" />

      {/* ── Main Container ── */}
      <main className="relative z-10 w-full max-w-4xl mx-auto my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-sky-950/10"
        >
          {/* Form Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 uppercase tracking-wider">
                Platform Onboarding
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Already registered?{" "}
                <Link
                  to="/login"
                  className="font-bold text-sky-600 hover:text-sky-800 underline underline-offset-2"
                >
                  Sign In Here
                </Link>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Register Organization Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your ecosystem role and submit your identity credentials for immutable verification.
            </p>
          </div>

          {/* ══ STEP 1: INTERACTIVE ROLE SELECTOR ══ */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
                1
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Select Your Participant Role
              </h3>
            </div>

            <RoleSelector selectedRole={selectedRole} onSelectRole={setSelectedRole} />
          </div>

          {/* ══ REGISTRATION FORM ══ */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ══ SECTION 1: ACCOUNT & PERSONAL CREDENTIALS ══ */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
                  2
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Account & Personal Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Full Legal Name"
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={formData.fullName}
                  onChange={setField("fullName")}
                  icon={User}
                />

                <FormInput
                  label="Work / Official Email"
                  type="email"
                  required
                  placeholder="e.g. contact@sunpharma.com"
                  value={formData.email}
                  onChange={setField("email")}
                  icon={Mail}
                  rightLabelAction={
                    isEmailVerified ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Verified
                      </span>
                    ) : undefined
                  }
                />
              </div>

              {/* OTP Input Drawer (Shown if user clicks Verify via OTP) */}
              <AnimatePresence>
                {otpStep && !isEmailVerified && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-white border border-sky-200 shadow-sm space-y-3"
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800">
                        Enter 6-Digit Email Verification Code
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Sent to <strong className="text-slate-700">{formData.email}</strong>
                      </p>
                    </div>

                    <OtpInput
                      value={otpCode}
                      onChange={setOtpCode}
                      onResend={handleSendOtp}
                      isResending={isOtpSending}
                    />

                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setOtpStep(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isOtpVerifying || otpCode.length < 6}
                        className="px-4 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                      >
                        {isOtpVerifying ? "Verifying..." : "Confirm OTP"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Create Password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={setField("password")}
                  icon={Lock}
                  helperText="Must be minimum 6 characters with mixed case recommended"
                />

                <FormInput
                  label="Confirm Password"
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={setField("confirmPassword")}
                  icon={Lock}
                  error={
                    formData.confirmPassword &&
                    formData.password !== formData.confirmPassword
                      ? "Passwords do not match"
                      : undefined
                  }
                />
              </div>

              {isProfessional && (
                <FormInput
                  label="Contact Phone Number"
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={setField("phone")}
                  icon={Phone}
                  helperText="Used for automated supply chain dispatch & critical tamper alerts"
                />
              )}
            </div>

            {/* ══ SECTION 2: ORGANIZATION & LICENSING (FOR PROFESSIONALS) ══ */}
            {isProfessional && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">
                    3
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Organization & Regulatory Licensing
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Organization / Company Name"
                    type="text"
                    required
                    placeholder="e.g. Sun Pharmaceutical Industries Ltd."
                    value={formData.companyName}
                    onChange={setField("companyName")}
                    icon={Building2}
                  />

                  <FormInput
                    label={selectedRoleConfig.codeLabel || "Official License Number"}
                    type="text"
                    required
                    placeholder={selectedRoleConfig.codePlaceholder || "e.g. LIC-2026-904"}
                    value={formData.companyCode}
                    onChange={setField("companyCode")}
                    icon={KeyRound}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Government Identification Proof Type *
                  </label>
                  <select
                    value={formData.governmentIdType}
                    onChange={setField("governmentIdType")}
                    className="w-full py-3 px-4 text-sm text-slate-900 bg-white/95 rounded-xl border border-slate-200/90 focus:border-sky-500 focus:ring-3 focus:ring-sky-100 outline-none font-medium shadow-2xs"
                  >
                    <option value="Government Identity Document (Aadhaar / Passport / License)">
                      National ID (Aadhaar / Passport / Driver License)
                    </option>
                    <option value="State Pharmacy Council Registration">
                      State Pharmacy Council Registration Certificate
                    </option>
                    <option value="Drug Manufacturing / Wholesale Distribution License">
                      Drug Manufacturing / Wholesale Distribution License
                    </option>
                    <option value="FDA / CDSCO Establishment Certificate">
                      FDA / CDSCO Regulatory Establishment Certificate
                    </option>
                  </select>
                </div>
              </div>
            )}

            {/* ══ SECTION 3: IDENTITY DOCUMENTS & VERIFICATION PROOF ══ */}
            {isProfessional && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                    4
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Identity Documents & Proof of Authority
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Identity Photo (Live Camera or Upload) */}
                  <FileUploadCard
                    title="Identity Photo of Authorized Representative"
                    subtitle="Live selfie or clear headshot JPG/PNG"
                    required
                    file={identityPhotoFile}
                    previewUrl={identityPhotoPreview || identityPhotoBase64}
                    hasCamera
                    onOpenCamera={() => setIsCameraOpen(true)}
                    onFileSelect={handlePhotoFileUpload}
                    onClear={() => {
                      setIdentityPhotoFile(null);
                      setIdentityPhotoPreview(null);
                      setIdentityPhotoBase64(null);
                    }}
                  />

                  {/* Government ID Document Upload */}
                  <FileUploadCard
                    title="Government / Licensing Proof Document"
                    subtitle="PDF or scanned high-res image (Max 10MB)"
                    required
                    file={governmentIdFile}
                    onFileSelect={handleGovernmentIdUpload}
                    onClear={() => setGovernmentIdFile(null)}
                  />
                </div>
              </div>
            )}

            {/* ══ SUBMIT BUTTON & TERMS ══ */}
            <div className="pt-2 space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 flex items-start gap-2.5 text-xs text-sky-800">
                <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  By submitting your application, you certify that all pharmaceutical licensing
                  credentials are authentic. Professional applications undergo mandatory cryptographic
                  audit by the system Super Admin.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-black text-sm sm:text-base shadow-xl shadow-sky-600/25 hover:shadow-sky-600/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Registering Account & Minting Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Submit {selectedRole} Registration</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto mt-6 text-center text-[11px] text-slate-400 font-medium">
        © 2026 MediChainAI — Autonomous Pharmaceutical Blockchain Traceability Network.
      </footer>

      {/* ── CAMERA MODAL ── */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={(base64Data) => {
          setIdentityPhotoBase64(base64Data);
          setIdentityPhotoPreview(base64Data);
          setIdentityPhotoFile(null);
          toast.success("Live identity photo captured!");
        }}
      />

      {/* ── REGISTRATION OTP VERIFICATION MODAL ── */}
      <AnimatePresence>
        {otpStep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <KeyRound size={28} />
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Verify Your Email Address
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                A 6-digit verification code was dispatched to{" "}
                <strong className="text-slate-800 font-mono font-bold">
                  {formData.email}
                </strong>
              </p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-800 uppercase tracking-wider border border-sky-200">
                {selectedRole} Registration
              </span>

              <div className="my-6">
                <OtpInput
                  length={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  onResend={handleResendRegistrationOtp}
                  isResending={isOtpSending}
                />
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isOtpVerifying || otpCode.length < 6}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  {isOtpVerifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying Security Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Complete Registration</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem("pending_reg_id");
                    sessionStorage.removeItem("pending_reg_email");
                    setPendingRegId("");
                    setOtpStep(false);
                  }}
                  className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  ← Edit registration details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── APPLICATION SUBMITTED CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {submittedSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <CheckCircle2 size={36} strokeWidth={2.2} />
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Application Submitted!
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Your application for{" "}
                <strong className="text-slate-800">{formData.companyName || selectedRole}</strong> has
                been queued for Super Admin review.
              </p>

              <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 font-medium">
                <p className="text-slate-500">
                  Registered Email: <span className="text-slate-900 font-bold">{formData.email}</span>
                </p>
                <p className="text-slate-500">
                  Role Requested: <span className="text-sky-700 font-bold">{selectedRole}</span>
                </p>
                <p className="text-slate-500">
                  Next Step:{" "}
                  <span className="text-emerald-700 font-bold">
                    Approval confirmation email will be sent
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-sky-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Proceed to Sign In
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
