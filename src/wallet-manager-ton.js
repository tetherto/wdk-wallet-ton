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

import AbstractWalletManager from '@wdk/wallet'

import WalletAccountTon from './wallet-account-ton.js'

/** @typedef {import('@wdk/wallet').FeeRates} FeeRates */

/** @typedef {import('./wallet-account-ton.js').TonWalletConfig} TonWalletConfig */

const TON_API_URL = 'https://tonapi.io/v2'

export default class WalletManagerTon extends AbstractWalletManager {
  /**
   * Creates a new wallet manager for the ton blockchain.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {TonWalletConfig} [config] - The configuration object.
   */
  constructor (seed, config = {}) {
    super(seed, config)

    /**
     * The ton wallet configuration.
     *
     * @protected
     * @type {TonWalletConfig}
     */
    this._config = config

    /**
     * A map between derivation paths and wallet accounts. It contains all the wallet accounts that have been accessed through the {@link getAccount} and {@link getAccountByPath} methods.
     *
     * @protected
     * @type {{ [path: string]: WalletAccountTon }}
     */
    this._accounts = {}
  }

  /**
   * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @example
   * // Returns the account with derivation path m/44'/607'/0'/0/1
   * const account = await wallet.getAccount(1);
   * @param {number} [index] - The index of the account to get (default: 0).
   * @returns {Promise<WalletAccountTon>} The account.
   */
  async getAccount (index = 0) {
    return await this.getAccountByPath(`0'/0/${index}`)
  }

  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @example
   * // Returns the account with derivation path m/44'/607'/0'/0/1
   * const account = await wallet.getAccountByPath("0'/0/1");
   * @param {string} path - The derivation path (e.g. "0'/0/0").
   * @returns {Promise<WalletAccountTon>} The account.
   */
  async getAccountByPath (path) {
    if (!this._accounts[path]) {
      const account = new WalletAccountTon(this.seed, path, this._config)

      this._accounts[path] = account
    }

    return this._accounts[path]
  }

  /**
   * Returns the current fee rates.
   *
   * @returns {Promise<FeeRates>} The fee rates (in nanotons).
   */
  async getFeeRates () {
    /* eslint-disable camelcase */

    const response = await fetch(`${TON_API_URL}/blockchain/config/raw`)

    const { config: { config_param21 } } = await response.json()
    const gasPrice = config_param21.gas_limits_prices.gas_flat_pfx.other.gas_prices_ext.gas_price
    const feeRate = Math.round(gasPrice / 65_536)

    return {
      normal: feeRate,
      fast: feeRate
    }
  }

  /**
   * Disposes all the wallet accounts, erasing their private keys from the memory.
   */
  dispose () {
    for (const account of Object.values(this._accounts)) {
      account.dispose()
    }

    this._accounts = {}
  }
}
