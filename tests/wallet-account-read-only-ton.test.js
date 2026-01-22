import { beforeEach, describe, expect, test, jest } from '@jest/globals'
import { beginCell, Address, SendMode, internal, fromNano } from '@ton/ton'
import { JettonMinter } from '@ton-community/assets-sdk'

import BlockchainWithLogs from './blockchain-with-logs.js'
import FakeTonClient, { ACTIVE_ACCOUNT_FEE, UNINITIALIZED_ACCOUNT_FEE } from './fake-ton-client.js'

import { WalletAccountReadOnlyTon } from '../index.js'

const PUBLIC_KEY = 'f2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'
const PRIVATE_KEY = '904a9fec5f3e5bea8f1b4c5180828843e6acd58c198967fd56b4159b44b5a68ef2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'

const ACCOUNT = {
  address: 'UQAvTZZjLwb1qnnuP1szbILyQyZT2zpSRX_Bw-fh4O9QojNi',
  keyPair: {
    publicKey: Buffer.from(PUBLIC_KEY, 'hex'),
    privateKey: Buffer.from(PRIVATE_KEY, 'hex')
  }
}

const TREASURY_BALANCE = 1_000_000_000_000n

const INITIAL_BALANCE = 1_000_000_000n
const INITIAL_TOKEN_BALANCE = 100_000n
const ACCOUNT_INITIALIZATION_GAS_COST = 218_400n

async function deployTestToken (blockchain, deployer) {
  const jettonMinter = JettonMinter.createFromConfig({
    admin: deployer.address,
    content: beginCell().storeStringTail('TestToken').endCell()
  })

  const testToken = blockchain.openContract(jettonMinter)

  await testToken.sendDeploy(deployer.getSender())

  return testToken
}

