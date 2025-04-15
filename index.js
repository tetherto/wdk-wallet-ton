/**
 * @fileoverview Wallet service for TON blockchain using mnemonic and key pairs
 */

import { 
  mnemonicNew, 
  mnemonicValidate, 
  mnemonicToSeed,
  keyPairFromSeed, 
  keyPairFromSecretKey, 
  sign, 
  signVerify, 
  KeyPair 
} from '@ton/crypto';
const { WalletContractV5R1 } = require('@ton/ton');
import nacl from 'tweetnacl';

/**
 * Service class for managing TON wallets
 */
export class WDKWalletManagementTON {
  /**
   * Creates a new random wallet with mnemonic phrase
   * @returns {Promise<{mnemonic: string[], keyPair: KeyPair}>} A new wallet instance with mnemonic and key pair
   * @throws {Error} If wallet creation fails
   */
  async createWallet() {
    return new Promise(async (resolve, reject) => {
      try {
        const mnemonic = await mnemonicNew(24);
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        resolve({
          mnemonic,
          keyPair
        });
      } catch (error) {
        reject(new Error("Failed to create wallet: " + error.message));
      }
    });
  }

  /**
   * Restores a wallet from a mnemonic phrase
   * @param {string[]} mnemonicPhrase - The mnemonic phrase array to restore from
   * @returns {Promise<KeyPair>} The restored key pair
   * @throws {Error} If mnemonic phrase is empty or invalid
   */
  async restoreWalletFromPhrase(mnemonicPhrase) {
    if (!mnemonicPhrase || !Array.isArray(mnemonicPhrase)) {
      throw new Error("Mnemonic phrase must be an array of words.");
    }

    try {
      const isValid = await mnemonicValidate(mnemonicPhrase);
      if (!isValid) {
        throw new Error("Invalid mnemonic phrase");
      }
      return await mnemonicToPrivateKey(mnemonicPhrase);
    } catch (error) {
      throw new Error(
        "Failed to restore wallet from mnemonic: " + error.message
      );
    }
  }

  /**
   * Validates a mnemonic phrase
   * @param {string[]} mnemonicPhrase - The mnemonic phrase to validate
   * @returns {Promise<boolean>} Whether the mnemonic is valid
   */
  async validateMnemonic(mnemonicPhrase) {
    if (!mnemonicPhrase || !Array.isArray(mnemonicPhrase)) {
      return false;
    }
    return await mnemonicValidate(mnemonicPhrase);
  }

  /**
   * Creates a new mnemonic phrase
   * @param {number} [wordCount=24] - Number of words in the mnemonic (default: 24)
   * @returns {Promise<string[]>} The generated mnemonic phrase
   * @throws {Error} If mnemonic generation fails
   */
  async generateMnemonic(wordCount = 24) {
    try {
      return await mnemonicNew(wordCount);
    } catch (error) {
      throw new Error("Failed to generate mnemonic: " + error.message);
    }
  }

  /**
   * Normalizes a mnemonic phrase
   * @param {string[]} src - The mnemonic phrase
   * @returns {string[]} The normalized mnemonic phrase
   */
  normalizeMnemonic(src) {
    return src.map((v) => v.toLowerCase().trim());
  }

  /**
   * Gets wallet details from a mnemonic phrase
   * @param {string[]} mnemonicPhrase - The mnemonic phrase
   * @param {string} [seed] - Optional seed (e.g. "TON default seed")
   * @returns {Promise<Object|null>} Wallet details including key pair
   */
  async getWalletDetails(mnemonicPhrase, seed) {
    try {
      const mnemonicArray = this.normalizeMnemonic(mnemonicPhrase);
      const seedBuffer = (await mnemonicToSeed(mnemonicArray, seed ? seed : 'TON default seed'));
      let keyPair = nacl.sign.keyPair.fromSeed(seedBuffer.slice(0, 32));
      const wallet = WalletContractV5R1.create({ 
        workchain: 0, 
        publicKey: keyPair.publicKey 
      });

      return {
        mnemonic: mnemonicPhrase,
        keyPair,
        publicKey: Buffer.from(keyPair.publicKey),
        secretKey: Buffer.from(keyPair.secretKey),
        address: wallet.address.toString({bounceable: false})
      };
    } catch (error) {
      console.error("Error getting wallet details:", error);
      return null;
    }
  }

