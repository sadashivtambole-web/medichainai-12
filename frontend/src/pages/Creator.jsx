import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Crown,
  Users,
  UserCheck,
  Building2,
  Server,
  Store,
  Pill,
  Truck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  ArrowRight,
  Shield,
  Layers,
  Activity,
  FileText,
  Lock,
  Loader2,
  Eye,
  Camera,
  FileCheck,
  ZoomIn,
  X,
  Mail,
  Send,
  Sparkles,
} from "lucide-react";
import Background from "../components/layout/Background";
import { useApp } from "../context/AppContext";
import { authService } from "../services/authService";
import api from "../services/api";
import toast, { Toaster } from "react-hot-toast";

export default function Creator() {
  const { user, token, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const currentAuthToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "") || "";

  // Determine active tab from URL path
  const currentPath = location.pathname;
  let activeTab = "overview";
  if (currentPath.includes("approvals")) activeTab = "approvals";
  else if (currentPath.includes("users")) activeTab = "users";
  else if (currentPath.includes("medicines")) activeTab = "medicines";
  else if (currentPath.includes("transfers")) activeTab = "transfers";
  else if (currentPath.includes("blockchain")) activeTab = "blockchain";

  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    approvedManufacturers: 0,
    approvedDistributors: 0,
    approvedPharmacies: 0,
    registeredMedicines: 0,
    activeTransfers: 0,
    verificationRecords: 0,
    blockchainStatus: null,
  });

  const [usersList, setUsersList] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [medicinesList, setMedicinesList] = useState([]);
  const [transfersList, setTransfersList] = useState([]);
  const [chainBlocks, setChainBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for User Management
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Role Section Filter for Approvals View
  const [approvalRoleTab, setApprovalRoleTab] = useState("ALL");
  const [approvalSearchQuery, setApprovalSearchQuery] = useState("");

  // Candidate Review Drawer / Modal States
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateOcrData, setCandidateOcrData] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState(null);

  // Approval confirmation modal
  const [confirmApproveUser, setConfirmApproveUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection modal state
  const [rejectModalUser, setRejectModalUser] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Blockchain cryptographic audit state
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, usersRes, medsRes, transRes, chainRes] =
        await Promise.allSettled([
          api.get("/creator/stats"),
          api.get("/creator/approvals"),
          api.get(`/creator/users?role=${roleFilter}&status=${statusFilter}&search=${searchQuery}`),
          api.get("/medicines"),
          api.get("/transfers/incoming"),
          api.get("/blockchain/chain"),
        ]);

      if (statsRes.status === "fulfilled" && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }
      if (pendingRes.status === "fulfilled" && Array.isArray(pendingRes.value?.data)) {
        setPendingList(pendingRes.value.data);
      }
      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value?.data)) {
        setUsersList(usersRes.value.data);
      }
      if (medsRes.status === "fulfilled" && Array.isArray(medsRes.value?.data)) {
        setMedicinesList(medsRes.value.data);
      }
      if (transRes.status === "fulfilled" && Array.isArray(transRes.value?.data)) {
        setTransfersList(transRes.value.data);
      }
      if (chainRes.status === "fulfilled" && Array.isArray(chainRes.value?.data)) {
        setChainBlocks(chainRes.value.data);
      }
    } catch (err) {
      console.warn("Data fetch note:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, roleFilter, statusFilter]);

  // Handle OCR Analysis Request
  const handleRunOcr = async (userId) => {
    setOcrLoading(true);
    try {
      const res = await authService.runOcrAssistance(userId);
      if (res.success && res.data) {
        setCandidateOcrData(res.data);
        toast.success("Document OCR analysis complete!");
      } else {
        toast.error(res.message || "OCR analysis unavailable for this document.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to analyze document.");
    } finally {
      setOcrLoading(false);
    }
  };

  // Execute Approval with Temporary Password Dispatch
  const handleConfirmApproval = async () => {
    if (!confirmApproveUser) return;
    setActionLoading(true);
    try {
      const res = await authService.approveUser(confirmApproveUser._id);
      if (res.success) {
        toast.success(`Approved ${confirmApproveUser.name}! Login credentials sent.`);
        setConfirmApproveUser(null);
        setSelectedCandidate(null);
        fetchData();
      } else {
        toast.error(res.message || "Approval failed");
      }
    } catch (err) {
      toast.error(err.message || "Network error during approval.");
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Rejection
  const handleConfirmRejection = async () => {
    if (!rejectModalUser) return;
    setActionLoading(true);
    try {
      const reason = rejectReason.trim() || "Submitted identity documents or organization credentials could not be verified.";
      const res = await authService.rejectUser(rejectModalUser._id, reason);
      if (res.success) {
        toast.success(`Application for ${rejectModalUser.name} has been rejected.`);
        setRejectModalUser(null);
        setSelectedCandidate(null);
        setRejectReason("");
        fetchData();
      } else {
        toast.error(res.message || "Rejection failed");
      }
    } catch (err) {
      toast.error(err.message || "Network error during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  // Resend Login Credentials
  const handleResendCredentials = async (userId, userName) => {
    try {
      toast.loading(`Generating new credentials for ${userName}...`, { id: "resend" });
      const res = await authService.resendCredentials(userId);
      if (res.success) {
        toast.success(`New credentials dispatched to ${userName}'s email!`, { id: "resend" });
        fetchData();
      } else {
        toast.error(res.message || "Failed to resend credentials.", { id: "resend" });
      }
    } catch (err) {
      toast.error(err.message || "Failed to dispatch email.", { id: "resend" });
    }
  };

  // Cryptographic Blockchain Audit
  const handleAuditBlockchain = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get("/creator/blockchain/audit");
      if (res.success && res.data) {
        setAuditResult(res.data);
        toast.success(`Cryptographic Audit: ${res.data.valid ? "VALID & UNTAMPERED" : "CORRUPTION DETECTED"}`);
      } else {
        toast.error("Cryptographic audit returned error");
      }
    } catch (err) {
      toast.error(err.message || "Audit failed");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navTabs = [
    { id: "overview", label: "Overview Metrics", path: "/creator", icon: Layers },
    { id: "approvals", label: `Pending Approvals (${stats.pendingApprovals})`, path: "/creator/approvals", icon: UserCheck },
    { id: "users", label: "User Directory", path: "/creator/users", icon: Users },
    { id: "medicines", label: "Registered Medicines", path: "/creator/medicines", icon: Pill },
    { id: "transfers", label: "Active Transfers", path: "/creator/transfers", icon: Truck },
    { id: "blockchain", label: "DrugChain Ledger & Audit", path: "/creator/blockchain", icon: ShieldCheck },
  ];

  return (
    <div className="page-bg" style={{ minHeight: "100vh", position: "relative" }}>
      <Background />
      <Toaster position="top-right" />

      {/* ── Top Super Admin Navigation Header ── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E8EAF6",
          padding: "12px 36px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo & Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(135deg, #7C3AED, #5855F3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
              }}
            >
              <Crown size={22} color="white" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#18182E",
                }}
              >
                DrugChain Creator Console
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED" }}>
                Super Administrator Authority
              </div>
            </div>
          </div>

          {/* Creator User Info & Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#18182E" }}>
                {user?.name || "System Creator"}
              </div>
              <div style={{ fontSize: 11, color: "#5F607A" }}>{user?.email}</div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                border: "1px solid #FECACA",
                background: "#FEF2F2",
                color: "#DC2626",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area (Full Expansive Width) ── */}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
          padding: "96px 40px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* Navigation Tabs Bar */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            marginBottom: 28,
            borderBottom: "1px solid #E8EAF6",
          }}
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 18px",
                  borderRadius: "12px 12px 0 0",
                  background: isSelected ? "#FFFFFF" : "transparent",
                  border: isSelected ? "1px solid #E8EAF6" : "1px solid transparent",
                  borderBottom: isSelected ? "2px solid #5855F3" : "none",
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: isSelected ? 800 : 600,
                  color: isSelected ? "#5855F3" : "#5F607A",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={16} color={isSelected ? "#5855F3" : "#8E8FA8"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── VIEW 1: OVERVIEW METRICS DASHBOARD ── */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                  Creator Master Console
                </h1>
                <p style={{ fontSize: 14, color: "#5F607A" }}>
                  Administrative overview of authorized supply-chain nodes, pending candidate applications, and blockchain ledger
                </p>
              </div>

              <button
                onClick={fetchData}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #E8EAF6",
                  background: "#FFFFFF",
                  color: "#18182E",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} /> Refresh Metrics
              </button>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { title: "Total Users", value: stats.totalUsers, icon: Users, color: "#5855F3", bg: "#EEF0FD" },
                { title: "Pending Approvals", value: stats.pendingApprovals, icon: UserCheck, color: "#D97706", bg: "#FFFBEB", onClick: () => navigate("/creator/approvals") },
                { title: "Approved Manufacturers", value: stats.approvedManufacturers, icon: Building2, color: "#2563EB", bg: "#EFF6FF" },
                { title: "Approved Distributors", value: stats.approvedDistributors, icon: Server, color: "#7C3AED", bg: "#F5F3FF" },
                { title: "Approved Pharmacies", value: stats.approvedPharmacies, icon: Store, color: "#059669", bg: "#ECFDF5" },
                { title: "Registered Medicines", value: stats.registeredMedicines, icon: Pill, color: "#5855F3", bg: "#EEF0FD" },
                { title: "Active Transfers", value: stats.activeTransfers, icon: Truck, color: "#0891B2", bg: "#ECFEFF" },
                { title: "DrugChain Blocks", value: chainBlocks.length, icon: ShieldCheck, color: "#10B981", bg: "#ECFDF5" },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    onClick={card.onClick}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E8EAF6",
                      borderRadius: 18,
                      padding: "20px",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                      cursor: card.onClick ? "pointer" : "default",
                      transition: "transform 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#8E8FA8" }}>{card.title}</span>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={18} color={card.color} />
                      </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#18182E" }}>{card.value}</div>
                  </div>
                );
              })}
            </div>

            {/* ── QUEUE SECTION: DIRECT APPROVAL QUEUES BY ROLE ── */}
            <div style={{ marginTop: 28, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#18182E", margin: 0 }}>
                    Registration Approval Queues by Role
                  </h3>
                  <p style={{ fontSize: 12, color: "#5F607A", margin: "4px 0 0" }}>
                    Select a supply-chain tier to review applicant identity proofs, license credentials, and documents
                  </p>
                </div>
                {pendingList.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 100, background: "#FEF3C7", color: "#92400E" }}>
                    {pendingList.length} Total Pending
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                {/* 1. Manufacturer Queue Card */}
                <div
                  onClick={() => {
                    setApprovalRoleTab("Manufacturer");
                    navigate("/creator/approvals");
                  }}
                  style={{
                    background: "#FFFFFF",
                    border: "1.5px solid #EEF0FD",
                    borderRadius: 18,
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 10px rgba(88, 85, 243, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EEF0FD", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Building2 size={20} color="#5855F3" />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#18182E" }}>Manufacturers</div>
                        <div style={{ fontSize: 11, color: "#5F607A" }}>Drug Origin & Batch Creation</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#5855F3" }}>
                      {pendingList.filter((u) => u.role === "Manufacturer").length}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#5855F3", display: "flex", alignItems: "center", gap: 4 }}>
                      Review Queue <ArrowRight size={14} />
                    </span>
                  </div>
                </div>

                {/* 2. Distributor Queue Card */}
                <div
                  onClick={() => {
                    setApprovalRoleTab("Distributor");
                    navigate("/creator/approvals");
                  }}
                  style={{
                    background: "#FFFFFF",
                    border: "1.5px solid #F5F3FF",
                    borderRadius: 18,
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 10px rgba(124, 58, 237, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Truck size={20} color="#7C3AED" />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#18182E" }}>Distributors</div>
                        <div style={{ fontSize: 11, color: "#5F607A" }}>Transit & Logistics Custody</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#7C3AED" }}>
                      {pendingList.filter((u) => u.role === "Distributor").length}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", display: "flex", alignItems: "center", gap: 4 }}>
                      Review Queue <ArrowRight size={14} />
                    </span>
                  </div>
                </div>

                {/* 3. Pharmacy Queue Card */}
                <div
                  onClick={() => {
                    setApprovalRoleTab("Pharmacy");
                    navigate("/creator/approvals");
                  }}
                  style={{
                    background: "#FFFFFF",
                    border: "1.5px solid #ECFDF5",
                    borderRadius: 18,
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 10px rgba(5, 150, 105, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Store size={20} color="#059669" />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#18182E" }}>Pharmacies</div>
                        <div style={{ fontSize: 11, color: "#5F607A" }}>Dispensing & Shelf POS</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#059669" }}>
                      {pendingList.filter((u) => u.role === "Pharmacy").length}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                      Review Queue <ArrowRight size={14} />
                    </span>
                  </div>
                </div>

                {/* 4. Customer / User Queue Card */}
                <div
                  onClick={() => {
                    setApprovalRoleTab("Customer");
                    navigate("/creator/approvals");
                  }}
                  style={{
                    background: "#FFFFFF",
                    border: "1.5px solid #FFFBEB",
                    borderRadius: 18,
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 10px rgba(217, 119, 6, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Users size={20} color="#D97706" />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#18182E" }}>Customers / Users</div>
                        <div style={{ fontSize: 11, color: "#5F607A" }}>Public Consumer Accounts</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#D97706" }}>
                      {pendingList.filter((u) => u.role === "Customer").length}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#D97706", display: "flex", alignItems: "center", gap: 4 }}>
                      Review Queue <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: PENDING APPROVALS WITH DEDICATED ROLE SECTIONS ── */}
        {activeTab === "approvals" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                Candidate Identity Reviews & Approvals
              </h1>
              <p style={{ fontSize: 14, color: "#5F607A" }}>
                Dedicated review queues for Manufacturers, Distributors, Pharmacies, and Public User accounts
              </p>
            </div>

            {/* Role-Specific Section Tabs */}
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 6,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  id: "ALL",
                  label: "All Applications",
                  icon: Layers,
                  count: pendingList.length,
                  color: "#5855F3",
                  bg: "#EEF0FD",
                },
                {
                  id: "Manufacturer",
                  label: "Manufacturers",
                  icon: Building2,
                  count: pendingList.filter((u) => u.role === "Manufacturer").length,
                  color: "#5855F3",
                  bg: "#EEF0FD",
                },
                {
                  id: "Distributor",
                  label: "Distributors",
                  icon: Truck,
                  count: pendingList.filter((u) => u.role === "Distributor").length,
                  color: "#7C3AED",
                  bg: "#F5F3FF",
                },
                {
                  id: "Pharmacy",
                  label: "Pharmacies",
                  icon: Store,
                  count: pendingList.filter((u) => u.role === "Pharmacy").length,
                  color: "#059669",
                  bg: "#ECFDF5",
                },
                {
                  id: "Customer",
                  label: "Customers / Users",
                  icon: Users,
                  count: pendingList.filter((u) => u.role === "Customer").length,
                  color: "#D97706",
                  bg: "#FFFBEB",
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = approvalRoleTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setApprovalRoleTab(tab.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 16px",
                      borderRadius: 12,
                      background: isSelected ? tab.color : "#FFFFFF",
                      color: isSelected ? "#FFFFFF" : "#18182E",
                      border: `1.5px solid ${isSelected ? tab.color : "#E8EAF6"}`,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? `0 4px 12px ${tab.color}33` : "none",
                    }}
                  >
                    <Icon size={16} color={isSelected ? "#FFFFFF" : tab.color} />
                    <span>{tab.label}</span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 7px",
                        borderRadius: 100,
                        background: isSelected ? "rgba(255,255,255,0.25)" : tab.bg,
                        color: isSelected ? "#FFFFFF" : tab.color,
                        fontWeight: 800,
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Role Verification Guidance Banner */}
            <div
              style={{
                background:
                  approvalRoleTab === "Manufacturer"
                    ? "#EEF0FD"
                    : approvalRoleTab === "Distributor"
                    ? "#F5F3FF"
                    : approvalRoleTab === "Pharmacy"
                    ? "#ECFDF5"
                    : approvalRoleTab === "Customer"
                    ? "#FFFBEB"
                    : "#F8F9FE",
                border: `1px solid ${
                  approvalRoleTab === "Manufacturer"
                    ? "#C7D2FE"
                    : approvalRoleTab === "Distributor"
                    ? "#DDD6FE"
                    : approvalRoleTab === "Pharmacy"
                    ? "#A7F3D0"
                    : approvalRoleTab === "Customer"
                    ? "#FDE68A"
                    : "#E8EAF6"
                }`,
                borderRadius: 14,
                padding: "14px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck
                  size={20}
                  color={
                    approvalRoleTab === "Manufacturer"
                      ? "#5855F3"
                      : approvalRoleTab === "Distributor"
                      ? "#7C3AED"
                      : approvalRoleTab === "Pharmacy"
                      ? "#059669"
                      : approvalRoleTab === "Customer"
                      ? "#D97706"
                      : "#5855F3"
                  }
                />
                <div style={{ fontSize: 13, color: "#18182E", fontWeight: 700 }}>
                  {approvalRoleTab === "Manufacturer" &&
                    "Manufacturer Verification: Check manufacturing facility license, company code, and authorized representative identity photo."}
                  {approvalRoleTab === "Distributor" &&
                    "Distributor Verification: Inspect wholesale distribution permit, logistics code, and transport head identity photo."}
                  {approvalRoleTab === "Pharmacy" &&
                    "Pharmacy Verification: Verify State Pharmacy Council retail license, chemist store code, and pharmacist identity document."}
                  {approvalRoleTab === "Customer" &&
                    "Customer Accounts: Review public user details and account status."}
                  {approvalRoleTab === "ALL" &&
                    "Super Administrator Verification: Review candidate identity photos and government IDs before activating accounts."}
                </div>
              </div>

              {/* Search Within Queue */}
              <div style={{ position: "relative", width: 240 }}>
                <Search size={14} color="#8E8FA8" style={{ position: "absolute", left: 12, top: 10 }} />
                <input
                  type="text"
                  placeholder="Filter by name or code..."
                  value={approvalSearchQuery}
                  onChange={(e) => setApprovalSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 12px 7px 32px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: 12,
                    background: "#FFFFFF",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Candidates Table or Empty State */}
            {(() => {
              const currentList = pendingList.filter((appUser) => {
                const matchesRole = approvalRoleTab === "ALL" || appUser.role === approvalRoleTab;
                const matchesSearch =
                  !approvalSearchQuery.trim() ||
                  (appUser.fullName || appUser.name || "").toLowerCase().includes(approvalSearchQuery.toLowerCase()) ||
                  (appUser.email || "").toLowerCase().includes(approvalSearchQuery.toLowerCase()) ||
                  (appUser.companyName || appUser.company || "").toLowerCase().includes(approvalSearchQuery.toLowerCase()) ||
                  (appUser.companyCode || "").toLowerCase().includes(approvalSearchQuery.toLowerCase());
                return matchesRole && matchesSearch;
              });

              if (currentList.length === 0) {
                return (
                  <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 20, padding: "48px 24px", textAlign: "center" }}>
                    <CheckCircle2 size={40} color="#10B981" style={{ margin: "0 auto 12px" }} />
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                      No Pending {approvalRoleTab === "ALL" ? "" : approvalRoleTab} Approvals
                    </h3>
                    <p style={{ fontSize: 13, color: "#5F607A" }}>
                      {approvalSearchQuery
                        ? `No applications matching "${approvalSearchQuery}" found in this section.`
                        : `All ${approvalRoleTab === "ALL" ? "candidate" : approvalRoleTab} registration applications have been reviewed.`}
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                          <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Applicant Details</th>
                          <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Role Section</th>
                          <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Organization & Code</th>
                          <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Identity Documents</th>
                          <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Submitted On</th>
                          <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569", textAlign: "right" }}>Review Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentList.map((appUser) => {
                          const roleConfig = {
                            Manufacturer: { color: "#4338CA", bg: "#EEF2FF", border: "#C7D2FE" },
                            Distributor: { color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" },
                            Pharmacy: { color: "#047857", bg: "#ECFDF5", border: "#A7F3D0" },
                            Customer: { color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
                          }[appUser.role] || { color: "#475569", bg: "#F1F5F9", border: "#E2E8F0" };

                          return (
                            <tr key={appUser._id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}>
                              <td style={{ padding: "16px 24px" }}>
                                <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 15.5 }}>{appUser.fullName || appUser.name}</div>
                                <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{appUser.email}</div>
                                {appUser.phone && <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>📞 {appUser.phone}</div>}
                              </td>
                              <td style={{ padding: "16px 24px" }}>
                                <span
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 800,
                                    padding: "4px 12px",
                                    borderRadius: 100,
                                    background: roleConfig.bg,
                                    color: roleConfig.color,
                                    border: `1px solid ${roleConfig.border}`,
                                    display: "inline-block",
                                  }}
                                >
                                  {appUser.role}
                                </span>
                              </td>
                              <td style={{ padding: "16px 24px" }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{appUser.companyName || appUser.company || "—"}</div>
                                <div style={{ fontSize: 13, fontFamily: "monospace", color: roleConfig.color, fontWeight: 800, marginTop: 2 }}>{appUser.companyCode || "—"}</div>
                              </td>
                              <td style={{ padding: "16px 24px" }}>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 800,
                                      padding: "4px 10px",
                                      borderRadius: 8,
                                      background: appUser.identityPhoto ? "#ECFDF5" : "#FEF2F2",
                                      color: appUser.identityPhoto ? "#047857" : "#B91C1C",
                                      border: `1px solid ${appUser.identityPhoto ? "#A7F3D0" : "#FECACA"}`,
                                    }}
                                  >
                                    📸 {appUser.identityPhoto ? "Photo Attached" : "No Photo"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 800,
                                      padding: "4px 10px",
                                      borderRadius: 8,
                                      background: appUser.governmentId ? "#EFF6FF" : "#FEF2F2",
                                      color: appUser.governmentId ? "#1E40AF" : "#B91C1C",
                                      border: `1px solid ${appUser.governmentId ? "#BFDBFE" : "#FECACA"}`,
                                    }}
                                  >
                                    📄 {appUser.governmentId ? "Gov ID Attached" : "No ID"}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: "16px 24px", fontSize: 13, color: "#475569", fontWeight: 600 }}>
                                {new Date(appUser.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCandidate(appUser);
                                    setCandidateOcrData(null);
                                  }}
                                  className="btn-primary"
                                  style={{ padding: "8px 18px", fontSize: 13, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}
                                >
                                  <Eye size={14} /> Review Candidate
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── VIEW 3: USER DIRECTORY & CREDENTIAL STATUS ── */}
        {activeTab === "users" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                Network User Directory
              </h1>
              <p style={{ fontSize: 14, color: "#5F607A" }}>
                Filter, inspect credentials, and manage accounts across all supply-chain roles
              </p>
            </div>

            {/* Filter Controls */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 240px" }}>
                <Search size={15} color="#8E8FA8" style={{ position: "absolute", left: 14, top: 13 }} />
                <input
                  type="text"
                  placeholder="Search by name, email, company, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchData()}
                  style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: 10, border: "1px solid #E8EAF6", fontSize: 13, background: "#FFFFFF", boxSizing: "border-box" }}
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #E8EAF6", background: "#FFFFFF", fontSize: 13, fontWeight: 700 }}
              >
                <option value="ALL">All Roles</option>
                <option value="Manufacturer">Manufacturer</option>
                <option value="Distributor">Distributor</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Customer">Customer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #E8EAF6", background: "#FFFFFF", fontSize: 13, fontWeight: 700 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {/* Directory Table */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                      <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>User</th>
                      <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Role</th>
                      <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Organization</th>
                      <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Account Status</th>
                      <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>Credentials / Email</th>
                      <th style={{ padding: "16px 24px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((usr) => {
                      const roleConfig = {
                        Manufacturer: { color: "#4338CA", bg: "#EEF2FF", border: "#C7D2FE" },
                        Distributor: { color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" },
                        Pharmacy: { color: "#047857", bg: "#ECFDF5", border: "#A7F3D0" },
                        Customer: { color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
                        Creator: { color: "#BE185D", bg: "#FDF2F8", border: "#FBCFE8" },
                      }[usr.role] || { color: "#475569", bg: "#F1F5F9", border: "#E2E8F0" };

                      const statusConfig = {
                        APPROVED: { color: "#047857", bg: "#ECFDF5", border: "#6EE7B7" },
                        PENDING: { color: "#B45309", bg: "#FFFBEB", border: "#FCD34D" },
                        REJECTED: { color: "#B91C1C", bg: "#FEF2F2", border: "#FCA5A5" },
                        SUSPENDED: { color: "#4B5563", bg: "#F3F4F6", border: "#D1D5DB" },
                      }[usr.accountStatus] || { color: "#475569", bg: "#F1F5F9", border: "#E2E8F0" };

                      return (
                        <tr key={usr._id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}>
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 15.5 }}>{usr.fullName || usr.name}</div>
                            <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{usr.email}</div>
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <span
                              style={{
                                fontSize: 12.5,
                                fontWeight: 800,
                                padding: "4px 12px",
                                borderRadius: 100,
                                background: roleConfig.bg,
                                color: roleConfig.color,
                                border: `1px solid ${roleConfig.border}`,
                                display: "inline-block",
                              }}
                            >
                              {usr.role}
                            </span>
                          </td>
                          <td style={{ padding: "16px 24px", fontSize: 14, fontWeight: 700, color: "#1E293B" }}>
                            {usr.company || "—"}
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                padding: "4px 12px",
                                borderRadius: 100,
                                background: statusConfig.bg,
                                color: statusConfig.color,
                                border: `1px solid ${statusConfig.border}`,
                                display: "inline-block",
                                letterSpacing: "0.02em",
                              }}
                            >
                              {usr.accountStatus}
                            </span>
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            {usr.role !== "Customer" && usr.accountStatus === "APPROVED" ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: usr.credentialEmailStatus === "SENT" ? "#047857" : "#B45309" }}>
                                  {usr.credentialEmailStatus === "SENT" ? "✓ Credentials Sent" : "⚠ Email Pending"}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 13, color: "#94A3B8" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "16px 24px", textAlign: "right" }}>
                            {usr.accountStatus === "APPROVED" && usr.role !== "Customer" && (
                              <button
                                onClick={() => handleResendCredentials(usr._id, usr.name)}
                                style={{
                                  padding: "8px 16px",
                                  borderRadius: 10,
                                  border: "1px solid #C7D2FE",
                                  background: "#EEF2FF",
                                  color: "#4338CA",
                                  fontSize: 12.5,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  transition: "all 0.15s",
                                }}
                              >
                                <Send size={13} /> Resend Credentials
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 4: REGISTERED MEDICINES ── */}
        {activeTab === "medicines" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                Registered Medicines Inventory
              </h1>
              <p style={{ fontSize: 14, color: "#5F607A" }}>
                Immutable medicine batches registered across the network on DrugChain
              </p>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#F8F9FE", borderBottom: "1px solid #E8EAF6" }}>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Medicine</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Batch ID</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Manufacturer</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Expiry Date</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Data Hash</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicinesList.map((med) => (
                      <tr key={med._id} style={{ borderBottom: "1px solid #F1F3FC" }}>
                        <td style={{ padding: "14px 20px", fontWeight: 800, color: "#18182E", fontSize: 13 }}>{med.name}</td>
                        <td style={{ padding: "14px 20px", fontFamily: "monospace", color: "#5855F3", fontWeight: 700, fontSize: 12 }}>{med.batchId}</td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "#5F607A" }}>{med.companyName || med.manufacturer}</td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "#5F607A" }}>{med.expiryDate}</td>
                        <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 11, color: "#8E8FA8" }}>
                          {med.medicineDataHash ? `${med.medicineDataHash.slice(0, 12)}...` : "—"}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 100, background: "#ECFDF5", color: "#059669" }}>
                            {med.status || "Registered"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 5: ACTIVE TRANSFERS ── */}
        {activeTab === "transfers" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                Supply Chain Custody Transfers
              </h1>
              <p style={{ fontSize: 14, color: "#5F607A" }}>
                Real-time tracking of medicine batches moving between Manufacturers, Distributors, and Pharmacies
              </p>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E8EAF6", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#F8F9FE", borderBottom: "1px solid #E8EAF6" }}>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Transfer ID</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Medicine & Batch</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>From Sender</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>To Recipient</th>
                      <th style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5F607A" }}>Blockchain Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfersList.map((tr) => (
                      <tr key={tr._id} style={{ borderBottom: "1px solid #F1F3FC" }}>
                        <td style={{ padding: "14px 20px", fontFamily: "monospace", fontWeight: 700, color: "#18182E", fontSize: 12 }}>{tr.id}</td>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ fontWeight: 800, color: "#18182E", fontSize: 13 }}>{tr.medicineName}</div>
                          <div style={{ fontSize: 11, color: "#5855F3", fontFamily: "monospace" }}>Batch: {tr.batchId}</div>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "#5F607A" }}>{tr.from}</td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "#18182E", fontWeight: 700 }}>{tr.to}</td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 100, background: tr.blockchainStatus === "Confirmed" ? "#ECFDF5" : "#FFFBEB", color: tr.blockchainStatus === "Confirmed" ? "#059669" : "#D97706" }}>
                            {tr.blockchainStatus || "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 6: DRUGCHAIN LEDGER & CRYPTOGRAPHIC AUDIT ── */}
        {activeTab === "blockchain" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#18182E", marginBottom: 4 }}>
                  DrugChain Private Ledger & Security Audit
                </h1>
                <p style={{ fontSize: 14, color: "#5F607A" }}>
                  Inspect immutable SHA-256 blocks, Merkle root proofs, and execute full cryptographic chain audits
                </p>
              </div>

              <button
                onClick={handleAuditBlockchain}
                disabled={auditLoading}
                className="btn-primary"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 13, fontWeight: 800 }}
              >
                {auditLoading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Auditing Cryptographic Chain...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Run Cryptographic Chain Audit
                  </>
                )}
              </button>
            </div>

            {/* Audit Results Banner */}
            {auditResult && (
              <div
                style={{
                  background: auditResult.valid ? "#ECFDF5" : "#FEF2F2",
                  border: `1px solid ${auditResult.valid ? "#A7F3D0" : "#FECACA"}`,
                  borderRadius: 16,
                  padding: "20px",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {auditResult.valid ? <CheckCircle2 size={28} color="#10B981" /> : <XCircle size={28} color="#EF4444" />}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: auditResult.valid ? "#065F46" : "#991B1B" }}>
                      {auditResult.valid ? "DRUGCHAIN INTEGRITY VERIFIED (100% UNTAMPERED)" : "SECURITY ALERT: BLOCKCHAIN CORRUPTION DETECTED"}
                    </div>
                    <div style={{ fontSize: 12, color: auditResult.valid ? "#047857" : "#B91C1C", marginTop: 4 }}>
                      Total Blocks Audited: {auditResult.totalBlocks} | Status: {auditResult.status} | Consensus: Proof-of-Authority
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Blocks Stream */}
            <div style={{ display: "grid", gap: 12 }}>
              {chainBlocks.map((blk) => (
                <div
                  key={blk.index}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E8EAF6",
                    borderRadius: 14,
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, background: "#EEF0FD", color: "#5855F3", padding: "3px 8px", borderRadius: 6 }}>
                        Block #{blk.index}
                      </span>
                      <span style={{ fontSize: 12, color: "#8E8FA8" }}>{new Date(blk.timestamp).toLocaleString("en-IN")}</span>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#059669", background: "#ECFDF5", padding: "2px 8px", borderRadius: 4 }}>
                      Validator: {blk.validator}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 6, fontSize: 11, fontFamily: "monospace", color: "#5F607A" }}>
                    <span>Block Hash:</span> <strong style={{ color: "#18182E" }}>{blk.hash}</strong>
                    <span>Prev Hash:</span> <span>{blk.previousHash}</span>
                    <span>Merkle Root:</span> <span>{blk.merkleRoot}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── CANDIDATE REVIEW DRAWER / MODAL ── */}
      {selectedCandidate && (
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
              borderRadius: 24,
              maxWidth: 780,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "28px 32px",
              boxShadow: "0 24px 70px rgba(0,0,0,0.25)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid #E8EAF6", paddingBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#18182E", margin: 0 }}>
                    {selectedCandidate.fullName || selectedCandidate.name}
                  </h2>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 100, background: "#EEF0FD", color: "#5855F3", textTransform: "uppercase" }}>
                    {selectedCandidate.role}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#5F607A", marginTop: 2 }}>
                  Application submitted on {new Date(selectedCandidate.createdAt).toLocaleString("en-IN")}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8FA8" }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Candidate Identity Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#F8F9FE", borderRadius: 12, padding: "16px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#8E8FA8", marginBottom: 8 }}>
                  Personal Information
                </div>
                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  <div><strong>Email:</strong> {selectedCandidate.email}</div>
                  <div><strong>Phone:</strong> {selectedCandidate.phone || "—"}</div>
                  <div><strong>Role:</strong> {selectedCandidate.role}</div>
                </div>
              </div>

              <div style={{ background: "#F8F9FE", borderRadius: 12, padding: "16px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#8E8FA8", marginBottom: 8 }}>
                  Organization Credentials
                </div>
                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  <div><strong>Company:</strong> {selectedCandidate.companyName || selectedCandidate.company || "—"}</div>
                  <div><strong>License Code:</strong> {selectedCandidate.companyCode || "—"}</div>
                  <div><strong>Status:</strong> <span style={{ color: "#D97706", fontWeight: 800 }}>PENDING APPROVAL</span></div>
                </div>
              </div>
            </div>

            {/* Submitted Identity Documents Section */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#18182E", marginBottom: 12 }}>
                Submitted Identity Documents & Proofs
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* 1. Identity Photo Box */}
                <div style={{ border: "1px solid #E8EAF6", borderRadius: 14, padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#18182E", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Camera size={14} color="#5855F3" /> Live Identity Photo
                  </div>
                  {selectedCandidate.identityPhoto ? (
                    <div>
                      <img
                        src={`http://localhost:5000/api/creator/users/${selectedCandidate._id}/identity-photo?token=${currentAuthToken}`}
                        alt="Identity Photo"
                        style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 10, border: "1px solid #E8EAF6", marginBottom: 8 }}
                      />
                      <button
                        type="button"
                        onClick={() => setZoomPhotoUrl(`http://localhost:5000/api/creator/users/${selectedCandidate._id}/identity-photo?token=${currentAuthToken}`)}
                        style={{ background: "#EEF0FD", color: "#5855F3", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <ZoomIn size={13} /> Zoom Photo
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: "40px 10px", color: "#9CA3AF", fontSize: 13 }}>No photo attached</div>
                  )}
                </div>

                {/* 2. Government ID Box */}
                <div style={{ border: "1px solid #E8EAF6", borderRadius: 14, padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#18182E", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <FileText size={14} color="#5855F3" /> Government ID Proof
                  </div>
                  {selectedCandidate.governmentId ? (
                    <div>
                      <div
                        style={{
                          height: 180,
                          background: "#F8F9FE",
                          borderRadius: 10,
                          border: "1px solid #E8EAF6",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 8,
                        }}
                      >
                        <FileCheck size={36} color="#5855F3" style={{ marginBottom: 6 }} />
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#18182E" }}>
                          {selectedCandidate.governmentIdType || "Government ID Document"}
                        </div>
                        <div style={{ fontSize: 11, color: "#8E8FA8" }}>Stored in Protected Storage</div>
                      </div>

                      <a
                        href={`http://localhost:5000/api/creator/users/${selectedCandidate._id}/government-id?token=${currentAuthToken}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: "#5855F3",
                          color: "#FFFFFF",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Eye size={13} /> View Document in New Tab
                      </a>
                    </div>
                  ) : (
                    <div style={{ padding: "40px 10px", color: "#9CA3AF", fontSize: 13 }}>No document attached</div>
                  )}
                </div>
              </div>
            </div>

            {/* Optional OCR Assistance Card */}
            <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 14, padding: "16px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, color: "#6D28D9" }}>
                  <Sparkles size={16} /> Optional AI / OCR Document Assistance
                </div>

                <button
                  type="button"
                  onClick={() => handleRunOcr(selectedCandidate._id)}
                  disabled={ocrLoading}
                  style={{
                    background: "#7C3AED",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {ocrLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
                  {candidateOcrData ? "Re-run OCR" : "Inspect with OCR"}
                </button>
              </div>

              {candidateOcrData ? (
                <div style={{ background: "#FFFFFF", borderRadius: 10, padding: "12px", fontSize: 12, marginTop: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6 }}>
                    <span>Registered Name:</span> <strong>{candidateOcrData.registeredName}</strong>
                    <span>Extracted Doc Name:</span> <strong>{candidateOcrData.extractedName}</strong>
                    <span>Document ID Detected:</span> <strong style={{ color: "#7C3AED" }}>{candidateOcrData.extractedId}</strong>
                    <span>Name Match:</span>{" "}
                    <strong style={{ color: candidateOcrData.nameMatch ? "#10B981" : "#EF4444" }}>
                      {candidateOcrData.nameMatch ? "✓ MATCH CONFIRMED" : "⚠ NAME MISMATCH DETECTED"}
                    </strong>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "#7C3AED", margin: 0 }}>
                  OCR assistance automatically cross-checks the name printed on the government ID against the registered applicant name. The Creator holds final approval authority.
                </p>
              )}
            </div>

            {/* Actions Bar */}
            <div style={{ display: "flex", gap: 12, borderTop: "1px solid #E8EAF6", paddingTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  setRejectModalUser(selectedCandidate);
                  setRejectReason("");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#DC2626",
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <XCircle size={16} /> Reject Application
              </button>

              <button
                type="button"
                onClick={() => setConfirmApproveUser(selectedCandidate)}
                className="btn-primary"
                style={{
                  flex: 2,
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} /> Approve Candidate Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVAL CONFIRMATION MODAL ── */}
      {confirmApproveUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1100,
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
              maxWidth: 480,
              width: "100%",
              padding: "28px 24px",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#ECFDF5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#10B981",
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#18182E", marginBottom: 8 }}>
              Confirm Account Approval?
            </h3>
            <p style={{ fontSize: 13, color: "#5F607A", lineHeight: 1.5, marginBottom: 20 }}>
              Have you reviewed the identity photo and government ID for <strong>{confirmApproveUser.name}</strong>?
              <br /><br />
              Approving will activate this account so the user can immediately log in with their <strong>registered email and password</strong>.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmApproveUser(null)}
                style={{ flex: 1, padding: "11px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmApproval}
                className="btn-primary"
                style={{ flex: 1, padding: "11px", fontWeight: 800, fontSize: 13 }}
              >
                {actionLoading ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION REASON MODAL ── */}
      {rejectModalUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1100,
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
              padding: "28px 24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <XCircle size={24} color="#DC2626" />
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#18182E", margin: 0 }}>
                Reject Application: {rejectModalUser.name}
              </h3>
            </div>

            <p style={{ fontSize: 13, color: "#5F607A", marginBottom: 14 }}>
              Select a reason or enter custom feedback. The candidate will see this reason and will be allowed to resubmit corrected documents.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {[
                "Identity information mismatch",
                "Government ID unclear",
                "Required information missing",
                "Company information needs verification",
                "Submitted documents are insufficient",
              ].map((reasonText) => (
                <button
                  key={reasonText}
                  type="button"
                  onClick={() => setRejectReason(reasonText)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: rejectReason === reasonText ? "#FEF2F2" : "#F8F9FE",
                    border: `1px solid ${rejectReason === reasonText ? "#FECACA" : "#E8EAF6"}`,
                    color: rejectReason === reasonText ? "#DC2626" : "#5F607A",
                    cursor: "pointer",
                  }}
                >
                  {reasonText}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter custom rejection feedback..."
              style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #E8EAF6", fontSize: 13, boxSizing: "border-box", marginBottom: 16 }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setRejectModalUser(null)}
                style={{ flex: 1, padding: "10px", background: "#F1F5F9", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRejection}
                style={{ flex: 1, padding: "10px", background: "#DC2626", color: "#FFFFFF", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO ZOOM MODAL ── */}
      {zoomPhotoUrl && (
        <div
          onClick={() => setZoomPhotoUrl(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            cursor: "zoom-out",
          }}
        >
          <img
            src={zoomPhotoUrl}
            alt="Zoomed Identity"
            style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          />
        </div>
      )}
    </div>
  );
}