describe('WalletAccountReadOnlyTon', () => {
  let blockchain, treasury, testToken, account

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

    const tonClient = new FakeTonClient(blockchain)
    account = new WalletAccountReadOnlyTon(ACCOUNT.keyPair.publicKey, { tonClient })
  })

  describe('getAddress', () => {
    test('should return the correct address', async () => {
      const address = await account.getAddress()

      expect(address).toBe(ACCOUNT.address)
    })
  })

  describe('getBalance', () => {
    test('should return the correct balance of the account', async () => {
      await sendTonsTo(ACCOUNT.address, INITIAL_BALANCE, { init: account._wallet.init })

      const balance = await account.getBalance()

      expect(balance).toEqual(INITIAL_BALANCE - ACCOUNT_INITIALIZATION_GAS_COST)
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountReadOnlyTon(ACCOUNT.keyPair.publicKey)

      await expect(account.getBalance())
        .rejects.toThrow('The wallet must be connected to ton center to get balances.')
    })
  })

  describe('getTokenBalance', () => {
    test('should return the correct token balance of the account', async () => {
      await sendTestTokensTo(ACCOUNT.address, INITIAL_TOKEN_BALANCE)

      const balance = await account.getTokenBalance(testToken.address.toString())

      expect(balance).toEqual(INITIAL_TOKEN_BALANCE)
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountReadOnlyTon(ACCOUNT.keyPair.publicKey)

      await expect(account.getTokenBalance(testToken.address.toString()))
        .rejects.toThrow('The wallet must be connected to ton center to get token balances.')
    })
  })

  describe('quoteTransaction', () => {
    test('should successfully quote a transaction for an uninitialized account', async () => {
      const TRANSACTION = {
        to: 'UQAMM7wsXH_0T7aLFJvyD1RS_KBSt6AqGV8c4i_2PUMscnoY',
        value: 1_000
      }

      const { fee } = await account.quoteSendTransaction(TRANSACTION)

      expect(fee).toEqual(UNINITIALIZED_ACCOUNT_FEE)
    })

    test('should successfully quote a transaction for an active account', async () => {
      const TRANSACTION = {
        to: 'UQAMM7wsXH_0T7aLFJvyD1RS_KBSt6AqGV8c4i_2PUMscnoY',
        value: 1_000
      }

      await sendTonsTo(ACCOUNT.address, INITIAL_BALANCE, { init: account._wallet.init })

      const { fee } = await account.quoteSendTransaction(TRANSACTION)

      expect(fee).toEqual(ACTIVE_ACCOUNT_FEE)
    })

    test('should throw if the account is not connected to ton center', async () => {
      const account = new WalletAccountReadOnlyTon(ACCOUNT.keyPair.publicKey)

      await expect(account.quoteSendTransaction({ }))
        .rejects.toThrow('The wallet must be connected to ton center to quote send transaction operations.')
    })
  })

  describe('quoteTransfer', () => {
    test('should successfully quote a transaction for an unitialized account', async () => {
      const TRANSFER = {
        token: testToken.address.toString(),
        recipient: 'UQAMM7wsXH_0T7aLFJvyD1RS_KBSt6AqGV8c4i_2PUMscnoY',
        amount: 1_000
      }

      const result = await account.quoteTransfer(TRANSFER)

      expect(result).toEqual({ fee: UNINITIALIZED_ACCOUNT_FEE })
    })

    test('should successfully quote a transaction for an active account', async () => {
      const TRANSFER = {
        token: testToken.address.toString(),
        recipient: 'UQAMM7wsXH_0T7aLFJvyD1RS_KBSt6AqGV8c4i_2PUMscnoY',
        amount: 1_000
      }

      await sendTonsTo(ACCOUNT.address, INITIAL_BALANCE, { init: account._wallet.init })

      const result = await account.quoteTransfer(TRANSFER)

      expect(result).toEqual({ fee: ACTIVE_ACCOUNT_FEE })
    })

    test('should throw if the account is not connected to ton center', async () => {
      const account = new WalletAccountReadOnlyTon(ACCOUNT.keyPair.publicKey)

      await expect(account.quoteTransfer({ }))
        .rejects.toThrow('The wallet must be connected to ton center to quote transfer operations.')
    })
  })

  describe('getTransactionReceipt', () => {
    async function sendTransaction (to, value) {
      const { isBounceable } = Address.parseFriendly(to)

      const message = internal({
        to,
        value: fromNano(value),
        bounce: isBounceable,
        body: 'Transfer'
      })

      const transfer = await account._contract.createTransfer({
        seqno: 0,
        secretKey: ACCOUNT.keyPair.privateKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [message]
      })

      await account._contract.send(transfer)

      return blockchain.lastTransaction.hash()
    }

    test('should return the correct transaction receipt for the given hash', async () => {
      await sendTonsTo(ACCOUNT.address, INITIAL_BALANCE, { init: account._wallet.init })

      const MESSAGE_HASH = 'e3dafa8c96cee59affae9a9ce1c1ac0661ba2b041bee6b46fd188f61ee70582a'

      const BOUNCEABLE_ADDRESS = Address.parse(ACCOUNT.address).toString()

      const hash = await sendTransaction('EQBP4mzpDIywL1SV-Wp9ZuBBlzprR9eXQgSYGEXiUEHm7yYF', 100_000)

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({
          transactions: [{
            hash: hash.toString('hex')
          }]
        })
      })

      const receipt = await account.getTransactionReceipt(MESSAGE_HASH)

      expect(global.fetch).toHaveBeenCalledWith(`https://toncenter.com/api/v3/transactionsByMessage?body_hash=${MESSAGE_HASH}&limit=1`)

      expect(receipt.hash()).toBe(hash)

      expect(receipt.inMessage.info.src.toString()).toBe(BOUNCEABLE_ADDRESS)
      expect(receipt.inMessage.info.dest.toString()).toBe('EQBP4mzpDIywL1SV-Wp9ZuBBlzprR9eXQgSYGEXiUEHm7yYF')
      expect(receipt.inMessage.info.value.coins).toBe(100_000n)
    })

    test('should return null if the transaction has not been included in a block yet', async () => {
      const MESSAGE_HASH = 'e3dafa8c96cee59affae9a9ce1c1ac0661ba2b041bee6b46fd188f61ee70582a'

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({
          transactions: []
        })
      })

      const receipt = await account.getTransactionReceipt(MESSAGE_HASH)

      expect(global.fetch).toHaveBeenCalledWith(`https://toncenter.com/api/v3/transactionsByMessage?body_hash=${MESSAGE_HASH}&limit=1`)

      expect(receipt).toBe(null)
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
})
