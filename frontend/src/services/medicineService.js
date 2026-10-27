import api from "./api";

export const medicineService = {
  async registerMedicine(medicineData) {
    const formData = new FormData();
    formData.append("manufacturerName", medicineData.manufacturerName || medicineData.manufacturer || "");
    formData.append("companyName", medicineData.companyName || medicineData.company || "");
    formData.append("manufacturerCode", medicineData.manufacturerCode || "");
    formData.append("medicineName", medicineData.medicineName || medicineData.name || "");
    formData.append("batchNumber", medicineData.batchNumber || medicineData.batchId || "");
    formData.append("manufacturingDate", medicineData.manufacturingDate || "");
    formData.append("expiryDate", medicineData.expiryDate || "");
    formData.append("price", medicineData.price || "");
    formData.append("quantity", medicineData.quantity || 1000);
    formData.append("composition", medicineData.composition || "");

    if (medicineData.medicineFile) {
      formData.append("medicineImage", medicineData.medicineFile);
    }
    if (medicineData.certFile) {
      formData.append("governmentCertificate", medicineData.certFile);
    }

    const res = await api.post("/medicines", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Backend returns { success: false, alreadyRegistered: true, data: {...} } for duplicate batches.
    // Throw a typed error so the UI can show the existing record instead of a generic error toast.
    if (res && res.alreadyRegistered) {
      const error = new Error(res.message || "This batch is already registered.");
      error.alreadyRegistered = true;
      error.existingRecord = res.data;
      error.code = res.code;
      throw error;
    }

    return res.data || res;
  },

  async getAllMedicines(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/medicines${query ? `?${query}` : ""}`);
    return res.data || [];
  },

  async getMedicineById(id) {
    const res = await api.get(`/medicines/${encodeURIComponent(id)}`);
    return res.data || null;
  },

  /**
   * Admin / Creator: Fetch all pending medicine submissions
   */
  async getPendingMedicines() {
    const res = await api.get("/creator/medicines/pending");
    return res.data || [];
  },

  /**
   * Admin / Creator: Fetch all medicines with status and search filters
   */
  async getCreatorMedicines(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const res = await api.get(`/creator/medicines${query ? `?${query}` : ""}`);
    return res.data || [];
  },

  /**
   * Admin / Creator: Approve a medicine submission on DrugChain
   */
  async approveMedicine(id) {
    const res = await api.patch(`/creator/medicines/${encodeURIComponent(id)}/approve`);
    return res;
  },

  /**
   * Admin / Creator: Reject a medicine submission with mandatory reason
   */
  async rejectMedicine(id, rejectionReason) {
    const res = await api.patch(`/creator/medicines/${encodeURIComponent(id)}/reject`, {
      rejectionReason,
    });
    return res;
  },

  /**
   * Pre-check if a batch number is already registered before submitting the form.
   * Returns { registered: true, record: {...} } or { registered: false }
   */
  async checkBatchExists(batchNumber) {
    try {
      const res = await api.get(`/medicines/${encodeURIComponent(batchNumber.trim().toUpperCase())}`);
      if (res.data) return { registered: true, record: res.data };
      return { registered: false };
    } catch {
      return { registered: false };
    }
  },
};
