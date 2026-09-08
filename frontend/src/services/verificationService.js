import api from "./api";

export const verificationService = {
  async verifyAI(formData) {
    const res = await api.post("/verification/ai", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async verifyPublicCode(code) {
    const res = await api.get(`/public/verify/${encodeURIComponent(code)}`);
    return res.data;
  },

  async verifyQR(code) {
    const res = await api.post("/qr/verify", { code });
    return res.data;
  },

  async generateQR(medicineId, batchId) {
    const res = await api.post("/qr/generate", { medicineId, batchId });
    return res.data;
  },

  async getBlockchainStatus() {
    const res = await api.get("/blockchain/status");
    return res.data;
  },

  async getBlockchainMedicine(medicineId) {
    const res = await api.get(`/blockchain/medicine/${encodeURIComponent(medicineId)}`);
    return res.data;
  },

  async getBlockchainHistory(medicineId) {
    const res = await api.get(`/blockchain/history/${encodeURIComponent(medicineId)}`);
    return res.data;
  },

  async auditDrugChain() {
    const res = await api.get("/creator/blockchain/audit");
    return res.data;
  },
};

