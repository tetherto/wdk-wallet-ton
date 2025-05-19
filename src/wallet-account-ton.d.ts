export default class WalletAccountTon {
    static "__#2@#deriveKeyPair"(seedPhrase: any, hdPath: any): any;
    /**
     * @param {string} seedPhrase - The bip-39 mnemonic.
     * @param {string} path - The BIP-44 derivation path suffix (e.g. "0'/0/0").
     * @param {TonWalletConfig} [config] - The configuration object.
     */
    constructor(seedPhrase: string, path: string, config?: TonWalletConfig);
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
     * Sends a transaction with arbitrary data.
     *
     * @param {TonTransaction} tx - The transaction to send.
     * @returns {Promise<string>} The transaction's hash.
     */
    sendTransaction({ to, value, bounceable }: TonTransaction): Promise<string>;
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
    #private;
}
export type KeyPair = {
    /**
     * - The public key.
     */
    publicKey: string;
    /**
     * - The private key.
     */
    privateKey: string;
};
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
export type TonWalletConfig = {
    /**
     * - The ton api's url.
     */
    tonApiUrl?: string;
    /**
     * - The api-key to use to authenticate on the ton api.
     */
    tonApiSecretKey?: string;
};
