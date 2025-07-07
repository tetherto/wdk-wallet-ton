// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict'

import { sign, signVerify } from '@ton/crypto'

import { Address, beginCell, fromNano, internal, SendMode, toNano, TonClient, WalletContractV5R1 } from '@ton/ton'

import nacl from 'tweetnacl'
import HDKey from 'micro-key-producer/slip10.js'

// eslint-disable-next-line camelcase
import { sodium_memzero } from 'sodium-universal'

import * as bip39 from 'bip39'

/** @typedef {import('@ton/ton').OpenedContract} OpenedContract */

/** @typedef {import('@ton/ton').MessageRelaxed} MessageRelaxed */

/** @typedef {import('@ton/ton').Transaction} TonTransactionReceipt */

/** @typedef {import('@wdk/wallet').IWalletAccount} IWalletAccount */

/** @typedef {import('@wdk/wallet').KeyPair} KeyPair */
/** @typedef {import('@wdk/wallet').TransactionResult} TransactionResult */
/** @typedef {import('@wdk/wallet').TransferOptions} TransferOptions */
/** @typedef {import('@wdk/wallet').TransferResult} TransferResult */

/**
 * @typedef {Object} TonTransaction
 * @property {string} to - The transaction's recipient.
 * @property {number} value - The amount of tons to send to the recipient (in nanotons).
 * @property {boolean} [bounceable] - If set, overrides the bounceability of the transaction.
 */

/**
 * @typedef {Object} TonClientConfig
 * @property {string} url - The url of the ton center api.
 * @property {string} secretKey - The api-key to use to authenticate on the ton center api.
 */

/**
 * @typedef {Object} TonWalletConfig
 * @property {TonClientConfig | TonClient} [tonClient] - The ton client configuration, or an instance of the {@link TonClient} class.
 */

const BIP_44_TON_DERIVATION_PATH_PREFIX = "m/44'/607'"

const DUMMY_MESSAGE_VALUE = toNano(0.05)

const TON_CENTER_V3_URL = 'https://toncenter.com/api/v3'

function derivePath (seed, path) {
  const hdKey = HDKey.fromMasterSeed(seed)
  const { privateKey } = hdKey.derive(path, true)
  const keyPair = nacl.sign.keyPair.fromSeed(privateKey)

  sodium_memzero(privateKey)

  return keyPair
}

