import '@ton/test-utils'
import { Blockchain } from '@ton/sandbox'
import { JettonMinter, JettonWallet } from '@ton-community/assets-sdk'
import { beginCell, toNano } from '@ton/core'
import TonClientStub from './ton-client-stub.js'

import { beforeEach, describe, expect, test } from '@jest/globals'

import { WalletAccountTon } from '../index.js'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'
const INVALID_SEED_PHRASE = 'invalid seed phrase'

const TRANSACTION = {
  to: 'UQCfu7DHKCYwqiohPFVQxjp45DDW3-tWSo-eIigNoZBaqOfQ',
  value: 100,
  bounceable: false
}

const ACCOUNT = {
  index: 0,
  path: "m/44'/607'/0'/0/0",
  address: 'UQAvTZZjLwb1qnnuP1szbILyQyZT2zpSRX_Bw-fh4O9QojNi',
  keyPair: {
    privateKey: new Uint8Array(Buffer.from('904a9fec5f3e5bea8f1b4c5180828843e6acd58c198967fd56b4159b44b5a68ef2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f', 'hex')),
    publicKey: new Uint8Array(Buffer.from('f2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f', 'hex'))
  }
}

describe('WalletAccountTon', () => {
  let tonClient, account, blockchain, deployer, jettonMinter, treasury, recipient

  beforeEach(async () => {
    blockchain = await Blockchain.create()
    treasury = await blockchain.treasury('treasury')
    recipient = await blockchain.treasury('recipient')
    tonClient = new TonClientStub(blockchain)
    deployer = await blockchain.treasury('deployer')
    jettonMinter = blockchain.openContract(JettonMinter.createFromConfig({
      admin: deployer.address,
      content: beginCell().storeStringTail('USDT').endCell()
    }))

    const deployResult = await jettonMinter.sendDeploy(deployer.getSender(), toNano(0.05))

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      on: jettonMinter.address,
      deploy: true,
      success: true
    })

    account = new WalletAccountTon(SEED_PHRASE, "0'/0/0", {
      tonClient
    })

    const walletContract = account._wallet

    const fundResult = await treasury.send({
      to: walletContract.address,
      value: toNano('0.5'),
      init: walletContract.init
    })

    expect(fundResult.transactions).toHaveTransaction({
      from: treasury.address,
      to: walletContract.address,
      deploy: true,
      success: true,
      endStatus: 'active'
    })

    const mintAmount = toNano('1000')
    await jettonMinter.sendMint(
      deployer.getSender(),
      account._wallet.address,
      mintAmount,
      toNano('0.05'),
      toNano('0.1')
    )
  })

  describe('constructor', () => {
    test('should successfully initialize an account for the given seed phrase and path', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      expect(account.index).toBe(ACCOUNT.index)

      expect(account.path).toBe(ACCOUNT.path)

      expect(account.keyPair).toEqual({
        privateKey: ACCOUNT.keyPair.privateKey,
        publicKey: ACCOUNT.keyPair.publicKey
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

  describe('getAddress', () => {
    test('should return the correct address', async () => {
      const address = await account.getAddress()

      expect(address).toBe(ACCOUNT.address)
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

  describe('sendTransaction method', () => {
    test('should successfully send a transaction', async () => {
      const result = await account.sendTransaction({ to: recipient.address.toString(), value: 10_000 })

      expect(result).toEqual({ hash: 'e3dafa8c96cee59affae9a9ce1c1ac0661ba2b041bee6b46fd188f61ee70582a', fee: 4 })
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.sendTransaction({ to: recipient.address.toString(), value: 10_000 }))
        .rejects.toThrow('The wallet must be connected to ton center to send transactions.')
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
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.quoteSendTransaction(TRANSACTION))
        .rejects.toThrow('The wallet must be connected to ton center to quote send transaction operations.')
    })
  })

  describe('transfer method', () => {
    test('transfer', async () => {
      const transferAmount = toNano('100')

      const result = await account.transfer({
        token: jettonMinter.address.toString(),
        recipient: recipient.address.toString(),
        amount: transferAmount
      })

      expect(result).toEqual({ hash: '7ffc3a0c11076e2bcefb7bed34f40e5de7ed858fa509b7eb22bc527eb63b7a97', fee: 4 })

      const recipientJettonWalletAddress = await jettonMinter.getWalletAddress(recipient.address)
      const recipientJettonWallet = blockchain.openContract(
        JettonWallet.createFromAddress(recipientJettonWalletAddress)
      )

      const recipientJettonWalletData = await recipientJettonWallet.getData()
      const recipientBalance = recipientJettonWalletData.balance

      expect(recipientBalance).toEqual(transferAmount)
    })

    test('should throw if the account is not connected to ton center', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.transfer({
        token: 'EQA3Ce7HlnCZNBYLzJoD7FO-NvNLbOArDEimVY1oNw_eAPeX',
        recipient: recipient.address.toString(),
        amount: 1_000
      }))
        .rejects.toThrow('The wallet must be connected to ton center to transfer tokens.')
    })
  })

  describe('getBalance', () => {
    test('should return the correct balance of the account', async () => {
      const value = 100_000
      const account1 = new WalletAccountTon(SEED_PHRASE, "0'/0/1", {
        tonClient
      })

      await treasury.send({ to: await account1.getAddress(), value })

      const balance = await account1.getBalance()

      expect(balance).toEqual(value)
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.getBalance(TRANSACTION))
        .rejects.toThrow('The wallet must be connected to ton center to get balances.')
    })
  })

  describe('getTokenBalance', () => {
    test('should return the correct token balance of the account', async () => {
      const balance = await account.getTokenBalance(jettonMinter.address.toString())

      expect(balance)
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.getTokenBalance(recipient.address.toString()))
        .rejects.toThrow('The wallet must be connected to ton center to get token balances.')
    })
  })
})
