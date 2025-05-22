import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import bip39 from 'bip39'

jest.unstable_mockModule('@ton-api/client', () => ({
  TonApiClient: jest.fn()
}))

jest.unstable_mockModule('../src/wallet-account-ton.js', () => ({
  default: jest.fn()
}))

const { TonApiClient } = await import('@ton-api/client')
const WalletAccountTon = (await import('../src/wallet-account-ton.js')).default
const WalletManagerTon = (await import('../src/wallet-manager-ton.js')).default

describe('WalletManagerTon', () => {
  const VALID_SEED_PHRASE = 'man toilet critic page about border soldier north report quote alcohol alter'
  const INVALID_SEED_PHRASE = 'invalid seed phrase'
  const MANAGER_CONFIG = {
    tonApiUrl: 'https://api.example.com',
    tonApiSecretKey: 'secret'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize correctly with valid seed and config', () => {
      const manager = new WalletManagerTon(VALID_SEED_PHRASE, MANAGER_CONFIG)

      expect(manager.seedPhrase).toBe(VALID_SEED_PHRASE)
      expect(TonApiClient).toHaveBeenCalledWith({
        baseUrl: MANAGER_CONFIG.tonApiUrl,
        apiKey: MANAGER_CONFIG.tonApiSecretKey
      })
    })

    it('should throw an error with invalid seed phrase', () => {
      expect(() => new WalletManagerTon(INVALID_SEED_PHRASE)).toThrow('The seed phrase is invalid.')
    })

    it('should not initialize TonApiClient if config is incomplete', () => {
      const partialConfig = { tonApiUrl: 'url' }

      const manager = new WalletManagerTon(VALID_SEED_PHRASE, partialConfig)

      expect(manager.seedPhrase).toBe(VALID_SEED_PHRASE)
      expect(TonApiClient).not.toHaveBeenCalled()
    })
  })

  describe('getRandomSeedPhrase', () => {
    test('generates a valid 12-word seed phrase', () => {
      const seedPhrase = WalletManagerTon.getRandomSeedPhrase()
      const words = seedPhrase.trim().split(/\s+/)

      expect(words).toHaveLength(12)

      words.forEach(word => expect(bip39.wordlists.EN).toContain(word))
    })
  })

  describe('isValidSeedPhrase', () => {
    it('should return true for a valid seed', () => {
      const result = WalletManagerTon.isValidSeedPhrase(VALID_SEED_PHRASE)

      expect(result).toBe(true)
    })

    it('should return false for an invalid seed', () => {
      const result = WalletManagerTon.isValidSeedPhrase(INVALID_SEED_PHRASE)

      expect(result).toBe(false)
    })
  })

  describe('seedPhrase (getter)', () => {
    it('should return the original seed phrase', () => {
      const wallet = new WalletManagerTon(VALID_SEED_PHRASE)

      const result = wallet.seedPhrase

      expect(result).toBe(VALID_SEED_PHRASE)
    })
  })

  describe('getAccount', () => {
    it('should call getAccountByPath with derived path for index 0 by default', async () => {
      const wallet = new WalletManagerTon(VALID_SEED_PHRASE)

      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountTon)
    })

    it('should use provided index in path', async () => {
      const wallet = new WalletManagerTon(VALID_SEED_PHRASE, MANAGER_CONFIG)

      await wallet.getAccount(3)

      expect(WalletAccountTon).toHaveBeenCalledWith(VALID_SEED_PHRASE, "0'/0/3", MANAGER_CONFIG)
    })
  })

  describe('getAccountByPath', () => {
    it('should return a WalletAccountTon for the given path', async () => {
      const wallet = new WalletManagerTon(VALID_SEED_PHRASE, MANAGER_CONFIG)
      const path = "0'/0/5"

      await wallet.getAccountByPath(path)

      expect(WalletAccountTon).toHaveBeenCalledWith(VALID_SEED_PHRASE, path, MANAGER_CONFIG)
    })
  })

  describe('getFeeRates', () => {
    it('should return normal and fast fee rates when connected to TON API', async () => {
      const mockGasPrice = 2 * 65536
      const mockResponse = {
        config: {
          config_param21: {
            gas_limits_prices: {
              gas_flat_pfx: {
                other: {
                  gas_prices_ext: {
                    gas_price: mockGasPrice
                  }
                }
              }
            }
          }
        }
      }

      const mockClient = {
        blockchain: {
          getRawBlockchainConfig: jest.fn().mockResolvedValue(mockResponse)
        }
      }

      TonApiClient.mockImplementation(() => mockClient)

      const wallet = new WalletManagerTon(VALID_SEED_PHRASE, MANAGER_CONFIG)

      const result = await wallet.getFeeRates()

      expect(mockClient.blockchain.getRawBlockchainConfig).toHaveBeenCalled()
      expect(result).toEqual({ normal: 2, fast: 2 })
    })

    it('should throw if TON API client is not initialized', async () => {
      const wallet = new WalletManagerTon(VALID_SEED_PHRASE)

      await expect(wallet.getFeeRates()).rejects.toThrow(
        'The wallet must be connected to the ton api to fetch fee rates.'
      )
    })
  })
})
