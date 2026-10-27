/**
 * Supply Chain Service
 * Handles manufacturer/distributor/pharmacy directory lookups and persistent linking.
 */
import api from "./api";

export const supplyChainService = {
  // ── Directory Listings ──────────────────────────────────────────────

  /** Get all approved Manufacturers (for Distributor dashboard) */
  async getManufacturers(search = "") {
    const params = search ? { search } : {};
    const res = await api.get("/manufacturers", { params });
    return res.data || [];
  },

  /** Get all approved Distributors (for Manufacturer/Pharmacy use) */
  async getDistributors() {
    const res = await api.get("/distributors");
    return res.data || [];
  },

  /** Get all approved Pharmacies (for Distributor use) */
  async getPharmacies(search = "") {
    const params = search ? { search } : {};
    const res = await api.get("/pharmacies", { params });
    return res.data || [];
  },

  // ── My Links (resolved) ──────────────────────────────────────────────

  /** Get the Manufacturers that this Distributor is linked with */
  async getMyManufacturers() {
    const res = await api.get("/supply-chain/my-manufacturers");
    return res.data || [];
  },

  /** Get the Pharmacies that this Distributor is linked with */
  async getMyPharmacies() {
    const res = await api.get("/supply-chain/my-pharmacies");
    return res.data || [];
  },

  /** List all my supply-chain links (raw) */
  async getMyLinks(linkType = null, direction = null) {
    const params = {};
    if (linkType) params.linkType = linkType;
    if (direction) params.direction = direction;
    const res = await api.get("/supply-chain/links", { params });
    return res.data || [];
  },

  // ── Linking Actions ──────────────────────────────────────────────────

  /**
   * Create a supply-chain link.
   * @param {string} targetUserId - MongoDB _id of the target user
   * @param {string} linkType - "MANUFACTURER_DISTRIBUTOR" | "DISTRIBUTOR_PHARMACY"
   */
  async createLink(targetUserId, linkType) {
    const res = await api.post("/supply-chain/link", { targetUserId, linkType });
    return res;
  },

  /** Remove a supply-chain link by its ID */
  async removeLink(linkId) {
    const res = await api.delete(`/supply-chain/links/${linkId}`);
    return res;
  },
};
