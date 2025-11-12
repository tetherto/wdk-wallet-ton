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
      expect(await account.getAddress()).toBe("UQASomfWf2V7N46QrW4umfpARQBwKORp_z6I_8u2jUG29cYa")
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

  describe('getAddress', () => {
    test('should return consistent address at index 0 by default', async () => {
      const account = await wallet.getAccount()

      expect(await account.getAddress()).toBe("UQASomfWf2V7N46QrW4umfpARQBwKORp_z6I_8u2jUG29cYa")
    })

    test('should return different addresses for different account indices', async () => {
      const account1 = await wallet.getAccount(1)
      const account2 = await wallet.getAccount(2)
      const account3 = await wallet.getAccount(3)

      expect(await account1.getAddress()).toBe("UQD3CRdkxEJL89-0TvBLTon261m8ImL2ivGgQ_50OW-XhKpY")
      expect(await account2.getAddress()).toBe("UQAHSZQKm9kgS7R9rj9W0MsiGae7_F83h48yATo8KlacmFlp")
      expect(await account3.getAddress()).toBe("UQA6jD3MrIfoQjNMiXzVv461JfqtZ3cSGkjV4i85tU5tKFlJ")
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
