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

import { WalletAccountReadOnly } from '@tetherto/wdk-wallet'
import FailoverProvider from '@tetherto/wdk-failover-provider'
import { Address, beginCell, TonClient } from '@ton/ton'

/** @typedef {import('./wallet-account-read-only-ton.js').TonClientConfig} TonClientConfig */
/** @typedef {import('./wallet-account-read-only-ton.js').TonWalletConfig} TonWalletConfig */

/**
 * Read-only TON account for an existing address.
 *
 * Unlike {@link WalletAccountReadOnlyTon}, this class does not derive a V5R1
 * wallet from a public key. It can therefore monitor any valid TON address,
 * including accounts using other wallet contract versions. Operations that
 * require a public key, wallet code or signing remain unsupported.
 */
export default class WalletAccountReadOnlyTonAddress extends WalletAccountReadOnly {
  /**
   * @param {string} address - Existing TON account address in raw or friendly form.
   * @param {Omit<TonWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} [config] - Read-only client configuration.
   */
  constructor (address, config = { }) {
    const ownerAddress = Address.parse(address)
    super(ownerAddress.toString({ bounceable: false }))

    /** @protected @type {Address} */
    this._ownerAddress = ownerAddress

    /** @protected @type {Omit<TonWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} */
    this._config = config

    /** @protected @type {TonClient | undefined} */
    this._tonClient = undefined

    const { tonClient, retries = 3 } = config
    if (Array.isArray(tonClient)) {
      if (tonClient.length > 0) {
        this._tonClient = WalletAccountReadOnlyTonAddress._createTonClientWithFailoverApi(tonClient, retries)
      }
    } else if (tonClient) {
      this._tonClient = tonClient instanceof TonClient
        ? tonClient
        : new TonClient({ endpoint: tonClient.url, apiKey: tonClient.secretKey })
    }
  }

  /**
   * @returns {Promise<bigint>} Native TON balance in nanotons.
   */
  async getBalance () {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to get balances.')
    }
    return this._tonClient.getBalance(this._ownerAddress)
  }

  /**
   * Resolves the owner's wallet from the provided Jetton master, then verifies
   * the wallet-reported owner and master before returning its balance.
   *
   * @param {string} tokenAddress - Jetton master address.
   * @returns {Promise<bigint>} Jetton balance in base units.
   */
  async getTokenBalance (tokenAddress) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to get token balances.')
    }

    const masterAddress = Address.parse(tokenAddress)
    const jettonWalletAddress = await this._getJettonWalletAddress(masterAddress)

    try {
      const { stack } = await this._tonClient.callGetMethod(jettonWalletAddress, 'get_wallet_data', [])
      const balance = stack.readBigNumber()
      const ownerAddress = stack.readAddress()
      const reportedMasterAddress = stack.readAddress()

      if (!ownerAddress.equals(this._ownerAddress) || !reportedMasterAddress.equals(masterAddress)) {
        throw new Error('The jetton wallet owner or master does not match the requested account.')
      }
      return balance
    } catch (error) {
      if (error.message.includes('exit_code: -13')) return 0n
      throw error
    }
  }

  /**
   * @protected
   * @param {Address} masterAddress - Jetton master address.
   * @returns {Promise<Address>} Derived Jetton wallet address.
   */
  async _getJettonWalletAddress (masterAddress) {
    const { stack } = await this._tonClient.callGetMethod(masterAddress, 'get_wallet_address', [{
      type: 'slice',
      cell: beginCell().storeAddress(this._ownerAddress).endCell()
    }])
    return stack.readAddress()
  }

  /**
   * @protected
   * @param {Array<TonClientConfig | TonClient>} tonClients - Client configs or instances.
   * @param {number} retries - Additional failover attempts.
   * @returns {TonClient} TON client using the failover API.
   */
  static _createTonClientWithFailoverApi (tonClients, retries) {
    const clients = tonClients.map(entry => entry instanceof TonClient
      ? entry
      : new TonClient({ endpoint: entry.url, apiKey: entry.secretKey }))

    const failoverProvider = new FailoverProvider({
      providers: clients.map(client => client.api),
      retries
    })
    const tonClient = new TonClient({ endpoint: '/' })
    tonClient.api = failoverProvider.initialize()
    return tonClient
  }
}
