import { jest, expect, it, describe, beforeEach } from '@jest/globals'

// --- MOCK CONSTANTS ---
const MOCK_VALID_SEED_PHRASE = 'legal winner thank year wave sausage worth useful legal winner thank yellow'
const MOCK_INVALID_SEED_PHRASE = 'invalid seed phrase words'
const MOCK_GENERATED_SEED_PHRASE = 'mock generated seed phrase success'
const MOCK_TON_API_URL = 'https://tonapi.io/v2'
const MOCK_TON_API_KEY = 'test_ton_api_secret_key_for_manager'
const MOCK_ACCOUNT_PATH_SUFFIX = "0'/0/0"

// --- DECLARE MOCK FUNCTIONS ---
const mockBip39GenerateMnemonic = jest.fn()
const mockBip39ValidateMnemonic = jest.fn()

// @ton-api/client (TonApiClient)
const MockTonApiClientConstructor = jest.fn()
const mockTonApiClientGetRawBlockchainConfig = jest.fn()

// (WalletAccountTon)
const mockWalletAccountTonConstructor = jest.fn()

// --- DEPENDENCY MOCKS ---
jest.unstable_mockModule('bip39', () => ({
  generateMnemonic: mockBip39GenerateMnemonic,
  validateMnemonic: mockBip39ValidateMnemonic
}))

jest.unstable_mockModule('@ton-api/client', () => ({
  TonApiClient: MockTonApiClientConstructor
}))

jest.unstable_mockModule('../src/wallet-account-ton.js', () => ({
  default: mockWalletAccountTonConstructor
}))

// --- CLASS IMPORT (MUST be after mocks) ---
const { default: WalletManagerTon } = await import('../src/wallet-manager-ton.js')

