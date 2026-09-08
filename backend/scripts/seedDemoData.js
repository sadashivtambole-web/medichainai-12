/**
 * Standalone Development / Demonstration Data Seeder
 * Run manually via: node scripts/seedDemoData.js
 * DO NOT run automatically during production server startup.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Medicine, Transfer } from "../models.js";
import { recordMedicineOnChain } from "../blockchain.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fake_drug_detection";

async function seedDemoData() {
  console.log("🌱 Connecting to MongoDB for manual demo seeding...");
  await mongoose.connect(MONGO_URI);

  const existingCount = await Medicine.countDocuments();
  console.log(`Current medicine records in DB: ${existingCount}`);

  console.log("Seeding authentic demo medicine on DrugChain and MongoDB...");

  const med1Id = "MED-2024-001";
  const batch1 = "BT001";
  const med1Record = await recordMedicineOnChain({
    id: med1Id,
    batchId: batch1,
    name: "Paracetamol 500mg",
    manufacturer: "XYZ Pharma Ltd.",
    manufacturerCode: "MFR-XYZ-001",
    manufacturingDate: "2024-01-15",
    expiryDate: "2026-01-15",
  });

  const med1 = new Medicine({
    id: med1Id,
    batchId: batch1,
    name: "Paracetamol 500mg",
    manufacturer: "XYZ Pharma Ltd.",
    manufacturerName: "Dr. Rajesh Sharma",
    company: "XYZ Pharma Ltd.",
    manufacturerCode: "MFR-XYZ-001",
    manufacturingDate: "2024-01-15",
    expiryDate: "2026-01-15",
    price: "₹120.00",
    quantity: 5000,
    status: "AUTHENTIC",
    medicineDataHash: med1Record.dataHash,
    blockchainTxHash: med1Record.txHash,
    blockchainStatus: "Confirmed",
    transferHistory: [
      {
        step: 1,
        role: "Manufacturer",
        actor: "XYZ Pharma Ltd.",
        timestamp: "15/01/2024, 10:30:00 am",
        status: "Registered",
        txHash: med1Record.txHash,
      },
    ],
    currentHolder: "Manufacturer",
  });

  await med1.save();

  const tr1 = new Transfer({
    id: "TR-894101",
    medicineId: med1Id,
    medicineName: "Paracetamol 500mg",
    batchId: batch1,
    from: "XYZ Pharma Ltd.",
    to: "ABC Distributors",
    quantity: "5000 Units",
    timestamp: "15/01/2024, 10:30:00 am",
    blockchainStatus: "Pending Confirmation",
  });
  await tr1.save();

  console.log("✅ Demo medicine successfully seeded on DrugChain & MongoDB!");
  await mongoose.disconnect();
}

seedDemoData().catch(console.error);
