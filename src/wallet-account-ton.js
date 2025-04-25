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

  get path () {
    return this.#path
  }

  get index () {
    return this.#index
  }

  get address () {
    return this.#address
  }

  get keyPair () {
    return this.#keyPair
  }

  async sign (message) {
    if (!Buffer.isBuffer(message)) throw new Error('Message must be a buffer')
    if (!Buffer.isBuffer(this.#keyPair.privateKey)) throw new Error('Secret key must be a buffer')

    try {
      return sign(message, this.#keyPair.privateKey)
    } catch (error) {
      throw new Error('Failed to sign message: ' + error.message)
    }
  }

  async verify (message, signature) {
    if (!Buffer.isBuffer(message)) throw new Error('Message must be a buffer')
    if (!Buffer.isBuffer(signature)) throw new Error('Signature must be a buffer')

    try {
      return signVerify(message, signature, this.#keyPair.publicKey)
    } catch (error) {
      throw new Error('Failed to verify signature: ' + error.message)
    }
  }

  async sendTransaction (to, value, data = {}) {
    const openContract = this.#contractAdapter.open(this.#wallet)
    const seqno = await openContract.getSeqno()
    const recipient = Address.parseFriendly(to)
    const message = internal({
      to: recipient.address,
      value: value.toString(),
      body: 'Transfer',
      bounce: recipient.isBounceable,
      ...data
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
      .storeUint(2, 2) // external-in
      .storeUint(0, 2) // addr_none
      .storeAddress(message.info.dest)
      .storeUint(0, 4) // import_fee = 0
      .storeBit(false) // no StateInit
      .storeBit(true) // store body as reference
      .storeRef(message.body)
      .endCell()

    return cell.hash()
  }
}
