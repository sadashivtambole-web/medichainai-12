import api from "./api";

export const authService = {
  async register(userData) {
    const isFormData = userData instanceof FormData;
    const res = await api.post("/auth/register", userData, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    if (res.success && res.data?.token) {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }
    return res;
  },

  async sendOtp(email, fullName) {
    return api.post("/auth/send-otp", { email, fullName });
  },

  async verifyOtp(email, otp) {
    return api.post("/auth/verify-otp", { email, otp });
  },

  async resubmit(formData) {
    return api.patch("/auth/resubmit", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  async login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    if (res.success && res.data?.token) {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }
    return res;
  },

  async verifyRegistrationOtp(email, otp, registrationId = "") {
    return api.post("/auth/verify-registration-otp", { email, otp, registrationId });
  },

  async verifyLoginOtp(email, otp, loginSessionToken) {
    const res = await api.post("/auth/verify-login-otp", { email, otp, loginSessionToken });
    if (res.success && res.data?.token) {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }
    return res;
  },

  async resendOtp(email, purpose = "LOGIN", loginSessionToken = "", registrationId = "") {
    return api.post("/auth/resend-otp", { email, purpose, loginSessionToken, registrationId });
  },

  async changePassword(newPassword, confirmPassword) {
    return api.post("/auth/change-password", { newPassword, confirmPassword });
  },

  async forgotPassword(email) {
    return api.post("/auth/forgot-password", { email });
  },

  async resetPassword(email, otp, newPassword, confirmPassword) {
    return api.post("/auth/reset-password", { email, otp, newPassword, confirmPassword });
  },

  async getMe() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const res = await api.get("/auth/me");
      if (res.success && res.data?.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch (e) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return null;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getCurrentUser() {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  },

  /* Creator Approvals & Review */
  async getCreatorApprovals() {
    return api.get("/creator/approvals");
  },

  async getUserDetails(userId) {
    return api.get(`/creator/users/${userId}`);
  },

  async approveUser(userId) {
    return api.patch(`/creator/users/${userId}/approve`);
  },

  async rejectUser(userId, reason) {
    return api.patch(`/creator/users/${userId}/reject`, { reason });
  },

  async resendCredentials(userId) {
    return api.post(`/creator/users/${userId}/resend-credentials`);
  },

  async resendNotification(userId) {
    return api.post(`/creator/users/${userId}/resend-notification`);
  },

  async runOcrAssistance(userId) {
    return api.post(`/creator/users/${userId}/id-ocr`);
  },
};

