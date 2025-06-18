/** @implements {IWalletAccount} */
export default class WalletAccountTon implements IWalletAccount {
    /**
     * Creates a new ton wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {TonWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config?: TonWalletConfig);
    /**
     * The wallet.
     *
     * @protected
     * @type {WalletContractV5R1}
     */
    protected _wallet: WalletContractV5R1;
    /** @private */
    private _address;
    /** @private */
    private _path;
    /** @private */
    private _keyPair;
    /**
     * The ton client.
     *
     * @protected
     * @type {TonClient | undefined}
     */
    protected _tonClient: TonClient | undefined;
    /**
     * The contract.
     *
     * @protected
     * @type {OpenedContract<WalletContractV5R1> | undefined}
     */
    protected _contract: OpenedContract<WalletContractV5R1> | undefined;
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
     * Returns the account's address.
     *
     * @returns {Promise<string>} The account's address.
     */
    getAddress(): Promise<string>;
    /**
     * Signs a message.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The message's signature.
     */
    sign(message: string): Promise<string>;
    /**
     * Verifies a message's signature.
     *
     * @param {string} message - The original message.
     * @param {string} signature - The signature to verify.
     * @returns {Promise<boolean>} True if the signature is valid.
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Returns the account's ton balance.
     *
     * @returns {Promise<number>} The ton balance (in nanotons).
     */
    getBalance(): Promise<number>;
    /**
     * Returns the balance of the account for a specific token.
     *
     * @param {string} tokenAddress - The smart contract address of the token.
     * @returns {Promise<number>} The token balance (in base unit).
     */
    getTokenBalance(tokenAddress: string): Promise<number>;
    /**
     * Sends a transaction.
     *
     * @param {TonTransaction} tx - The transaction.
     * @returns {Promise<TransactionResult>} The transaction's result.
     */
    sendTransaction(tx: TonTransaction): Promise<TransactionResult>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @see {sendTransaction}
     * @param {TonTransaction} tx - The transaction.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction(tx: TonTransaction): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Transfers a token to another address.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<TransferResult>} The transfer's result.
     */
    transfer(options: TransferOptions): Promise<TransferResult>;
    /**
     * Quotes the costs of a transfer operation.
     *
     * @see {transfer}
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer(options: TransferOptions): Promise<Omit<TransferResult, "hash">>;
    /**
     * Disposes the wallet account, erasing the private key from the memory.
     */
    dispose(): void;
    /**
     * Returns the jetton wallet address of the given jetton.
     *
     * @protected
     * @param {string} tokenAddress - The jetton token address.
     * @returns {Promise<Address>} The jetton wallet address.
     */
    protected _getJettonWalletAddress(tokenAddress: string): Promise<Address>;
    /**
     * Returns the hash of a message.
     *
     * @protected
     * @param {MessageRelaxed} message - The message.
     * @returns {string} The hash.
     */
    protected _getHash(message: MessageRelaxed): string;
    /** @private */
    private _getTransfer;
    /** @private */
    private _getTokenTransfer;
    /** @private */
    private _getTransferFee;
}
export type OpenedContract = import("@ton/ton").OpenedContract;
export type MessageRelaxed = import("@ton/ton").MessageRelaxed;
export type IWalletAccount = import("@wdk/wallet").IWalletAccount;
export type KeyPair = import("@wdk/wallet").KeyPair;
export type TransactionResult = import("@wdk/wallet").TransactionResult;
export type TransferOptions = import("@wdk/wallet").TransferOptions;
export type TransferResult = import("@wdk/wallet").TransferResult;
export type TonTransaction = {
    /**
     * - The transaction's recipient.
     */
    to: string;
    /**
     * - The amount of tons to send to the recipient (in nanotons).
     */
    value: number;
    /**
     * - If set, overrides the bounceability of the transaction.
     */
    bounceable?: boolean;
};
export type TonClientConfig = {
    /**
     * - The url of the ton center api.
     */
    url: string;
    /**
     * - The api-key to use to authenticate on the ton center api.
     */
    secretKey: string;
};
export type TonWalletConfig = {
    /**
     * - The ton client configuration, or an instance of the {@link TonClient} class.
     */
    tonClient?: TonClientConfig | TonClient;
};
import { Address, TonClient, WalletContractV5R1 } from '@ton/ton';
