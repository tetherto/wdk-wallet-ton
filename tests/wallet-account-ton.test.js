import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import { Address, beginCell, SendMode } from '@ton/ton'
import { JettonMinter } from '@ton-community/assets-sdk'

import * as bip39 from 'bip39'

import BlockchainWithLogs from './blockchain-with-logs.js'
import FakeTonClient, { ACTIVE_ACCOUNT_FEE } from './fake-ton-client.js'


const { WalletAccountReadOnlyTon, WalletAccountTon } = await import('../index.js')

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'
const INVALID_SEED_PHRASE = 'invalid seed phrase'
const SEED = bip39.mnemonicToSeedSync(SEED_PHRASE)

const PUBLIC_KEY = 'f2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'
const PRIVATE_KEY = '904a9fec5f3e5bea8f1b4c5180828843e6acd58c198967fd56b4159b44b5a68ef2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'

const ACCOUNT = {
  index: 0,
  path: "m/44'/607'/0'/0/0",
  address: 'UQAvTZZjLwb1qnnuP1szbILyQyZT2zpSRX_Bw-fh4O9QojNi',
  keyPair: {
    publicKey: Buffer.from(PUBLIC_KEY, 'hex'),
    privateKey: Buffer.from(PRIVATE_KEY, 'hex')
  }
}

const RECIPIENT = {
  index: 1,
  path: "m/44'/607'/0'/0/1",
  address: 'UQCKSPZPsdyq3FRW9SHtRNY1Ni6qCNbTErQLHUpytJFej_vG'
}

const TREASURY_BALANCE = 1_000_000_000_000n

const INITIAL_BALANCE = 1_000_000_000n
const INITIAL_TOKEN_BALANCE = 100_000n

const DUMMY_QUERY_ID = 12345678901234567890n

async function deployTestToken (blockchain, deployer) {
  const jettonMinter = JettonMinter.createFromConfig({
    admin: deployer.address,
    content: beginCell().storeStringTail('TestToken').endCell()
  })

  const testToken = blockchain.openContract(jettonMinter)

  await testToken.sendDeploy(deployer.getSender())

  return testToken
}

