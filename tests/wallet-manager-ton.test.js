import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import WalletManagerTon, { WalletAccountTon } from '../index.js'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

describe('WalletManagerTon', () => {
  let wallet

  beforeEach(() => {
    wallet = new WalletManagerTon(SEED_PHRASE)
  })

  afterEach(() => {
    wallet.dispose()
  })

  describe('getAccount', () => {
    test('should return the account at index 0 by default', async () => {
      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountTon)

      expect(account.path).toBe("m/44'/607'/0'")
    })

    test('should return the account at the given index', async () => {
      const account = await wallet.getAccount(3)

      expect(account).toBeInstanceOf(WalletAccountTon)

      expect(account.path).toBe("m/44'/607'/3'")
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

    test('should return the correct fee rates', async () => {
      global.fetch = jest.fn().mockResolvedValue({
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

      const feeRates = await wallet.getFeeRates()

      expect(global.fetch).toHaveBeenCalledWith('https://tonapi.io/v2/blockchain/config/raw')

      expect(feeRates).toEqual({
        normal: BigInt(EXPECTED_FEE_RATE),
        fast: BigInt(EXPECTED_FEE_RATE)
      })
    })
  })
})
