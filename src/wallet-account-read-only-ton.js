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

import { WalletAccountReadOnly } from '@tetherto/wdk-wallet'

import { Address, beginCell, fromNano, internal, SendMode, toNano, TonClient, WalletContractV5R1 } from '@ton/ton'

import { signVerify } from '@ton/crypto'

/** @typedef {import('@ton/ton').Cell} Cell */
/** @typedef {import('@ton/ton').OpenedContract} OpenedContract */
/** @typedef {import('@ton/ton').MessageRelaxed} MessageRelaxed */
/** @typedef {import('@ton/ton').Transaction} TonTransactionReceipt */

/** @typedef {import('@tetherto/wdk-wallet').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet').TransferResult} TransferResult */

/**
 * @typedef {Object} TonTransaction
 * @property {string} to - The transaction's recipient.
 * @property {number | bigint} value - The amount of tons to send to the recipient (in nanotons).
 * @property {boolean} [bounceable] - If set, overrides the bounceability of the transaction.
 * @property {string | Cell} [body] - Optional message body for smart contract interactions.
 */

/**
 * @typedef {Object} TonClientConfig
 * @property {string} url - The url of the ton center api.
 * @property {string} [secretKey] - If set, uses an api-key to authenticate on the ton center api.
 */

/**
 * @typedef {Object} TonWalletConfig
 * @property {TonClientConfig | TonClient} [tonClient] - The ton client configuration, or an instance of the {@link TonClient} class.
 * @property {number | bigint} [transferMaxFee] - The maximum fee amount for transfer operations.
 */

const DUMMY_MESSAGE_VALUE = toNano(0.05)

const TON_CENTER_V3_URL = 'https://toncenter.com/api/v3'

const SECRET_KEY_NULL = Buffer.alloc(64)

