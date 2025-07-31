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

import { AbstractWalletAccountReadOnly } from '@wdk/wallet'

import { Address, beginCell, Cell, fromNano, internal, SendMode, toNano, TonClient, WalletContractV5R1 } from '@ton/ton'

/** @typedef {import('@ton/ton').OpenedContract} OpenedContract */
/** @typedef {import('@ton/ton').MessageRelaxed} MessageRelaxed */
/** @typedef {import('@ton/ton').Transaction} TonTransactionReceipt */

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
 * @property {string} [secretKey] - If set, uses an api-key to authenticate on the ton center api.
 */

/**
 * @typedef {Object} TonWalletConfig
 * @property {TonClientConfig | TonClient} [tonClient] - The ton client configuration, or an instance of the {@link TonClient} class.
 * @property {number} [transferMaxFee] - The maximum fee amount for transfer operations.
 */

const DUMMY_MESSAGE_VALUE = toNano(0.05)

const TON_CENTER_V3_URL = 'https://toncenter.com/api/v3'

const SECRET_KEY_NULL = Buffer.alloc(64)

const WALLET_CONTRACT_V5R1_INIT_CODE = Buffer.from('b5ee9c7241021401000281000114ff00f4a413f4bcf2c80b01020120020d020148030402dcd020d749c\
120915b8f6320d70b1f2082106578746ebd21821073696e74bdb0925f03e082106578746eba8eb48020d72101d074d721fa4030fa44f828fa443058bd915be0ed44d0\
810141d721f4058307f40e6fa1319130e18040d721707fdb3ce03120d749810280b99130e070e2100f020120050c020120060902016e07080019adce76a2684020eb9\
0eb85ffc00019af1df6a2684010eb90eb858fc00201480a0b0017b325fb51341c75c875c2c7e00011b262fb513435c280200019be5f0f6a2684080a0eb90fa02c0102\
f20e011e20d70b1f82107369676ebaf2e08a7f0f01e68ef0eda2edfb218308d722028308d723208020d721d31fd31fd31fed44d0d200d31f20d31fd3ffd70a000af90\
140ccf9109a28945f0adb31e1f2c087df02b35007b0f2d0845125baf2e0855036baf2e086f823bbf2d0882292f800de01a47fc8ca00cb1f01cf16c9ed542092f80fde\
70db3cd81003f6eda2edfb02f404216e926c218e4c0221d73930709421c700b38e2d01d72820761e436c20d749c008f2e09320d74ac002f2e09320d71d06c712c2005\
230b0f2d089d74cd7393001a4e86c128407bbf2e093d74ac000f2e093ed55e2d20001c000915be0ebd72c08142091709601d72c081c12e25210b1e30f20d74a111213\
009601fa4001fa44f828fa443058baf2e091ed44d0810141d718f405049d7fc8ca0040048307f453f2e08b8e14038307f45bf2e08c22d70a00216e01b3b0f2d090e2c\
85003cf1612f400c9ed54007230d72c08248e2d21f2e092d200ed44d0d2005113baf2d08f54503091319c01810140d721d70a00f2e08ee2c8ca0058cf16c9ed5493f2\
c08de20010935bdb31e1d74cd0b4d6c35e', 'hex')

export default class WalletAccountReadOnlyTon extends AbstractWalletAccountReadOnly {
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

    try {
      const jettonWalletAddress = await this._getJettonWalletAddress(tokenAddress)

      const { stack } = await this._tonClient.callGetMethod(jettonWalletAddress, 'get_wallet_data', [])

      const balance = stack.readNumber()

      return balance
    } catch (error) {
      if (error.message.includes('exit_code: -13')) {
        return 0
      }

      throw error
    }
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

    const message = await this._getTransactionMessage(tx)
    const transfer = await this._getTransfer(message)
    const fee = await this._getTransferFee(transfer)

    return { fee }
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
      direction: 'out',
      limit: 1
    })

    const response = await fetch(`${TON_CENTER_V3_URL}/transactionsByMessage?${query.toString()}`)

    const { transactions } = await response.json()

    if (!transactions || transactions.length === 0) {
      return null
    }

    const address = this._wallet.address

    const receipt = transactions[0]

    const [ transaction ] = await this._tonClient.getTransactions(address, { 
      hash: receipt.hash 
    })

    return transaction
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
  async _getTransactionMessage ({ to, value, bounceable }) {
    const { isBounceable } = Address.parseFriendly(to)

    const message = internal({
      to,
      value: fromNano(value).toString(),
      bounce: bounceable ?? isBounceable,
      body: 'Transfer'
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

    const jettonWalletAddress = await this._getJettonWalletAddress(token)

    const body = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(0, 64)
      .storeCoins(amount)
      .storeAddress(recipient)
      .storeAddress(address)
      .storeBit(false)
      .storeCoins(1n)
      .storeMaybeRef()
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
   * @returns {Promise<number>} The transfer's fee.
   */
  async _getTransferFee (transfer) {
    /* eslint-disable camelcase */

    const address = this._wallet.address

    const { code, data } = await this._tonClient.getContractState(address)

    const { source_fees } = await this._tonClient.estimateExternalMessageFee(address, {
      body: transfer,
      initCode: !code ? Cell.fromBoc(WALLET_CONTRACT_V5R1_INIT_CODE)[0] : null,
      initData: !data ? Cell.EMPTY : null
    })

    const { in_fwd_fee, storage_fee, gas_fee, fwd_fee } = source_fees

    return in_fwd_fee + storage_fee + gas_fee + fwd_fee
  }
}
