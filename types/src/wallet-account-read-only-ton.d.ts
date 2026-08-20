export default class WalletAccountReadOnlyTon extends WalletAccountReadOnly {
    /**
     * Creates a TON client whose internal API calls fail over across configured clients.
     *
     * @protected
     * @param {Array<TonClientConfig | TonClient>} tonClients - TON client configs or clients.
     * @param {number} retries - The number of failover retries.
     * @returns {TonClient} The TON client with a failover API.
     */
    protected static _createTonClientWithFailoverApi(tonClients: Array<TonClientConfig | TonClient>, retries: number): TonClient;
    /**
     * Creates a new ton read-only wallet account.
     *
     * @param {string | Uint8Array} publicKey - The account's public key.
     * @param {Omit<TonWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} [config] - The configuration object.
     */
    constructor(publicKey: string | Uint8Array, config?: Omit<TonWalletConfig, "transferMaxFee" | "transactionMaxFee">);
    /**
     * The read-only wallet account configuration.
     *
     * @protected
     * @type {Omit<TonWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>}
     */
    protected _config: Omit<TonWalletConfig, "transferMaxFee" | "transactionMaxFee">;
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
     * The v5r1 wallet's contract.
     *
     * @protected
     * @type {OpenedContract<WalletContractV5R1> | undefined}
     */
    protected _contract: OpenedContract<WalletContractV5R1> | undefined;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @param {TonTransaction} tx - The transaction.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction(tx: TonTransaction): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Returns a transaction's receipt.
     *
     * @deprecated Use {@link getTransaction} instead, which returns a normalized, finality-based receipt. The raw ton transaction remains available on its `transaction` property.
     * @param {string} hash - The transaction's hash.
     * @returns {Promise<TonTransactionReceipt | null>} - The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<TonTransactionReceipt | null>;
    /**
     * Returns a normalized, finality-based receipt for a transaction.
     *
     * @param {string} hash - The transaction's message body hash.
     * @returns {Promise<TransactionReceipt & TonTransactionDetails>} The normalized receipt.
     * @throws {NoSuchElementError} If no transaction has been found for the given hash.
     */
    getTransaction(hash: string): Promise<TransactionReceipt & TonTransactionDetails>;
    /**
     * Blocks until a transaction reaches the requested finality target, or times out.
     *
     * Note: there is no `dropped` path. A transaction TonCenter has not indexed yet is
     * indistinguishable from one that will never land, so it stays not-found and a dropped
     * transaction surfaces as a {@link TimeoutError} rather than resolving to a `dropped` receipt.
     *
     * @param {string} hash - The transaction's message body hash.
     * @param {WaitForTransactionOptions} [options] - The wait options.
     * @returns {Promise<TransactionReceipt & TonTransactionDetails>} The terminal receipt for the finality target reached (inspect `success` to tell success from revert).
     * @throws {TimeoutError} If the target is not reached before the timeout.
     */
    waitForTransaction(hash: string, options?: WaitForTransactionOptions): Promise<TransactionReceipt & TonTransactionDetails>;
    /**
     * Fetches the TON Center v3 transactions matching the given message body hash.
     *
     * @protected
     * @param {string} hash - The message body hash.
     * @returns {Promise<{ transactions?: Array<Object> }>} The TON Center response payload.
     * @throws {Error} If the TON Center request returns a non-OK HTTP status.
     */
    protected _fetchTransactionsByMessage(hash: string): Promise<{
        transactions?: Array<any>;
    }>;
    /**
     * Resolves the TON Center v3 REST base URL and api key from the configured client.
     *
     * @protected
     * @returns {{ baseUrl: string, apiKey: string | undefined }} The resolved endpoint.
     */
    protected _resolveTonCenterEndpoint(): {
        baseUrl: string;
        apiKey: string | undefined;
    };
    /**
     * Returns whether a committed transaction executed successfully, or undefined when the execution result can't be determined.
     *
     * @protected
     * @param {TonTransactionReceipt} [transaction] - The native ton transaction.
     * @returns {boolean | undefined} The execution result.
     */
    protected _isTransactionSuccessful(transaction?: TonTransactionReceipt): boolean | undefined;
    /**
     * Returns the jetton wallet address of the given jetton.
     *
     * @protected
     * @param {string} tokenAddress - The jetton token address.
     * @returns {Promise<Address>} The jetton wallet address.
     */
    protected _getJettonWalletAddress(tokenAddress: string): Promise<Address>;
    /**
     * Creates and returns an internal message to execute the given transaction.
     *
     * @protected
     * @param {TonTransaction} tx - The transaction.
     * @returns {Promise<MessageRelaxed>} The internal message.
     */
    protected _getTransactionMessage({ to, value, bounceable, body }: TonTransaction): Promise<MessageRelaxed>;
    /**
     * Parses a string message body: a string carrying the BoC magic prefix is decoded as a
     * base64-encoded serialized cell, any other string is kept as-is to be sent as a text comment.
     *
     * The magic prefix makes the intent unambiguous, so a recognized serialized cell that fails
     * to decode throws instead of being silently sent as a text comment.
     *
     * @protected
     * @param {string} body - The string message body.
     * @returns {Cell | string} The decoded cell, or the original string.
     * @throws If the body carries the BoC magic prefix but is not a valid serialized cell.
     */
    protected _parseStringBody(body: string): Cell | string;
    /**
     * Creates and returns an internal message to execute the given token transfer.
     *
     * @protected
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<MessageRelaxed>} The internal message.
     */
    protected _getTokenTransferMessage({ token, recipient, amount }: TransferOptions): Promise<MessageRelaxed>;
    /**
     * Creates and returns a v5r1 transfer to execute the given message.
     *
     * @protected
     * @param {MessageRelaxed} message - The message.
     * @returns {Promise<Cell>} The v5r1 transfer.
     */
    protected _getTransfer(message: MessageRelaxed): Promise<Cell>;
    /**
     * Returns the fee of a transfer.
     *
     * @protected
     * @param {Cell} transfer - The transfer.
     * @returns {Promise<bigint>} The transfer's fee.
     */
    protected _getTransferFee(transfer: Cell): Promise<bigint>;
    /**
     * Generates and returns a random 64-bit unsigned integer for use as a queryId.
     *
     * @protected
     * @returns {bigint} The random queryId.
     */
    protected _generateQueryId(): bigint;
}
export type Cell = import("@ton/ton").Cell;
export type MessageRelaxed = import("@ton/ton").MessageRelaxed;
export type TonTransactionReceipt = import("@ton/ton").Transaction;
export type OpenedContract<T> = import("@ton/ton").OpenedContract<T>;
export type TransactionResult = import("@tetherto/wdk-wallet").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet").TransferOptions;
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
};
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { WalletContractV5R1 } from '@ton/ton';
import { TonClient } from '@ton/ton';
import { Address } from '@ton/ton';
