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

import * as bip39 from 'bip39'
import WalletAccountTon from './wallet-account-ton.js'
import * as ed25519 from 'ed25519-hd-key'

export default class WalletManagerTon {
  /**
   * Creates a new WalletManagerTon instance.
   *
   * @param {string} seedPhrase - The wallet’s BIP-39 seed phrase.
   * @param {Object} [config={}] - The configuration object.
   * @param {string} [config.tonApiUrl] - The TON API’s URL.
   * @param {string} [config.tonApiSecretKey] - The API key to use to authenticate on the TON API.
   */
  constructor(seedPhrase, config = {}) {
    if (!WalletManagerTon.isValidSeedPhrase(seedPhrase)) {
      throw new Error('Invalid seed phrase');
    }

    this.seedPhrase = seedPhrase;
    this.config = config;
  }

  /**
   * Returns a random BIP-39 seed phrase.
   *
   * @returns {string} The seed phrase.
   */
  static getRandomSeedPhrase() {
    return bip39.generateMnemonic();
  }

  /**
   * Checks if a seed phrase is valid.
   *
   * @param {string} seedPhrase - The seed phrase.
   * @returns {boolean} True if the seed phrase is valid.
   */
  static isValidSeedPhrase(seedPhrase) {
    return bip39.validateMnemonic(seedPhrase);
  }

  /**
   * Gets a wallet account for the specified index.
   *
   * @param {number} index - The account index to retrieve.
   * @returns {WalletAccountTon} The wallet account for the specified index.
   */
  getAccount(index) {
    const path = `m/44'/607'/${index}'`;
    const keyPair = this.#deriveKeyPair(path);
    return new WalletAccountTon({ path, index, keyPair, config: this.config });
  }

  /**
   * Derives a key pair from the seed phrase using the specified HD path.
   *
   * @private
   * @param {string} hdPath - The hierarchical deterministic path.
   * @returns {{ privateKey: Buffer, publicKey: Buffer }} The derived key pair.
   */
  #deriveKeyPair(hdPath) {
    const seed = bip39.mnemonicToSeedSync(this.seedPhrase);
    const { key: privateKey } = ed25519.derivePath(hdPath, seed.toString('hex'));
    const publicKey = ed25519.getPublicKey(privateKey).slice(1);

    return { privateKey, publicKey };
  }
}
