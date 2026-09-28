export default class WalletManagerTon extends WalletManager {
    /**
     * Creates a new wallet manager for the ton blockchain.
     *
     * @param {string | Uint8Array} seed - A [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
     * @param {TonWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, config?: TonWalletConfig);
    /**
     * The ton wallet configuration.
     *
     * @protected
     * @type {TonWalletConfig}
     */
    protected _config: TonWalletConfig;
    /**
     * The ton client. Shared with every account this manager creates, so two accounts never
     * open two clients for the same endpoint.
     *
     * @protected
     * @type {TonClient | undefined}
     */
    protected _tonClient: TonClient | undefined;
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
     * Builds the account config, injecting the manager's shared ton client so accounts reuse
     * it instead of opening their own.
     *
     * @private
     * @returns {TonWalletConfig} The account configuration.
     */
    private _accountConfig;
    /**
     * Returns the current fee rates.
     *
     * @returns {Promise<FeeRates>} The fee rates (in nanotons).
     */
    getFeeRates(): Promise<FeeRates>;
}
export type TonClient = import("@ton/ton").TonClient;
export type FeeRates = import("@tetherto/wdk-wallet").FeeRates;
export type TonWalletConfig = import("./wallet-account-ton.js").TonWalletConfig;
import WalletManager from '@tetherto/wdk-wallet';
import WalletAccountTon from './wallet-account-ton.js';
