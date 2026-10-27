/**
 * Profile Service — Manages separate business profile collections for each role.
 * Ensures User authentication records never store business or inventory data.
 */

import {
  User,
  ManufacturerProfile,
  DistributorProfile,
  PharmacyProfile,
  CustomerProfile,
} from "../models.js";

/**
 * Fetch role-specific profile document for a given user
 * @param {object} user - User document or ID
 * @returns {Promise<object|null>} Profile document
 */
export async function getProfileForUser(user) {
  if (!user) return null;
  const userId = user._id || user.id || user;
  const role = (user.role || "").toLowerCase();

  switch (role) {
    case "manufacturer":
      return ManufacturerProfile.findOne({ userId });
    case "distributor":
      return DistributorProfile.findOne({ userId });
    case "pharmacy":
      return PharmacyProfile.findOne({ userId });
    case "customer":
      return CustomerProfile.findOne({ userId });
    default:
      return null;
  }
}

/**
 * Create or update role-specific business profile for a user
 * @param {object} user - User document
 * @param {object} profileData - Profile attributes
 * @returns {Promise<object>} Created/updated profile document
 */
export async function createOrUpdateProfile(user, profileData = {}) {
  if (!user || !user._id) return null;
  const userId = user._id;
  const role = (user.role || "").toLowerCase();

  const updateFields = {};
  if (profileData.approvalStatus !== undefined) updateFields.approvalStatus = profileData.approvalStatus;
  else if (user.accountStatus) updateFields.approvalStatus = user.accountStatus;

  if (profileData.phone !== undefined) updateFields.phone = (profileData.phone || "").trim();
  if (profileData.address !== undefined) updateFields.address = (profileData.address || "").trim();
  if (profileData.walletAddress !== undefined) updateFields.walletAddress = (profileData.walletAddress || "").trim();
  if (profileData.identityPhoto !== undefined) updateFields.identityPhoto = profileData.identityPhoto;
  if (profileData.governmentId !== undefined) updateFields.governmentId = profileData.governmentId;
  if (profileData.governmentIdType !== undefined) updateFields.governmentIdType = profileData.governmentIdType;

  switch (role) {
    case "manufacturer": {
      if (profileData.companyName !== undefined || profileData.company !== undefined) {
        updateFields.companyName = (profileData.companyName || profileData.company || "").trim();
      }
      if (profileData.companyCode !== undefined || profileData.licenseNumber !== undefined) {
        const code = (profileData.companyCode || profileData.licenseNumber || "").trim();
        updateFields.companyCode = code;
        updateFields.licenseNumber = code;
      }

      return ManufacturerProfile.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    case "distributor": {
      if (profileData.companyName !== undefined || profileData.company !== undefined) {
        updateFields.companyName = (profileData.companyName || profileData.company || "").trim();
      }
      if (profileData.companyCode !== undefined || profileData.licenseNumber !== undefined) {
        const code = (profileData.companyCode || profileData.licenseNumber || "").trim();
        updateFields.companyCode = code;
        updateFields.licenseNumber = code;
      }

      return DistributorProfile.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    case "pharmacy": {
      const pharmacyDisplayName = (profileData.pharmacyName || profileData.companyName || profileData.company || "").trim();
      if (pharmacyDisplayName) {
        updateFields.pharmacyName = pharmacyDisplayName;
        updateFields.companyName = pharmacyDisplayName;
      }
      if (profileData.companyCode !== undefined || profileData.licenseNumber !== undefined) {
        const code = (profileData.companyCode || profileData.licenseNumber || "").trim();
        updateFields.companyCode = code;
        updateFields.licenseNumber = code;
      }

      return PharmacyProfile.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    case "customer": {
      if (profileData.fullName !== undefined || profileData.name !== undefined) {
        updateFields.fullName = (profileData.fullName || profileData.name || "").trim();
      }
      if (profileData.preferences !== undefined) {
        updateFields.preferences = profileData.preferences;
      }
      return CustomerProfile.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    default:
      return null;
  }
}

/**
 * Return a safe, sanitized user object merged with their profile for client response
 * @param {object} user - User document
 * @returns {Promise<object>} Safe User DTO
 */
export async function getSafeUserWithProfile(user) {
  if (!user) return null;
  const profile = await getProfileForUser(user);
  return user.toSafeObject(profile);
}
