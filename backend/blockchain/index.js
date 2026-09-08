/**
 * DrugChain - Custom Permissioned Blockchain for Fake Drug Detection
 * Exports Core Components & Singleton Service
 */

export { Block } from "./core/Block.js";
export { Blockchain } from "./core/Blockchain.js";
export { Transaction } from "./core/Transaction.js";
export { ValidatorManager } from "./core/Validator.js";
export { BlockchainStorage } from "./storage/blockchainStorage.js";
export { DrugChainService, drugChainService } from "./services/drugChainService.js";
export {
  sha256,
  calculateBlockHash,
  calculateMedicineDataHash,
  calculateMerkleRoot,
} from "./crypto/hash.js";
export {
  TRANSACTION_TYPES,
  AUTHORIZED_VALIDATORS,
  GENESIS_PREVIOUS_HASH,
} from "./types/blockchain.types.js";
