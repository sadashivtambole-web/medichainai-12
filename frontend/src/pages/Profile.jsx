import { useNavigate } from "react-router-dom";
import {
  User,
  Building,
  Mail,
  KeyRound,
  Shield,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Lock
} from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";

export default function Profile() {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    setTimeout(() => {
      navigate("/login");
    }, 400);
  };

  const getDashboardPath = () => {
    const role = (user?.role || "").toLowerCase();
    if (role === "creator") return "/creator";
    if (role === "manufacturer") return "/manufacturer";
    if (role === "distributor") return "/distributor";
    if (role === "pharmacy") return "/pharmacy";
    if (role === "customer") return "/customer";
    return "/";
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="page-bg" style={{ minHeight: "100vh" }}>
      <Background />
      <Header />
      <Toaster position="top-right" />

      <main
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "108px 36px 80px",
        }}
      >
        {/* Back */}
        <button
          onClick={() => navigate(getDashboardPath())}
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
            marginBottom: 28,
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Profile Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(226, 232, 240, 0.9)",
            borderRadius: 24,
            padding: "36px 40px",
            boxShadow: "0 10px 40px rgba(99, 102, 241, 0.05)",
          }}
        >
          {/* Top User Hero */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              paddingBottom: 28,
              borderBottom: "1px solid #F1F3FC",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "linear-gradient(135deg,#0284C7,#0369A1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                fontWeight: 800,
                boxShadow: "0 8px 24px rgba(2,132,199,0.25)",
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>

            <div>
              <h1
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "#0F172A",
                  marginBottom: 4,
                }}
              >
                {user.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "3px 12px",
                    borderRadius: 100,
                    background: "#F0F9FF",
                    color: "#0284C7",
                    border: "1px solid rgba(2,132,199,0.25)",
                  }}
                >
                  {user.role}
                </span>
                <span style={{ fontSize: 13, color: "#64748B" }}>{user.email}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginBottom: 2 }}>
                  System Role (Read-Only)
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0284C7" }}>
                  {user.role}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#059669",
                  background: "#ECFDF5",
                  padding: "4px 10px",
                  borderRadius: 100,
                }}
              >
                <Lock size={12} /> Immutable
              </div>
            </div>

            {user.company && (
              <div
                style={{
                  padding: "16px 20px",
                  background: "#F8F9FE",
                  border: "1px solid #E8EAF6",
                  borderRadius: 14,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#8E8FA8", marginBottom: 2 }}>
                  Company / Organization
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#18182E" }}>
                  {user.company}
                </div>
              </div>
            )}

            {user.companyCode && (
              <div
                style={{
                  padding: "16px 20px",
                  background: "#F8F9FE",
                  border: "1px solid #E8EAF6",
                  borderRadius: 14,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#8E8FA8", marginBottom: 2 }}>
                  Authorized Registration Code
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#18182E", fontFamily: "monospace" }}>
                  {user.companyCode}
                </div>
              </div>
            )}

            <div
              style={{
                padding: "16px 20px",
                background: "#F8F9FE",
                border: "1px solid #E8EAF6",
                borderRadius: 14,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#8E8FA8", marginBottom: 2 }}>
                Registered Email Address
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#18182E" }}>
                {user.email}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#DC2626",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FEE2E2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FEF2F2")}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
