/**
 * DrugChain Comprehensive Automated Test Suite
 * Tests all 9 Core Dimensions of Custom Permissioned Blockchain
 */

import {
  Blockchain,
  Block,
  Transaction,
  DrugChainService,
  sha256,
  calculateMedicineDataHash,
  calculateMerkleRoot,
  TRANSACTION_TYPES,
  AUTHORIZED_VALIDATORS,
} from "./blockchain/index.js";
import { BlockchainStorage } from "./blockchain/storage/blockchainStorage.js";
import path from "path";
import fs from "fs";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n🧪 ════════════════════════════════════════════════════════════");
  console.log("   DRUGCHAIN AUTOMATED TEST SUITE (CUSTOM PRIVATE BLOCKCHAIN)");
  console.log("════════════════════════════════════════════════════════════\n");

  const testDir = path.resolve(process.cwd(), "blockchain", "data");
  const testStoragePath = path.resolve(testDir, "test-chain.json");

  // Clean test chain if exists
  if (fs.existsSync(testStoragePath)) {
    fs.unlinkSync(testStoragePath);
  }

  const storage = new BlockchainStorage(testStoragePath);
  const blockchain = new Blockchain({ storage, autoLoad: true });
  const service = new DrugChainService(blockchain);

  /* ───────────────────────────────────────────────────────────
     1. GENESIS BLOCK TESTS
  ─────────────────────────────────────────────────────────── */
  console.log("📦 1. Genesis Block Tests");
  const genesis = blockchain.chain[0];
  assert(genesis !== undefined, "Genesis block created");
  assert(genesis.index === 0, "Genesis block has index 0");
  assert(
    genesis.previousHash === "0000000000000000000000000000000000000000000000000000000000000000",
    "Genesis block previousHash is 64 zeros"
  );
  assert(genesis.validator === "genesis-authority", "Genesis block validator is authorized authority");
  assert(genesis.isValid().valid === true, "Genesis block internal hash & Merkle root are valid");

  /* ───────────────────────────────────────────────────────────
     2. DETERMINISTIC HASHING TESTS
  ─────────────────────────────────────────────────────────── */
  console.log("\n🔐 2. Deterministic SHA-256 Hashing Tests");
  const medPayload1 = {
    medicineId: "MED-TEST-001",
    batchNumber: "BT-999",
    medicineName: "Amoxicillin 500mg",
    manufacturerCode: "MFR-01",
    manufacturingDate: "2024-01-01",
    expiryDate: "2026-01-01",
  };
  const hash1 = calculateMedicineDataHash(medPayload1);
  const hash2 = calculateMedicineDataHash(medPayload1);
  assert(hash1 === hash2, "Identical medicine data produces deterministic, identical SHA-256 hash");

  const medPayload2 = { ...medPayload1, expiryDate: "2025-12-31" };
  const hash3 = calculateMedicineDataHash(medPayload2);
  assert(hash1 !== hash3, "Tampering even 1 date character alters the medicineDataHash completely");

  /* ───────────────────────────────────────────────────────────
     3. BLOCK & MERKLE ROOT TESTS
  ─────────────────────────────────────────────────────────── */
  console.log("\n🧱 3. Block Structure & Merkle Root Tests");
  const dummyTx = new Transaction({
    type: TRANSACTION_TYPES.MEDICINE_REGISTERED,
    medicineId: "MED-TEST-001",
    batchNumber: "BT-999",
    to: "Global Pharma",
    dataHash: hash1,
  });
  const block1 = await blockchain.addBlock([dummyTx], "validator-manufacturer");
  assert(block1.index === 1, "Block 1 successfully minted with index 1");
  assert(block1.previousHash === genesis.hash, "Block 1 correctly references Genesis Block hash");
  assert(block1.merkleRoot.length === 64, "Block 1 calculates valid 64-char hex Merkle Root");
  assert(block1.isValid(genesis, (v) => AUTHORIZED_VALIDATORS.includes(v)).valid === true, "Block 1 validation passes");

  /* ───────────────────────────────────────────────────────────
     4. TAMPER DETECTION TESTS
  ─────────────────────────────────────────────────────────── */
  console.log("\n🛡️ 4. Cryptographic Tamper & Corruption Detection Tests");
  const auditBefore = blockchain.isValidChain();
  assert(auditBefore.valid === true, "Original DrugChain passes 100% cryptographic audit");

  // Simulate malicious tampering with transaction in Block 1
  const originalTxId = block1.transactions[0].medicineId;
  block1.transactions[0].medicineId = "COUNTERFEIT-MED-HACKED";
  const auditTampered = blockchain.isValidChain();
  assert(auditTampered.valid === false, "Altering a transaction in Block 1 immediately causes CHAIN_INVALID");

  // Restore
  block1.transactions[0].medicineId = originalTxId;
  assert(blockchain.isValidChain().valid === true, "Chain validity restored after correcting data");

  /* ───────────────────────────────────────────────────────────
     5. MEDICINE REGISTRATION SERVICE TESTS
  ─────────────────────────────────────────────────────────── */
  console.log("\n💊 5. Medicine Registration Workflow");
  const regResult = await service.registerMedicine({
    medicineId: "MED-PARACETAMOL-100",
    batchNumber: "BT-PARA-100",
    medicineName: "Paracetamol 650mg",
    manufacturerCode: "MFR-GLOBAL",
    manufacturerName: "Global Pharma Ltd",
    manufacturingDate: "2024-02-01",
    expiryDate: "2026-02-01",
    validator: "validator-manufacturer",
  });
  assert(regResult.success === true, "Medicine registered successfully on DrugChain");
  assert(regResult.blockIndex >= 2, `Block index #${regResult.blockIndex} created for registration`);
  assert(regResult.dataHash.length === 64, "Medicine data hash generated and stored");

  // Duplicate batch test
  let duplicateCaught = false;
  try {
    await service.registerMedicine({
      medicineId: "MED-DUPLICATE",
      batchNumber: "BT-PARA-100",
      medicineName: "Fake Copy",
      manufacturerCode: "MFR-FAKE",
      manufacturingDate: "2024-02-01",
      expiryDate: "2026-02-01",
    });
  } catch (e) {
    duplicateCaught = true;
  }
  assert(duplicateCaught === true, "Duplicate registration of registered batch is strictly rejected");

  /* ───────────────────────────────────────────────────────────
     6. SUPPLY CHAIN TRANSFER WORKFLOW
  ─────────────────────────────────────────────────────────── */
  console.log("\n🚚 6. Supply Chain Transfer Sequence Tests");
  const transfer1 = await service.transferMedicine({
    medicineId: "MED-PARACETAMOL-100",
    batchNumber: "BT-PARA-100",
    from: "Global Pharma Ltd",
    to: "Express Distributors",
    fromRole: "Manufacturer",
    toRole: "Distributor",
    validator: "validator-distributor",
  });
  assert(transfer1.success === true, "Manufacturer → Distributor transfer recorded on DrugChain");

  // Invalid transition test (Manufacturer skipping to Pharmacy)
  let invalidTransitionCaught = false;
  try {
    await service.transferMedicine({
      medicineId: "MED-PARACETAMOL-100",
      batchNumber: "BT-PARA-100",
      from: "Global Pharma Ltd",
      to: "City Pharmacy",
      fromRole: "Manufacturer",
      toRole: "Pharmacy",
    });
  } catch (e) {
    invalidTransitionCaught = true;
  }
  assert(invalidTransitionCaught === true, "Invalid supply chain jump (Manufacturer → Pharmacy) rejected");

  /* ───────────────────────────────────────────────────────────
     7. RECEIPT CONFIRMATION TESTS
  ─────────────────────────────────────────────────────────── */
  console.log("\n📥 7. Receipt Confirmation Tests");
  const receipt1 = await service.confirmReceipt({
    medicineId: "MED-PARACETAMOL-100",
    batchNumber: "BT-PARA-100",
    actor: "Express Distributors",
    role: "Distributor",
    validator: "validator-distributor",
  });
  assert(receipt1.success === true, "Distributor custody confirmation recorded in new block");

  // Forward to Pharmacy & confirm
  const transfer2 = await service.transferMedicine({
    medicineId: "MED-PARACETAMOL-100",
    batchNumber: "BT-PARA-100",
    from: "Express Distributors",
    to: "City Pharmacy Central",
    fromRole: "Distributor",
    toRole: "Pharmacy",
    validator: "validator-pharmacy",
  });
  assert(transfer2.success === true, "Distributor → Pharmacy transfer recorded in new block");

  const receipt2 = await service.confirmReceipt({
    medicineId: "MED-PARACETAMOL-100",
    batchNumber: "BT-PARA-100",
    actor: "City Pharmacy Central",
    role: "Pharmacy",
    validator: "validator-pharmacy",
  });
  assert(receipt2.success === true, "Pharmacy shelf receipt confirmed on DrugChain");

  /* ───────────────────────────────────────────────────────────
     8. VERIFICATION WORKFLOW (MATCH & MISMATCH)
  ─────────────────────────────────────────────────────────── */
  console.log("\n🔍 8. End-to-End Cryptographic Verification Tests");
  // 1. Genuine verification
  const genuineCheck = await service.verifyMedicine({
    medicineId: "MED-PARACETAMOL-100",
    batchNumber: "BT-PARA-100",
    submittedData: {
      medicineId: "MED-PARACETAMOL-100",
      batchNumber: "BT-PARA-100",
      medicineName: "Paracetamol 650mg",
      manufacturerCode: "MFR-GLOBAL",
      manufacturingDate: "2024-02-01",
      expiryDate: "2026-02-01",
    },
    verifier: "Hospital POS Scanner",
  });
  assert(genuineCheck.result === "MATCH", "Authentic medicine parameters return cryptographic MATCH");
  assert(genuineCheck.match === true, "Match flag is true");

  // 2. Tampered / Counterfeit verification
  const fakeCheck = await service.verifyMedicine({
    medicineId: "MED-PARACETAMOL-100",
    batchNumber: "BT-PARA-100",
    submittedData: {
      medicineId: "MED-PARACETAMOL-100",
      batchNumber: "BT-PARA-100",
      medicineName: "Paracetamol 650mg",
      manufacturerCode: "MFR-GLOBAL",
      manufacturingDate: "2024-02-01",
      expiryDate: "2029-12-31", // Counterfeit altered expiry date!
    },
    verifier: "Customer Mobile App",
  });
  assert(fakeCheck.result === "MISMATCH", "Altered expiry date detected as cryptographic MISMATCH");
  assert(fakeCheck.match === false, "Match flag is false");

  /* ───────────────────────────────────────────────────────────
     9. PERSISTENCE & RELOAD TEST
  ─────────────────────────────────────────────────────────── */
  console.log("\n💾 9. Disk Persistence & State Reload Tests");
  const chainLengthBefore = blockchain.getLength();
  // Create a second blockchain instance from the same disk storage
  const restoredBlockchain = new Blockchain({ storage, autoLoad: true });
  assert(
    restoredBlockchain.getLength() === chainLengthBefore,
    `Reloaded DrugChain matches exact length of ${chainLengthBefore} blocks from disk`
  );
  assert(
    restoredBlockchain.isValidChain().valid === true,
    "Restored DrugChain validates 100% of blocks with zero integrity errors"
  );

  // History timeline extraction
  const history = service.getMedicineHistory("MED-PARACETAMOL-100");
  assert(history.length >= 4, `Traceability history extracted ${history.length} lifecycle events for medicine`);

  // Cleanup test chain
  if (fs.existsSync(testStoragePath)) {
    fs.unlinkSync(testStoragePath);
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution exception:", err);
  process.exit(1);
});
