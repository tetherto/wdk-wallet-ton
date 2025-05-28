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

import { beginCell, fromNano } from '@ton/core'
import { sign, signVerify } from '@ton/crypto'
import { Address, WalletContractV5R1, internal, TonClient, SendMode } from '@ton/ton'
import { TonApiClient } from '@ton-api/client'
import { ContractAdapter } from '@ton-api/ton-adapter'

import { BIP32Factory } from 'bip32'
import ecc from '@bitcoinerlab/secp256k1'
import nacl from 'tweetnacl'
import * as bip39 from 'bip39'

/** @typedef {import('@ton/ton').TonClient} TonClient */

/** @typedef {import('@ton-api/client').TonApiClient} TonApiClient */

/**
 * @typedef {Object} KeyPair
 * @property {string} publicKey - The public key.
 * @property {string} privateKey - The private key.
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
 * @property {string | TonApiClient} [tonApiUrl] - The url of the ton api, or a instance of the {@link TonApiClient} class.
 * @property {string} [tonApiSecretKey] - The api-key to use to authenticate on the ton api.
 */

const bip32 = BIP32Factory(ecc)

const BIP_44_TON_DERIVATION_PATH_PREFIX = "m/44'/607'"

export default class WalletAccountTon {
  #wallet
  #address
  #path
  #keyPair

  #tonCenter
  #tonApi
  #contractAdapter

  /**
   * @param {string} seedPhrase - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {TonWalletConfig} [config] - The configuration object.
   */
  constructor (seedPhrase, path, config = {}) {
    path = `${BIP_44_TON_DERIVATION_PATH_PREFIX}/${path}`

    const keyPair = WalletAccountTon.#deriveKeyPair(seedPhrase, path)

    this.#wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey })
    this.#address = this.#wallet.address.toString({ urlSafe: true, bounceable: false, testOnly: false })
    this.#path = path
    this.#keyPair = keyPair

    const { tonCenterUrl, tonCenterSecretKey, tonApiUrl, tonApiSecretKey } = config

    if (tonCenterUrl) {
      if (typeof tonCenterUrl === 'string') {
        if (!tonCenterSecretKey) {
          throw new Error('You must also provide a valid secret key to connect the wallet to the ton center api.')
        }

        this.#tonCenter = new TonClient({
          endpoint: tonCenterUrl,
          apiKey: tonCenterSecretKey
        })
      }

      if (tonCenterUrl instanceof TonClient) {
        this.#tonCenter = tonCenterUrl
      }
    }

    if (tonApiUrl) {
      if (typeof tonApiUrl === 'string') {
        if (!tonApiSecretKey) {
          throw new Error('You must also provide a valid secret key to connect the wallet to the ton api.')
        }

        this.#tonApi = new TonApiClient({
          baseUrl: tonApiUrl,
          apiKey: tonApiSecretKey
        })
      }

      if (tonApiUrl instanceof TonApiClient) {
        this.#tonApi = tonApiUrl
      }

      this.#contractAdapter = new ContractAdapter(this.#tonApi)
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
      publicKey: Buffer.from(this.#keyPair.publicKey).toString('hex'),
      privateKey: Buffer.from(this.#keyPair.privateKey).toString('hex')
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

    return sign(_message, this.#keyPair.privateKey)
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
   * @returns {Promise<number>} - The transaction’s fee (in nanotons).
   */
  async quoteTransaction ({ to, value, bounceable }) {
    /* eslint-disable camelcase */

    if (!this.#tonCenter) {
      throw new Error('The wallet must be connected to the ton center api to quote transactions.')
    }

    const { transfer } = await this.#getTransfer({ to, value, bounceable })

    const { source_fees: { in_fwd_fee, storage_fee, gas_fee, fwd_fee } } = await this.#tonCenter.estimateExternalMessageFee(this.#wallet.address, { body: transfer })

    return in_fwd_fee + storage_fee + gas_fee + fwd_fee
  }

  /**
   * Sends a transaction with arbitrary data.
   *
   * @param {TonTransaction} tx - The transaction to send.
   * @returns {Promise<string>} The transaction's hash.
   */
  async sendTransaction ({ to, value, bounceable }) {
    const { contract, transfer, message } = await this.#getTransfer({ to, value, bounceable })

    await contract.send(transfer)

    const hash = this.#normalizeHash(message).toString('hex')

    return hash
  }

  /**
   * Returns the account's native token balance.
   *
   * @returns {Promise<number>} The native token balance.
   */
  async getBalance () {
    if (!this.#contractAdapter) {
      throw new Error('The wallet must be connected to the ton api to get balances.')
    }

    const contract = this.#contractAdapter.open(this.#wallet)

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
    if (!this.#tonApi) {
      throw new Error('The wallet must be connected to the ton api to get token balances.')
    }

    const jettonWalletAddress = await this.#getJettonWalletAddress(tokenAddress)

    const { decoded: { balance } } = await this.#tonApi.blockchain
      .execGetMethodForBlockchainAccount(jettonWalletAddress, 'get_wallet_data')

    return Number(balance)
  }

  async #getTransfer ({ to, value, bounceable }) {
    if (!this.#contractAdapter) {
      throw new Error('The wallet must be connected to the ton api to send or quote transactions.')
    }

    const _to = Address.parseFriendly(to)

    const contract = this.#contractAdapter.open(this.#wallet)

    const message = internal({
      to: _to.address,
      value: fromNano(value).toString(),
      body: 'Transfer',
      bounce: bounceable ?? _to.isBounceable
    })

    const transfer = contract.createTransfer({
      secretKey: this.#keyPair.privateKey,
      seqno: await contract.getSeqno(),
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message]
    })

    return { contract, transfer, message }
  }

  async #getJettonWalletAddress (tokenAddress) {
    const jettonAddress = Address.parse(tokenAddress)

    const response = await this.#tonApi.blockchain.execGetMethodForBlockchainAccount(
      jettonAddress,
      'get_wallet_address',
      { args: [this.#address] }
    )

    return Address.parse(response.decoded.jetton_wallet_address)
  }

  #normalizeHash (message) {
    if (message.info.type !== 'external-in') {
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

    return cell.hash()
  }

  static #deriveKeyPair (seedPhrase, hdPath) {
    const seed = bip39.mnemonicToSeedSync(seedPhrase)
    const { privateKey } = bip32.fromSeed(seed).derivePath(hdPath)
    const keyPair = nacl.sign.keyPair.fromSeed(privateKey)

    return { privateKey: keyPair.secretKey, publicKey: keyPair.publicKey }
  }
}
