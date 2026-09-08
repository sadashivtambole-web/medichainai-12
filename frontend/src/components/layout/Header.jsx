import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  Building2,
  Server,
  Store,
  User,
  Shield,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus,
  Globe,
  Info
} from "lucide-react";

export default function Header() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login");
  };

  const userRole = (user?.role || "").toLowerCase().trim();

  // Role-specific navigation items based on requirement #11
  const getNavLinks = () => {
    if (!user) {
      return [
        { label: "Home", path: "/" },
        { label: "About", path: "/about" },
        { label: "Verify Medicine", path: "/customer" },
      ];
    }

    switch (userRole) {
      case "creator":
        return [
          { label: "Creator Console", path: "/creator" },
          { label: "Pending Approvals", path: "/creator/approvals" },
          { label: "Users", path: "/creator/users" },
          { label: "Medicines", path: "/creator/medicines" },
          { label: "Transfers", path: "/creator/transfers" },
          { label: "Blockchain", path: "/creator/blockchain" },
          { label: "Profile", path: "/profile" },
        ];
      case "manufacturer":
        return [
          { label: "Home", path: "/" },
          { label: "Manufacturer Dashboard", path: "/manufacturer" },
          { label: "Verify Medicine", path: "/customer" },
          { label: "Profile", path: "/profile" },
        ];
      case "distributor":
        return [
          { label: "Home", path: "/" },
          { label: "Distributor Dashboard", path: "/distributor" },
          { label: "Verify Medicine", path: "/customer" },
          { label: "Profile", path: "/profile" },
        ];
      case "pharmacy":
        return [
          { label: "Home", path: "/" },
          { label: "Pharmacy Dashboard", path: "/pharmacy" },
          { label: "Verify Medicine", path: "/customer" },
          { label: "Profile", path: "/profile" },
        ];
      case "customer":
        return [
          { label: "Home", path: "/" },
          { label: "User Dashboard", path: "/customer" },
          { label: "Profile", path: "/profile" },
        ];
      default:
        return [{ label: "Home", path: "/" }];
    }
  };

  const navLinks = getNavLinks();

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
        background: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 4px 20px rgba(99, 102, 241, 0.04)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 36px",
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "linear-gradient(135deg, #5855F3, #4743EB)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(88,85,243,0.25)",
            }}
          >
            <Shield size={20} color="white" />
          </div>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "-0.02em",
              color: "#18182E",
            }}
          >
            DrugChain
          </span>
        </button>

        {/* Role-Specific Nav Links */}
        <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {navLinks.map((item, idx) => {
            const active = isActive(item.path);
            return (
              <button
                key={`${item.label}-${idx}`}
                onClick={() => navigate(item.path)}
                style={{
                  background: active ? "rgba(99,102,241,0.09)" : "none",
                  border: active ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: active ? "#4F46E5" : "#5F607A",
                  transition: "all 0.2s ease",
                  padding: "6px 12px",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!active) { e.currentTarget.style.color = "#5855F3"; e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }
                }}
                onMouseLeave={(e) => {
                  if (!active) { e.currentTarget.style.color = "#5F607A"; e.currentTarget.style.background = "none"; }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Auth Section */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 14px 6px 8px",
                  borderRadius: 12,
                  background: "#F8F9FE",
                  border: "1px solid #E8EAF6",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "#5855F3",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#18182E",
                      maxWidth: 130,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#5855F3",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {user.role}
                  </div>
                </div>
                <ChevronDown size={14} color="#8E8FA8" />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: 200,
                    background: "#FFFFFF",
                    border: "1px solid #E8EAF6",
                    borderRadius: 14,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                    padding: 8,
                    zIndex: 200,
                  }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      const dashboardMap = {
                        creator: "/creator",
                        manufacturer: "/manufacturer",
                        distributor: "/distributor",
                        pharmacy: "/pharmacy",
                        customer: "/customer",
                      };
                      navigate(dashboardMap[userRole] || "/");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "none",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#5855F3",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#EEF0FD")}
                    onMouseLeave={(e) => (e.target.style.background = "none")}
                  >
                    🚀 My Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/profile");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "none",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#18182E",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#F8F9FE")}
                    onMouseLeave={(e) => (e.target.style.background = "none")}
                  >
                    👤 My Profile
                  </button>

                  <div style={{ height: 1, background: "#F1F3FC", margin: "4px 0" }} />

                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "none",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#DC2626",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#FEF2F2")}
                    onMouseLeave={(e) => (e.target.style.background = "none")}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid #E8EAF6",
                  background: "#FFFFFF",
                  color: "#18182E",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <LogIn size={14} /> Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <UserPlus size={14} /> Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
