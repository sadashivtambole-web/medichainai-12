import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";
import { medicineService } from "../services/medicineService";
import { transferService } from "../services/transferService";
import { verificationService } from "../services/verificationService";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(authService.getCurrentUser() || null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [medicines, setMedicines] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [blockchainInfo, setBlockchainInfo] = useState(null);

  // Restore User Session & Initial Data
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        // 1. Check Authenticated Session
        const tokenInStorage = localStorage.getItem("token");
        let activeUser = null;
        if (tokenInStorage) {
          try {
            const me = await authService.getMe();
            if (me && (me.accountStatus === "APPROVED" || me.role === "Creator")) {
              setUser(me);
              setToken(tokenInStorage);
              activeUser = me;
            } else {
              setUser(null);
              setToken(null);
              localStorage.removeItem("token");
              localStorage.removeItem("user");
            }
          } catch {
            setUser(null);
            setToken(null);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        }

        // 2. Fetch Live Medicines & Transfers only for Approved Users
        if (activeUser) {
          const [meds, trans] = await Promise.allSettled([
            medicineService.getAllMedicines(),
            transferService.getIncomingTransfers(),
          ]);

          if (meds.status === "fulfilled" && Array.isArray(meds.value)) {
            setMedicines(meds.value);
            setServerOnline(true);
          }
          if (trans.status === "fulfilled" && Array.isArray(trans.value)) {
            setTransfers(trans.value);
          }
        }

        // 3. Network health indicator
        try {
          const chain = await verificationService.getBlockchainStatus();
          if (chain) setBlockchainInfo(chain);
        } catch {}
      } catch (err) {
        console.warn("API Connection note:", err.message);
      } finally {
        setLoading(false);
      }
    }

    init();

    // Listen for global logout events
    const handleLogout = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success) {
      if (res.data?.requiresOtp || res.requiresOtp) {
        return {
          requiresOtp: true,
          email: res.data?.email || email,
          maskedEmail: res.data?.maskedEmail,
          loginSessionToken: res.data?.loginSessionToken,
          purpose: res.data?.purpose || "LOGIN",
          role: res.data?.role,
        };
      }
      if (res.data?.user) {
        setUser(res.data.user);
        setToken(res.data.token);
        return {
          user: res.data.user,
          mustChangePassword: !!res.data.mustChangePassword,
        };
      }
    }
    throw new Error(res.message || "Login failed");
  };

  const verifyLoginOtp = async (email, otp, loginSessionToken) => {
    const res = await authService.verifyLoginOtp(email, otp, loginSessionToken);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      setToken(res.data.token);
      return {
        user: res.data.user,
        mustChangePassword: !!res.data.mustChangePassword,
      };
    }
    throw new Error(res.message || "Verification failed");
  };

  const registerUser = async (userData) => {
    const res = await authService.register(userData);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      setToken(res.data.token);
      return res.data.user;
    }
    throw new Error(res.message || "Registration failed");
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  /* ── Manufacturer Action: Register Medicine on Real Backend ── */
  const registerMedicine = async (medicineData) => {
    // medicineService throws a typed error with .alreadyRegistered = true for duplicate batches.
    // Let it propagate directly so Manufacturer.jsx can inspect error.alreadyRegistered.
    const saved = await medicineService.registerMedicine({
      ...medicineData,
      manufacturerName: medicineData.manufacturerName || user?.name,
      companyName: medicineData.companyName || user?.company,
      manufacturerCode: medicineData.manufacturerCode || user?.companyCode,
    });

    if (saved) {
      // Prepend new medicine to local list (avoid duplicates)
      setMedicines((prev) => [saved, ...prev.filter((m) => m.id !== saved.id && m.batchId !== saved.batchId)]);
      // Refresh transfers to show the new pending distributor transfer
      try {
        const trans = await transferService.getIncomingTransfers();
        setTransfers(trans);
      } catch (e) {}
      return saved;
    }
    throw new Error("Failed to register medicine on server");
  };


  /* ── Distributor Action: Confirm Received on Real Backend ── */
  const confirmTransfer = async (transferId) => {
    const updatedTransfer = await transferService.confirmTransfer(transferId);
    if (updatedTransfer) {
      setTransfers((prev) =>
        prev.map((t) => (t.id === transferId ? { ...t, ...updatedTransfer } : t))
      );
      // Reload medicines to show updated history
      const meds = await medicineService.getAllMedicines();
      setMedicines(meds);
      return updatedTransfer;
    }
  };

  /* ── Distributor Action: Transfer to Pharmacy on Real Backend ── */
  const forwardToPharmacy = async (transferId) => {
    const forwardedTransfer = await transferService.forwardToPharmacy(transferId);
    if (forwardedTransfer) {
      setTransfers((prev) =>
        prev.map((t) => (t.id === transferId ? { ...t, ...forwardedTransfer } : t))
      );
      const meds = await medicineService.getAllMedicines();
      setMedicines(meds);
      return forwardedTransfer;
    }
  };

  /* ── Pharmacy Action: Confirm Receipt on Real Backend ── */
  const confirmPharmacyReceipt = async (medicineId) => {
    const updated = await transferService.confirmPharmacyReceipt(medicineId);
    if (updated) {
      setMedicines((prev) =>
        prev.map((m) => (m.id === medicineId || m.batchId === medicineId ? { ...m, ...updated } : m))
      );
      return updated;
    }
  };

  /* ── Customer / Universal Public Verify Action ── */
  const verifyMedicineCode = async (code) => {
    return await verificationService.verifyPublicCode(code);
  };

  const loadTransfers = async () => {
    try {
      const trans = await transferService.getIncomingTransfers();
      setTransfers(trans || []);
      return trans;
    } catch (e) {
      return [];
    }
  };

  const loadMedicines = async () => {
    try {
      const meds = await medicineService.getAllMedicines();
      setMedicines(meds || []);
      return meds;
    } catch (e) {
      return [];
    }
  };

  /* ── Distributor Action: Reject Transfer on Real Backend ── */
  const rejectTransfer = async (transferId, rejectionReason = "") => {
    const rejectedTransfer = await transferService.rejectTransfer(transferId, rejectionReason);
    if (rejectedTransfer) {
      setTransfers((prev) =>
        prev.map((t) => (t.id === transferId ? { ...t, ...rejectedTransfer, status: "Rejected", blockchainStatus: "Rejected" } : t))
      );
      return rejectedTransfer;
    }
  };

  /* ── Local query helper ── */
  const getMedicineById = (id) =>
    medicines.find(
      (m) =>
        m.id?.toLowerCase() === id?.toLowerCase() ||
        m.batchId?.toLowerCase() === id?.toLowerCase() ||
        m.name?.toLowerCase().includes(id?.toLowerCase())
    );

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        token,
        login,
        verifyLoginOtp,
        registerUser,
        logout,
        medicines,
        transfers,
        loading,
        serverOnline,
        blockchainInfo,
        profileOpen,
        setProfileOpen,
        registerMedicine,
        confirmTransfer,
        rejectTransfer,
        forwardToPharmacy,
        confirmPharmacyReceipt,
        verifyMedicineCode,
        getMedicineById,
        loadTransfers,
        loadMedicines,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
