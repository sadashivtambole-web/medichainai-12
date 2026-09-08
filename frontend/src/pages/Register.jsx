import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  Server,
  Store,
  User,
  Shield,
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
  Eye,
  X,
  AlertTriangle,
  Loader2,
  FileCheck,
} from "lucide-react";
import Background from "../components/layout/Background";
import { authService } from "../services/authService";
import toast, { Toaster } from "react-hot-toast";

const ROLES = [
  {
    id: "Manufacturer",
    title: "Manufacturer",
    description: "Drug origin, batch registration & digital certificate stamping",
    icon: Building2,
    color: "#5855F3",
    bg: "#EEF0FD",
    codeLabel: "Manufacturer Code / License",
    codePlaceholder: "e.g. MFR-SUN-772",
  },
  {
    id: "Distributor",
    title: "Distributor",
    description: "Transit custody confirmation & intermediate distribution trace",
    icon: Server,
    color: "#7C3AED",
    bg: "#F5F3FF",
    codeLabel: "Distributor License / Logistics Code",
    codePlaceholder: "e.g. DST-MH-102",
  },
  {
    id: "Pharmacy",
    title: "Pharmacy",
    description: "Dispensing receipt, shelf inventory & public POS verification",
    icon: Store,
    color: "#059669",
    bg: "#ECFDF5",
    codeLabel: "Pharmacy License / Store Code",
    codePlaceholder: "e.g. PH-APL-404",
  },
  {
    id: "Customer",
    title: "Customer / Public",
    description: "Public zero-trust QR scanning & immutable medicine verification",
    icon: User,
    color: "#D97706",
    bg: "#FFFBEB",
    codeLabel: "",
    codePlaceholder: "",
  },
];

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
  const [governmentIdPreview, setGovernmentIdPreview] = useState(null);

  // Camera Modal States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputPhotoRef = useRef(null);
  const fileInputGovIdRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const isProfessional = selectedRole !== "Customer";

  const setField = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  // Start Camera Stream
  const openCamera = async () => {
    setCameraError("");
    setCapturedPhoto(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera permission denied or camera not available. You can use the 'Upload Photo' option instead.");
    }
  };

  // Stop Camera Stream
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCapturedPhoto(null);
  };

  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraOpen, cameraStream]);

  // Capture Snapshot from Camera
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(dataUrl);
  };

  const useThisCapturedPhoto = () => {
    if (capturedPhoto) {
      setIdentityPhotoBase64(capturedPhoto);
      setIdentityPhotoPreview(capturedPhoto);
      setIdentityPhotoFile(null);
      toast.success("Live identity photo captured!");
      closeCamera();
    }
  };

  // Handle Photo File Upload
  const handlePhotoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be less than 10MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image.");
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
  const handleGovernmentIdUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document must be less than 10MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF document or JPG/PNG image.");
      return;
    }

    setGovernmentIdFile(file);
    setGovernmentIdPreview({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
      type: file.type,
    });
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
      toast.error("Password must be at least 6 characters");
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
          toast.success("Registration complete! Redirecting...");
          setTimeout(() => navigate("/customer"), 800);
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

  const selectedRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  return (
    <div className="page-bg" style={{ minHeight: "100vh", position: "relative" }}>
      <Background />
      <Toaster position="top-right" />

      {/* ── Top Header Navigation ── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E8EAF6",
          padding: "14px 32px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            onClick={() => navigate("/login")}
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
              }}
            >
              <Shield size={22} color="white" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#0F172A",
                }}
              >
                Fake Drug Detection
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5" }}>
                Cryptographic Supply Chain Platform
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#64748B" }}>Already have an account?</span>
            <Link
              to="/login"
              style={{
                color: "#4F46E5",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Sign In <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
          padding: "100px 36px 80px",
        }}
      >
        {/* Success Confirmation Card */}
        {submittedSuccess ? (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EAF6",
              borderRadius: 24,
              padding: "48px 36px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#ECFDF5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "#10B981",
              }}
            >
              <CheckCircle2 size={40} />
            </div>

            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#18182E",
                marginBottom: 12,
              }}
            >
              Application Submitted Successfully!
            </h1>

            <p style={{ fontSize: 14, color: "#5F607A", maxWidth: 540, margin: "0 auto 24px", lineHeight: 1.6 }}>
              Thank you, <strong>{formData.fullName}</strong>. Your <strong>{selectedRole}</strong> application for{" "}
              <strong>{formData.companyName}</strong> has been submitted for Creator identity verification.
            </p>

            <div
              style={{
                background: "#F8F9FE",
                border: "1px solid #E8EAF6",
                borderRadius: 16,
                padding: "20px 24px",
                textAlign: "left",
                maxWidth: 480,
                margin: "0 auto 32px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#8E8FA8", marginBottom: 12 }}>
                Application Summary
              </div>
              <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#18182E" }}>
                <div><strong>Registered Email:</strong> {formData.email}</div>
                <div><strong>Role:</strong> {selectedRole}</div>
                <div><strong>Company:</strong> {formData.companyName}</div>
                <div><strong>Status:</strong> <span style={{ color: "#D97706", fontWeight: 700 }}>PENDING CREATOR APPROVAL</span></div>
              </div>
            </div>

            <div
              style={{
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: 12,
                padding: "14px 20px",
                maxWidth: 480,
                margin: "0 auto 28px",
                fontSize: 13,
                color: "#065F46",
                lineHeight: 1.5,
              }}
            >
              <strong>Sign In Notice:</strong> Once approved by the Creator, you will log in using your <strong>registered email</strong> and the <strong>password you just created</strong>.
            </div>

            <button
              onClick={() => navigate("/login")}
              className="btn-primary"
              style={{ padding: "12px 32px", fontSize: 14, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Back to Login <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EAF6",
              borderRadius: 24,
              boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}
          >
            {/* Header Banner */}
            <div
              style={{
                padding: "32px 36px 24px",
                borderBottom: "1px solid #F1F3FC",
              }}
            >
              <h1
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "1.65rem",
                  fontWeight: 800,
                  color: "#18182E",
                  marginBottom: 6,
                }}
              >
                Create Your Account
              </h1>
              <p style={{ fontSize: 13, color: "#5F607A", margin: 0 }}>
                Register on DrugChain to participate in secure pharmaceutical supply-chain traceability
              </p>
            </div>

            <div style={{ padding: "28px 36px 36px" }}>
              {/* ── 1. Select Role ── */}
              <div style={{ marginBottom: 28 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#5F607A",
                    marginBottom: 10,
                  }}
                >
                  Select Your Role
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10,
                  }}
                >
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        style={{
                          background: isSelected ? role.bg : "#F8F9FE",
                          border: `1.5px solid ${isSelected ? role.color : "#E8EAF6"}`,
                          borderRadius: 14,
                          padding: "12px 10px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.2s ease",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: isSelected ? role.color : "#FFFFFF",
                            border: `1px solid ${isSelected ? role.color : "#E8EAF6"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={16} color={isSelected ? "white" : "#5F607A"} />
                        </div>
                        <span
                          style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 800,
                            color: isSelected ? role.color : "#18182E",
                          }}
                        >
                          {role.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gap: 20 }}>
                  {/* ── Section 1: Personal & Account Credentials ── */}
                  <div style={{ borderBottom: "1px solid #F1F3FC", paddingBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#18182E", marginBottom: 14 }}>
                      1. Account & Personal Details
                    </div>

                    <div style={{ display: "grid", gap: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 6 }}>
                          Full Name *
                        </label>
                        <div style={{ position: "relative" }}>
                          <UserCheck size={16} color="#8E8FA8" style={{ position: "absolute", left: 14, top: 14 }} />
                          <input
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={setField("fullName")}
                            placeholder="e.g. Dr. Ganesh Tambole"
                            style={{
                              width: "100%",
                              padding: "11px 14px 11px 42px",
                              borderRadius: 10,
                              border: "1px solid #E8EAF6",
                              fontSize: 14,
                              color: "#18182E",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: isProfessional ? "1fr 1fr" : "1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 6 }}>
                            Email Address *
                          </label>
                          <div style={{ position: "relative" }}>
                            <Mail size={16} color="#8E8FA8" style={{ position: "absolute", left: 14, top: 14 }} />
                            <input
                              type="email"
                              required
                              value={formData.email}
                              onChange={setField("email")}
                              placeholder="e.g. ganesh@sunpharma.com"
                              style={{
                                width: "100%",
                                padding: "11px 14px 11px 42px",
                                borderRadius: 10,
                                border: "1px solid #E8EAF6",
                                fontSize: 14,
                                color: "#18182E",
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          </div>
                        </div>

                        {isProfessional && (
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 6 }}>
                              Phone Number *
                            </label>
                            <div style={{ position: "relative" }}>
                              <Phone size={16} color="#8E8FA8" style={{ position: "absolute", left: 14, top: 14 }} />
                              <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={setField("phone")}
                                placeholder="+91 98220 12345"
                                style={{
                                  width: "100%",
                                  padding: "11px 14px 11px 42px",
                                  borderRadius: 10,
                                  border: "1px solid #E8EAF6",
                                  fontSize: 14,
                                  color: "#18182E",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 6 }}>
                            Password *
                          </label>
                          <div style={{ position: "relative" }}>
                            <Lock size={16} color="#8E8FA8" style={{ position: "absolute", left: 14, top: 14 }} />
                            <input
                              type="password"
                              required
                              value={formData.password}
                              onChange={setField("password")}
                              placeholder="Minimum 6 characters"
                              style={{
                                width: "100%",
                                padding: "11px 14px 11px 42px",
                                borderRadius: 10,
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
                          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 6 }}>
                            Confirm Password *
                          </label>
                          <div style={{ position: "relative" }}>
                            <Lock size={16} color="#8E8FA8" style={{ position: "absolute", left: 14, top: 14 }} />
                            <input
                              type="password"
                              required
                              value={formData.confirmPassword}
                              onChange={setField("confirmPassword")}
                              placeholder="Re-enter password"
                              style={{
                                width: "100%",
                                padding: "11px 14px 11px 42px",
                                borderRadius: 10,
                                border: "1px solid #E8EAF6",
                                fontSize: 14,
                                color: "#18182E",
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 2: Organization Information (Professional Roles Only) ── */}
                  {isProfessional && (
                    <div style={{ borderBottom: "1px solid #F1F3FC", paddingBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#18182E", marginBottom: 14 }}>
                        2. Organization & Licensing
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 6 }}>
                            Company / Organization Name *
                          </label>
                          <div style={{ position: "relative" }}>
                            <Building size={16} color="#8E8FA8" style={{ position: "absolute", left: 14, top: 14 }} />
                            <input
                              type="text"
                              required
                              value={formData.companyName}
                              onChange={setField("companyName")}
                              placeholder="e.g. Sun Pharma Laboratories"
                              style={{
                                width: "100%",
                                padding: "11px 14px 11px 42px",
                                borderRadius: 10,
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
                          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#18182E", marginBottom: 6 }}>
                            {selectedRoleConfig.codeLabel || "License Code"} *
                          </label>
                          <div style={{ position: "relative" }}>
                            <KeyRound size={16} color="#8E8FA8" style={{ position: "absolute", left: 14, top: 14 }} />
                            <input
                              type="text"
                              required
                              value={formData.companyCode}
                              onChange={setField("companyCode")}
                              placeholder={selectedRoleConfig.codePlaceholder}
                              style={{
                                width: "100%",
                                padding: "11px 14px 11px 42px",
                                borderRadius: 10,
                                border: "1px solid #E8EAF6",
                                fontSize: 14,
                                color: "#18182E",
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Section 3: Identity Verification (Professional Roles Only) ── */}
                  {isProfessional && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#18182E", marginBottom: 14 }}>
                        3. Identity Documents & Verification Proof
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        {/* 3.1 Live Camera / Photo Box */}
                        <div
                          style={{
                            border: "1.5px dashed #CBD5E1",
                            borderRadius: 14,
                            padding: "16px",
                            textAlign: "center",
                            background: "#F8F9FE",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                            Identity Photo *
                          </div>
                          <div style={{ fontSize: 11, color: "#8E8FA8", marginBottom: 12 }}>
                            Live photo preferred
                          </div>

                          {identityPhotoPreview ? (
                            <div>
                              <img
                                src={identityPhotoPreview}
                                alt="Identity Preview"
                                style={{
                                  width: 100,
                                  height: 100,
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  margin: "0 auto 10px",
                                  border: "2px solid #5855F3",
                                  boxShadow: "0 4px 12px rgba(88, 85, 243, 0.2)",
                                }}
                              />
                              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                <button
                                  type="button"
                                  onClick={openCamera}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: "1px solid #CBD5E1",
                                    background: "#FFFFFF",
                                    cursor: "pointer",
                                  }}
                                >
                                  Retake
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIdentityPhotoFile(null);
                                    setIdentityPhotoBase64(null);
                                    setIdentityPhotoPreview(null);
                                  }}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: "1px solid #FECACA",
                                    background: "#FEF2F2",
                                    color: "#DC2626",
                                    cursor: "pointer",
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <button
                                type="button"
                                onClick={openCamera}
                                style={{
                                  background: "#5855F3",
                                  color: "#FFFFFF",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "9px 12px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                }}
                              >
                                <Camera size={14} /> Open Camera
                              </button>

                              <button
                                type="button"
                                onClick={() => fileInputPhotoRef.current?.click()}
                                style={{
                                  background: "#FFFFFF",
                                  color: "#5F607A",
                                  border: "1px solid #CBD5E1",
                                  borderRadius: 8,
                                  padding: "8px 12px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                }}
                              >
                                <Upload size={14} /> Upload Photo
                              </button>
                            </div>
                          )}

                          <input
                            ref={fileInputPhotoRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: "none" }}
                            onChange={handlePhotoFileUpload}
                          />
                        </div>

                        {/* 3.2 Government ID Document Box */}
                        <div
                          style={{
                            border: "1.5px dashed #CBD5E1",
                            borderRadius: 14,
                            padding: "16px",
                            textAlign: "center",
                            background: "#F8F9FE",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                            Government ID Proof *
                          </div>
                          <div style={{ fontSize: 11, color: "#8E8FA8", marginBottom: 12 }}>
                            PDF or Image (License / Aadhaar)
                          </div>

                          {governmentIdPreview ? (
                            <div
                              style={{
                                background: "#FFFFFF",
                                border: "1px solid #E8EAF6",
                                borderRadius: 10,
                                padding: "12px",
                              }}
                            >
                              <FileCheck size={28} color="#059669" style={{ margin: "0 auto 6px" }} />
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#18182E", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {governmentIdPreview.name}
                              </div>
                              <div style={{ fontSize: 11, color: "#8E8FA8", marginBottom: 8 }}>
                                {governmentIdPreview.size}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setGovernmentIdFile(null);
                                  setGovernmentIdPreview(null);
                                }}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "3px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #FECACA",
                                  background: "#FEF2F2",
                                  color: "#DC2626",
                                  cursor: "pointer",
                                }}
                              >
                                Replace File
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputGovIdRef.current?.click()}
                              style={{
                                width: "100%",
                                height: 86,
                                background: "#FFFFFF",
                                color: "#5855F3",
                                border: "1px solid #CBD5E1",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              }}
                            >
                              <Upload size={18} />
                              <span>Select Document</span>
                            </button>
                          )}

                          <input
                            ref={fileInputGovIdRef}
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            style={{ display: "none" }}
                            onChange={handleGovernmentIdUpload}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Submit Action Button ── */}
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                      style={{
                        width: "100%",
                        padding: "13px",
                        fontSize: 14,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        borderRadius: 12,
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Submitting Application...
                        </>
                      ) : isProfessional ? (
                        <>
                          Submit Application for Creator Review <ArrowRight size={16} />
                        </>
                      ) : (
                        <>
                          Create Account & Sign In <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ── LIVE WEBRTC CAMERA MODAL ── */}
      {isCameraOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
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
              maxWidth: 520,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #E8EAF6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Camera size={18} color="#5855F3" />
                <span style={{ fontSize: 14, fontWeight: 800, color: "#18182E" }}>
                  Live Camera Identity Capture
                </span>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8FA8" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, textAlign: "center" }}>
              {cameraError ? (
                <div style={{ padding: 24, color: "#DC2626", fontSize: 13 }}>
                  <AlertTriangle size={32} style={{ margin: "0 auto 10px" }} />
                  {cameraError}
                </div>
              ) : capturedPhoto ? (
                <div>
                  <img
                    src={capturedPhoto}
                    alt="Captured Identity"
                    style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 12, marginBottom: 16 }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setCapturedPhoto(null)}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={useThisCapturedPhoto}
                      className="btn-primary"
                      style={{ flex: 1, padding: "10px", borderRadius: 8, fontWeight: 800 }}
                    >
                      Use This Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 12, background: "#000000", marginBottom: 16 }}
                  />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="btn-primary"
                    style={{ width: "100%", padding: "11px", fontWeight: 800, fontSize: 13 }}
                  >
                    📸 Capture Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
