/**
 * Clean Development Seed Script (Separated Architecture)
 * Section 33 & 34: Clean development seed data following strict role separation.
 * Run manually via: node scripts/seedDatabase.js
 */

import dotenv from "dotenv";
import { connectDatabase, closeDatabaseConnection } from "../db.js";
import {
  User,
  ManufacturerProfile,
  DistributorProfile,
  PharmacyProfile,
  CustomerProfile,
  Medicine,
  SupplyChainTransaction,
  BlockchainTransaction,
  AuditLog,
} from "../models.js";
import { recordMedicineOnChain, recordTransferOnChain } from "../blockchain.js";

dotenv.config();

async function seedDatabase() {
  console.log("🌱 Starting development database seeding with separated architecture...");
  await connectDatabase();

  const accounts = [
    {
      name: "Super Administrator",
      email: "admin@example.com",
      password: "Password123!",
      role: "Creator",
      accountStatus: "APPROVED",
    },
    {
      name: "Apex BioPharma Labs",
      email: "manufacturer@example.com",
      password: "Password123!",
      role: "Manufacturer",
      accountStatus: "APPROVED",
      profile: {
        companyName: "Apex BioPharma Labs",
        companyCode: "MFR-APEX-9988",
        licenseNumber: "MFR-APEX-9988",
        phone: "+91 98765 43210",
        address: "Plot 42, Biotech Industrial Zone, Hyderabad",
        governmentIdType: "Drug Manufacturing License",
      },
    },
    {
      name: "Metro Logistics & Distribution",
      email: "distributor@example.com",
      password: "Password123!",
      role: "Distributor",
      accountStatus: "APPROVED",
      profile: {
        companyName: "Metro Logistics & Distribution",
        companyCode: "DIST-METRO-4411",
        licenseNumber: "DIST-METRO-4411",
        phone: "+91 98765 12345",
        address: "Central Warehouse Hub 5, Mumbai",
        governmentIdType: "Wholesale Drug License",
      },
    },
    {
      name: "LifeCare Retail Pharmacy",
      email: "pharmacy@example.com",
      password: "Password123!",
      role: "Pharmacy",
      accountStatus: "APPROVED",
      profile: {
        pharmacyName: "LifeCare Retail Pharmacy",
        companyName: "LifeCare Retail Pharmacy",
        companyCode: "PHARM-LIFE-2233",
        licenseNumber: "PHARM-LIFE-2233",
        phone: "+91 98765 67890",
        address: "Shop 12, Main Street, Bengaluru",
        governmentIdType: "Retail Pharmacy License",
      },
    },
    {
      name: "Rahul Verma",
      email: "customer@example.com",
      password: "Password123!",
      role: "Customer",
      accountStatus: "APPROVED",
      profile: {
        fullName: "Rahul Verma",
        phone: "+91 98765 99999",
        address: "Indiranagar, Bengaluru",
      },
    },
  ];

  const seededUsers = {};

  for (const acc of accounts) {
    let user = await User.findOne({ email: acc.email });
    if (!user) {
      user = new User({
        name: acc.name,
        fullName: acc.name,
        email: acc.email,
        password: acc.password,
        role: acc.role,
        accountStatus: acc.accountStatus,
        approvalStatus: acc.accountStatus,
        isEmailVerified: true,
      });
      await user.save();
      console.log(`  ✓ Created user: ${acc.email} (${acc.role})`);
    } else {
      console.log(`  ℹ User exists: ${acc.email} (${acc.role})`);
    }
    seededUsers[acc.role] = user;

    // Seed dedicated profile
    if (acc.profile) {
      if (acc.role === "Manufacturer") {
        await ManufacturerProfile.findOneAndUpdate(
          { userId: user._id },
          { $set: { ...acc.profile, userId: user._id, approvalStatus: "APPROVED" } },
          { upsert: true, new: true }
        );
      } else if (acc.role === "Distributor") {
        await DistributorProfile.findOneAndUpdate(
          { userId: user._id },
          { $set: { ...acc.profile, userId: user._id, approvalStatus: "APPROVED" } },
          { upsert: true, new: true }
        );
      } else if (acc.role === "Pharmacy") {
        await PharmacyProfile.findOneAndUpdate(
          { userId: user._id },
          { $set: { ...acc.profile, userId: user._id, approvalStatus: "APPROVED" } },
          { upsert: true, new: true }
        );
      } else if (acc.role === "Customer") {
        await CustomerProfile.findOneAndUpdate(
          { userId: user._id },
          { $set: { ...acc.profile, userId: user._id } },
          { upsert: true, new: true }
        );
      }
      console.log(`  ✓ Synchronized profile for: ${acc.email}`);
    }
  }

  // Seed sample medicine following supply chain relationship
  const mfrUser = seededUsers["Manufacturer"];
  const distUser = seededUsers["Distributor"];
  const batchId = "BT-APEX-2026";
  const medId = "MED-2024-901";

  let medicine = await Medicine.findOne({ batchId });
  if (!medicine) {
    console.log("  → Registering authentic batch on DrugChain...");
    const chainRecord = await recordMedicineOnChain(
      {
        id: medId,
        batchId,
        name: "Amoxicillin 500mg",
        manufacturer: "Apex BioPharma Labs",
        manufacturerCode: "MFR-APEX-9988",
        manufacturingDate: "2024-03-01",
        expiryDate: "2027-03-01",
      },
      "Manufacturer"
    );

    medicine = new Medicine({
      id: medId,
      batchId,
      name: "Amoxicillin 500mg",
      medicineName: "Amoxicillin 500mg",
      manufacturerId: mfrUser._id,
      manufacturer: "Apex BioPharma Labs",
      company: "Apex BioPharma Labs",
      manufacturerCode: "MFR-APEX-9988",
      manufacturingDate: "2024-03-01",
      expiryDate: "2027-03-01",
      price: "₹185.00",
      quantity: 2500,
      currentOwnerId: distUser._id,
      currentOwnerRole: "Distributor",
      currentHolder: "Distributor",
      status: "AUTHENTIC",
      medicineDataHash: chainRecord.dataHash,
      blockchainTxHash: chainRecord.txHash,
      blockchainStatus: "Confirmed",
      transferHistory: [
        {
          step: 1,
          role: "Manufacturer",
          actor: "Apex BioPharma Labs",
          timestamp: new Date().toLocaleString("en-IN"),
          status: "Registered",
          txHash: chainRecord.txHash,
        },
      ],
    });
    await medicine.save();

    // SupplyChainTransaction
    const transferId = "TR-901001";
    await SupplyChainTransaction.findOneAndUpdate(
      { id: transferId },
      {
        $set: {
          id: transferId,
          transferId,
          medicineId: medId,
          medicineName: "Amoxicillin 500mg",
          batchId,
          fromUserId: mfrUser._id,
          fromRole: "Manufacturer",
          from: "Apex BioPharma Labs",
          toUserId: distUser._id,
          toRole: "Distributor",
          to: "Metro Logistics & Distribution",
          quantity: "2500 Units",
          timestamp: new Date().toLocaleString("en-IN"),
          action: "CONFIRMED",
          status: "Confirmed",
          blockchainStatus: "Confirmed",
          confirmTxHash: chainRecord.txHash,
        },
      },
      { upsert: true }
    );

    // BlockchainTransaction
    await BlockchainTransaction.create({
      medicineId: medId,
      batchId,
      transactionType: "MEDICINE_REGISTRATION",
      blockIndex: chainRecord.blockIndex || 1,
      transactionHash: chainRecord.txHash,
      dataHash: chainRecord.dataHash || "",
      timestamp: new Date(),
      validationStatus: "VALID",
    });

    // AuditLog
    await AuditLog.create({
      userId: mfrUser._id,
      email: mfrUser.email,
      role: "Manufacturer",
      action: "MEDICINE_REGISTERED",
      resource: "Medicine",
      resourceId: medId,
      result: "SUCCESS",
      details: { batchId, seeded: true },
    });

    console.log("  ✓ Seeded authentic medicine, supply chain transaction, and blockchain record!");
  }

  console.log("✅ Development database seeding complete!");
  await closeDatabaseConnection();
}

seedDatabase().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
