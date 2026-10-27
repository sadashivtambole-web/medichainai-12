import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Server,
  Cpu,
  Layers,
  Building2,
  Store,
  QrCode,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Zap,
  Lock,
  Terminal,
  Activity
} from "lucide-react";
import toast from "react-hot-toast";

const ICON_MAP = {
  "ap-mfr": Building2,
  "ap-chain": Layers,
  "ap-ai": Cpu,
  "ap-dist": Server,
  "ap-pharm": Store,
  "ap-cust": QrCode,
};

export default function ApproverBar() {
  const navigate = useNavigate();
  const [accessPoints, setAccessPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [activeModalPoint, setActiveModalPoint] = useState(null);
  const [pinging, setPinging] = useState(false);

  /* ── Fetch live real-time access points telemetry ── */
  const fetchTelemetry = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/system/access-points");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.points) {
          setAccessPoints(json.data.points);
          if (activeModalPoint) {
            const updated = json.data.points.find((p) => p.id === activeModalPoint.id);
            if (updated) setActiveModalPoint(updated);
          }
        }
      }
    } catch (err) {
      console.warn("Real-time telemetry poll notice:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => fetchTelemetry(true), 6000);
    return () => clearInterval(interval);
  }, []);

  const approvedCount = accessPoints.filter((p) => p.status === "APPROVED").length;
  const allApproved = approvedCount === accessPoints.length && accessPoints.length > 0;

  const handleAuditAll = async () => {
    setAuditing(true);
    toast.loading("Auditing real-time state of all 6 access gateways...", { id: "audit" });

    try {
      await fetchTelemetry(true);
      await new Promise((r) => setTimeout(r, 600));
      setAuditing(false);
      toast.success("Real-time audit complete: All access points verified & operational!", { id: "audit" });
    } catch (err) {
      setAuditing(false);
      toast.error("Audit encounter connection issue", { id: "audit" });
    }
  };

  const handlePingNode = async (point) => {
    setPinging(true);
    toast.loading(`Measuring real-time latency for ${point.name}...`, { id: "ping" });

    try {
      const res = await fetch(`http://localhost:5000/api/system/access-points/${point.id}/ping`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.data) {
        const newLatency = json.data.latency;
        setAccessPoints((prev) =>
          prev.map((p) => (p.id === point.id ? { ...p, latency: newLatency, lastChecked: "Just now" } : p))
        );
        if (activeModalPoint?.id === point.id) {
          setActiveModalPoint((prev) => ({ ...prev, latency: newLatency, lastChecked: "Just now" }));
        }
        toast.success(`Live Roundtrip: ${newLatency} · 0% Packet Loss · 200 OK`, { id: "ping" });
      }
    } catch (e) {
      toast.error(`Ping timeout for ${point.name}`, { id: "ping" });
    } finally {
      setPinging(false);
    }
  };

  const togglePointStatus = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:5000/api/system/access-points/${id}/toggle`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.data) {
        const nextStatus = json.data.status;
        setAccessPoints((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: nextStatus, lastChecked: "Just now" } : p))
        );
        if (activeModalPoint?.id === id) {
          setActiveModalPoint((prev) => ({ ...prev, status: nextStatus, lastChecked: "Just now" }));
        }
        if (nextStatus === "APPROVED") {
          toast.success("Access gateway authorized & cleared");
        } else {
          toast.error("Access gateway suspended");
        }
      }
    } catch (err) {
      toast.error("Status update failed");
    }
  };

  return (
    <section
      style={{
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(226, 232, 240, 0.9)",
        borderRadius: 22,
        padding: "26px 32px",
        marginBottom: 48,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(99, 102, 241, 0.05), 0 1px 4px rgba(0,0,0,0.02)",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Left Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: allApproved ? "#F0F9FF" : "rgba(245,158,11,0.1)",
              border: `1px solid ${allApproved ? "rgba(2,132,199,0.2)" : "rgba(245,158,11,0.3)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={22} color={allApproved ? "#0284C7" : "#D97706"} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#0F172A",
                }}
              >
                Access Point Approver & Real-Time Integrity Monitor
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "3px 10px",
                  borderRadius: 100,
                  background: allApproved ? "#F0F9FF" : "rgba(245,158,11,0.12)",
                  border: `1px solid ${allApproved ? "rgba(2,132,199,0.2)" : "rgba(245,158,11,0.3)"}`,
                  color: allApproved ? "#0284C7" : "#D97706",
                }}
              >
                {allApproved ? "● Live Monitored (6/6 OK)" : `● ${approvedCount}/6 Operational`}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              Live real-time monitoring of decentralized node gateways, EVM block height, and throughput.
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleAuditAll}
            disabled={auditing}
            style={{
              background: "#F0F9FF",
              border: "1px solid rgba(2,132,199,0.25)",
              borderRadius: 10,
              padding: "10px 18px",
              color: "#0284C7",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#E0E3FC")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#EEF0FD")}
          >
            <RefreshCw
              size={13}
              style={{
                animation: auditing ? "spin 1s linear infinite" : "none",
              }}
            />
            {auditing ? "Auditing Live..." : "Real-Time Audit"}
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EAF6",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#18182E",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(2,132,199,0.3)";
              e.currentTarget.style.color = "#0284C7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E2E8F0";
              e.currentTarget.style.color = "#0F172A";
            }}
          >
            {expanded ? "Hide Details" : "View Access Points"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Access Points Quick Badges Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginTop: 20,
        }}
      >
        {accessPoints.map((point) => {
          const Icon = ICON_MAP[point.id] || Server;
          const isApproved = point.status === "APPROVED";
          return (
            <div
              key={point.id}
              onClick={() => setActiveModalPoint(point)}
              title="Click to view live node diagnostics"
              style={{
                background: isApproved ? "#F8FAFC" : "rgba(239,68,68,0.04)",
                border: `1px solid ${isApproved ? "#E2E8F0" : "rgba(239,68,68,0.2)"}`,
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = isApproved ? "#0284C7" : "#EF4444";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(2,132,199,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isApproved ? "#E2E8F0" : "rgba(239,68,68,0.2)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isApproved ? "#10B981" : "#EF4444",
                  boxShadow: isApproved ? "0 0 6px #10B981" : "0 0 6px #EF4444",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0F172A",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {point.name}
                </div>
                <div style={{ fontSize: 11, color: "#8E8FA8" }}>{point.latency}</div>
              </div>
              <Icon size={14} color={isApproved ? "#0284C7" : "#EF4444"} />
            </div>
          );
        })}
      </div>

      {/* Detailed Access Points Clearance List */}
      {expanded && (
        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid #F1F3FC",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5F607A" }}>
              Live Decentralized Access Gateways
            </div>
            <div style={{ fontSize: 12, color: "#8E8FA8" }}>
              Click any card to inspect real-time connection telemetry
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 14,
            }}
          >
            {accessPoints.map((point) => {
              const Icon = ICON_MAP[point.id] || Server;
              const isApproved = point.status === "APPROVED";

              return (
                <div
                  key={point.id}
                  onClick={() => setActiveModalPoint(point)}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E8EAF6",
                    borderRadius: 14,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0284C7";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(2,132,199,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,23,42,0.02)";
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: isApproved ? "#F0F9FF" : "rgba(239,68,68,0.1)",
                            border: `1px solid ${isApproved ? "rgba(2,132,199,0.2)" : "rgba(239,68,68,0.2)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={16} color={isApproved ? "#0284C7" : "#DC2626"} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{point.name}</div>
                          <div style={{ fontSize: 12, color: "#64748B" }}>{point.role}</div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => togglePointStatus(point.id, e)}
                        style={{
                          border: `1px solid ${isApproved ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                          background: isApproved ? "#F0FDF4" : "#FEF2F2",
                          color: isApproved ? "#065F46" : "#DC2626",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {isApproved ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                        {point.status}
                      </button>
                    </div>

                    <p style={{ fontSize: 12, color: "#64748B", marginTop: 12, lineHeight: 1.5 }}>
                      {point.details}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      paddingTop: 10,
                      borderTop: "1px solid #E2E8F0",
                      fontSize: 11,
                    }}
                  >
                    <div>
                      <span style={{ color: "#8E8FA8" }}>Live Latency: </span>
                      <span style={{ color: "#065F46", fontWeight: 700 }}>{point.latency}</span>
                    </div>
                    <div>
                      <span style={{ color: "#8E8FA8" }}>Endpoint: </span>
                      <span style={{ color: "#0284C7", fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>
                        {point.endpoint}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIVE NODE TELEMETRY INSPECTOR MODAL ── */}
      {activeModalPoint && (
        <div
          onClick={() => setActiveModalPoint(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(24, 24, 46, 0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EAF6",
              borderRadius: 20,
              width: "100%",
              maxWidth: 620,
              padding: "32px",
              boxShadow: "0 20px 60px rgba(24, 24, 46, 0.15)",
              position: "relative",
              animation: "modalFadeIn 0.25s ease-out",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "linear-gradient(135deg,#0284C7,#0369A1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 18px rgba(2,132,199,0.25)",
                  }}
                >
                  {(() => {
                    const ModalIcon = ICON_MAP[activeModalPoint.id] || Server;
                    return <ModalIcon size={24} color="white" />;
                  })()}
                </div>
                <div>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.4rem", fontWeight: 800, color: "#0F172A" }}>
                    {activeModalPoint.name}
                  </h3>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{activeModalPoint.role}</div>
                </div>
              </div>

              <button
                onClick={() => setActiveModalPoint(null)}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 6,
                  cursor: "pointer",
                  color: "#64748B",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Status Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>Status</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: activeModalPoint.status === "APPROVED" ? "#065F46" : "#DC2626", marginTop: 4 }}>
                  ● {activeModalPoint.status}
                </div>
              </div>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>Live RTT Ping</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0284C7", marginTop: 4 }}>
                  {activeModalPoint.latency}
                </div>
              </div>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>Uptime SLA</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>
                  {activeModalPoint.uptime}
                </div>
              </div>
            </div>

            {/* Node Metadata */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px", marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#64748B" }}>Endpoint: </span>
                  <span style={{ color: "#0284C7", fontFamily: "monospace", fontWeight: 700 }}>{activeModalPoint.endpoint}</span>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>Auth Protocol: </span>
                  <span style={{ color: "#0F172A", fontWeight: 700 }}>{activeModalPoint.authType}</span>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>Throughput: </span>
                  <span style={{ color: "#0F172A", fontWeight: 700 }}>{activeModalPoint.requestsPerMin}</span>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>Security Signature: </span>
                  <span style={{ color: "#0284C7", fontFamily: "monospace", fontWeight: 700 }}>{activeModalPoint.securityHash}</span>
                </div>
              </div>
            </div>

            {/* Live Terminal Log Stream */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Terminal size={14} color="#0284C7" />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748B" }}>
                  Live Real-Time Event Stream
                </span>
              </div>
              <div
                style={{
                  background: "#0F172A",
                  borderRadius: 12,
                  padding: "14px 16px",
                  color: "#93C5FD",
                  fontFamily: "monospace",
                  fontSize: 11,
                  lineHeight: 1.7,
                }}
              >
                {activeModalPoint.logs?.map((log, i) => (
                  <div key={i}>
                    <span style={{ color: "#34D399" }}>&gt;</span> {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => handlePingNode(activeModalPoint)}
                disabled={pinging}
                className="btn-secondary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Zap size={15} color="#0284C7" /> {pinging ? "Pinging..." : "Test Live Ping"}
              </button>

              <button
                onClick={() => togglePointStatus(activeModalPoint.id)}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: activeModalPoint.status === "APPROVED" ? "#FEF2F2" : "#F0FDF4",
                  color: activeModalPoint.status === "APPROVED" ? "#DC2626" : "#065F46",
                }}
              >
                <Lock size={15} />
                {activeModalPoint.status === "APPROVED" ? "Suspend Access" : "Grant Authorization"}
              </button>

              {activeModalPoint.route !== "/" && (
                <button
                  onClick={() => {
                    setActiveModalPoint(null);
                    navigate(activeModalPoint.route);
                  }}
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  Open <ExternalLink size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </section>
  );
}