/** @implements {IWalletAccount} */
export default class WalletAccountTon {
  /**
   * Creates a new ton wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {TonWalletConfig} [config] - The configuration object.
   */
  constructor (seed, path, config = {}) {
    if (typeof seed === 'string') {
      if (!bip39.validateMnemonic(seed)) {
        throw new Error('The seed phrase is invalid.')
      }

      seed = bip39.mnemonicToSeedSync(seed)
    }

    path = BIP_44_TON_DERIVATION_PATH_PREFIX + '/' + path

    const keyPair = derivePath(seed, path)

    /**
     * The ton wallet configuration.
     *
     * @protected
     * @type {TonWalletConfig}
     */
    this._config = config

    /**
     * The wallet.
     *
     * @protected
     * @type {WalletContractV5R1}
     */
    this._wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey })

    /** @private */
    this._address = this._wallet.address.toString({ urlSafe: true, bounceable: false, testOnly: false })

    /** @private */
    this._path = path

    /** @private */
    this._keyPair = keyPair

    if (config.tonClient) {
      const { tonClient } = config

      /**
       * The ton client.
       *
       * @protected
       * @type {TonClient | undefined}
       */
      this._tonClient = tonClient instanceof TonClient
        ? tonClient
        : new TonClient({ endpoint: tonClient.url, apiKey: tonClient.secretKey })

      /**
       * The contract.
       *
       * @protected
       * @type {OpenedContract<WalletContractV5R1> | undefined}
       */
      this._contract = this._tonClient.open(this._wallet)
    }
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return +this._path.split('/').pop()
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path () {
    return this._path
  }

  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return {
      publicKey: this._keyPair.publicKey,
      privateKey: this._keyPair.secretKey
    }
  }

  /**
   * Returns the account's address.
   *
   * @returns {Promise<string>} The account's address.
   */
  async getAddress () {
    return this._address
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  async sign (message) {
    const _message = Buffer.from(message)

    return sign(_message, this._keyPair.secretKey)
      .toString('hex')
  }

  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  async verify (message, signature) {
    const _message = Buffer.from(message)
    const _signature = Buffer.from(signature, 'hex')
    return signVerify(_message, _signature, this._keyPair.publicKey)
  }

  /**
   * Returns the account's ton balance.
   *
   * @returns {Promise<number>} The ton balance (in nanotons).
   */
  async getBalance () {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to get balances.')
    }

    const balance = await this._contract.getBalance()

    return Number(balance)
  }

  /**
   * Returns the balance of the account for a specific token.
   *
   * @param {string} tokenAddress - The smart contract address of the token.
   * @returns {Promise<number>} The token balance (in base unit).
   */
  async getTokenBalance (tokenAddress) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to get token balances.')
    }

    const jettonWalletAddress = await this._getJettonWalletAddress(tokenAddress)

    const { stack } = await this._tonClient.callGetMethod(jettonWalletAddress, 'get_wallet_data', [])

    const balance = stack.readNumber()

    return balance
  }

  /**
   * Sends a transaction.
   *
   * @param {TonTransaction} tx - The transaction.
   * @returns {Promise<TransactionResult>} The transaction's result.
   */
  async sendTransaction (tx) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to send transactions.')
    }

    const { transfer, hash } = await this._getTransfer(tx)

    const fee = await this._getTransferFee(transfer)

    await this._contract.send(transfer)

    return { hash, fee }
  }

  /**
   * Quotes the costs of a send transaction operation.
   *
   * @see {sendTransaction}
   * @param {TonTransaction} tx - The transaction.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   */
  async quoteSendTransaction (tx) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to quote send transaction operations.')
    }

    const { transfer } = await this._getTransfer(tx)

    const fee = await this._getTransferFee(transfer)

    return { fee }
  }

  /**
   * Transfers a token to another address.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<TransferResult>} The transfer's result.
   */

  async transfer (options) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to transfer tokens.')
    }

    const { transfer, hash } = await this._getTokenTransfer(options)

    const fee = await this._getTransferFee(transfer)

    // eslint-disable-next-line eqeqeq
    if (this._config.transferMaxFee != undefined && fee >= this._config.transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transfer operations.')
    }

    await this._contract.send(transfer)

    return { hash, fee }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @see {transfer}
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */

  async quoteTransfer (options) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to quote transfer operations.')
    }

    const { transfer } = await this._getTokenTransfer(options)

    const fee = await this._getTransferFee(transfer)

    return { fee }
  }

  /**
   * Returns a transaction's receipt.
   *
   * @param {string} hash - The transaction's hash.
   * @returns {Promise<TonTransactionReceipt | null>} - The receipt, or null if the transaction has not been included in a block yet.
   */
  async getTransactionReceipt (hash) {
    const query = new URLSearchParams({
      body_hash: hash,
      direction: 'out',
      limit: 1
    })

    const response = await fetch(`${TON_CENTER_V3_URL}/transactionsByMessage?${query.toString()}`)

    const { transactions } = await response.json()

    if (!transactions || transactions.length === 0) {
      return null
    }

    const address = Address.parse(this._address)

    const { hash } = transactions[0]

    const [ transaction ] = await this._tonClient.getTransactions(address, { hash })

    return transaction
  }

  /**
   * Disposes the wallet account, erasing the private key from the memory.
   */
  dispose () {
    sodium_memzero(this._keyPair.secretKey)

    this._keyPair.secretKey = undefined
  }

  /**
   * Returns the jetton wallet address of the given jetton.
   *
   * @protected
   * @param {string} tokenAddress - The jetton token address.
   * @returns {Promise<Address>} The jetton wallet address.
   */
  async _getJettonWalletAddress (tokenAddress) {
    tokenAddress = Address.parse(tokenAddress)

    const address = Address.parse(this._address)

    const { stack } = await this._tonClient.callGetMethod(tokenAddress, 'get_wallet_address', [{
      type: 'slice',
      cell: beginCell().storeAddress(address).endCell()
    }])

    const jettonWalletAddress = stack.readAddress()

    return jettonWalletAddress
  }

  /**
   * Returns the hash of a message.
   *
   * @protected
   * @param {MessageRelaxed} message - The message.
   * @returns {string} The hash.
   */
  _getHash (message) {
    if (message.info.type === 'internal') {
      return message.body.hash()
    }

    const cell = beginCell()
      .storeUint(2, 2)
      .storeUint(0, 2)
      .storeAddress(message.info.dest)
      .storeUint(0, 4)
      .storeBit(false)
      .storeBit(true)
      .storeRef(message.body)
      .endCell()

    const hash = cell.hash()

    return hash
  }

  /** @private */
  async _getTransfer ({ to, value, bounceable }) {
    to = Address.parseFriendly(to)

    const message = internal({
      to: to.address,
      value: fromNano(value).toString(),
      body: 'Transfer',
      bounce: bounceable ?? to.isBounceable
    })

    const seqno = await this._contract.getSeqno()

    const transfer = this._contract.createTransfer({
      secretKey: this._keyPair.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message],
      seqno
    })

    const hash = this._getHash(message).toString('hex')

    return { transfer, hash }
  }

  /** @private */
  async _getTokenTransfer ({ token, recipient, amount }) {
    recipient = Address.parse(recipient)

    const jettonWalletAddress = await this._getJettonWalletAddress(token)

    const body = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(0, 64)
      .storeCoins(amount)
      .storeAddress(recipient)
      .storeAddress(this._wallet.address)
      .storeBit(false)
      .storeCoins(1n)
      .storeMaybeRef(undefined)
      .endCell()

    const message = internal({
      to: jettonWalletAddress,
      value: DUMMY_MESSAGE_VALUE,
      body,
      bounce: true
    })

    const seqno = await this._contract.getSeqno()

    const transfer = this._contract.createTransfer({
      secretKey: this._keyPair.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message],
      seqno
    })

    const hash = this._getHash(message).toString('hex')

    return { transfer, hash }
  }

  /** @private */
  async _getTransferFee (transfer) {
    /* eslint-disable camelcase */

    const { source_fees: { in_fwd_fee, storage_fee, gas_fee, fwd_fee } } =
      await this._tonClient.estimateExternalMessageFee(this._wallet.address, { body: transfer })

    return in_fwd_fee + storage_fee + gas_fee + fwd_fee
  }
}
