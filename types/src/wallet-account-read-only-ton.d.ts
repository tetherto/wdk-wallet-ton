export default class WalletAccountReadOnlyTon extends WalletAccountReadOnly {
    /**
     * Creates a new ton read-only wallet account.
     *
     * @param {string | Uint8Array} publicKey - The account's public key.
     * @param {Omit<TonWalletConfig, 'transferMaxFee'>} [config] - The configuration object.
     */
    constructor(publicKey: string | Uint8Array, config?: Omit<TonWalletConfig, "transferMaxFee">);
    /**
     * The read-only wallet account configuration.
     *
     * @protected
     * @type {Omit<TonWalletConfig, 'transferMaxFee'>}
     */
    protected _config: Omit<TonWalletConfig, "transferMaxFee">;
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
     * @returns {Promise<bigint>} The ton balance (in nanotons).
     */
    getBalance(): Promise<bigint>;
    /**
     * Returns the balance of the account for a specific token.
     *
     * @param {string} tokenAddress - The smart contract address of the token.
     * @returns {Promise<bigint>} The token balance (in base unit).
     */
    getTokenBalance(tokenAddress: string): Promise<bigint>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @param {TonTransaction} tx - The transaction.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction(tx: TonTransaction): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Quotes the costs of a transfer operation.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer(options: TransferOptions): Promise<Omit<TransferResult, "hash">>;
    /**
     * Returns a transaction's receipt.
     *
     * @param {string} hash - The transaction's hash.
     * @returns {Promise<TonTransactionReceipt | null>} - The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<TonTransactionReceipt | null>;
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
export type OpenedContract<F> = import("@ton/ton").OpenedContract<F>;
export type MessageRelaxed = import("@ton/ton").MessageRelaxed;
export type TonTransactionReceipt = import("@ton/ton").Transaction;
export type TransactionResult = import("@tetherto/wdk-wallet").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet").TransferResult;
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
     * - Optional message body.
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
     * - The ton client configuration, or an instance of the {@link TonClient} class.
     */
    tonClient?: TonClientConfig | TonClient;
    /**
     * - The maximum fee amount for transfer operations.
     */
    transferMaxFee?: number | bigint;
};
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { Address, Cell, TonClient, WalletContractV5R1 } from '@ton/ton';
