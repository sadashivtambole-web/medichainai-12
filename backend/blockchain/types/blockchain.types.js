/**
 * DrugChain Type Definitions & Constants
 * Custom Permissioned Blockchain for Fake Drug Detection
 */

export const TRANSACTION_TYPES = {
  MEDICINE_REGISTERED: "MEDICINE_REGISTERED",
  MEDICINE_TRANSFERRED: "MEDICINE_TRANSFERRED",
  RECEIPT_CONFIRMED: "RECEIPT_CONFIRMED",
  MEDICINE_VERIFIED: "MEDICINE_VERIFIED",
};

export const AUTHORIZED_VALIDATORS = [
  "validator-manufacturer",
  "validator-distributor",
  "validator-pharmacy",
  "validator-admin",
  "validator-creator",
  "validator-authority-root",
  "genesis-authority",
];

export const GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
