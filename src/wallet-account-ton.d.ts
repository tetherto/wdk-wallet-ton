/**
 * @typedef {Object} KeyPair
 * @property {string} publicKey - The public key.
 * @property {string} privateKey - The private key.
 */
/**
 * @typedef {Object} Transaction
 * @property {string} to - The transaction's recipient.
 * @property {number} value - The amount of native tokens to send to the recipient.
 * @property {string} [data] - The transaction's data in hex format.
 */
export default class WalletAccountTon {
    constructor({ path, index, keyPair, config }: {
        path: any;
        index: any;
        keyPair: any;
        config: any;
    });
    /**
     * The derivation path's index of this account.
     *
     * @type {number}
     */
    get index(): number;
    /**
     * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @type {number}
     */
    get path(): number;
    /**
     * The account's address.
     *
     * @type {string}
     */
    get address(): string;
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
     * @param {Transaction} tx - The transaction to send.
     * @returns {Promise<string>} The transaction's hash.
     */
    sendTransaction(to: any, value: any): Promise<string>;
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
export type Transaction = {
    /**
     * - The transaction's recipient.
     */
    to: string;
    /**
     * - The amount of native tokens to send to the recipient.
     */
    value: number;
    /**
     * - The transaction's data in hex format.
     */
    data?: string;
};
