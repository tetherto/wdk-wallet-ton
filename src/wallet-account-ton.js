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

import { Address, beginCell, fromNano, internal, SendMode, TonClient, WalletContractV5R1 } from '@ton/ton'

import nacl from 'tweetnacl'
import HDKey from 'micro-key-producer/slip10.js'

// eslint-disable-next-line camelcase
import { sodium_memzero } from 'sodium-universal'

import * as bip39 from 'bip39'

/** @typedef {import('@ton/ton').TonClient} TonClient */

/**
 * @typedef {Object} KeyPair
 * @property {Uint8Array} publicKey - The public key.
 * @property {Uint8Array} privateKey - The private key.
 */

/**
 * @typedef {Object} TonTransaction
 * @property {string} to - The transaction's recipient.
 * @property {number} value - The amount of tons to send to the recipient (in nanotons).
 * @property {boolean} [bounceable] - If set, overrides the bounceability of the transaction.
 */

/**
 * @typedef {Object} TonWalletConfig
 * @property {string | TonClient} [tonCenterUrl] - The url of the ton center api, or a instance of the {@link TonClient} class.
 * @property {string} [tonCenterSecretKey] - The api-key to use to authenticate on the ton center api.
 */

const BIP_44_TON_DERIVATION_PATH_PREFIX = "m/44'/607'"

function derivePath (seed, path) {
  const hdKey = HDKey.fromMasterSeed(seed)
  const { privateKey } = hdKey.derive(path, true)
  const keyPair = nacl.sign.keyPair.fromSeed(privateKey)

  return keyPair
}

export default class WalletAccountTon {
  #wallet
  #address
  #path
  #keyPair

  #tonClient

  /**
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

    this.#wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey })
    this.#address = this.#wallet.address.toString({ urlSafe: true, bounceable: false, testOnly: false })
    this.#path = path
    this.#keyPair = keyPair

    const { tonCenterUrl, tonCenterSecretKey } = config

    if (tonCenterUrl) {
      if (typeof tonCenterUrl === 'string') {
        if (!tonCenterSecretKey) {
          throw new Error('You must also provide a valid secret key to connect the wallet to the ton center api.')
        }

        this.#tonClient = new TonClient({
          endpoint: tonCenterUrl,
          apiKey: tonCenterSecretKey
        })
      }

      if (tonCenterUrl instanceof TonClient) {
        this.#tonClient = tonCenterUrl
      }
    }
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return +this.#path.split('/').pop()
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path () {
    return this.#path
  }

  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return {
      publicKey: this.#keyPair.publicKey,
      privateKey: this.#keyPair.secretKey
    }
  }

  /**
   * Returns the account's address.
   *
   * @returns {Promise<string>} The account's address.
   */
  async getAddress () {
    return this.#address
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  async sign (message) {
    const _message = Buffer.from(message)

    return sign(_message, this.#keyPair.secretKey)
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

    return signVerify(_message, _signature, this.#keyPair.publicKey)
  }

  /**
   * Quotes a transaction.
   *
   * @param {TonTransaction} tx - The transaction to quote.
   * @returns {Promise<number>} - The transaction's fee (in nanotons).
   */
  async quoteTransaction (tx) {
    /* eslint-disable camelcase */

    if (!this.#tonClient) {
      throw new Error('The wallet must be connected to ton center to quote transactions.')
    }

    const { transfer } = await this.#getTransfer(tx)
    const { source_fees } = await this.#tonClient.estimateExternalMessageFee(this.#wallet.address, { body: transfer })
    const { in_fwd_fee, storage_fee, gas_fee, fwd_fee } = source_fees

    return in_fwd_fee + storage_fee + gas_fee + fwd_fee
  }

  /**
   * Sends a transaction with arbitrary data.
   *
   * @param {TonTransaction} tx - The transaction to send.
   * @returns {Promise<string>} The transaction's hash.
   */
  async sendTransaction (tx) {
    if (!this.#tonClient) {
      throw new Error('The wallet must be connected to ton center to send transactions.')
    }

    const { contract, message, transfer } = await this.#getTransfer(tx)

    await contract.send(transfer)

    const hash = this.#getHash(message).toString('hex')

    return hash
  }

  /**
   * Returns the account's native token balance.
   *
   * @returns {Promise<number>} The native token balance.
   */
  async getBalance () {
    if (!this.#tonClient) {
      throw new Error('The wallet must be connected to ton center to get balances.')
    }

    const contract = this.#tonClient.open(this.#wallet)

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
    if (!this.#tonClient) {
      throw new Error('The wallet must be connected to ton center to get token balances.')
    }

    const jettonWalletAddress = await this.#getJettonWalletAddress(tokenAddress)

    const { stack } = await this.#tonClient.callGetMethod(jettonWalletAddress, 'get_wallet_data', [])

    const balance = stack.readNumber()

    return balance
  }

  async #getTransfer ({ to, value, bounceable }) {
    to = Address.parseFriendly(to)

    const contract = this.#tonClient.open(this.#wallet)

    const message = internal({
      to: to.address,
      value: fromNano(value).toString(),
      body: 'Transfer',
      bounce: bounceable ?? to.isBounceable
    })

    const transfer = contract.createTransfer({
      secretKey: this.#keyPair.secretKey,
      seqno: await contract.getSeqno(),
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message]
    })

    return { contract, transfer, message }
  }

  async #getJettonWalletAddress (tokenAddress) {
    const address = Address.parse(tokenAddress);

    const args = [{
      type: 'slice',
      cell: beginCell().storeAddress(this.#address).endCell()
    }];

    const { stack } = await this.#tonClient.callGetMethod(address, 'get_wallet_address', args);

    const jettonWalletAddress = stack.readAddress();

    return jettonWalletAddress;
  }

  #getHash (message) {
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

  /**
   * Disposes the wallet account, erasing the private key from the memory.
   */
  dispose () {
    sodium_memzero(this.#keyPair.secretKey)

    this.#keyPair.secretKey = undefined
  }
}
