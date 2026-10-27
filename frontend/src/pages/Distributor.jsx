import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, CheckCircle2, ArrowLeft, Package, ArrowRight, Clock,
  Loader2, Send, RotateCcw, Building2, Link2, Store, AlertCircle,
  RefreshCw, Search, Unlink, ShieldCheck, Users, ChevronRight,
} from "lucide-react";
import Background from "../components/layout/Background";
import Header from "../components/layout/Header";
import BlockchainStatus from "../components/ui/BlockchainStatus";
import TransferTimeline from "../components/ui/TransferTimeline";
import MedicineImage from "../components/ui/MedicineImage";
import { useApp } from "../context/AppContext";
import { supplyChainService } from "../services/supplyChainService";
import { transferService } from "../services/transferService";
import toast, { Toaster } from "react-hot-toast";

const TAB = { TRANSFERS: "transfers", MANUFACTURERS: "manufacturers", PHARMACIES: "pharmacies" };

export default function Distributor() {
  const { transfers, confirmTransfer, forwardToPharmacy, user } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(TAB.TRANSFERS);
  const [confirming, setConfirming] = useState(null);
  const [forwarding, setForwarding] = useState(null);

  // Manufacturer directory
  const [manufacturers, setManufacturers] = useState([]);
  const [mfrSearch, setMfrSearch] = useState("");
  const [mfrLoading, setMfrLoading] = useState(false);
  const [linkingMfr, setLinkingMfr] = useState(null);

  // Pharmacy directory
  const [pharmacies, setPharmacies] = useState([]);
  const [pharmSearch, setPharmSearch] = useState("");
  const [pharmLoading, setPharmLoading] = useState(false);
  const [linkingPharm, setLinkingPharm] = useState(null);

  // Forward modal
  const [showForwardModal, setShowForwardModal] = useState(null); // transferId
  const [myPharmacies, setMyPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  // ── Load Manufacturers ────────────────────────────────────────────────
  const loadManufacturers = useCallback(async () => {
    setMfrLoading(true);
    try {
      const data = await supplyChainService.getManufacturers(mfrSearch);
      setManufacturers(data || []);
    } catch (e) {
      toast.error("Failed to load manufacturers");
    } finally {
      setMfrLoading(false);
    }
  }, [mfrSearch]);

  // ── Load Pharmacies ───────────────────────────────────────────────────
  const loadPharmacies = useCallback(async () => {
    setPharmLoading(true);
    try {
      const data = await supplyChainService.getPharmacies(pharmSearch);
      setPharmacies(data || []);
    } catch (e) {
      toast.error("Failed to load pharmacies");
    } finally {
      setPharmLoading(false);
    }
  }, [pharmSearch]);

  // ── Load my pharmacies for forward modal ─────────────────────────────
  const loadMyPharmacies = useCallback(async () => {
    try {
      const data = await supplyChainService.getMyPharmacies();
      setMyPharmacies(data || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (activeTab === TAB.MANUFACTURERS) loadManufacturers();
    if (activeTab === TAB.PHARMACIES) loadPharmacies();
  }, [activeTab]);

  // ── Link Manufacturer ────────────────────────────────────────────────
  const handleLinkManufacturer = async (mfr) => {
    setLinkingMfr(mfr._id);
    try {
      await supplyChainService.createLink(mfr._id, "MANUFACTURER_DISTRIBUTOR");
      toast.success(`✅ Linked with ${mfr.companyName || mfr.name}! You can now receive their medicine batches.`);
      loadManufacturers();
    } catch (e) {
      toast.error(e.message || "Failed to create link");
    } finally {
      setLinkingMfr(null);
    }
  };

  // ── Link Pharmacy ─────────────────────────────────────────────────────
  const handleLinkPharmacy = async (pharm) => {
    setLinkingPharm(pharm._id);
    try {
      await supplyChainService.createLink(pharm._id, "DISTRIBUTOR_PHARMACY");
      toast.success(`✅ Linked with ${pharm.companyName || pharm.pharmacyName || pharm.name}! You can now forward batches to them.`);
      loadPharmacies();
      loadMyPharmacies();
    } catch (e) {
      toast.error(e.message || "Failed to create link");
    } finally {
      setLinkingPharm(null);
    }
  };

  // ── Confirm Transfer ──────────────────────────────────────────────────
  const handleConfirm = async (id) => {
    setConfirming(id);
    try {
      await confirmTransfer(id);
      toast.success("✅ Manufacturer → Distributor recorded on blockchain & MongoDB!");
    } catch (err) {
      toast.error(err.message || "Failed to confirm transfer");
    } finally {
      setConfirming(null);
    }
  };

  // ── Forward to Pharmacy ───────────────────────────────────────────────
  const openForwardModal = async (transferId) => {
    await loadMyPharmacies();
    setShowForwardModal(transferId);
    setSelectedPharmacy(null);
  };

  const handleForward = async () => {
    if (!showForwardModal) return;
    setForwarding(showForwardModal);
    try {
      await transferService.forwardToPharmacy(showForwardModal, {
        pharmacyUserId: selectedPharmacy?._id,
        destinationPharmacy: selectedPharmacy?.companyName || selectedPharmacy?.pharmacyName || selectedPharmacy?.name,
      });
      toast.success("✅ Distributor → Pharmacy recorded on blockchain & MongoDB!");
      setShowForwardModal(null);
      setSelectedPharmacy(null);
    } catch (err) {
      toast.error(err.message || "Failed to forward batch to pharmacy");
    } finally {
      setForwarding(null);
    }
  };

  /* Status helpers */
  const isPending = (t) => t.blockchainStatus === "Pending Confirmation";
  const isConfirmed = (t) => t.blockchainStatus === "Confirmed";
  const isForwarded = (t) => t.blockchainStatus === "Forwarded to Pharmacy";

  const statusColor = (t) =>
    isForwarded(t)
      ? { text: "#065F46", bg: "#F0FDF4", border: "rgba(16,185,129,0.3)" }
      : isConfirmed(t)
      ? { text: "#0284C7", bg: "#F0F9FF", border: "rgba(2,132,199,0.3)" }
      : { text: "#92400E", bg: "#FEF3C7", border: "rgba(245,158,11,0.3)" };

  const tabStyle = (id) => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "10px 8px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    transition: "all 0.2s",
    background: activeTab === id ? "#0284C7" : "transparent",
    color: activeTab === id ? "#FFFFFF" : "#64748B",
    boxShadow: activeTab === id ? "0 2px 8px rgba(2,132,199,0.25)" : "none",
  });

  return (
    <div className="page-bg" style={{ minHeight: "100vh" }}>
      <Background />
      <Header />
      <Toaster position="top-right" />

      <main style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1360, margin: "0 auto", padding: "108px 36px 80px" }}>
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "10px 18px", cursor: "pointer", color: "#0F172A", fontSize: 13, fontWeight: 700, marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.03)", transition: "all 0.2s" }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#0284C7,#0369A1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(2,132,199,0.25)" }}>
            <Truck size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "2rem", fontWeight: 800, color: "#0F172A" }}>
              Distributor Dashboard
            </h1>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              {user?.companyName || user?.company || user?.name} &nbsp;·&nbsp; Link manufacturers, manage transfers, supply pharmacies
            </p>
          </div>
        </div>

        {/* Permission notice */}
        <div style={{ background: "#F0F9FF", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 14, padding: "14px 20px", marginBottom: 28, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            <strong style={{ color: "#0284C7" }}>Distributor workflow:</strong>&nbsp;
            1) Link yourself to an approved <strong>Manufacturer</strong> to receive their batches.&nbsp;
            2) Link yourself to <strong>Pharmacies</strong> you supply.&nbsp;
            3) <strong>Confirm</strong> incoming batches and <strong>Forward</strong> them to linked pharmacies.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Pending Transfers", value: transfers.filter(isPending).length, color: "#D97706", bg: "rgba(245,158,11,0.08)", icon: Clock },
            { label: "Confirmed Receipt", value: transfers.filter(isConfirmed).length, color: "#0284C7", bg: "rgba(2,132,199,0.08)", icon: CheckCircle2 },
            { label: "Forwarded to Pharm", value: transfers.filter(isForwarded).length, color: "#059669", bg: "rgba(5,150,105,0.08)", icon: Send },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="stat-card" style={{ transition: "all 0.3s ease" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#8E8FA8" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: 5, marginBottom: 28, gap: 4 }}>
          <button style={tabStyle(TAB.TRANSFERS)} onClick={() => setActiveTab(TAB.TRANSFERS)}>
            <Package size={15} /> Incoming Transfers
          </button>
          <button style={tabStyle(TAB.MANUFACTURERS)} onClick={() => setActiveTab(TAB.MANUFACTURERS)}>
            <Building2 size={15} /> Manufacturers Directory
          </button>
          <button style={tabStyle(TAB.PHARMACIES)} onClick={() => setActiveTab(TAB.PHARMACIES)}>
            <Store size={15} /> Pharmacies Directory
          </button>
        </div>

        {/* ── Tab: Incoming Transfers ── */}
        {activeTab === TAB.TRANSFERS && (
          <div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748B", marginBottom: 16 }}>
              Incoming Transfers ({transfers.length})
            </h2>

            {transfers.length === 0 ? (
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 18, padding: "48px 28px", textAlign: "center" }}>
                <Package size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginBottom: 8 }}>No incoming transfers yet</div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>
                  First, link yourself to a Manufacturer. Once they register a medicine batch, you'll see it here.
                </div>
                <button
                  onClick={() => setActiveTab(TAB.MANUFACTURERS)}
                  style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, background: "#0284C7", color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  <Building2 size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Browse Manufacturers
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {transfers.map((t) => {
                  const c = statusColor(t);
                  return (
                    <div key={t.id} style={{ background: "#FFFFFF", border: `1px solid ${c.border}`, borderRadius: 18, padding: "24px 28px", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>

                      {/* ── Manufacturer Medicine Image ── */}
                      {t.medicineImage && (
                        <div style={{ marginBottom: 20, borderRadius: 12, overflow: "hidden", border: "1px solid #E2E8F0", maxHeight: 160 }}>
                          <MedicineImage
                            src={t.medicineImage}
                            alt={t.medicineName}
                            style={{ height: 160 }}
                            placeholderSize={100}
                          />
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                            <Package size={18} color="#0284C7" />
                            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{t.medicineName}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: c.text, background: c.bg, border: `1px solid ${c.border}`, padding: "3px 10px", borderRadius: 100 }}>
                              {t.blockchainStatus}
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
                            {[
                              { label: "Batch ID", value: t.batchId },
                              { label: "From Manufacturer", value: t.from },
                              { label: "Quantity", value: t.quantity },
                              { label: "Transfer ID", value: t.id },
                              { label: "Timestamp", value: t.timestamp },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8E8FA8", marginBottom: 3 }}>{label}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#18182E" }}>{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Chain badges */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#F0F9FF", border: "1px solid rgba(2,132,199,0.25)", borderRadius: 100, padding: "3px 10px" }}>
                              Manufacturer ({t.from})
                            </span>
                            {(isConfirmed(t) || isForwarded(t)) && (
                              <>
                                <ArrowRight size={12} color="#8E8FA8" />
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#F0F9FF", border: "1px solid rgba(2,132,199,0.25)", borderRadius: 100, padding: "3px 10px" }}>
                                  Distributor ✓
                                </span>
                              </>
                            )}
                            {isForwarded(t) && (
                              <>
                                <ArrowRight size={12} color="#8E8FA8" />
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#065F46", background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 100, padding: "3px 10px" }}>
                                  Pharmacy ✓
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 180 }}>
                          {isPending(t) && (
                            <button
                              id={`confirm-btn-${t.id}`}
                              className="btn-green"
                              onClick={() => handleConfirm(t.id)}
                              disabled={confirming === t.id}
                              style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "10px 20px", fontSize: 13 }}
                            >
                              {confirming === t.id ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Confirming...</> : <><CheckCircle2 size={14} /> Confirm Received</>}
                            </button>
                          )}

                          {isConfirmed(t) && (
                            <button
                              id={`forward-btn-${t.id}`}
                              className="btn-primary"
                              onClick={() => openForwardModal(t.id)}
                              disabled={forwarding === t.id}
                              style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "10px 20px", fontSize: 13 }}
                            >
                              {forwarding === t.id ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Forwarding...</> : <><Truck size={14} /> Forward to Pharmacy</>}
                            </button>
                          )}

                          {isForwarded(t) && (
                            <div style={{ padding: "10px 16px", borderRadius: 10, background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.3)", fontSize: 12, fontWeight: 700, color: "#065F46", textAlign: "center" }}>
                              ✓ Forwarded to Pharmacy
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Manufacturers Directory ── */}
        {activeTab === TAB.MANUFACTURERS && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5F607A", marginBottom: 4 }}>
                  Approved Manufacturers
                </h2>
                <p style={{ fontSize: 13, color: "#94A3B8" }}>
                  Link yourself to manufacturers to start receiving their medicine batches.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: 12, color: "#8E8FA8" }} />
                  <input
                    value={mfrSearch}
                    onChange={(e) => setMfrSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadManufacturers()}
                    placeholder="Search manufacturers..."
                    style={{ paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, border: "1px solid #E8EAF6", borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 200 }}
                  />
                </div>
                <button onClick={loadManufacturers} style={{ padding: "10px 16px", borderRadius: 10, background: "#0284C7", color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {mfrLoading ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <Loader2 size={32} color="#0284C7" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
                <div style={{ marginTop: 14, color: "#64748B", fontSize: 13 }}>Loading manufacturers...</div>
              </div>
            ) : manufacturers.length === 0 ? (
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 18, padding: "48px 28px", textAlign: "center" }}>
                <Users size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#475569" }}>No approved manufacturers yet</div>
                <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 8 }}>Wait for manufacturers to register and get approved by the Creator.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {manufacturers.map((mfr) => (
                  <div key={mfr._id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 10px rgba(15,23,42,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#0284C7,#0D9488)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Building2 size={22} color="white" />
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 3 }}>
                          {mfr.companyName || mfr.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          Code: <strong>{mfr.companyCode || "—"}</strong>
                          &nbsp;·&nbsp;
                          Phone: {mfr.phone || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{mfr.email}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {mfr.linkStatus === "APPROVED" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.3)", fontSize: 12, fontWeight: 700, color: "#065F46" }}>
                          <Link2 size={13} /> Linked ✓
                        </div>
                      ) : (
                        <button
                          onClick={() => handleLinkManufacturer(mfr)}
                          disabled={linkingMfr === mfr._id}
                          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, background: "#0284C7", color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                        >
                          {linkingMfr === mfr._id ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Linking...</> : <><Link2 size={13} /> Link Manufacturer</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Pharmacies Directory ── */}
        {activeTab === TAB.PHARMACIES && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5F607A", marginBottom: 4 }}>
                  Approved Pharmacies
                </h2>
                <p style={{ fontSize: 13, color: "#94A3B8" }}>
                  Link yourself to pharmacies so you can forward medicine batches to them.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: 12, color: "#8E8FA8" }} />
                  <input
                    value={pharmSearch}
                    onChange={(e) => setPharmSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadPharmacies()}
                    placeholder="Search pharmacies..."
                    style={{ paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, border: "1px solid #E8EAF6", borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 200 }}
                  />
                </div>
                <button onClick={loadPharmacies} style={{ padding: "10px 16px", borderRadius: 10, background: "#0284C7", color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {pharmLoading ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <Loader2 size={32} color="#0284C7" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
                <div style={{ marginTop: 14, color: "#64748B", fontSize: 13 }}>Loading pharmacies...</div>
              </div>
            ) : pharmacies.length === 0 ? (
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 18, padding: "48px 28px", textAlign: "center" }}>
                <Store size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#475569" }}>No approved pharmacies yet</div>
                <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 8 }}>Pharmacies must register and get approved before you can supply them.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {pharmacies.map((pharm) => (
                  <div key={pharm._id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 10px rgba(15,23,42,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#059669,#10B981)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Store size={22} color="white" />
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 3 }}>
                          {pharm.companyName || pharm.pharmacyName || pharm.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          License: <strong>{pharm.companyCode || pharm.licenseNumber || "—"}</strong>
                          &nbsp;·&nbsp;
                          Phone: {pharm.phone || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{pharm.email}</div>
                      </div>
                    </div>

                    <div>
                      {pharm.linkStatus === "APPROVED" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.3)", fontSize: 12, fontWeight: 700, color: "#065F46" }}>
                          <Link2 size={13} /> Linked ✓
                        </div>
                      ) : (
                        <button
                          onClick={() => handleLinkPharmacy(pharm)}
                          disabled={linkingPharm === pharm._id}
                          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, background: "#059669", color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                        >
                          {linkingPharm === pharm._id ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Linking...</> : <><Link2 size={13} /> Link Pharmacy</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blockchain status */}
        <div style={{ marginTop: 40 }}>
          <BlockchainStatus status="Connected" />
        </div>
      </main>

      {/* ── Forward to Pharmacy Modal ── */}
      {showForwardModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 20, maxWidth: 500, width: "100%", boxShadow: "0 24px 60px rgba(15,23,42,0.2)", overflow: "hidden", border: "1px solid #E2E8F0" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>Forward to Pharmacy</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Select a linked pharmacy to receive this batch</div>
              </div>
              <button onClick={() => setShowForwardModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 22, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              {myPharmacies.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <AlertCircle size={32} color="#F59E0B" style={{ margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>No linked pharmacies</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>
                    You need to link at least one pharmacy first. Go to the <strong>Pharmacies Directory</strong> tab and link a pharmacy.
                  </div>
                  <button onClick={() => { setShowForwardModal(null); setActiveTab(TAB.PHARMACIES); }} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, background: "#0284C7", color: "#FFF", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Go to Pharmacies
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Select destination pharmacy:</div>
                  <div style={{ display: "grid", gap: 10, maxHeight: 260, overflowY: "auto" }}>
                    {myPharmacies.map((pharm) => (
                      <div
                        key={pharm._id}
                        onClick={() => setSelectedPharmacy(pharm)}
                        style={{ padding: "14px 16px", borderRadius: 12, border: `2px solid ${selectedPharmacy?._id === pharm._id ? "#0284C7" : "#E2E8F0"}`, background: selectedPharmacy?._id === pharm._id ? "#F0F9FF" : "#FAFAFA", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#059669,#10B981)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Store size={18} color="white" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{pharm.companyName || pharm.pharmacyName || pharm.name}</div>
                          <div style={{ fontSize: 12, color: "#64748B" }}>{pharm.email}</div>
                        </div>
                        {selectedPharmacy?._id === pharm._id && <CheckCircle2 size={18} color="#0284C7" style={{ marginLeft: "auto" }} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <button onClick={() => setShowForwardModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                      Cancel
                    </button>
                    <button
                      onClick={handleForward}
                      disabled={!selectedPharmacy || forwarding}
                      style={{ flex: 2, padding: "11px", borderRadius: 10, background: selectedPharmacy ? "#0284C7" : "#CBD5E1", color: "#FFF", border: "none", fontWeight: 700, fontSize: 13, cursor: selectedPharmacy ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    >
                      {forwarding ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Forwarding...</> : <><Truck size={14} /> Forward to {selectedPharmacy?.companyName || selectedPharmacy?.name || "Pharmacy"}</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
