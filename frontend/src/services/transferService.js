import api from "./api";

export const transferService = {
  async createTransfer(transferData) {
    const res = await api.post("/transfers", transferData);
    return res.data;
  },

  async getOutgoingTransfers() {
    const res = await api.get("/transfers/outgoing");
    return res.data || [];
  },

  async getIncomingTransfers() {
    const res = await api.get("/transfers/incoming");
    return res.data || [];
  },

  async confirmTransfer(transferId) {
    const res = await api.post(`/transfers/${encodeURIComponent(transferId)}/confirm`);
    return res.data;
  },

  async rejectTransfer(transferId, rejectionReason = "") {
    const res = await api.post(`/transfers/${encodeURIComponent(transferId)}/reject`, {
      rejectionReason,
    });
    return res.data;
  },

  async forwardToPharmacy(transferId, pharmacyData = {}) {
    const res = await api.post(`/transfers/${encodeURIComponent(transferId)}/forward`, pharmacyData);
    return res.data;
  },

  async confirmPharmacyReceipt(medicineId) {
    const res = await api.post(`/pharmacy/${encodeURIComponent(medicineId)}/confirm`);
    return res.data;
  },

  async getNotifications() {
    const res = await api.get("/notifications");
    return res.data || [];
  },

  async markNotificationRead(id) {
    const res = await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
    return res.data;
  },
};
