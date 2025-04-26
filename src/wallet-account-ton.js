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

import { TonApiClient } from '@ton-api/client'
import { sign, signVerify } from '@ton/crypto'
import { Address, WalletContractV5R1, internal, SendMode } from '@ton/ton'
import { ContractAdapter } from '@ton-api/ton-adapter'
import { beginCell } from '@ton/core'

export default class WalletAccountTon {
  #path
  #index
  #address
  #keyPair
  #client
  #wallet
  #contractAdapter

  constructor ({ path, index, keyPair, config }) {
    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey })
    const address = wallet.address.toString({ urlSafe: true, bounceable: false, testOnly: false })

    this.#path = path
    this.#wallet = wallet
    this.#index = index
    this.#address = address
    this.#keyPair = keyPair
    this.#client = new TonApiClient({
      baseUrl: config.tonApiUrl,
      apiKey: config.tonApiSecretKey
    })
    this.#contractAdapter = new ContractAdapter(this.#client)
  }

  /**
   * The derivation path's index of this account.
   * 
   * @type {number}
   */
  get index () {
    return this.#index
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   * 
   * @type {number}
   */
  get path () {
    return this.#path
  }

  /**
   * The account's address.
   * 
   * @type {string}
   */
  get address () {
    return this.#address
  }

  /**
   * @typedef {Object} KeyPair
   * @property {string} publicKey - The public key.
   * @property {string} privateKey - The private key.
   */

  /**
   * The account's key pair.
   * 
   * @type {KeyPair}
   */
  get keyPair () {
    return this.#keyPair
  }

  /**
   * Signs a message.
   * 
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  async sign (message) {
    if (!Buffer.isBuffer(message)) throw new Error('Message must be a buffer')
    if (!Buffer.isBuffer(this.#keyPair.privateKey)) throw new Error('Secret key must be a buffer')

    try {
      return sign(message, this.#keyPair.privateKey)
    } catch (error) {
      throw new Error('Failed to sign message: ' + error.message)
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
    if (!Buffer.isBuffer(message)) throw new Error('Message must be a buffer')
    if (!Buffer.isBuffer(signature)) throw new Error('Signature must be a buffer')

    try {
      return signVerify(message, signature, this.#keyPair.publicKey)
    } catch (error) {
      throw new Error('Failed to verify signature: ' + error.message)
    }
  }

  /**
   * @typedef {Object} Transaction
   * @property {string} to - The transaction's recipient.
   * @property {number} value - The amount of native tokens to send to the recipient.
   * @property {string} [data] - The transaction's data in hex format.
   */
  
  /**
   * Sends a transaction with arbitrary data.
   * 
   * @param {Transaction} tx - The transaction to send.
   * @returns {Promise<string>} The transaction's hash.
   */
  async sendTransaction (to, value) {
    const openContract = this.#contractAdapter.open(this.#wallet)
    const seqno = await openContract.getSeqno()
    const recipient = Address.parseFriendly(to)
    const message = internal({
      to: recipient.address,
      value: value.toString(),
      body: 'Transfer',
      bounce: recipient.isBounceable
    })

    const transfer = openContract.createTransfer({
      secretKey: this.#keyPair.privateKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message]
    })

    const internalMessageHash = this.#normalizeHash(message).toString('hex')

    await openContract.send(transfer)

    return internalMessageHash
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
}
