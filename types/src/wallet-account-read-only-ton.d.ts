export default class WalletAccountReadOnlyTon extends WalletAccountReadOnly {
    /**
     * Builds the ton client from the wallet configuration: a ton center config, an already-built
     * {@link TonClient} reused as-is, or a list of either (with internal api calls failing over).
     *
     * @private
     * @static
     * @param {TonWalletConfig} config - The wallet configuration.
     * @returns {TonClient | undefined} The ton client, or undefined if the wallet is not connected to the ton center.
     */
    private static _buildTonClient(config: TonWalletConfig): TonClient | undefined;
    /**
     * Creates a new read-only TON wallet account.
     *
     * @param {string | Buffer} publicKey - The account public key.
     * @param {TonWalletConfig} [config] - The wallet configuration.
     */
    constructor(publicKey: string | Buffer, config?: TonWalletConfig);
    /**
     * The read-only wallet account configuration.
     *
     * @protected
     * @type {Omit<TonWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>}
     */
    protected _config: Omit<TonWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>;
    /**
     * The v5r1 wallet.
     *
     * @protected
     * @type {WalletContractV5R1}
     */
    protected _wallet: WalletContractV5R1;
    /**
     * The ton client.
     *
     * @protected
     * @type {TonClient | undefined}
     */
    protected _tonClient: TonClient | undefined;
    /**
     * The TON address of this account.
     *
     * @type {string}
     */
    address: string;
    /**
     * Returns the TON address of this account.
     *
     * @returns {Promise<string>} The TON address.
     */
    getAddress(): Promise<string>;
    /**
     * Returns the TON balance of this account in nanotons.
     *
     * @returns {Promise<bigint>} The balance in nanotons.
     */
    getBalance(): Promise<bigint>;
    /**
     * Returns the balance of a Jetton for this account.
     *
     * @param {string} tokenAddress - The Jetton master address.
     * @returns {Promise<bigint>} The Jetton balance.
     */
    getTokenBalance(tokenAddress: string): Promise<bigint>;
    /**
     * Quotes the fee for a native TON transaction.
     *
     * @param {TonTransaction} transaction - The transaction to quote.
     * @returns {Promise<QuoteResult>} The quoted fee.
     */
    quoteTransaction(transaction: TonTransaction): Promise<QuoteResult>;
    /**
     * Quotes the fee for a Jetton transfer.
     *
     * @param {TonTransaction} transaction - The transfer to quote.
     * @param {string} tokenAddress - The Jetton master address.
     * @returns {Promise<QuoteResult>} The quoted fee.
     */
    quoteTransfer(transaction: TonTransaction, tokenAddress: string): Promise<QuoteResult>;
    /**
     * Returns the transaction receipt for a given hash.
     *
     * @param {string} hash - The transaction hash.
     * @param {WaitForTransactionOptions} [options] - Options for waiting.
     * @returns {Promise<TransactionReceipt | null>} The receipt or null if not yet included.
     */
    getTransactionReceipt(hash: string, options?: WaitForTransactionOptions): Promise<TransactionReceipt | null>;
    /**
     * Returns the transaction details for a given hash.
     *
     * @param {string} hash - The transaction hash.
     * @returns {Promise<TonTransactionDetails>} The transaction details.
     */
    getTransaction(hash: string): Promise<TonTransactionDetails>;
    /**
     * Verifies a signature against a message hash.
     *
     * @param {string | Buffer} message - The message that was signed.
     * @param {string | Buffer} signature - The signature to verify.
     * @returns {Promise<boolean>} Whether the signature is valid.
     */
    verify(message: string | Buffer, signature: string | Buffer): Promise<boolean>;
    /**
     * Disposes of the account, clearing any sensitive data from memory.
     */
    dispose(): void;
}
export type TransferResult = import("@tetherto/wdk-wallet").TransferResult;
export type TransactionReceipt = import("@tetherto/wdk-wallet").TransactionReceipt;
export type WaitForTransactionOptions = import("@tetherto/wdk-wallet").WaitForTransactionOptions;
/**
 * The TON-specific fields added to a normalized transaction receipt.
 */
export type TonTransactionDetails = {
    /**
     * - The native ton transaction, or null while the transaction is pending or dropped.
     */
    transaction: TonTransactionReceipt | null;
};
export type TonTransaction = {
    /**
     * - The transaction's recipient.
     */
    to: string;
    /**
     * - The amount of tons to send to the recipient (in nanotons).
     */
    value: number | bigint;
    /**
     * - If set, overrides the bounceability of the transaction.
     */
    bounceable?: boolean;
    /**
     * - Optional message body for smart contract interactions: a cell, a base64-encoded
     * serialized cell (BoC), or any other string to send as a text comment.
     */
    body?: string | Cell;
};
export type TonClientConfig = {
    /**
     * - The url of the ton center api.
     */
    url: string;
    /**
     * - If set, uses an api-key to authenticate on the ton center api.
     */
    secretKey?: string;
};
export type TonWalletConfig = {
    /**
     * - The ton configuration or ton client {@link TonClient}. It's also possible to provide an array of configs or clients instead. In such case, connection errors will cause the wallet to automatically fallback on the next client in the list.
     */
    tonClient?: TonClientConfig | TonClient | Array<TonClientConfig | TonClient>;
    /**
     * - If set and if 'tonClient' is a list of ton configs or ton clients, the number of additional retry attempts after the initial call fails. Total attempts = `1 + retries`. For example, `retries: 3` with 4 clients will try each client once before throwing. If `retries` exceeds the number of clients, the failover will loop back and retry already-failed clients in round-robin order. Default: 3.
     */
    retries?: number;
    /**
     * - The maximum fee amount for transfer operations.
     */
    transferMaxFee?: number | bigint;
    /**
     * - The maximum fee amount for sendTransaction and signTransaction operations.
     */
    transactionMaxFee?: number | bigint;
    /**
     * - The network global id the v5r1 wallet is bound to: -239 for mainnet, -3 for testnet (default: -239).
     */
    networkGlobalId?: number;
};
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { WalletContractV5R1 } from '@ton/ton';
import { TonClient } from '@ton/ton';
import { Address } from '@ton/ton';
