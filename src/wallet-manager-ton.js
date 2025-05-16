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
import bip39 from 'bip39'
import WalletAccountTon from './wallet-account-ton.js'

// Includes standard 0'/0/ segment used in BIP-44 paths
const BIP_44_TON_DERIVATION_PATH_BASE = "m/44'/607'/0'/0/"

/**
 * @typedef {Object} TonWalletConfig
 * @property {string} [tonApiUrl] - The ton api's url.
 * @property {string} [tonApiSecretKey] - The api-key to use to authenticate on the ton api.
 */

export default class WalletManagerTon {
  #seedPhrase
  #config
  #client

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

    const { tonApiUrl, tonApiSecretKey } = config || {}

    if (tonApiUrl && tonApiSecretKey) {
      this.#client = new TonApiClient({
        baseUrl: tonApiUrl,
        apiKey: tonApiSecretKey
      })
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
   * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @example
   * // Returns the account with derivation path m/44'/607'/0'/0/1
   * const account = await wallet.getAccount(1);
   * @param {number} index - The index of the account to get (default: 0).
   * @returns {Promise<WalletAccountTon>} The account.
   */
  async getAccount (index = 0) {
    return await this.getAccountByPath(`${index}`)
  }

  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @param {string} path - The final segment of the derivation path (e.g. "0", "1").
   * @returns {Promise<WalletAccountTon>} The account.
   */
  async getAccountByPath (path) {
    const fullPath = BIP_44_TON_DERIVATION_PATH_BASE + path
    return new WalletAccountTon(this.#seedPhrase, fullPath, this.#config)
  }

  /**
   * Returns the current fee rates.
   *
   * @returns {Promise<{ normal: number, fast: number }>} The fee rates (in nanotons).
   */
  async getFeeRates () {
    if (!this.#client) {
      throw new Error('The wallet must be connected to the ton api to fetch fee rates.')
    }

    const { config: { config_param21 } } = await this.#client.blockchain.getRawBlockchainConfig()
    const gasPriceBasechainRaw = config_param21.gas_limits_prices.gas_flat_pfx.other.gas_prices_ext.gas_price
    const gasPriceBasechain = Math.round(gasPriceBasechainRaw / 65536)

    return {
      normal: gasPriceBasechain,
      fast: gasPriceBasechain
    }
  }
}
