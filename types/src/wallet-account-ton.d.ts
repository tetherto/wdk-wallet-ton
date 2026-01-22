/** @implements {IWalletAccount} */
export default class WalletAccountTon extends WalletAccountReadOnlyTon implements IWalletAccount {
    /**
     * Creates a new ton wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {TonWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config?: TonWalletConfig);
    /**
     * The wallet account configuration.
     *
     * @protected
     * @type {TonWalletConfig}
     */
    protected _config: TonWalletConfig;
    /** @private */
    private _path;
    /** @private */
    private _keyPair;
    /**
     * The derivation path's index of this account.
     *
     * @type {number}
     */
    get index(): number;
    /**
     * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @type {string}
     */
    get path(): string;
    /**
     * The account's key pair.
     *
     * @type {KeyPair}
     */
    get keyPair(): KeyPair;
    /**
     * Signs a message.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The message's signature.
     */
    sign(message: string): Promise<string>;
    /**
     * Sends a transaction.
     *
     * @param {TonTransaction} tx - The transaction.
     * @returns {Promise<TransactionResult>} The transaction's result.
     */
    sendTransaction(tx: TonTransaction): Promise<TransactionResult>;
    /**
     * Transfers a token to another address.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<TransferResult>} The transfer's result.
     */
    transfer(options: TransferOptions): Promise<TransferResult>;
    /**
     * Returns a read-only copy of the account.
     *
     * @returns {Promise<WalletAccountReadOnlyTon>} The read-only account.
     */
    toReadOnlyAccount(): Promise<WalletAccountReadOnlyTon>;
    /**
     * Disposes the wallet account, erasing the private key from the memory.
     */
    dispose(): void;
}
export type MessageRelaxed = import("@ton/ton").MessageRelaxed;
export type TonTransactionReceipt = import("@ton/ton").Transaction;
export type IWalletAccount = import("@tetherto/wdk-wallet").IWalletAccount;
export type KeyPair = import("@tetherto/wdk-wallet").KeyPair;
export type TransactionResult = import("@tetherto/wdk-wallet").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet").TransferResult;
export type TonTransaction = import("./wallet-account-read-only-ton.js").TonTransaction;
export type TonClientConfig = import("./wallet-account-read-only-ton.js").TonClientConfig;
export type TonWalletConfig = import("./wallet-account-read-only-ton.js").TonWalletConfig;
import WalletAccountReadOnlyTon from './wallet-account-read-only-ton.js';
