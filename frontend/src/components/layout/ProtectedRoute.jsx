import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { ShieldAlert, ArrowRight, Loader2 } from "lucide-react";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, token, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F9FE",
        }}
      >
        <Loader2 size={36} color="#5855F3" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // 1. Not Authenticated -> Redirect to Login
  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role Check
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || "").toLowerCase().trim();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());

    if (!normalizedAllowed.includes(userRole)) {
      const roleDashboardMap = {
        creator: "/creator",
        manufacturer: "/manufacturer",
        distributor: "/distributor",
        pharmacy: "/pharmacy",
        customer: "/customer",
      };
      const ownDashboard = roleDashboardMap[userRole] || "/";

      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#F8F9FE",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              boxShadow: "0 8px 24px rgba(239,68,68,0.12)",
            }}
          >
            <ShieldAlert size={36} color="#DC2626" />
          </div>

          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "2rem",
              fontWeight: 800,
              color: "#18182E",
              marginBottom: 8,
            }}
          >
            Access Denied
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "#5F607A",
              maxWidth: 440,
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            Your account role (<strong>{user.role}</strong>) is not authorized to access this section. Each portal is strictly restricted to its designated supply-chain role.
          </p>

          <a
            href={ownDashboard}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              padding: "12px 24px",
            }}
          >
            Go to {user.role} Dashboard <ArrowRight size={16} />
          </a>
        </div>
      );
    }
  }

  return children;
}