  /**
   * Creates a key pair from a seed
   * @param {Buffer} seed - 32-byte seed buffer
   * @returns {KeyPair} The generated key pair
   * @throws {Error} If seed is invalid or key pair creation fails
   */
  async createKeyPairFromSeed(seed) {
    if (!Buffer.isBuffer(seed) || seed.length !== 32) {
      throw new Error("Seed must be a 32-byte buffer");
    }
    try {
      return keyPairFromSeed(seed);
    } catch (error) {
      throw new Error("Failed to create key pair from seed: " + error.message);
    }
  }

  /**
   * Creates a key pair from a secret key
   * @param {Buffer} secretKey - The secret key buffer
   * @returns {KeyPair} The generated key pair
   * @throws {Error} If secret key is invalid or key pair creation fails
   */
  async createKeyPairFromSecretKey(secretKey) {
    if (!Buffer.isBuffer(secretKey)) {
      throw new Error("Secret key must be a buffer");
    }
    try {
      return keyPairFromSecretKey(secretKey);
    } catch (error) {
      throw new Error("Failed to create key pair from secret key: " + error.message);
    }
  }

  /**
   * Signs data using a key pair's secret key
   * @param {Buffer} data - The data to sign
   * @param {Buffer} secretKey - The secret key to sign with
   * @returns {Buffer} The signature
   * @throws {Error} If signing fails
   */
  async signData(data, secretKey) {
    if (!Buffer.isBuffer(data)) {
      throw new Error("Data must be a buffer");
    }
    if (!Buffer.isBuffer(secretKey)) {
      throw new Error("Secret key must be a buffer");
    }
    try {
      return sign(data, secretKey);
    } catch (error) {
      throw new Error("Failed to sign data: " + error.message);
    }
  }

  /**
   * Verifies a signature for given data
   * @param {Buffer} data - The original data
   * @param {Buffer} signature - The signature to verify
   * @param {Buffer} publicKey - The public key to verify against
   * @returns {boolean} Whether the signature is valid
   * @throws {Error} If verification fails
   */
  async verifySignature(data, signature, publicKey) {
    if (!Buffer.isBuffer(data)) {
      throw new Error("Data must be a buffer");
    }
    if (!Buffer.isBuffer(signature)) {
      throw new Error("Signature must be a buffer");
    }
    if (!Buffer.isBuffer(publicKey)) {
      throw new Error("Public key must be a buffer");
    }
    try {
      return signVerify(data, signature, publicKey);
    } catch (error) {
      throw new Error("Failed to verify signature: " + error.message);
    }
  }

  /**
   * Signs and verifies data using a key pair
   * @param {Buffer} data - The data to sign and verify
   * @param {KeyPair} keyPair - The key pair to use
   * @returns {Promise<{signature: Buffer, isValid: boolean}>} The signature and verification result
   */
  async signAndVerify(data, keyPair) {
    if (!Buffer.isBuffer(data)) {
      throw new Error("Data must be a buffer");
    }
    try {
      const signature = await this.signData(data, keyPair.secretKey);
      const isValid = await this.verifySignature(data, signature, keyPair.publicKey);
      return { signature, isValid };
    } catch (error) {
      throw new Error("Failed to sign and verify data: " + error.message);
    }
  }

  /**
   * Generates a TON seed for a given account index
   * @param {number} accountIndex - The account index (0-based)
   * @returns {string} The seed for the given account index
   * @throws {Error} If accountIndex is negative
   */
  getSeed(accountIndex) {
    if (!accountIndex) accountIndex = 0;
    
    if (accountIndex < 0) {
      throw new Error("Account index cannot be negative");
    } else if (accountIndex === 0) {
      return 'TON default seed';
    } else {
      return 'TON custom seed ' + accountIndex;
    }
  }
}

