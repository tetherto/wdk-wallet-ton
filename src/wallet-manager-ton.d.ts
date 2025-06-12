export default class WalletManagerTon {
    /**
     * Returns a random [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     *
     * @returns {string} The seed phrase.
     */
    static getRandomSeedPhrase(): string;
    /**
     * Checks if a seed phrase is valid.
     *
     * @param {string} seedPhrase - The seed phrase.
     * @returns {boolean} True if the seed phrase is valid.
     */
    static isValidSeedPhrase(seedPhrase: string): boolean;
    /**
     * Creates a new wallet manager for the ton blockchain.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {TonWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, config?: TonWalletConfig);
    /**
    * The seed phrase of the wallet.
    *
    * @type {Uint8Array}
    */
    get seed(): Uint8Array;
    /**
     * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @example
     * // Returns the account with derivation path m/44'/607'/0'/0/1
     * const account = await wallet.getAccount(1);
     * @param {number} [index] - The index of the account to get (default: 0).
     * @returns {Promise<WalletAccountTon>} The account.
     */
    getAccount(index?: number): Promise<WalletAccountTon>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/607'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     * @param {string} path - The derivation path (e.g. "0'/0/0").
     * @returns {Promise<WalletAccountTon>} The account.
     */
    getAccountByPath(path: string): Promise<WalletAccountTon>;
    /**
     * Returns the current fee rates.
     *
     * @returns {Promise<{ normal: number, fast: number }>} The fee rates (in nanotons).
     */
    getFeeRates(): Promise<{
        normal: number;
        fast: number;
    }>;
    /**
     * Disposes all the wallet accounts, erasing their private keys from the memory.
     */
    dispose(): void;
    #private;
}
export type TonWalletConfig = import("./wallet-account-ton.js").TonWalletConfig;
import WalletAccountTon from './wallet-account-ton.js';
