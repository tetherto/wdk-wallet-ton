/** @implements {IWalletAccount} */
export default class WalletAccountTon implements IWalletAccount {
    /**
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {TonWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config?: TonWalletConfig);
    /**
     * The TON wallet account configuration.
     *
     * @protected
     * @type {TonWalletConfig}
     */
    protected _config: TonWalletConfig;
    /**
     * The V5R1 wallet contract TON.
     *
     * @type {WalletContractV5R1}
     * @protected
     */
    protected _wallet: WalletContractV5R1;
    /** @private */
    private _address;
    /** @private */
    private _path;
    /** @private */
    private _keyPair;
    /**
     * The ton center client.
     *
     * @type {TonClient}
     * @protected
     */
    protected _tonClient: TonClient;
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
     * Quotes the costs of a send transaction operation.
     *
     * @param {TonTransaction} tx - The transaction.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The send transaction’s quotes.
     */
    quoteSendTransaction({ to, value, bounceable }: TonTransaction): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Sends a transaction.
     *
     * @param {TonTransaction} tx - The transaction.
     * @returns {Promise<TransactionResult>} The send transaction’s result.
     */
    sendTransaction({ to, value, bounceable }: TonTransaction): Promise<TransactionResult>;
    /**
     * Quotes the costs of a transfer operation.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer({ recipient, amount, token }: TransferOptions): Promise<Omit<TransferResult, "hash">>;
    /**
     * Transfers a token to another address.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<TransferResult>} The transfer's result.
     */
    transfer({ recipient, amount, token }: TransferOptions): Promise<TransferResult>;
    /**
     * Returns the account's native token balance.
     *
     * @returns {Promise<number>} The native token balance.
     */
    getBalance(): Promise<number>;
    /**
     * Returns the balance of the account for a specific token.
     *
     * @param {string} tokenAddress - The smart contract address of the token.
     * @returns {Promise<number>} The token balance.
     */
    getTokenBalance(tokenAddress: string): Promise<number>;
    /** @private */
    private _getFeeForTransfer;
    /** @private */
    private _buildTransfer;
    /** @private */
    private _buildTransaction;
    /**
     * Returns the Jetton wallet address for a given Jetton token address using its owner address.
     *
     * @param {string} - The jetton token address
     * @returns {Address} The Jetton wallet address.
     * @protected
     */
    protected _getJettonWalletAddress(tokenAddress: any): Address;
    /**
     * Returns the hash for a message.
     *
     * @param {MessageRelaxed} - The message to compute the hash.
     * @returns {string}
     * @protected
     */
    protected _getHash(message: any): string;
    dispose(): void;
}
export type IWalletAccount = any;
export type KeyPair = import("@wdk/wallet").KeyPair;
export type Transaction = import("@wdk/wallet").Transaction;
export type TransactionResult = import("@wdk/wallet").TransactionResult;
export type TransferOptions = import("@wdk/wallet").TransferOptions;
export type TransferResult = import("@wdk/wallet").TransferResult;
export type TonClient = any;
export type MessageRelaxed = import("@ton/ton").MessageRelaxed;
export type TonTransaction = any;
export type TonWalletConfig = {
    /**
     * - The url of the ton center api, or a instance of the {@link TonClient} class.
     */
    tonCenterUrl?: string | TonClient;
    /**
     * - The api-key to use to authenticate on the ton center api.
     */
    tonCenterSecretKey?: string;
};
import { WalletContractV5R1 } from '@ton/ton';
import { TonClient } from '@ton/ton';
import { Address } from '@ton/ton';
