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

/** @typedef {import('@wdk/wallet').FeeRates} FeeRates */
/** @typedef {import('@wdk/wallet').KeyPair} KeyPair */
/** @typedef {import('@wdk/wallet').TransactionResult} TransactionResult */
/** @typedef {import('@wdk/wallet').TransferOptions} TransferOptions */
/** @typedef {import('@wdk/wallet').TransferResult} TransferResult */

/** @typedef {import('./src/wallet-account-ton.js').TonClientConfig} TonClientConfig */
/** @typedef {import('./src/wallet-account-ton.js').TonWalletConfig} TonWalletConfig */
/** @typedef {import('./src/wallet-account-ton.js').TonTransaction} TonTransaction */
/** @typedef {import('./src/wallet-account-ton.js').TonTransactionReceipt} TonTransactionReceipt */

export { default } from './src/wallet-manager-ton.js'

export { default as WalletAccountTon } from './src/wallet-account-ton.js'