export default class WalletAccountReadOnlyTon extends WalletAccountReadOnly {
  /**
   * Creates a new ton read-only wallet account.
   *
   * @param {string | Uint8Array} publicKey - The account's public key.
   * @param {Omit<TonWalletConfig, 'transferMaxFee'>} [config] - The configuration object.
   */
  constructor (publicKey, config = { }) {
    if (typeof publicKey === 'string') {
      publicKey = Buffer.from(publicKey, 'hex')
    }

    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey })

    const address = wallet.address.toString({ bounceable: false })

    super(address)

    /**
     * The read-only wallet account configuration.
     *
     * @protected
     * @type {Omit<TonWalletConfig, 'transferMaxFee'>}
     */
    this._config = config

    /**
     * The v5r1 wallet.
     *
     * @protected
     * @type {WalletContractV5R1}
     */
    this._wallet = wallet

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
       * The v5r1 wallet's contract.
       *
       * @protected
       * @type {OpenedContract<WalletContractV5R1> | undefined}
       */
      this._contract = this._tonClient.open(this._wallet)
    }
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
    return signVerify(_message, _signature, this._wallet.publicKey)
  }

  /**
   * Returns the account's ton balance.
   *
   * @returns {Promise<bigint>} The ton balance (in nanotons).
   */
  async getBalance () {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to get balances.')
    }

    const balance = await this._contract.getBalance()

    return balance
  }

  /**
   * Returns the balance of the account for a specific token.
   *
   * @param {string} tokenAddress - The smart contract address of the token.
   * @returns {Promise<bigint>} The token balance (in base unit).
   */
  async getTokenBalance (tokenAddress) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to get token balances.')
    }

    try {
      const jettonWalletAddress = await this._getJettonWalletAddress(tokenAddress)

      const { stack } = await this._tonClient.callGetMethod(jettonWalletAddress, 'get_wallet_data', [])

      const balance = stack.readBigNumber()

      return balance
    } catch (error) {
      if (error.message.includes('exit_code: -13')) {
        return 0n
      }

      throw error
    }
  }

  /**
   * Quotes the costs of a send transaction operation.
   *
   * @param {TonTransaction} tx - The transaction.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   */
  async quoteSendTransaction (tx) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to quote send transaction operations.')
    }

    const message = await this._getTransactionMessage(tx)
    const transfer = await this._getTransfer(message)
    const fee = await this._getTransferFee(transfer)

    return { fee }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */

  async quoteTransfer (options) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to quote transfer operations.')
    }

    const message = await this._getTokenTransferMessage(options)
    const transfer = await this._getTransfer(message)
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
      limit: 1
    })

    const response = await fetch(`${TON_CENTER_V3_URL}/transactionsByMessage?${query.toString()}`)

    const { transactions } = await response.json()

    if (!transactions || transactions.length === 0) {
      return null
    }

    const receipt = transactions[0]

    const rawAddress = receipt.account

    try {
      const [transaction] = await this._tonClient.getTransactions(rawAddress, {
        limit: 1,
        hash: receipt.hash
      })
      return transaction
    } catch (error) {
      const [transaction] = await this._tonClient.getTransactions(rawAddress, {
        limit: 1,
        lt: receipt.lt,
        hash: receipt.hash,
        archival: true
      })
      return transaction
    }
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

    const address = this._wallet.address

    const { stack } = await this._tonClient.callGetMethod(tokenAddress, 'get_wallet_address', [{
      type: 'slice',
      cell: beginCell().storeAddress(address).endCell()
    }])

    const jettonWalletAddress = stack.readAddress()

    return jettonWalletAddress
  }

  /**
   * Creates and returns an internal message to execute the given transaction.
   *
   * @protected
   * @param {TonTransaction} tx - The transaction.
   * @returns {Promise<MessageRelaxed>} The internal message.
   */
  async _getTransactionMessage ({ to, value, bounceable, body }) {
    const { isBounceable } = Address.parseFriendly(to)

    const message = internal({
      to,
      value: fromNano(value),
      bounce: bounceable ?? isBounceable,
      body: body || ''
    })

    return message
  }

  /**
   * Creates and returns an internal message to execute the given token transfer.
   *
   * @protected
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<MessageRelaxed>} The internal message.
   */
  async _getTokenTransferMessage ({ token, recipient, amount }) {
    recipient = Address.parse(recipient)

    const address = this._wallet.address

    const queryId = this._generateQueryId()

    const jettonWalletAddress = await this._getJettonWalletAddress(token)

    const body = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(queryId, 64)
      .storeCoins(amount)
      .storeAddress(recipient)
      .storeAddress(address)
      .storeBit(false)
      .storeCoins(1n)
      .storeMaybeRef(null)
      .endCell()

    const message = internal({
      to: jettonWalletAddress,
      value: DUMMY_MESSAGE_VALUE,
      bounce: true,
      body
    })

    return message
  }

  /**
   * Creates and returns a v5r1 transfer to execute the given message.
   *
   * @protected
   * @param {MessageRelaxed} message - The message.
   * @returns {Promise<Cell>} The v5r1 transfer.
   */
  async _getTransfer (message) {
    const seqno = await this._contract.getSeqno()

    const transfer = this._contract.createTransfer({
      secretKey: SECRET_KEY_NULL,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message],
      seqno
    })

    return transfer
  }

  /**
   * Returns the fee of a transfer.
   *
   * @protected
   * @param {Cell} transfer - The transfer.
   * @returns {Promise<bigint>} The transfer's fee.
   */
  async _getTransferFee (transfer) {
    /* eslint-disable camelcase */

    const address = this._wallet.address

    const { code, data } = await this._tonClient.getContractState(address)

    const { source_fees } = await this._tonClient.estimateExternalMessageFee(address, {
      body: transfer,
      initCode: !code ? this._wallet.init.code : null,
      initData: !data ? this._wallet.init.data : null
    })

    const { in_fwd_fee, storage_fee, gas_fee, fwd_fee } = source_fees

    const fee = in_fwd_fee + storage_fee + gas_fee + fwd_fee

    return BigInt(fee)
  }

  /**
   * Generates and returns a random 64-bit unsigned integer for use as a queryId.
   *
   * @protected
   * @returns {bigint} The random queryId.
   */
  _generateQueryId () {
    const high = BigInt(Math.floor(Math.random() * 0x100000000))
    const low = BigInt(Math.floor(Math.random() * 0x100000000))
    const queryId = (high << 32n) | low

    return queryId
  }
}
