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
import { Address, beginCell, fromNano, toNano, internal, SendMode, TonClient, WalletContractV5R1 } from '@ton/ton'

import nacl from 'tweetnacl'
import HDKey from 'micro-key-producer/slip10.js'

// eslint-disable-next-line camelcase
import { sodium_memzero } from 'sodium-universal'

import * as bip39 from 'bip39'

/** @typedef {import('@wdk/wallet').IWalletAccount} IWalletAccount */

/** @typedef {import('@wdk/wallet').KeyPair} KeyPair */

/** @typedef {import('@wdk/wallet').Transaction} Transaction */

/** @typedef {import('@wdk/wallet').TransactionResult} TransactionResult */

/** @typedef {import('@wdk/wallet').TransferOptions} TransferOptions */

/** @typedef {import('@wdk/wallet').TransferResult} TransferResult */

/** @typedef {import('@ton/ton').TonClient} TonClient */

/** @typedef {import('@ton/ton').MessageRelaxed} MessageRelaxed */

/**
 * @typedef {Object} TonTransaction
 * @extends Transaction
 * @property {string} to - The transaction's recipient.
 * @property {number} value - The amount of tons to send to the recipient (in nanotons).
 * @property {boolean} [bounceable] - If set, overrides the bounceability of the transaction.
 */

/**
 * @typedef {Object} TonWalletConfig
 * @property {string | TonClient} [tonCenterUrl] - The url of the ton center api, or a instance of the {@link TonClient} class.
 * @property {string} [tonCenterSecretKey] - The api-key to use to authenticate on the ton center api.
 */

const DUMMY_MESSAGE_VALUE = toNano(0.05)
const BIP_44_TON_DERIVATION_PATH_PREFIX = "m/44'/607'"

function derivePath (seed, path) {
  const hdKey = HDKey.fromMasterSeed(seed)
  const { privateKey } = hdKey.derive(path, true)
  const keyPair = nacl.sign.keyPair.fromSeed(privateKey)

  return keyPair
}

/** @implements {IWalletAccount} */
export default class WalletAccountTon {
  /**
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {TonWalletConfig} [config] - The configuration object.
   */

