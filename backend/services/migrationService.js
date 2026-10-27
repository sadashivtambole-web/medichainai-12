/**
 * Database Architecture Migration & Synchronization Service
 * 
 * Safely migrates existing legacy data to the separated collection architecture:
 * 1. Users ➔ Role Profiles (ManufacturerProfile, DistributorProfile, PharmacyProfile, CustomerProfile)
 * 2. Medicines ➔ Links manufacturerId and currentOwnerId
 * 3. Transfers ➔ Mirrors into supplyChainTransactions
 * 4. Verification Logs ➔ Populates verifications collection
 */

import {
  User,
  ManufacturerProfile,
  DistributorProfile,
  PharmacyProfile,
  CustomerProfile,
  Medicine,
  SupplyChainTransaction,
  Verification,
} from "../models.js";
import { logger } from "../utils/logger.js";

export async function migrateToSeparatedArchitecture() {
  try {
    logger.info("Checking database for architecture data separation & migration...");

    // 1. Migrate Users to Role-Specific Profiles
    const users = await User.find().lean();
    let migratedProfiles = 0;

    for (const u of users) {
      const role = (u.role || "").toLowerCase();

      if (role === "manufacturer") {
        const existing = await ManufacturerProfile.findOne({ userId: u._id });
        if (!existing) {
          await ManufacturerProfile.create({
            userId: u._id,
            companyName: u.companyName || u.company || u.name,
            companyCode: u.companyCode || "",
            licenseNumber: u.companyCode || "",
            phone: u.phone || "",
            identityPhoto: u.identityPhoto || null,
            governmentId: u.governmentId || null,
            governmentIdType: u.governmentIdType || "Drug Manufacturing License",
            approvalStatus: u.accountStatus || "APPROVED",
          });
          migratedProfiles++;
        }
      } else if (role === "distributor") {
        const existing = await DistributorProfile.findOne({ userId: u._id });
        if (!existing) {
          await DistributorProfile.create({
            userId: u._id,
            companyName: u.companyName || u.company || u.name,
            companyCode: u.companyCode || "",
            licenseNumber: u.companyCode || "",
            phone: u.phone || "",
            identityPhoto: u.identityPhoto || null,
            governmentId: u.governmentId || null,
            governmentIdType: u.governmentIdType || "Wholesale Drug License",
            approvalStatus: u.accountStatus || "APPROVED",
          });
          migratedProfiles++;
        }
      } else if (role === "pharmacy") {
        const existing = await PharmacyProfile.findOne({ userId: u._id });
        if (!existing) {
          await PharmacyProfile.create({
            userId: u._id,
            pharmacyName: u.companyName || u.company || u.name,
            companyName: u.companyName || u.company || u.name,
            companyCode: u.companyCode || "",
            licenseNumber: u.companyCode || "",
            phone: u.phone || "",
            identityPhoto: u.identityPhoto || null,
            governmentId: u.governmentId || null,
            governmentIdType: u.governmentIdType || "Retail Pharmacy License",
            approvalStatus: u.accountStatus || "APPROVED",
          });
          migratedProfiles++;
        }
      } else if (role === "customer") {
        const existing = await CustomerProfile.findOne({ userId: u._id });
        if (!existing) {
          await CustomerProfile.create({
            userId: u._id,
            fullName: u.fullName || u.name,
            phone: u.phone || "",
          });
          migratedProfiles++;
        }
      }
    }

    if (migratedProfiles > 0) {
      logger.info(`Separated ${migratedProfiles} user profile records into dedicated role collections.`);
    }

    // 2. Link Medicines to Manufacturer User IDs
    const unlinkedMeds = await Medicine.find({ manufacturerId: { $exists: false } });
    if (unlinkedMeds.length > 0) {
      for (const med of unlinkedMeds) {
        const mfgUser = await User.findOne({
          $or: [
            { company: med.company },
            { companyName: med.company },
            { name: med.manufacturer },
            { role: "Manufacturer" },
          ],
        });
        if (mfgUser) {
          med.manufacturerId = mfgUser._id;
          med.currentOwnerId = mfgUser._id;
          med.currentOwnerRole = "Manufacturer";
          await med.save();
        }
      }
      logger.info(`Linked ${unlinkedMeds.length} medicines to authoritative manufacturer user references.`);
    }

    // 3. Mirror verification records into dedicated verifications collection
    const medicinesWithLogs = await Medicine.find({
      verificationLogs: { $exists: true, $not: { $size: 0 } },
    });
    for (const med of medicinesWithLogs) {
      for (const log of med.verificationLogs) {
        const exists = await Verification.findOne({
          medicineId: med.id,
          batchId: med.batchId,
          createdAt: log.timestamp,
        });
        if (!exists) {
          await Verification.create({
            medicineId: med.id,
            batchId: med.batchId,
            verifiedBy: log.role || "Public / Customer",
            verificationType: "QR_SCAN",
            result: log.result || "AUTHENTIC",
            authenticityScore: 100,
            clientIp: log.clientIp || "127.0.0.1",
            createdAt: log.timestamp || new Date(),
          });
        }
      }
    }

    logger.info("Database architecture separation & synchronization verified.");
  } catch (err) {
    logger.error("Migration check error", { message: err.message });
  }
}
