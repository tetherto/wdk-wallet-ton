import BlockchainWithLogs from './blockchain-with-logs.js'
import { JettonMinter } from '@ton-community/assets-sdk'
import { beginCell, toNano, Address } from '@ton/ton'
import TonClientStub from './ton-client-stub.js'

import { beforeEach, describe, expect, test, jest } from '@jest/globals'

import { WalletAccountReadOnlyTon } from '../index.js'

const ACCOUNT_PUBLIC_KEY_1 = new Uint8Array(Buffer.from('f2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f', 'hex'))
const ACCOUNT_PUBLIC_KEY_2 = new Uint8Array(Buffer.from('358c3ff65d9a70250257330c6881228b09ca4d5fab6e0bea6f4f55b8eaf4f895', 'hex'))
const ACCOUNT_PUBLIC_KEY_3 = new Uint8Array(Buffer.from('a2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8c', 'hex'))

describe('WalletAccountReadOnlyTon', () => {
  let tonClient, account, blockchain, jettonMinter, treasury, deployer, recipient

  beforeEach(async () => {
    blockchain = await BlockchainWithLogs.create()
    treasury = await blockchain.treasury('treasury')
    tonClient = new TonClientStub(blockchain)
    deployer = await blockchain.treasury('deployer')
    jettonMinter = blockchain.openContract(JettonMinter.createFromConfig({
      admin: deployer.address,
      content: beginCell().storeStringTail('TestToken').endCell()
    }))

    await jettonMinter.sendDeploy(deployer.getSender(), toNano(0.05))

    account = new WalletAccountReadOnlyTon(ACCOUNT_PUBLIC_KEY_1, {
      tonClient
    })
    recipient = new WalletAccountReadOnlyTon(ACCOUNT_PUBLIC_KEY_2, {
      tonClient
    })
  })

  describe('getAddress', () => {
    test('should return the correct address', async () => {
      const address = await account.getAddress()

      expect(address).toBe('UQAvTZZjLwb1qnnuP1szbILyQyZT2zpSRX_Bw-fh4O9QojNi')
    })
  })

  describe('quoteTransaction', () => {
    const TRANSACTION = {
      to: 'UQAMM7wsXH_0T7aLFJvyD1RS_KBSt6AqGV8c4i_2PUMscnoY',
      value: 1_000
    }

    test('should successfully quote a transaction', async () => {
      const result = await account.quoteSendTransaction(TRANSACTION)

      expect(result).toEqual({ fee: 4 })
    })

    test('should throw if the account is not connected to ton center', async () => {
      const account = new WalletAccountReadOnlyTon(ACCOUNT_PUBLIC_KEY_1)

      await expect(account.quoteSendTransaction(TRANSACTION))
        .rejects.toThrow('The wallet must be connected to ton center to quote send transaction operations.')
    })
  })

  describe('quoteTransfer', () => {
    test('should successfully quote a transaction', async () => {
      const result = await account.quoteTransfer({
        token: jettonMinter.address.toString(),
        recipient: await recipient.getAddress(),
        amount: 1_000
      })

      expect(result).toEqual({ fee: 4 })
    })

    test('should throw if the account is not connected to ton center', async () => {
      const account = new WalletAccountReadOnlyTon(ACCOUNT_PUBLIC_KEY_1)

      await expect(account.quoteTransfer({
        token: jettonMinter.address.toString(),
        recipient: await recipient.getAddress(),
        amount: 1_000
      }))
        .rejects.toThrow('The wallet must be connected to ton center to quote transfer operations.')
    })
  })

  describe('getBalance', () => {
    test('should return the correct balance of the account', async () => {
      const value = 100_000
      const account = new WalletAccountReadOnlyTon(ACCOUNT_PUBLIC_KEY_3, {
        tonClient
      })

      await treasury.send({ to: await account.getAddress(), value })

      const balance = await account.getBalance()

      expect(balance).toEqual(value)
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountReadOnlyTon(ACCOUNT_PUBLIC_KEY_1)

      await expect(account.getBalance({
        to: 'UQCfu7DHKCYwqiohPFVQxjp45DDW3-tWSo-eIigNoZBaqOfQ',
        value: 100,
        bounceable: false
      }))
        .rejects.toThrow('The wallet must be connected to ton center to get balances.')
    })
  })

  describe('getTokenBalance', () => {
    test('should return the correct token balance of the account', async () => {
      const mintAmount = toNano('100')
      const account = new WalletAccountReadOnlyTon(ACCOUNT_PUBLIC_KEY_3, {
        tonClient
      })

      await jettonMinter.sendMint(
        deployer.getSender(),
        account._wallet.address,
        mintAmount,
        toNano('0.05'),
        toNano('0.1')
      )

      const balance = await account.getTokenBalance(jettonMinter.address.toString())

      expect(balance).toEqual(Number(mintAmount))
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountReadOnlyTon(ACCOUNT_PUBLIC_KEY_1)

      await expect(account.getTokenBalance(jettonMinter.address.toString()))
        .rejects.toThrow('The wallet must be connected to ton center to get token balances.')
    })
  })

  describe('getTransactionReceipt', () => {
    test('should return the correct transaction receipt for the given hash', async () => {
      const mockBodyHash = 'mock_in_msg_body_hash_1234567890abcdef'
      const mockTransactionHash = 'mock_transaction_hash_fedcba0987654321'
      const mockTonTransaction = {
        hash: () => Buffer.from(mockTransactionHash, 'hex')
      }

      const getTransactionsSpy = jest.spyOn(tonClient, 'getTransactions').mockImplementation((address, options) => {
        expect(address.toString()).toBe(Address.parse(account._address).toString())
        expect(options).toEqual({ hash: mockTransactionHash })
        return Promise.resolve([mockTonTransaction])
      })

      const mockTonCenterResponse = {
        transactions: [
          {
            hash: mockTransactionHash
          }
        ]
      }

      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((url) => {
        const urlObj = new URL(url)
        expect(urlObj.searchParams.get('body_hash')).toBe(mockBodyHash)
        expect(urlObj.searchParams.get('direction')).toBe('out')
        expect(urlObj.searchParams.get('limit')).toBe('1')

        return Promise.resolve({
          json: () => Promise.resolve(mockTonCenterResponse)
        })
      })

      const receivedReceipt = await account.getTransactionReceipt(mockBodyHash)

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(getTransactionsSpy).toHaveBeenCalledTimes(1)
      expect(receivedReceipt.hash().toString('hex')).toBe(mockTonTransaction.hash().toString('hex'))

      fetchSpy.mockRestore()
      getTransactionsSpy.mockRestore()
    })

    test('should return null if no transaction is found by body hash from TonCenter', async () => {
      const mockTonCenterResponse = {
        transactions: []
      }

      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockTonCenterResponse)
        })
      )

      const dummyBodyHash = 'some_non_existent_hash_123'
      const receipt = await account.getTransactionReceipt(dummyBodyHash)

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(receipt).toBeNull()

      fetchSpy.mockRestore()
    })
  })
})