  constructor (seed, path, config = {}) {
    /**
     * The TON wallet account configuration.
     *
     * @protected
     * @type {TonWalletConfig}
     */
    this._config = config

    if (typeof seed === 'string') {
      if (!bip39.validateMnemonic(seed)) {
        throw new Error('The seed phrase is invalid.')
      }

      seed = bip39.mnemonicToSeedSync(seed)
    }

    path = BIP_44_TON_DERIVATION_PATH_PREFIX + '/' + path

    const keyPair = derivePath(seed, path)

    /**
     * The V5R1 wallet contract TON.
     *
     * @type {WalletContractV5R1}
     * @protected
     */
    this._wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey })
    /** @private */
    this._address = this._wallet.address.toString({ urlSafe: true, bounceable: false, testOnly: false })
    /** @private */
    this._path = path
    /** @private */
    this._keyPair = keyPair

    /**
     * The ton center client.
     *
     * @type {TonClient}
     * @protected
     */
    this._tonClient = undefined

    const { tonCenterUrl, tonCenterSecretKey } = config

    if (tonCenterUrl) {
      if (typeof tonCenterUrl === 'string') {
        if (!tonCenterSecretKey) {
          throw new Error('You must also provide a valid secret key to connect the wallet to the ton center api.')
        }

        this._tonClient = new TonClient({
          endpoint: tonCenterUrl,
          apiKey: tonCenterSecretKey
        })
      }

      if (tonCenterUrl instanceof TonClient) {
        this._tonClient = tonCenterUrl
      }
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
   * Quotes the costs of a send transaction operation.
   *
   * @param {TonTransaction} tx - The transaction.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The send transaction’s quotes.
   */
  async quoteSendTransaction ({ to, value, bounceable }) {
    const { transfer } = await this._buildTransaction({ to, value, bounceable })

    const fee = await this._getFeeForTransfer(transfer)

    return { fee }
  }

  /**
   * Sends a transaction.
   *
   * @param {TonTransaction} tx - The transaction.
   * @returns {Promise<TransactionResult>} The send transaction’s result.
   */
  async sendTransaction ({ to, value, bounceable }) {
    const { contract, transfer, message } = await this._buildTransaction({ to, value, bounceable })
    const fee = await this._getFeeForTransfer(transfer)

    if (this._config.transferMaxFee && fee >= this._config.transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transaction.')
    }

    await contract.send(transfer)

    const hash = this._getHash(message).toString('hex')

    return { hash, fee }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */

  async quoteTransfer ({ recipient, amount, token }) {
    const { transfer } = await this._buildTransfer({ recipient, amount, token })

    const fee = await this._getFeeForTransfer(transfer)

    return { fee }
  }

  /**
   * Transfers a token to another address.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<TransferResult>} The transfer's result.
   */

  async transfer ({ recipient, amount, token }) {
    const { transfer, contract, message } = await this._buildTransfer({ recipient, amount, token })

    const fee = await this._getFeeForTransfer(transfer)

    if (this._config.transferMaxFee && fee >= this._config.transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transfer.')
    }

    await contract.send(transfer)

    const hash = this._getHash(message).toString('hex')

    return { hash, fee }
  }

  /**
   * Returns the account's native token balance.
   *
   * @returns {Promise<number>} The native token balance.
   */
  async getBalance () {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to get balances.')
    }

    const contract = this._tonClient.open(this._wallet)

    const balance = await contract.getBalance()

    return Number(balance)
  }

  /**
   * Returns the balance of the account for a specific token.
   *
   * @param {string} tokenAddress - The smart contract address of the token.
   * @returns {Promise<number>} The token balance.
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

  /** @private */
  async _getFeeForTransfer (transfer) {
    /* eslint-disable camelcase */

    if (!this._tonClient) {
      throw new Error('The wallet must be connected to the ton center api to quote transactions.')
    }

    const { source_fees: { in_fwd_fee, storage_fee, gas_fee, fwd_fee } } = await this._tonClient.estimateExternalMessageFee(this._wallet.address, { body: transfer })

    return in_fwd_fee + storage_fee + gas_fee + fwd_fee
  }

  /** @private */
  async _buildTransfer ({ recipient, amount, token }) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to the ton center api to quote transactions.')
    }

    const contract = this._tonClient.open(this._wallet)
    const jettonWalletAddress = await this._getJettonWalletAddress(token)
    const jettonTransferBody = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(0, 64)
      .storeCoins(amount)
      .storeAddress(Address.parse(recipient))
      .storeAddress(this._wallet.address)
      .storeBit(false)
      .storeCoins(1n)
      .storeMaybeRef(undefined)
      .endCell()

    const message = internal({
      to: jettonWalletAddress,
      value: DUMMY_MESSAGE_VALUE,
      body: jettonTransferBody,
      bounce: true
    })

    const seqno = await contract.getSeqno()

    const transfer = await contract.createTransfer({
      secretKey: this._keyPair.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message]
    })

    return { transfer, contract, message }
  }

  /** @private */
  async _buildTransaction ({ to, value, bounceable }) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to the ton center api to perform this operation.')
    }

    to = Address.parseFriendly(to)

    const contract = this._tonClient.open(this._wallet)

    const message = internal({
      to: to.address,
      value: fromNano(value).toString(),
      body: 'Transfer',
      bounce: bounceable ?? to.isBounceable
    })

    const transfer = contract.createTransfer({
      secretKey: this._keyPair.secretKey,
      seqno: await contract.getSeqno(),
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message]
    })

    return { contract, transfer, message }
  }

  /**
   * Returns the Jetton wallet address for a given Jetton token address using its owner address.
   *
   * @param {string} - The jetton token address
   * @returns {Address} The Jetton wallet address.
   * @protected
   */
  async _getJettonWalletAddress (tokenAddress) {
    tokenAddress = Address.parse(tokenAddress)

    const address = Address.parse(this._address)

    const args = [{
      type: 'slice',
      cell: beginCell().storeAddress(address).endCell()
    }]

    const { stack } = await this._tonClient.callGetMethod(tokenAddress, 'get_wallet_address', args)

    const jettonWalletAddress = stack.readAddress()

    return jettonWalletAddress
  }

  /**
   * Returns the hash for a message.
   *
   * @param {MessageRelaxed} - The message to compute the hash.
   * @returns {string}
   * @protected
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

  dispose () {
    sodium_memzero(this._keyPair.secretKey)

    this._keyPair.secretKey = undefined
  }
}
