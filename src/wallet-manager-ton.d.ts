/** @typedef {import('./wallet-account-ton.js').TonWalletConfig} TonWalletConfig */
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
     * @param {Uint8Array} seedBuffer - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {TonWalletConfig} [config] - The configuration object.
     */
    constructor(seedBuffer: Uint8Array, config?: TonWalletConfig);
    /**
    * The seed of the wallet.
    *
    * @type {Uint8Array}
    */
    get seedBuffer(): Uint8Array;
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
     * Disposes the wallet manager, erasing the seed buffer.
     */
    dispose(): void;
    #private;
}
export type TonWalletConfig = import("./wallet-account-ton.js").TonWalletConfig;
import WalletAccountTon from './wallet-account-ton.js';