describe('WalletAccountTon', () => {
  let blockchain, treasury, testToken, tonClient, account, recipient

  async function sendTonsTo (to, value, options = { }) {
    await treasury.send({ to: Address.parse(to), value, init: options.init })
  }

  async function sendTestTokensTo (to, value) {
    await testToken.sendMint(treasury.getSender(), Address.parse(to), value)
  }

  beforeEach(async () => {
    blockchain = await BlockchainWithLogs.create()
    treasury = await blockchain.treasury('treasury', { balance: TREASURY_BALANCE })
    testToken = await deployTestToken(blockchain, treasury)

    tonClient = new FakeTonClient(blockchain)
    account = new WalletAccountTon(SEED_PHRASE, "0'/0/0", { tonClient })
    recipient = new WalletAccountTon(SEED_PHRASE, "0'/0/1", { tonClient })

    await sendTonsTo(ACCOUNT.address, INITIAL_BALANCE, { init: account._wallet.init })

    await sendTonsTo(RECIPIENT.address, INITIAL_BALANCE, { init: recipient._wallet.init })

    await sendTestTokensTo(ACCOUNT.address, INITIAL_TOKEN_BALANCE)
  })

  afterEach(() => {
    account.dispose()
  })

  describe('constructor', () => {
    test('should successfully initialize an account for the given seed phrase and path', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      expect(account.index).toBe(ACCOUNT.index)

      expect(account.path).toBe(ACCOUNT.path)

      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(ACCOUNT.keyPair.privateKey),
        publicKey: new Uint8Array(ACCOUNT.keyPair.publicKey)
      })
    })

    test('should successfully initialize an account for the given seed and path', async () => {
      const account = new WalletAccountTon(SEED, "0'/0/0")

      expect(account.index).toBe(ACCOUNT.index)

      expect(account.path).toBe(ACCOUNT.path)

      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(ACCOUNT.keyPair.privateKey),
        publicKey: new Uint8Array(ACCOUNT.keyPair.publicKey)
      })
    })

    test('should throw if the seed phrase is invalid', () => {
      // eslint-disable-next-line no-new
      expect(() => { new WalletAccountTon(INVALID_SEED_PHRASE, "0'/0/0") })
        .toThrow('The seed phrase is invalid.')
    })

    test('should throw if the path is invalid', () => {
      // eslint-disable-next-line no-new
      expect(() => { new WalletAccountTon(SEED_PHRASE, "a'/b/c") })
        .toThrow('Invalid child index: a\'')
    })
  })

  describe('sign', () => {
    const MESSAGE = 'Dummy message to sign.'

    const EXPECTED_SIGNATURE = '640cb213751dcff7ed5f72330ca36efd6d640b9cc1df71418ec3c4f730b3fa8e81e450386e2a00c5e87da06f3edefebadd958b7d31a22b8d430da846ce087c06'

    test('should return the correct signature', async () => {
      const signature = await account.sign(MESSAGE)

      expect(signature).toBe(EXPECTED_SIGNATURE)
    })
  })

  describe('verify', () => {
    const MESSAGE = 'Dummy message to sign.'

    const SIGNATURE = '640cb213751dcff7ed5f72330ca36efd6d640b9cc1df71418ec3c4f730b3fa8e81e450386e2a00c5e87da06f3edefebadd958b7d31a22b8d430da846ce087c06'

    test('should return true for a valid signature', async () => {
      const result = await account.verify(MESSAGE, SIGNATURE)

      expect(result).toBe(true)
    })

    test('should return false for an invalid signature', async () => {
      const result = await account.verify('Another message.', SIGNATURE)

      expect(result).toBe(false)
    })

    test('should throw on a malformed signature', async () => {
      await expect(account.verify(MESSAGE, 'A bad signature'))
        .rejects.toThrow('bad signature size')
    })
  })

  describe('sendTransaction', () => {
    test('should successfully send a transaction', async () => {
      const TRANSACTION = {
        to: RECIPIENT.address,
        value: 1_000_000
      }

      const { hash, fee } = await account.sendTransaction(TRANSACTION)

      expect(blockchain.transactions).toHaveTransaction({
        from: account._wallet.address,
        to: recipient._wallet.address,
        value: 1_000_000n,
        success: true
      })

      expect(hash).toBeDefined()

      expect(fee).toBe(ACTIVE_ACCOUNT_FEE)
    })

    test('should successfully send a transaction that overrides bounceability', async () => {
      const TRANSACTION = {
        to: RECIPIENT.address,
        value: 1_000_000,
        bounceable: true
      }

      const { hash, fee } = await account.sendTransaction(TRANSACTION)

      expect(blockchain.transactions).toHaveTransaction({
        from: account._wallet.address,
        to: recipient._wallet.address,
        value: 1_000_000n,
        inMessageBounceable: true,
        success: true
      })

      expect(hash).toBeDefined()

      expect(fee).toBe(ACTIVE_ACCOUNT_FEE)
    })

    test('should generate unique hashes for identical transactions (seqno in transfer ensures uniqueness)', async () => {
      const TRANSACTION = {
        to: RECIPIENT.address,
        value: 1_000_000
      }

      const result1 = await account.sendTransaction(TRANSACTION)
      const result2 = await account.sendTransaction(TRANSACTION)
      const result3 = await account.sendTransaction(TRANSACTION)

      expect(result1.hash).toBeDefined()
      expect(result2.hash).toBeDefined()
      expect(result3.hash).toBeDefined()

      // Each transaction has unique hash because we hash the external transfer
      // Transfer includes seqno which increments: seqno=0, seqno=1, seqno=2
      // Even with identical message bodies, transfer hashes are different
      expect(result1.hash).not.toBe(result2.hash)
      expect(result2.hash).not.toBe(result3.hash)
      expect(result1.hash).not.toBe(result3.hash)

      // All three transactions should be in the blockchain
      const tonTransfers = blockchain.transactions.filter(tx => {
        if (!tx.inMessage?.info) return false
        const info = tx.inMessage.info
        if (info.type !== 'internal') return false
        return info.src?.equals(account._wallet.address) &&
               info.dest?.equals(recipient._wallet.address)
      })

      expect(tonTransfers.length).toBe(3)
    })

    test('should return the hash of the external transfer cell (not just message body)', async () => {
      const TRANSACTION = {
        to: RECIPIENT.address,
        value: 1_000_000
      }

      const seqnoBefore = await account._contract.getSeqno()

      const { hash: returnedHash } = await account.sendTransaction(TRANSACTION)

      const message = await account._getTransactionMessage(TRANSACTION)
      const transfer = account._contract.createTransfer({
        secretKey: account._keyPair.secretKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [message],
        seqno: seqnoBefore
      })

      const expectedHash = transfer.hash().toString('hex')
      expect(returnedHash).toBe(expectedHash)

      // The transfer hash should NOT be the same as just the message body hash
      const messageBodyHash = message.body.hash().toString('hex')
      expect(returnedHash).not.toBe(messageBodyHash)
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.sendTransaction({ }))
        .rejects.toThrow('The wallet must be connected to ton center to send transactions.')
    })
  })

  describe('transfer', () => {
    test('should successfully transfer tokens', async () => {
      const TRANSFER = {
        token: testToken.address.toString(),
        recipient: RECIPIENT.address,
        amount: 1_000
      }

      jest.spyOn(account, '_generateQueryId').mockReturnValue(DUMMY_QUERY_ID)

      const { hash, fee } = await account.transfer(TRANSFER)

      const accountJettonWalletAddress = await testToken.getWalletAddress(account._wallet.address)

      const recipientJettonWalletAddress = await testToken.getWalletAddress(Address.parse(TRANSFER.recipient))

      const internalTransferBody = beginCell()
        .storeUint(0x0f8a7ea5, 32)
        .storeUint(DUMMY_QUERY_ID, 64)
        .storeCoins(TRANSFER.amount)
        .storeAddress(recipient._wallet.address)
        .storeAddress(account._wallet.address)
        .storeBit(false)
        .storeCoins(1n)
        .storeMaybeRef(null)
        .endCell()

      expect(blockchain.transactions).toHaveTransaction({
        from: account._wallet.address,
        to: accountJettonWalletAddress,
        body: internalTransferBody,
        success: true
      })

      expect(blockchain.transactions).toHaveTransaction({
        from: accountJettonWalletAddress,
        to: recipientJettonWalletAddress,
        success: true
      })

      expect(hash).toBeDefined()

      expect(fee).toBe(ACTIVE_ACCOUNT_FEE)
    })

    test('should generate different hashes for identical token transfers (queryId ensures uniqueness)', async () => {
      const TRANSFER = {
        token: testToken.address.toString(),
        recipient: RECIPIENT.address,
        amount: 1_000
      }

      const result1 = await account.transfer(TRANSFER)
      const result2 = await account.transfer(TRANSFER)
      const result3 = await account.transfer(TRANSFER)

      expect(result1.hash).toBeDefined()
      expect(result2.hash).toBeDefined()
      expect(result3.hash).toBeDefined()

      expect(result1.hash).not.toBe(result2.hash)
      expect(result2.hash).not.toBe(result3.hash)
      expect(result1.hash).not.toBe(result3.hash)

      // Verify all three transfers were successful
      const accountJettonWalletAddress = await testToken.getWalletAddress(account._wallet.address)

      const jettonTransfers = blockchain.transactions.filter(tx => {
        if (!tx.inMessage?.info) return false
        const info = tx.inMessage.info
        if (info.type !== 'internal') return false
        return info.src?.equals(account._wallet.address) &&
               info.dest?.equals(accountJettonWalletAddress)
      })

      expect(jettonTransfers.length).toBe(3)
    })

    test('should throw if transfer fee exceeds the transfer max fee configuration', async () => {
      const TRANSFER = {
        token: testToken.address.toString(),
        recipient: RECIPIENT.address,
        amount: 1_000
      }

      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0", {
        tonClient,
        transferMaxFee: 0
      })

      await expect(account.transfer(TRANSFER))
        .rejects.toThrow('Exceeded maximum fee cost for transfer operations.')
    })

    test('should throw if the account is not connected to ton center', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.transfer({ }))
        .rejects.toThrow('The wallet must be connected to ton center to transfer tokens.')
    })
  })

  describe('toReadOnlyAccount', () => {
    test('should return a read-only copy of the account', async () => {
      const readOnlyAccount = await account.toReadOnlyAccount()

      expect(readOnlyAccount).toBeInstanceOf(WalletAccountReadOnlyTon)

      expect(await readOnlyAccount.getAddress()).toBe(ACCOUNT.address)
    })
  })
})
