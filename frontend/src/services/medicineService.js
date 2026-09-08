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

    if (medicineData.medicineFile) {
      formData.append("medicineImage", medicineData.medicineFile);
    }
    if (medicineData.certFile) {
      formData.append("governmentCertificate", medicineData.certFile);
    }

    const res = await api.post("/medicines", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async getAllMedicines() {
    const res = await api.get("/medicines");
    return res.data || [];
  },

  async getMedicineById(id) {
    const res = await api.get(`/medicines/${encodeURIComponent(id)}`);
    return res.data || null;
  },
};
