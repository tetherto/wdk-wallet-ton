import { randomAddress } from '@ton/test-utils'
import * as bip39 from 'bip39'
import BlockchainWithLogs from './blockchain-with-logs.js'
import { JettonMinter } from '@ton-community/assets-sdk'
import { beginCell, toNano } from '@ton/ton'
import TonClientStub from './ton-client-stub.js'

import { beforeEach, describe, expect, test, jest } from '@jest/globals'

import { WalletAccountTon } from '../index.js'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'
const SEED = bip39.mnemonicToSeedSync(SEED_PHRASE)
const INVALID_SEED_PHRASE = 'invalid seed phrase'

const ACCOUNT_PRIVATE_KEY = '904a9fec5f3e5bea8f1b4c5180828843e6acd58c198967fd56b4159b44b5a68ef2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'
const ACCOUNT_PUBLIC_KEY = 'f2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'
const ACCOUNT = {
  index: 0,
  path: "m/44'/607'/0'/0/0",
  address: 'UQAvTZZjLwb1qnnuP1szbILyQyZT2zpSRX_Bw-fh4O9QojNi',
  keyPair: {
    privateKey: new Uint8Array(Buffer.from(ACCOUNT_PRIVATE_KEY, 'hex')),
    publicKey: new Uint8Array(Buffer.from(ACCOUNT_PUBLIC_KEY, 'hex'))
  }
}

describe('WalletAccountTon', () => {
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

    account = new WalletAccountTon(SEED_PHRASE, "0'/0/0", {
      tonClient
    })
    recipient = new WalletAccountTon(SEED_PHRASE, "0'/0/666", {
      tonClient
    })

    await treasury.send({
      to: account._wallet.address,
      value: toNano('100'),
      init: account._wallet.init
    })

    await treasury.send({
      to: recipient._wallet.address,
      value: toNano('5'),
      init: recipient._wallet.init
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

  afterEach(() => {
    account.dispose()
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

    test('should successfully initialize an account for the given seed and path', async () => {
      const account = new WalletAccountTon(SEED, "0'/0/0")

      expect(account.index).toBe(ACCOUNT.index)

      expect(account.path).toBe(ACCOUNT.path)

      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.publicKey, 'hex'))
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

  describe('sendTransaction', () => {
    test('should successfully send a transaction', async () => {
      const value = 11111111
      const result = await account.sendTransaction({ to: await recipient.getAddress(), value, bounceable: false })

      expect(blockchain.transactions).toHaveTransaction({
        from: account._wallet.address,
        to: recipient._wallet.address,
        value: BigInt(value),
        success: true
      })

      expect(result).toEqual({ hash: 'e3dafa8c96cee59affae9a9ce1c1ac0661ba2b041bee6b46fd188f61ee70582a', fee: 4 })
    })

    test('should successfully send a transaction with a bounceable address', async () => {
      const value = 11111111
      const result = await account.sendTransaction({ to: recipient._wallet.address.toString(), value, bounceable: true })

      expect(blockchain.transactions).toHaveTransaction({
        from: account._wallet.address,
        to: recipient._wallet.address,
        value: BigInt(value),
        success: true
      })

      expect(result).toEqual({ hash: 'e3dafa8c96cee59affae9a9ce1c1ac0661ba2b041bee6b46fd188f61ee70582a', fee: 4 })
    })

    test('should bounce the transaction when sent to a non-existent address', async () => {
      const value = 11111111
      const nonExistentAddress = randomAddress()

      await account.sendTransaction({
        to: nonExistentAddress.toString(),
        value,
        bounceable: true
      })

      expect(blockchain.transactions).toHaveTransaction({
        from: nonExistentAddress,
        to: account._wallet.address,
        inMessageBounced: true,
        success: true
      })

      expect(blockchain.transactions).toHaveTransaction({
        from: account._wallet.address,
        to: nonExistentAddress,
        value: BigInt(value),
        success: false,
        inMessageBounced: false
      })
    })

    test('should throw if the account is not connected to the ton center', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.sendTransaction({ to: recipient._wallet.address, value: 10_000 }))
        .rejects.toThrow('The wallet must be connected to ton center to send transactions.')
    })
  })

  describe('transfer', () => {
    test('should successfully transfer tokens', async () => {
      const transferAmount = 22_222
      const senderJettonWalletAddress = await jettonMinter.getWalletAddress(account._wallet.address)
      const recipientJettonWalletAddress = await jettonMinter.getWalletAddress(recipient._wallet.address)

      const result = await account.transfer({
        token: jettonMinter.address.toString(),
        recipient: await recipient.getAddress(),
        amount: transferAmount
      })

      const internalTransferBody = beginCell()
        .storeUint(0x0f8a7ea5, 32)
        .storeUint(0, 64)
        .storeCoins(transferAmount)
        .storeAddress(recipient._wallet.address)
        .storeAddress(account._wallet.address)
        .storeBit(false)
        .storeCoins(1n)
        .storeMaybeRef(undefined)
        .endCell()

      expect(blockchain.transactions).toHaveTransaction({
        from: account._wallet.address,
        to: senderJettonWalletAddress,
        body: internalTransferBody,
        success: true
      })

      expect(blockchain.transactions).toHaveTransaction({
        from: senderJettonWalletAddress,
        to: recipientJettonWalletAddress,
        success: true
      })

      expect(result).toEqual({ hash: '8f170dca659c6ff27347c3e39d9580df59c5954b91837544a78f2f41ce3d5bc0', fee: 4 })
    })

    test('should throw if transfer fee exceeds the transfer max fee configuration', async () => {
      const TRANSFER = {
        token: jettonMinter.address.toString(),
        recipient: await recipient.getAddress(),
        amount: 100_000
      }

      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0", {
        tonClient,
        transferMaxFee: 0
      })

      await expect(account.transfer(TRANSFER))
        .rejects.toThrow('Exceeded maximum fee cost for transfer operation.')
    })

    test('should throw if the account is not connected to ton center', async () => {
      const account = new WalletAccountTon(SEED_PHRASE, "0'/0/0")

      await expect(account.transfer({
        token: 'EQA3Ce7HlnCZNBYLzJoD7FO-NvNLbOArDEimVY1oNw_eAPeX',
        recipient: await recipient.getAddress(),
        amount: 1_000
      }))
        .rejects.toThrow('The wallet must be connected to ton center to transfer tokens.')
    })
  })
})
