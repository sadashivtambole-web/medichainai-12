import { AUTHORIZED_VALIDATORS } from "../types/blockchain.types.js";

export class ValidatorManager {
  constructor(initialValidators = AUTHORIZED_VALIDATORS) {
    this.authorizedValidators = new Set(initialValidators);
  }

  /**
   * Check if a validator node identity is authorized to sign & mint blocks
   * @param {string} validatorId 
   * @returns {boolean}
   */
  isAuthorized(validatorId) {
    if (!validatorId) return false;
    return this.authorizedValidators.has(String(validatorId).trim());
  }

  /**
   * Add a new permissioned validator node
   * @param {string} validatorId 
   */
  addValidator(validatorId) {
    if (validatorId) {
      this.authorizedValidators.add(String(validatorId).trim());
    }
  }

  /**
   * Remove a validator node
   * @param {string} validatorId 
   */
  removeValidator(validatorId) {
    this.authorizedValidators.delete(String(validatorId).trim());
  }

  /**
   * List all current authorized validator nodes
   * @returns {string[]}
   */
  listValidators() {
    return Array.from(this.authorizedValidators);
  }
}
