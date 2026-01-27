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

import { sign } from '@ton/crypto'

import { SendMode } from '@ton/ton'

import nacl from 'tweetnacl'
import HDKey from 'micro-key-producer/slip10.js'

// eslint-disable-next-line camelcase
import { sodium_memzero } from 'sodium-universal'

import * as bip39 from 'bip39'

import WalletAccountReadOnlyTon from './wallet-account-read-only-ton.js'

/** @typedef {import('@ton/ton').MessageRelaxed} MessageRelaxed */
/** @typedef {import('@ton/ton').Transaction} TonTransactionReceipt */

/** @typedef {import('@tetherto/wdk-wallet').IWalletAccount} IWalletAccount */

/** @typedef {import('@tetherto/wdk-wallet').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet').TransferResult} TransferResult */

/** @typedef {import('./wallet-account-read-only-ton.js').TonTransaction} TonTransaction */
/** @typedef {import('./wallet-account-read-only-ton.js').TonClientConfig} TonClientConfig */
/** @typedef {import('./wallet-account-read-only-ton.js').TonWalletConfig} TonWalletConfig */

const BIP_44_TON_DERIVATION_PATH_PREFIX = "m/44'/607'"

function derivePath (seed, path) {
  const hdKey = HDKey.fromMasterSeed(seed)
  const { privateKey } = hdKey.derive(path, true)
  const keyPair = nacl.sign.keyPair.fromSeed(privateKey)

  sodium_memzero(privateKey)

  return keyPair
}

/** @implements {IWalletAccount} */
export default class WalletAccountTon extends WalletAccountReadOnlyTon {
  /**
   * Creates a new ton wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {TonWalletConfig} [config] - The configuration object.
   */
  constructor (seed, path, config = { }) {
    if (typeof seed === 'string') {
      if (!bip39.validateMnemonic(seed)) {
        throw new Error('The seed phrase is invalid.')
      }

      seed = bip39.mnemonicToSeedSync(seed)
    }

    path = BIP_44_TON_DERIVATION_PATH_PREFIX + '/' + path

    const keyPair = derivePath(seed, path)

    super(keyPair.publicKey, config)

    /**
     * The wallet account configuration.
     *
     * @protected
     * @type {TonWalletConfig}
     */
    this._config = config

    /** @private */
    this._path = path

    /** @private */
    this._keyPair = keyPair
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return +this._path.split('/').pop().replace("'", '')
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path () {
    return this._path
  }

  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return {
      publicKey: this._keyPair.publicKey,
      privateKey: this._keyPair.secretKey
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

    return sign(_message, this._keyPair.secretKey)
      .toString('hex')
  }

  /**
   * Sends a transaction.
   *
   * @param {TonTransaction} tx - The transaction.
   * @returns {Promise<TransactionResult>} The transaction's result.
   */
  async sendTransaction (tx) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to send transactions.')
    }

    const message = await this._getTransactionMessage(tx)
    const transfer = await this._getTransfer(message)
    const fee = await this._getTransferFee(transfer)

    await this._contract.send(transfer)

    return {
      hash: transfer.hash().toString('hex'),
      fee
    }
  }

  /**
   * Transfers a token to another address.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<TransferResult>} The transfer's result.
   */

  async transfer (options) {
    if (!this._tonClient) {
      throw new Error('The wallet must be connected to ton center to transfer tokens.')
    }

    const message = await this._getTokenTransferMessage(options)
    const transfer = await this._getTransfer(message)
    const fee = await this._getTransferFee(transfer)

    // eslint-disable-next-line eqeqeq
    if (this._config.transferMaxFee != undefined && fee >= this._config.transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transfer operations.')
    }

    await this._contract.send(transfer)

    return {
      hash: transfer.hash().toString('hex'),
      fee
    }
  }

  /**
   * Returns a read-only copy of the account.
   *
   * @returns {Promise<WalletAccountReadOnlyTon>} The read-only account.
   */
  async toReadOnlyAccount () {
    const readOnlyAccount = new WalletAccountReadOnlyTon(this._keyPair.publicKey, this._config)

    return readOnlyAccount
  }

  /**
   * Disposes the wallet account, erasing the private key from the memory.
   */
  dispose () {
    sodium_memzero(this._keyPair.secretKey)

    this._keyPair.secretKey = undefined
  }

  async _getTransfer (message) {
    const seqno = await this._contract.getSeqno()

    const transfer = this._contract.createTransfer({
      secretKey: this._keyPair.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [message],
      seqno
    })

    return transfer
  }
}
