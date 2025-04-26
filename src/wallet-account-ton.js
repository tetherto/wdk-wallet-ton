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

import { beginCell } from '@ton/core'
import { sign, signVerify } from '@ton/crypto'
import { Address, WalletContractV5R1, internal, SendMode } from '@ton/ton'
import { TonApiClient } from '@ton-api/client'
import { ContractAdapter } from '@ton-api/ton-adapter'

export default class WalletAccountTon {
  #path
  #index
  #address
  #keyPair

  #wallet
  #contractAdapter

  constructor ({ path, index, keyPair, config }) {
    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey })

    const address = wallet.address.toString({ urlSafe: true, bounceable: false, testOnly: false })

    this.#path = path
    this.#index = index
    this.#address = address
    this.#keyPair = keyPair

    this.#wallet = wallet

    const { tonApiUrl, tonApiSecretKey } = config

    if (tonApiUrl && tonApiSecretKey) {
      const client = new TonApiClient({
        baseUrl: tonApiUrl,
        apiKey: tonApiSecretKey
      })

      this.#contractAdapter = new ContractAdapter(client)
    }
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
    return {
      publicKey: Buffer.from(this.#keyPair.publicKey).toString('hex'),
      privateKey: Buffer.from(this.#keyPair.privateKey).toString('hex')
    }
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
    if (!this.#contractAdapter) {
      throw new Error('The wallet must be connected to the ton api to send transactions.')
    }

    const _to = Address.parseFriendly(to)

    const contract = this.#contractAdapter.open(this.#wallet)

    const message = internal({
      to: _to.address,
      value: value.toString(),
      body: 'Transfer',
      bounce: _to.isBounceable
    })

    const transfer = contract.createTransfer({
      secretKey: this.#keyPair.privateKey,
      seqno: await contract.getSeqno(),
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message]
    })

    await contract.send(transfer)

    const hash = this.#normalizeHash(message).toString('hex')

    return hash
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
