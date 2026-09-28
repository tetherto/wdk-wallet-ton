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

// eslint-disable-next-line camelcase
import { sha256_sync } from '@ton/crypto'

const TON_SAFE_SIGN_PREFIX = Buffer.from([0xff, 0xff])
const TON_SAFE_SIGN_MAGIC = Buffer.from('ton-safe-sign-magic')

/**
 * Hashes message bytes under TON's safe-sign domain so the resulting signature
 * cannot authorize a transaction that expects a signature over raw bytes.
 *
 * @param {string | Uint8Array} message - The message bytes to domain-separate.
 * @returns {Buffer} The 32-byte domain-separated digest to sign or verify.
 */
export function getMessageSigningHash (message) {
  return sha256_sync(Buffer.concat([
    TON_SAFE_SIGN_PREFIX,
    TON_SAFE_SIGN_MAGIC,
    Buffer.from(message)
  ]))
}
