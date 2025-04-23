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
import { WalletContractV5R1 } from '@ton/ton'

export default class WalletAccountTon {
  #path
  #index
  #address
  #keyPair
  #config

  constructor ({ path, index, keyPair, config }) {
    const contract = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey })
    const address = contract.address.toString({ urlSafe: true, bounceable: false, testOnly: false })

    this.#path = path
    this.#index = index
    this.#address = address
    this.#keyPair = keyPair
    this.#config = config
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

  async sendTransaction () {
    throw Error('Method not implemented')
  }
}
