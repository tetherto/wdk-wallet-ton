import { KeyPair } from '@ton/crypto';

export class WDKWalletManagementTON {
  /**
   * Creates a new random wallet with mnemonic phrase
   * @returns A new wallet instance with mnemonic and key pair
   * @throws {Error} If wallet creation fails
   */
  createWallet(): Promise<{
    mnemonic: string[];
    keyPair: KeyPair;
  }>;

  /**
   * Restores a wallet from a mnemonic phrase
   * @param mnemonicPhrase - The mnemonic phrase array to restore from
   * @returns The restored key pair
   * @throws {Error} If mnemonic phrase is empty or invalid
   */
  restoreWalletFromPhrase(mnemonicPhrase: string[]): Promise<KeyPair>;

  /**
   * Validates a mnemonic phrase
   * @param mnemonicPhrase - The mnemonic phrase to validate
   * @returns Whether the mnemonic is valid
   */
  validateMnemonic(mnemonicPhrase: string[]): Promise<boolean>;

  /**
   * Creates a new mnemonic phrase
   * @param wordCount - Number of words in the mnemonic (default: 24)
   * @returns The generated mnemonic phrase
   * @throws {Error} If mnemonic generation fails
   */
  generateMnemonic(wordCount?: number): Promise<string[]>;

  /**
   * Normalizes a mnemonic phrase
   * @param src - The mnemonic phrase
   * @returns The normalized mnemonic phrase
   */
  normalizeMnemonic(src: string[]): string[];

  /**
   * Gets wallet details from a mnemonic phrase
   * @param mnemonicPhrase - The mnemonic phrase
   * @param seed - Optional seed (e.g. "TON default seed")
   * @returns Wallet details including key pair
   */
  getWalletDetails(mnemonicPhrase: string[], seed?: string): Promise<{
    mnemonic: string[];
    keyPair: KeyPair;
    publicKey: Buffer;
    secretKey: Buffer;
  } | null>;

  /**
   * Creates a key pair from a seed
   * @param seed - 32-byte seed buffer
   * @returns The generated key pair
   * @throws {Error} If seed is invalid or key pair creation fails
   */
  createKeyPairFromSeed(seed: Buffer): Promise<KeyPair>;

  /**
   * Creates a key pair from a secret key
   * @param secretKey - The secret key buffer
   * @returns The generated key pair
   * @throws {Error} If secret key is invalid or key pair creation fails
   */
  createKeyPairFromSecretKey(secretKey: Buffer): Promise<KeyPair>;

  /**
   * Signs data using a key pair's secret key
   * @param data - The data to sign
   * @param secretKey - The secret key to sign with
   * @returns The signature
   * @throws {Error} If signing fails
   */
  signData(data: Buffer, secretKey: Buffer): Promise<Buffer>;

  /**
   * Verifies a signature for given data
   * @param data - The original data
   * @param signature - The signature to verify
   * @param publicKey - The public key to verify against
   * @returns Whether the signature is valid
   * @throws {Error} If verification fails
   */
  verifySignature(data: Buffer, signature: Buffer, publicKey: Buffer): Promise<boolean>;

  /**
   * Signs and verifies data using a key pair
   * @param data - The data to sign and verify
   * @param keyPair - The key pair to use
   * @returns The signature and verification result
   */
  signAndVerify(data: Buffer, keyPair: KeyPair): Promise<{
    signature: Buffer;
    isValid: boolean;
  }>;

  /**
   * Generates a TON derivation path for a given account index
   * @param accountIndex - The account index (0-based)
   * @returns The TON derivation path (e.g. "m/44'/607'/0'/0'/0'")
   * @throws {Error} If accountIndex is negative
   */
  getDerivationPath(accountIndex: number): string;

  /**
   * Generates a TON seed for a given account index
   * @param accountIndex - The account index (0-based)
   * @returns The seed for the given account index
   * @throws {Error} If accountIndex is negative
   */
  getSeed(accountIndex: number): string;
}
