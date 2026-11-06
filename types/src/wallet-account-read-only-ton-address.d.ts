/** @typedef {import('./wallet-account-read-only-ton.js').TonClientConfig} TonClientConfig */
/** @typedef {import('./wallet-account-read-only-ton.js').TonWalletConfig} TonWalletConfig */
/**
 * Read-only TON account for an existing address.
 *
 * Unlike {@link WalletAccountReadOnlyTon}, this class does not derive a V5R1
 * wallet from a public key. It can therefore monitor any valid TON address,
 * including accounts using other wallet contract versions. Operations that
 * require a public key, wallet code or signing remain unsupported.
 */
export default class WalletAccountReadOnlyTonAddress extends WalletAccountReadOnly {
    /**
     * @protected
     * @param {Array<TonClientConfig | TonClient>} tonClients - Client configs or instances.
     * @param {number} retries - Additional failover attempts.
     * @returns {TonClient} TON client using the failover API.
     */
    protected static _createTonClientWithFailoverApi(tonClients: Array<TonClientConfig | TonClient>, retries: number): TonClient;
    /**
     * @param {string} address - Existing TON account address in raw or friendly form.
     * @param {Omit<TonWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} [config] - Read-only client configuration.
     */
    constructor(address: string, config?: Omit<TonWalletConfig, "transferMaxFee" | "transactionMaxFee">);
    /** @protected @type {Address} */
    protected _ownerAddress: Address;
    /** @protected @type {Omit<TonWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} */
    protected _config: Omit<TonWalletConfig, "transferMaxFee" | "transactionMaxFee">;
    /** @protected @type {TonClient | undefined} */
    protected _tonClient: TonClient | undefined;
    /**
     * @protected
     * @param {Address} masterAddress - Jetton master address.
     * @returns {Promise<Address>} Derived Jetton wallet address.
     */
    protected _getJettonWalletAddress(masterAddress: Address): Promise<Address>;
}
export type TonClientConfig = import("./wallet-account-read-only-ton.js").TonClientConfig;
export type TonWalletConfig = import("./wallet-account-read-only-ton.js").TonWalletConfig;
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { Address } from '@ton/ton';
import { TonClient } from '@ton/ton';
