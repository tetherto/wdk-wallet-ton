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
