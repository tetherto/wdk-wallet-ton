import { it, expect, describe, beforeEach, jest } from '@jest/globals'

// --- MOCK CONSTANTS ---
const MOCK_SEED_PHRASE = 'man toilet critic page about border soldier north report quote alcohol alter'
const MOCK_DERIVATION_SUFFIX = "0'/0"
const MOCK_FULL_DERIVATION_PATH = `m/44'/607'/${MOCK_DERIVATION_SUFFIX}`
const MOCK_RAW_PUBLIC_KEY = Buffer.alloc(32, 'b')
const MOCK_RAW_PRIVATE_KEY = Buffer.alloc(64, 'a')
const MOCK_GENERATED_ADDRESS_STRING = 'EQCtest_address_generated_by_mock_wallet_contract'
const MOCK_TON_CENTER_URL = 'https://toncenter.com/api/v2/jsonRPC'
const MOCK_TON_CENTER_KEY = 'test_ton_center_key'
const MOCK_TON_API_URL = 'https://tonapi.io'
const MOCK_TON_API_KEY = 'test_ton_api_key'

// --- DECLARE MOCK FUNCTIONS ---
const mockBip39MnemonicToSeedSync = jest.fn()
const mockBip32FromSeed = jest.fn()
const mockBip32DerivePath = jest.fn()
const mockNaclSignKeyPairFromSeed = jest.fn()

// For @ton/core and @ton/ton shared mocks
const mockWalletAddressToStringFn = jest.fn()
const mockParsedAddressToStringFn = jest.fn()
const mockAddressParseFriendlyFn = jest.fn()
const mockAddressParseFn = jest.fn()
const mockWalletContractV5R1CreateFn = jest.fn()
const mockInternalFnCore = jest.fn()

// For @ton/core specific (beginCell chain)
const mockCoreFromNano = jest.fn()
const mockCoreBeginCell = jest.fn()
const mockCellStoreUint = jest.fn()
const mockCellStoreAddress = jest.fn()
const mockCellStoreBit = jest.fn()
const mockCellStoreRef = jest.fn()
const mockCellEndCell = jest.fn()
const mockCellHash = jest.fn()

// For @ton/crypto
const mockCryptoSign = jest.fn()
const mockCryptoSignVerify = jest.fn()

// For @ton/ton (TonClient)
const mockTonClientConstructor = jest.fn()
const mockTonClientInstanceEstimateFee = jest.fn()

// For @ton-api/client (TonApiClient)
const mockTonApiClientConstructor = jest.fn()
const mockTonApiInstanceExecGetMethod = jest.fn()

// For @ton-api/ton-adapter (ContractAdapter & opened contract)
const mockContractAdapterConstructor = jest.fn()
const mockContractAdapterInstanceOpen = jest.fn()
const mockOpenedContractSend = jest.fn()
const mockOpenedContractGetBalance = jest.fn()
const mockOpenedContractGetSeqno = jest.fn()
const mockOpenedContractCreateTransfer = jest.fn()

// --- SHARED MOCK OBJECTS ---
const MockStaticAddressObject = {
  parseFriendly: mockAddressParseFriendlyFn,
  parse: mockAddressParseFn
}

const MockWalletContractV5R1Object = {
  create: mockWalletContractV5R1CreateFn
}

// --- DEPENDENCY MOCKS ---
jest.unstable_mockModule('bip39', () => ({
  mnemonicToSeedSync: mockBip39MnemonicToSeedSync,
  validateMnemonic: jest.fn().mockReturnValue(true)
}))

jest.unstable_mockModule('bip32', () => ({
  BIP32Factory: jest.fn(() => ({ fromSeed: mockBip32FromSeed }))
}))

jest.unstable_mockModule('tweetnacl', () => ({
  default: {
    sign: {
      keyPair: {
        fromSeed: mockNaclSignKeyPairFromSeed
      }
    }
  }
}))