describe('WalletManagerTon', () => {
  let defaultConfig

  beforeEach(() => {
    jest.clearAllMocks()

    defaultConfig = {
      tonApiUrl: MOCK_TON_API_URL,
      tonApiSecretKey: MOCK_TON_API_KEY
    }

    mockBip39GenerateMnemonic.mockReturnValue(MOCK_GENERATED_SEED_PHRASE)
    mockBip39ValidateMnemonic.mockImplementation((seed) => seed === MOCK_VALID_SEED_PHRASE)

    MockTonApiClientConstructor.mockImplementation(function (config) {
      this.baseUrl = config ? config.baseUrl : undefined
      this.apiKey = config ? config.apiKey : undefined
      this.blockchain = {
        getRawBlockchainConfig: mockTonApiClientGetRawBlockchainConfig
      }
    })
    mockTonApiClientGetRawBlockchainConfig.mockResolvedValue({
      config: {
        config_param21: {
          gas_limits_prices: {
            gas_flat_pfx: {
              other: {
                gas_prices_ext: {
                  gas_price: 655360 // Example: 10 * 65536
                }
              }
            }
          }
        }
      }
    })
    mockWalletAccountTonConstructor.mockImplementation(function (seedPhrase, path, config) {
      this.seedPhrase = seedPhrase
      this.path = path
      this.config = config
      this.getAddress = jest.fn().mockResolvedValue('mock-account-address')
    })
  })

  describe('constructor', () => {
    it('should successfully create an instance with a valid seed phrase', () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)

      const manager = new WalletManagerTon(MOCK_VALID_SEED_PHRASE, defaultConfig)

      expect(manager).toBeInstanceOf(WalletManagerTon)
      expect(mockBip39ValidateMnemonic).toHaveBeenCalledWith(MOCK_VALID_SEED_PHRASE)
      expect(manager.seedPhrase).toBe(MOCK_VALID_SEED_PHRASE)
    })

    it('should throw an error if the seed phrase is invalid', () => {
      mockBip39ValidateMnemonic.mockReturnValue(false)

      expect(() => new WalletManagerTon(MOCK_INVALID_SEED_PHRASE, defaultConfig))
        .toThrow('The seed phrase is invalid.')
      expect(mockBip39ValidateMnemonic).toHaveBeenCalledWith(MOCK_INVALID_SEED_PHRASE)
    })

    it('should initialize TonApiClient if tonApiUrl (string) and tonApiSecretKey are provided', () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)

      new WalletManagerTon(MOCK_VALID_SEED_PHRASE, defaultConfig)

      expect(MockTonApiClientConstructor).toHaveBeenCalledWith({
        baseUrl: MOCK_TON_API_URL,
        apiKey: MOCK_TON_API_KEY
      })
    })

    it('should throw an error if tonApiUrl (string) is provided without tonApiSecretKey', () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      const configWithoutKey = { tonApiUrl: MOCK_TON_API_URL }

      expect(() => new WalletManagerTon(MOCK_VALID_SEED_PHRASE, configWithoutKey))
        .toThrow('You must also provide a valid secret key to connect the wallet to the ton api.')
    })

    it('should use an existing TonApiClient instance if provided', () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      const existingTonApiClientInstance = new MockTonApiClientConstructor({ baseUrl: 'dummy-url' })
      const configWithInstance = { tonApiUrl: existingTonApiClientInstance }

      const callsToTonApiClientConstructorBeforeAct = MockTonApiClientConstructor.mock.calls.length

      new WalletManagerTon(MOCK_VALID_SEED_PHRASE, configWithInstance)

      expect(MockTonApiClientConstructor.mock.calls.length).toBe(callsToTonApiClientConstructorBeforeAct)
    })

    it('should not initialize TonApiClient if tonApiUrl is not provided', () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      const configWithoutApiUrl = {}

      new WalletManagerTon(MOCK_VALID_SEED_PHRASE, configWithoutApiUrl)

      expect(MockTonApiClientConstructor).not.toHaveBeenCalled()
    })
  })

  describe('getRandomSeedPhrase (static)', () => {
    it('should call bip39.generateMnemonic and return its result', () => {
      const seedPhrase = WalletManagerTon.getRandomSeedPhrase()

      expect(mockBip39GenerateMnemonic).toHaveBeenCalledTimes(1)
      expect(seedPhrase).toBe(MOCK_GENERATED_SEED_PHRASE)
    })
  })

  describe('isValidSeedPhrase (static)', () => {
    it('should call bip39.validateMnemonic with the given seed phrase and return true for a valid one', () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)

      const isValid = WalletManagerTon.isValidSeedPhrase(MOCK_VALID_SEED_PHRASE)

      expect(mockBip39ValidateMnemonic).toHaveBeenCalledWith(MOCK_VALID_SEED_PHRASE)
      expect(isValid).toBe(true)
    })

    it('should call bip39.validateMnemonic with the given seed phrase and return false for an invalid one', () => {
      mockBip39ValidateMnemonic.mockReturnValue(false)

      const isValid = WalletManagerTon.isValidSeedPhrase(MOCK_INVALID_SEED_PHRASE)

      expect(mockBip39ValidateMnemonic).toHaveBeenCalledWith(MOCK_INVALID_SEED_PHRASE)
      expect(isValid).toBe(false)
    })
  })

  describe('get seedPhrase', () => {
    it('should return the seed phrase initialized in the constructor', () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      const manager = new WalletManagerTon(MOCK_VALID_SEED_PHRASE, {})

      const seed = manager.seedPhrase

      expect(seed).toBe(MOCK_VALID_SEED_PHRASE)
    })
  })

  describe('getAccount', () => {
    let manager
    beforeEach(() => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      manager = new WalletManagerTon(MOCK_VALID_SEED_PHRASE, defaultConfig)
      jest.spyOn(manager, 'getAccountByPath')
    })

    it('should call getAccountByPath with the default path "0\'/0/0" if no index is provided', async () => {
      const mockAccountInstance = { isMockAccount: true }
      manager.getAccountByPath.mockResolvedValue(mockAccountInstance)

      const account = await manager.getAccount()

      expect(manager.getAccountByPath).toHaveBeenCalledWith("0'/0/0")
      expect(account).toBe(mockAccountInstance)
    })

    it('should call getAccountByPath with the correct path "0\'/0/{index}" if an index is provided', async () => {
      const index = 5
      const expectedPath = `0'/0/${index}`
      const mockAccountInstance = { isMockAccount: true, index }
      manager.getAccountByPath.mockResolvedValue(mockAccountInstance)

      const account = await manager.getAccount(index)

      expect(manager.getAccountByPath).toHaveBeenCalledWith(expectedPath)
      expect(account).toBe(mockAccountInstance)
    })
  })

  describe('getAccountByPath', () => {
    it('should create and return a new WalletAccountTon instance with correct parameters', async () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      const manager = new WalletManagerTon(MOCK_VALID_SEED_PHRASE, defaultConfig)
      const expectedConfig = defaultConfig

      const account = await manager.getAccountByPath(MOCK_ACCOUNT_PATH_SUFFIX)

      expect(mockWalletAccountTonConstructor).toHaveBeenCalledWith(
        MOCK_VALID_SEED_PHRASE,
        MOCK_ACCOUNT_PATH_SUFFIX,
        expectedConfig
      )
      expect(account).toBeInstanceOf(mockWalletAccountTonConstructor)
      expect(account.seedPhrase).toBe(MOCK_VALID_SEED_PHRASE)
      expect(account.path).toBe(MOCK_ACCOUNT_PATH_SUFFIX)
      expect(account.config).toBe(expectedConfig)
    })
  })

  describe('getFeeRates', () => {
    it('should throw an error if TonApiClient (#tonApi) is not initialized', async () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      const managerWithoutApi = new WalletManagerTon(MOCK_VALID_SEED_PHRASE, {})

      await expect(managerWithoutApi.getFeeRates())
        .rejects.toThrow('The wallet must be connected to the ton api to fetch fee rates.')
    })

    it('should call getRawBlockchainConfig and return correctly calculated fee rates', async () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      const manager = new WalletManagerTon(MOCK_VALID_SEED_PHRASE, defaultConfig)

      const mockGasPriceRaw = 131072 // Example: 2 * 65536
      mockTonApiClientGetRawBlockchainConfig.mockResolvedValue({
        config: {
          config_param21: {
            gas_limits_prices: {
              gas_flat_pfx: {
                other: {
                  gas_prices_ext: {
                    gas_price: mockGasPriceRaw
                  }
                }
              }
            }
          }
        }
      })
      const expectedGasPrice = Math.round(mockGasPriceRaw / 65536) // 2

      const feeRates = await manager.getFeeRates()

      expect(mockTonApiClientGetRawBlockchainConfig).toHaveBeenCalledTimes(1)
      expect(feeRates).toEqual({
        normal: expectedGasPrice,
        fast: expectedGasPrice
      })
    })

    it('should handle different gas prices from getRawBlockchainConfig', async () => {
      mockBip39ValidateMnemonic.mockReturnValue(true)
      const manager = new WalletManagerTon(MOCK_VALID_SEED_PHRASE, defaultConfig)

      const mockGasPriceRaw = 327680 // Example: 5 * 65536
      mockTonApiClientGetRawBlockchainConfig.mockResolvedValue({
        config: {
          config_param21: {
            gas_limits_prices: {
              gas_flat_pfx: {
                other: {
                  gas_prices_ext: {
                    gas_price: mockGasPriceRaw
                  }
                }
              }
            }
          }
        }
      })
      const expectedGasPrice = Math.round(mockGasPriceRaw / 65536) // 5

      const feeRates = await manager.getFeeRates()

      expect(feeRates).toEqual({
        normal: expectedGasPrice,
        fast: expectedGasPrice
      })
    })
  })
})
