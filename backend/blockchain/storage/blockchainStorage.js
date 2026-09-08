import fs from "fs";
import path from "path";

export class BlockchainStorage {
  /**
   * @param {string} [storageFilePath] 
   */
  constructor(storageFilePath = null) {
    this.filePath =
      storageFilePath ||
      path.resolve(process.cwd(), "blockchain", "data", "chain.json");
    
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Save blockchain data atomically with Windows fallback
   * @param {Array<Object>} chainData 
   */
  async saveChain(chainData) {
    const tempPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const jsonString = JSON.stringify(chainData, null, 2);

    try {
      await fs.promises.writeFile(tempPath, jsonString, "utf-8");
      try {
        await fs.promises.rename(tempPath, this.filePath);
      } catch (renameErr) {
        await fs.promises.copyFile(tempPath, this.filePath);
        await fs.promises.unlink(tempPath).catch(() => {});
      }
    } catch (err) {
      try {
        await fs.promises.writeFile(this.filePath, jsonString, "utf-8");
      } catch (finalErr) {
        throw new Error(`Failed to save DrugChain: ${finalErr.message}`);
      }
    }
  }

  /**
   * Synchronous atomic save with Windows fallback
   * @param {Array<Object>} chainData 
   */
  saveChainSync(chainData) {
    const tempPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const jsonString = JSON.stringify(chainData, null, 2);

    try {
      fs.writeFileSync(tempPath, jsonString, "utf-8");
      try {
        fs.renameSync(tempPath, this.filePath);
      } catch (renameErr) {
        fs.copyFileSync(tempPath, this.filePath);
        try { fs.unlinkSync(tempPath); } catch {}
      }
    } catch (err) {
      try {
        fs.writeFileSync(this.filePath, jsonString, "utf-8");
      } catch (finalErr) {
        throw new Error(`Failed to save DrugChain (sync): ${finalErr.message}`);
      }
    }
  }

  /**
   * Load blockchain data from disk
   * @returns {Array<Object>|null}
   */
  loadChain() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.filePath, "utf-8");
      if (!content || !content.trim()) {
        return null;
      }
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error("Invalid chain.json format: Root element is not an array");
      }
      return parsed;
    } catch (err) {
      throw new Error(`CORRUPTION_DETECTED: Unable to load DrugChain from ${this.filePath}: ${err.message}`);
    }
  }

  /**
   * Check if chain file exists
   * @returns {boolean}
   */
  hasChainFile() {
    return fs.existsSync(this.filePath);
  }
}
