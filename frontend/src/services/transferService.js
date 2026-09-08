import api from "./api";

export const transferService = {
  async getIncomingTransfers() {
    const res = await api.get("/transfers/incoming");
    return res.data || [];
  },

  async confirmTransfer(transferId) {
    const res = await api.post(`/transfers/${encodeURIComponent(transferId)}/confirm`);
    return res.data;
  },

  async forwardToPharmacy(transferId) {
    const res = await api.post(`/transfers/${encodeURIComponent(transferId)}/forward`);
    return res.data;
  },

  async confirmPharmacyReceipt(medicineId) {
    const res = await api.post(`/pharmacy/${encodeURIComponent(medicineId)}/confirm`);
    return res.data;
  },
};
