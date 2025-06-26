import * as bip39 from 'bip39'

import { beforeEach, afterAll, describe, expect, jest, test } from '@jest/globals'

import WalletManagerTon, { WalletAccountTon } from '../index.js'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

const INVALID_SEED_PHRASE = 'invalid seed phrase'

describe('WalletManagerTon', () => {
  let wallet

  beforeEach(() => {
    wallet = new WalletManagerTon(SEED_PHRASE)
  })

  describe('constructor', () => {
    test('should successfully initialize a wallet manager for the given seed phrase', () => {
      const wallet = new WalletManagerTon(SEED_PHRASE)

      expect(wallet.seed).toEqual(bip39.mnemonicToSeedSync(SEED_PHRASE))
    })

    test('should throw if the seed phrase is invalid', () => {
      // eslint-disable-next-line no-new
      expect(() => { new WalletManagerTon(INVALID_SEED_PHRASE) })
        .toThrow('Invalid seed phrase.')
    })
  })

  describe('static getRandomSeedPhrase', () => {
    test('should generate a valid 12-word seed phrase', () => {
      const seedPhrase = WalletManagerTon.getRandomSeedPhrase()

      const words = seedPhrase.trim()
        .split(/\s+/)

      expect(words).toHaveLength(12)

      words.forEach(word => {
        expect(bip39.wordlists.EN.includes(word))
          .not.toBe(-1)
      })
    })
  })

  describe('static isValidSeedPhrase', () => {
    test('should return true for a valid seed phrase', () => {
      expect(WalletManagerTon.isValidSeedPhrase(SEED_PHRASE))
        .toBe(true)
    })

    test('should return false for an invalid seed phrase', () => {
      expect(WalletManagerTon.isValidSeedPhrase(INVALID_SEED_PHRASE))
        .toBe(false)
    })

    test('should return false for an empty string', () => {
      expect(WalletManagerTon.isValidSeedPhrase(''))
        .toBe(false)
    })
  })

  describe('getAccount', () => {
    test('should return the account at index 0 by default', async () => {
      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountTon)

      expect(account.path).toBe("m/44'/607'/0'/0/0")
    })

    test('should return the account at the given index', async () => {
      const account = await wallet.getAccount(3)

      expect(account).toBeInstanceOf(WalletAccountTon)

      expect(account.path).toBe("m/44'/607'/0'/0/3")
    })

    test('should throw if the index is a negative number', async () => {
      await expect(wallet.getAccount(-1))
        .rejects.toThrow('Invalid child index: -1')
    })
  })

  describe('getAccountByPath', () => {
    test('should return the account with the given path', async () => {
      const account = await wallet.getAccountByPath("1'/2/3")

      expect(account).toBeInstanceOf(WalletAccountTon)

      expect(account.path).toBe("m/44'/607'/1'/2/3")
    })

    test('should throw if the path is invalid', async () => {
      await expect(wallet.getAccountByPath("a'/b/c"))
        .rejects.toThrow('Invalid child index: a\'')
    })
  })

  describe('getFeeRates', () => {
    const EXPECTED_FEE_RATE = 1_234

    const { fetch: originalFetch } = global

    afterAll(() => {
      global.fetch = originalFetch
    })

    test('should return the correct fee rates', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({
            config: {
              config_param21: {
                gas_limits_prices: {
                  gas_flat_pfx: {
                    other: {
                      gas_prices_ext: {
                        gas_price: EXPECTED_FEE_RATE * 65_536
                      }
                    }
                  }
                }
              }
            }
          })
        })
      )

      const feeRates = await wallet.getFeeRates()

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith('https://tonapi.io/v2/blockchain/config/raw')

      expect(feeRates).toEqual({
        normal: EXPECTED_FEE_RATE,
        fast: EXPECTED_FEE_RATE
      })
    })
  })
})
