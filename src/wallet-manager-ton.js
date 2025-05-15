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

import { BIP32Factory } from 'bip32'
import ecc from '@bitcoinerlab/secp256k1'
import bip39 from 'bip39'
import nacl from 'tweetnacl'

import WalletAccountTon from './wallet-account-ton.js'

const bip32 = BIP32Factory(ecc)

const BIP_44_TON_DERIVATION_PATH_BASE = 'm/44\'/607\''

/**
 * @typedef {Object} TonWalletConfig
 * @property {string} [tonApiUrl] - The ton api's url.
 * @property {string} [tonApiSecretKey] - The api-key to use to authenticate on the ton api.
 */

export default class WalletManagerTon {
  #seedPhrase
  #config

  /**
   * Creates a new wallet manager for the ton blockchain.
   *
   * @param {string} seedPhrase - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {TonWalletConfig} [config] - The configuration object.
   */
  constructor (seedPhrase, config = {}) {
    if (!WalletManagerTon.isValidSeedPhrase(seedPhrase)) {
      throw new Error('The seed phrase is invalid.')
    }

    this.#seedPhrase = seedPhrase

    this.#config = config
  }

  /**
   * Returns a random [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   *
   * @returns {string} The seed phrase.
   */
  static getRandomSeedPhrase () {
    return bip39.generateMnemonic()
  }

  /**
   * Checks if a seed phrase is valid.
   *
   * @param {string} seedPhrase - The seed phrase.
   * @returns {boolean} True if the seed phrase is valid.
   */
  static isValidSeedPhrase (seedPhrase) {
    return bip39.validateMnemonic(seedPhrase)
  }

  /**
  * The seed phrase of the wallet.
  *
  * @type {string}
  */
  get seedPhrase () {
    return this.#seedPhrase
  }

  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @param {string} path - The derivation path (e.g. “/0’/0/0”).
   * @returns {Promise<WalletAccountTon>} The account.
   */
  async getAccountByPath (path) {
    path = BIP_44_TON_DERIVATION_PATH_BASE + path
    const segments = path.split('/')
    const lastSegment = segments[segments.length - 1]
    const index = parseInt(lastSegment, 10)
    const keyPair = this.#deriveKeyPair(path)
    return new WalletAccountTon({ path, index, keyPair, config: this.#config })
  }

  /**
   * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @example
   * // Returns the account with derivation path m/44'/607'/0'/0/1
   * const account = await wallet.getAccount(1);
   * @param {number} index - The index of the account to get (default: 0).
   * @returns {Promise<WalletAccountTon>} The account.
   */
  async getAccount (index = 0) {
    return await this.getAccountByPath(`/0'/0/${index}`)
  }

  #deriveKeyPair (hdPath) {
    const seed = bip39.mnemonicToSeedSync(this.#seedPhrase)

    const { privateKey } = bip32.fromSeed(seed)
      .derivePath(hdPath)

    const keyPair = nacl.sign.keyPair.fromSeed(privateKey)

    return { privateKey: keyPair.secretKey, publicKey: keyPair.publicKey }
  }
}