jest.unstable_mockModule('@ton/core', () => ({
  fromNano: mockCoreFromNano,
  beginCell: mockCoreBeginCell,
  Address: MockStaticAddressObject,
  WalletContractV5R1: MockWalletContractV5R1Object,
  internal: mockInternalFnCore
}))

jest.unstable_mockModule('@ton/crypto', () => ({
  sign: mockCryptoSign,
  signVerify: mockCryptoSignVerify
}))

jest.unstable_mockModule('@ton/ton', () => {
  const actualTon = jest.requireActual('@ton/ton')
  return {
    TonClient: mockTonClientConstructor,
    SendMode: actualTon.SendMode,
    Address: MockStaticAddressObject,
    WalletContractV5R1: MockWalletContractV5R1Object,
    internal: mockInternalFnCore
  }
})

jest.unstable_mockModule('@ton-api/client', () => ({
  TonApiClient: mockTonApiClientConstructor
}))

jest.unstable_mockModule('@ton-api/ton-adapter', () => ({
  ContractAdapter: mockContractAdapterConstructor
}))

// --- CLASS IMPORT (MUST be after mocks) ---
const { default: WalletAccountTon } = await import('../src/wallet-account-ton.js')
const { SendMode } = await import('@ton/ton')

describe('WalletAccountTon', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockBip39MnemonicToSeedSync.mockReturnValue(Buffer.from('mockBip39Seed'))
    mockBip32DerivePath.mockReturnValue({ privateKey: Buffer.from('mockBip32DerivedPrivateKey') })
    mockBip32FromSeed.mockReturnValue({ derivePath: mockBip32DerivePath })
    mockNaclSignKeyPairFromSeed.mockReturnValue({
      secretKey: MOCK_RAW_PRIVATE_KEY,
      publicKey: MOCK_RAW_PUBLIC_KEY
    })
    mockWalletAddressToStringFn.mockReturnValue(MOCK_GENERATED_ADDRESS_STRING)
    mockParsedAddressToStringFn.mockImplementation(arg => `parsed-${typeof arg === 'object' ? JSON.stringify(arg) : arg}`)
    mockAddressParseFriendlyFn.mockImplementation(addrStr => ({
      address: `internal-friendly-${addrStr}`,
      isBounceable: true,
      toString: mockParsedAddressToStringFn
    }))
    mockAddressParseFn.mockImplementation(addrStr => ({
      address: `internal-regular-${addrStr}`,
      toString: mockParsedAddressToStringFn
    }))
    mockWalletContractV5R1CreateFn.mockImplementation(({ workchain, publicKey }) => ({
      address: {
        toString: mockWalletAddressToStringFn
      }
    }))
    mockInternalFnCore.mockImplementation(details => ({
      ...details,
      info: { type: 'internal', dest: details.to },
      body: { hash: jest.fn(() => Buffer.from('mockInternalBodyHashFromInternalFn')) }
    }))
    mockCoreFromNano.mockImplementation(val => val.toString())
    mockCellHash.mockReturnValue(Buffer.from('mockCellHashNormalized'))
    mockCellEndCell.mockReturnValue({ hash: mockCellHash })
    mockCellStoreRef.mockReturnThis()
    mockCellStoreBit.mockReturnThis()
    mockCellStoreAddress.mockReturnThis()
    mockCellStoreUint.mockReturnThis()
    mockCoreBeginCell.mockReturnValue({
      storeUint: mockCellStoreUint,
      storeAddress: mockCellStoreAddress,
      storeBit: mockCellStoreBit,
      storeRef: mockCellStoreRef,
      endCell: mockCellEndCell
    })
    mockCryptoSign.mockReturnValue(Buffer.from('mockRawSignature'))
    mockCryptoSignVerify.mockReturnValue(true)
    mockTonClientInstanceEstimateFee.mockResolvedValue({
      source_fees: { in_fwd_fee: 100, storage_fee: 200, gas_fee: 300, fwd_fee: 50 }
    })
    mockTonClientConstructor.mockReturnValue({
      estimateExternalMessageFee: mockTonClientInstanceEstimateFee
    })
    mockTonApiInstanceExecGetMethod.mockResolvedValue({ decoded: {} })
    mockTonApiClientConstructor.mockReturnValue({
      blockchain: {
        execGetMethodForBlockchainAccount: mockTonApiInstanceExecGetMethod
      }
    })
    mockOpenedContractSend.mockResolvedValue(undefined)
    mockOpenedContractGetBalance.mockResolvedValue('123000000000')
    mockOpenedContractGetSeqno.mockResolvedValue(0)
    mockOpenedContractCreateTransfer.mockImplementation(params => ({ mockTransferData: params, ...params }))
    mockContractAdapterInstanceOpen.mockReturnValue({
      send: mockOpenedContractSend,
      getBalance: mockOpenedContractGetBalance,
      getSeqno: mockOpenedContractGetSeqno,
      createTransfer: mockOpenedContractCreateTransfer
    })
    mockContractAdapterConstructor.mockReturnValue({
      open: mockContractAdapterInstanceOpen
    })
  })

  describe('constructor', () => {
    it('should correctly initialize with seed phrase and path, deriving keys and address', () => {
      const seedPhrase = MOCK_SEED_PHRASE
      const path = MOCK_DERIVATION_SUFFIX

      new WalletAccountTon(seedPhrase, path)

      expect(mockBip39MnemonicToSeedSync).toHaveBeenCalledWith(seedPhrase)
      expect(mockBip32FromSeed).toHaveBeenCalledWith(Buffer.from('mockBip39Seed'))
      expect(mockBip32DerivePath).toHaveBeenCalledWith(MOCK_FULL_DERIVATION_PATH)
      expect(mockNaclSignKeyPairFromSeed).toHaveBeenCalledWith(Buffer.from('mockBip32DerivedPrivateKey'))
      expect(mockWalletContractV5R1CreateFn).toHaveBeenCalledWith({
        workchain: 0,
        publicKey: MOCK_RAW_PUBLIC_KEY
      })
      expect(mockWalletAddressToStringFn).toHaveBeenCalledWith({ urlSafe: true, bounceable: false, testOnly: false })
    })

    it('should initialize TonClient if tonCenterUrl (string) and tonCenterSecretKey are provided', () => {
      const config = { tonCenterUrl: MOCK_TON_CENTER_URL, tonCenterSecretKey: MOCK_TON_CENTER_KEY }
      new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config)
      expect(mockTonClientConstructor).toHaveBeenCalledWith({ endpoint: MOCK_TON_CENTER_URL, apiKey: MOCK_TON_CENTER_KEY })
    })

    it('should throw an error if tonCenterUrl (string) is provided without tonCenterSecretKey', () => {
      const config = { tonCenterUrl: MOCK_TON_CENTER_URL }
      expect(() => new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config))
        .toThrow('You must also provide a valid secret key to connect the wallet to the ton center api.')
    })

    it('should use an existing TonClient instance if provided', () => {
      const existingTonClient = { estimateExternalMessageFee: jest.fn() }
      const config = { tonCenterUrl: existingTonClient }
      new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config)
      expect(mockTonClientConstructor).not.toHaveBeenCalled()
    })

    it('should initialize TonApiClient and ContractAdapter if tonApiUrl (string) and tonApiSecretKey are provided', () => {
      const mockTonApiInstance = { blockchain: { execGetMethodForBlockchainAccount: mockTonApiInstanceExecGetMethod } }
      mockTonApiClientConstructor.mockReturnValue(mockTonApiInstance)
      const config = { tonApiUrl: MOCK_TON_API_URL, tonApiSecretKey: MOCK_TON_API_KEY }
      new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config)
      expect(mockTonApiClientConstructor).toHaveBeenCalledWith({ baseUrl: MOCK_TON_API_URL, apiKey: MOCK_TON_API_KEY })
      expect(mockContractAdapterConstructor).toHaveBeenCalledWith(mockTonApiInstance)
    })

    it('should throw an error if tonApiUrl (string) is provided without tonApiSecretKey', () => {
      const config = { tonApiUrl: MOCK_TON_API_URL }
      expect(() => new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config))
        .toThrow('You must also provide a valid secret key to connect the wallet to the ton api.')
    })

    it('should not initialize clients if no config is provided', () => {
      new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX)
      expect(mockTonClientConstructor).not.toHaveBeenCalled()
      expect(mockTonApiClientConstructor).not.toHaveBeenCalled()
      expect(mockContractAdapterConstructor).not.toHaveBeenCalled()
    })
  })

  describe('get index', () => {
    it('should return the correct index from the path', () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, "0'/123")
      expect(walletAccount.index).toBe(123)
    })
    it('should return the correct index for a multi-segment path', () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, "0'/0/42")
      expect(walletAccount.index).toBe(42)
    })
  })

  describe('get path', () => {
    it('should return the full derivation path', () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX)
      expect(walletAccount.path).toBe(MOCK_FULL_DERIVATION_PATH)
    })
  })

  describe('get keyPair', () => {
    it('should return the public and private keys in hex format', () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX)
      const keyPair = walletAccount.keyPair
      expect(keyPair.publicKey).toBe(MOCK_RAW_PUBLIC_KEY.toString('hex'))
      expect(keyPair.privateKey).toBe(MOCK_RAW_PRIVATE_KEY.toString('hex'))
    })
  })

  describe('getAddress', () => {
    it('should return the pre-computed address', async () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX)
      const address = await walletAccount.getAddress()
      expect(address).toBe(MOCK_GENERATED_ADDRESS_STRING)
    })
  })

  describe('sign', () => {
    it('should sign a message and return the signature in hex', async () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX)
      const message = 'Hello, TON!'
      const mockSignatureBuffer = Buffer.from('mockRawSignature')
      mockCryptoSign.mockReturnValue(mockSignatureBuffer)
      const signature = await walletAccount.sign(message)
      expect(mockCryptoSign).toHaveBeenCalledWith(Buffer.from(message), MOCK_RAW_PRIVATE_KEY)
      expect(signature).toBe(mockSignatureBuffer.toString('hex'))
    })
  })

  describe('verify', () => {
    it('should return true for a valid signature', async () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX)
      const message = 'Hello, TON!'
      const signatureHex = 'someValidSignatureHex'
      mockCryptoSignVerify.mockReturnValue(true)
      const isValid = await walletAccount.verify(message, signatureHex)
      expect(mockCryptoSignVerify).toHaveBeenCalledWith(Buffer.from(message), Buffer.from(signatureHex, 'hex'), MOCK_RAW_PUBLIC_KEY)
      expect(isValid).toBe(true)
    })

    it('should return false for an invalid signature', async () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX)
      const message = 'Hello, TON!'
      const signatureHex = 'someInvalidSignatureHex'
      mockCryptoSignVerify.mockReturnValue(false)
      const isValid = await walletAccount.verify(message, signatureHex)
      expect(isValid).toBe(false)
    })
  })

  describe('quoteTransaction', () => {
    const txParams = { to: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', value: 100000000, bounceable: true }
    let walletAccount

    beforeEach(() => {
      const config = {
        tonCenterUrl: MOCK_TON_CENTER_URL,
        tonCenterSecretKey: MOCK_TON_CENTER_KEY,
        tonApiUrl: MOCK_TON_API_URL,
        tonApiSecretKey: MOCK_TON_API_KEY
      }
      walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config)
    })

    it('should throw an error if TonClient (this.#tonCenter) is not configured', async () => {
      const plainWallet = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, {
        tonApiUrl: MOCK_TON_API_URL,
        tonApiSecretKey: MOCK_TON_API_KEY
      })
      await expect(plainWallet.quoteTransaction(txParams))
        .rejects.toThrow('The wallet must be connected to the ton center api to quote transactions.')
    })

    it('should correctly quote a transaction and return the fee sum', async () => {
      const mockTransferObject = { data: 'mockedTransfer' }
      mockOpenedContractCreateTransfer.mockReturnValue(mockTransferObject)
      mockOpenedContractGetSeqno.mockResolvedValue(1)
      const mockParsedFriendlyAddress = { address: txParams.to, isBounceable: txParams.bounceable, toString: mockParsedAddressToStringFn }
      mockAddressParseFriendlyFn.mockReturnValue(mockParsedFriendlyAddress)

      const fee = await walletAccount.quoteTransaction(txParams)

      expect(mockContractAdapterInstanceOpen).toHaveBeenCalled()
      expect(mockAddressParseFriendlyFn).toHaveBeenCalledWith(txParams.to)
      expect(mockOpenedContractGetSeqno).toHaveBeenCalled()
      expect(mockInternalFnCore).toHaveBeenCalledWith(expect.objectContaining({
        to: mockParsedFriendlyAddress.address,
        value: txParams.value.toString(),
        bounce: txParams.bounceable
      }))
      expect(mockOpenedContractCreateTransfer).toHaveBeenCalledWith(expect.objectContaining({
        seqno: 1,
        messages: [expect.any(Object)],
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS
      }))
      const expectedWalletAddressObject = { toString: mockWalletAddressToStringFn }
      expect(mockTonClientInstanceEstimateFee).toHaveBeenCalledWith(
        expectedWalletAddressObject,
        { body: mockTransferObject }
      )

      expect(fee).toBe(100 + 200 + 300 + 50)
    })
  })

  describe('sendTransaction', () => {
    const txParams = { to: 'EQCdifferent_address_for_send_tx_test_placeholder', value: 200000000, bounceable: false }
    let walletAccountWithApi

    beforeEach(() => {
      const config = { tonApiUrl: MOCK_TON_API_URL, tonApiSecretKey: MOCK_TON_API_KEY }
      walletAccountWithApi = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config)
    })

    it('should throw an error if ContractAdapter is not configured (implicitly via #getTransfer)', async () => {
      const plainWallet = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, {})
      await expect(plainWallet.sendTransaction(txParams))
        .rejects.toThrow('The wallet must be connected to the ton api to send or quote transactions.')
    })

    it('should correctly send a transaction and return its hash (external-in message path for normalizeHash)', async () => {
      const mockTransferObject = { data: 'mockedTransferForSend' }
      const mockMessageObject = {
        info: { type: 'external-in', dest: { toString: () => 'someDestAddressString' } },
        body: { data: 'messageBodyRef' }
      }
      mockOpenedContractCreateTransfer.mockReturnValue(mockTransferObject)
      mockOpenedContractGetSeqno.mockResolvedValue(2)
      mockInternalFnCore.mockReturnValue(mockMessageObject)
      const mockParsedFriendlyAddress = { address: txParams.to, isBounceable: txParams.bounceable, toString: mockParsedAddressToStringFn }
      mockAddressParseFriendlyFn.mockReturnValue(mockParsedFriendlyAddress)

      const hash = await walletAccountWithApi.sendTransaction(txParams)

      expect(mockOpenedContractSend).toHaveBeenCalledWith(mockTransferObject)
      expect(mockCoreBeginCell).toHaveBeenCalled()
      expect(mockCellStoreAddress).toHaveBeenCalledWith(mockMessageObject.info.dest)
      expect(hash).toBe(Buffer.from('mockCellHashNormalized').toString('hex'))
    })

    it('should correctly send a transaction and return its hash (internal message path for normalizeHash)', async () => {
      const mockTransferObject = { data: 'mockedTransferForSendInternal' }
      const mockInternalMessageBodyHash = Buffer.from('internalBodySpecificHash')
      const mockMessageObjectInternal = {
        info: { type: 'internal', dest: 'someDestAddress' },
        body: { hash: jest.fn(() => mockInternalMessageBodyHash) }
      }
      mockOpenedContractCreateTransfer.mockReturnValue(mockTransferObject)
      mockOpenedContractGetSeqno.mockResolvedValue(3)
      mockInternalFnCore.mockReturnValue(mockMessageObjectInternal)
      const mockParsedFriendlyAddress = { address: txParams.to, isBounceable: txParams.bounceable, toString: mockParsedAddressToStringFn }
      mockAddressParseFriendlyFn.mockReturnValue(mockParsedFriendlyAddress)

      const hash = await walletAccountWithApi.sendTransaction(txParams)

      expect(mockOpenedContractSend).toHaveBeenCalledWith(mockTransferObject)
      expect(mockMessageObjectInternal.body.hash).toHaveBeenCalled()
      expect(hash).toBe(mockInternalMessageBodyHash.toString('hex'))
    })
  })

  describe('getBalance', () => {
    it('should throw an error if ContractAdapter is not configured', async () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, {})
      await expect(walletAccount.getBalance())
        .rejects.toThrow('The wallet must be connected to the ton api to get balances.')
    })

    it('should return the native token balance', async () => {
      const config = { tonApiUrl: MOCK_TON_API_URL, tonApiSecretKey: MOCK_TON_API_KEY }
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config)
      mockOpenedContractGetBalance.mockResolvedValue('5000000000')
      const balance = await walletAccount.getBalance()
      expect(mockContractAdapterInstanceOpen).toHaveBeenCalledWith(
        expect.objectContaining({ address: expect.objectContaining({ toString: mockWalletAddressToStringFn }) })
      )
      expect(mockOpenedContractGetBalance).toHaveBeenCalled()
      expect(balance).toBe(5000000000)
    })
  })

  describe('getTokenBalance', () => {
    const tokenAddress = 'EQDkFinmD_AMLpcX2AlOH13270pHj2Wd_ifIh6S9n9K1S07N'
    let walletAccountWithApi

    beforeEach(() => {
      const config = { tonApiUrl: MOCK_TON_API_URL, tonApiSecretKey: MOCK_TON_API_KEY }
      walletAccountWithApi = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, config)
    })

    it('should throw an error if TonApiClient is not configured', async () => {
      const walletAccount = new WalletAccountTon(MOCK_SEED_PHRASE, MOCK_DERIVATION_SUFFIX, {})
      await expect(walletAccount.getTokenBalance(tokenAddress))
        .rejects.toThrow('The wallet must be connected to the ton api to get token balances.')
    })

    it('should return the token balance for a given token address', async () => {
      const mockJettonWalletAddressString = 'EQCjetton_wallet_address_for_user_and_token'
      const mockTokenAddrObj = { toString: () => tokenAddress }
      const mockJettonWalletAddrObj = { toString: () => mockJettonWalletAddressString }

      mockAddressParseFn
        .mockImplementation(addrStr => {
          if (addrStr === tokenAddress) return mockTokenAddrObj
          if (addrStr === mockJettonWalletAddressString) return mockJettonWalletAddrObj
          return { toString: () => addrStr }
        })

      mockTonApiInstanceExecGetMethod
        .mockResolvedValueOnce({ decoded: { jetton_wallet_address: mockJettonWalletAddressString } })
        .mockResolvedValueOnce({ decoded: { balance: '777000000' } })

      const tokenBalance = await walletAccountWithApi.getTokenBalance(tokenAddress)

      expect(mockAddressParseFn).toHaveBeenCalledWith(tokenAddress)
      expect(mockTonApiInstanceExecGetMethod).toHaveBeenNthCalledWith(1, mockTokenAddrObj, 'get_wallet_address', { args: [MOCK_GENERATED_ADDRESS_STRING] })
      expect(mockAddressParseFn).toHaveBeenCalledWith(mockJettonWalletAddressString)
      expect(mockTonApiInstanceExecGetMethod).toHaveBeenNthCalledWith(2, mockJettonWalletAddrObj, 'get_wallet_data')
      expect(tokenBalance).toBe(777000000)
    })
  })
})
