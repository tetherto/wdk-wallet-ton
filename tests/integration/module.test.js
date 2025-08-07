import { beforeEach, describe, expect, test } from '@jest/globals'

import { Address, beginCell } from '@ton/ton'
import { JettonMinter } from '@ton-community/assets-sdk'

import BlockchainWithLogs from '../blockchain-with-logs.js'
import FakeTonClient, { ACTIVE_ACCOUNT_FEE } from '../fake-ton-client.js'

import WalletManagerTon, { WalletAccountTon } from '../../index.js'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

const PUBLIC_KEY0 = 'f2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'
const PRIVATE_KEY0 = '904a9fec5f3e5bea8f1b4c5180828843e6acd58c198967fd56b4159b44b5a68ef2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'

const PUBLIC_KEY1 = '7ad5a20de91962a8afd8ff6247d2928df3f557e404154dde6471800c92fdacb1'
const PRIVATE_KEY1 = '4ef354693bf43b4a71cfb562ed7d41fdba27521faccbb27336715fad849364457ad5a20de91962a8afd8ff6247d2928df3f557e404154dde6471800c92fdacb1'

const ACCOUNT0 = {
  index: 0,
  path: "m/44'/607'/0'/0/0",
  address: 'UQAvTZZjLwb1qnnuP1szbILyQyZT2zpSRX_Bw-fh4O9QojNi',
  keyPair: {
    publicKey: Buffer.from(PUBLIC_KEY0, 'hex'),
    privateKey: Buffer.from(PRIVATE_KEY0, 'hex')
  }
}

const ACCOUNT1 = {
  index: 1,
  path: "m/44'/607'/0'/0/1",
  address: 'UQCKSPZPsdyq3FRW9SHtRNY1Ni6qCNbTErQLHUpytJFej_vG',
  keyPair: {
    publicKey: Buffer.from(PUBLIC_KEY1, 'hex'),
    privateKey: Buffer.from(PRIVATE_KEY1, 'hex')
  }
}

const TREASURY_BALANCE = 1_000_000_000_000n

const INITIAL_BALANCE = 1_000_000_000
const INITIAL_TOKEN_BALANCE = 100_000

async function deployTestToken (blockchain, deployer) {
  const jettonMinter = JettonMinter.createFromConfig({
    admin: deployer.address,
    content: beginCell().storeStringTail('TestToken').endCell()
  })

  const testToken = blockchain.openContract(jettonMinter)

  await testToken.sendDeploy(deployer.getSender())

  return testToken
}

describe('@wdk/wallet-ton', () => {
  let blockchain, treasury, testToken, tonClient, account0, account1, wallet

  async function sendTonsTo (to, value, options = { }) {
    await treasury.send({ to: Address.parse(to), value: BigInt(value), init: options.init })
  }

  async function sendTestTokensTo (to, value) {
    await testToken.sendMint(treasury.getSender(), Address.parse(to), BigInt(value))
  }

  beforeEach(async () => {
    blockchain = await BlockchainWithLogs.create()
    treasury = await blockchain.treasury('treasury', { balance: TREASURY_BALANCE })
    testToken = await deployTestToken(blockchain, treasury)

    tonClient = new FakeTonClient(blockchain)
    account0 = new WalletAccountTon(SEED_PHRASE, "0'/0/0", { tonClient })
    account1 = new WalletAccountTon(SEED_PHRASE, "0'/0/1", { tonClient })

    await sendTonsTo(ACCOUNT0.address, INITIAL_BALANCE, { init: account0._wallet.init })

    await sendTonsTo(ACCOUNT1.address, INITIAL_BALANCE, { init: account1._wallet.init })

    await sendTestTokensTo(ACCOUNT0.address, INITIAL_TOKEN_BALANCE)

    await sendTestTokensTo(ACCOUNT1.address, INITIAL_TOKEN_BALANCE)

    wallet = new WalletManagerTon(SEED_PHRASE, { tonClient })
  })

  test('should derive an account, quote the cost of a tx and send the tx', async () => {
    const account0 = await wallet.getAccount()
    const account1 = await wallet.getAccount(1)

    expect(account0).toBeInstanceOf(WalletAccountTon)

    expect(account0.path).toBe(ACCOUNT0.path)

    expect(await account0.getAddress()).toBe(ACCOUNT0.address)
    expect(Buffer.from(account0.keyPair.publicKey)).toEqual(ACCOUNT0.keyPair.publicKey)
    expect(Buffer.from(account0.keyPair.privateKey)).toEqual(ACCOUNT0.keyPair.privateKey)

    expect(account1.path).toBe(ACCOUNT1.path)
    expect(await account1.getAddress()).toBe(ACCOUNT1.address)
    expect(Buffer.from(account1.keyPair.publicKey)).toEqual(ACCOUNT1.keyPair.publicKey)
    expect(Buffer.from(account1.keyPair.privateKey)).toEqual(ACCOUNT1.keyPair.privateKey)

    const TRANSACTION = {
      to: ACCOUNT1.address,
      value: 1_000_000
    }

    const { fee: quoteFee } = await account0.quoteSendTransaction(TRANSACTION)

    expect(quoteFee).toBe(ACTIVE_ACCOUNT_FEE)

    const { fee } = await account0.sendTransaction(TRANSACTION)

    expect(blockchain.transactions).toHaveTransaction({
      from: account0._wallet.address,
      to: account1._wallet.address,
      value: 1_000_000n,
      success: true
    })

    expect(fee).toBe(quoteFee)
  })

  test('should derive two accounts, send a tx from account 0 to 1 and get the correct balances', async () => {
    const account0 = await wallet.getAccount()
    const account1 = await wallet.getAccount(1)

    const balance0 = await account0.getBalance()
    const balance1 = await account1.getBalance()

    const TRANSACTION = {
      to: await account1.getAddress(),
      value: 1_000_000
    }

    await account0.sendTransaction(TRANSACTION)

    expect(blockchain.transactions).toHaveTransaction({
      from: account0._wallet.address,
      to: account1._wallet.address,
      value: 1_000_000n,
      success: true
    })

    const finalBalance0 = await account0.getBalance()
    const finalBalance1 = await account1.getBalance()

    const actualFee = balance0 - finalBalance0 - 1_000_000

    expect(finalBalance0).toBe(balance0 - actualFee - 1_000_000)
    expect(finalBalance1).toBeLessThanOrEqual(balance1 + 1_000_000)
    expect(finalBalance1).toBeGreaterThan(balance1)
  })

  test('should derive an account by its path, quote the cost of transferring a token and transfer a token', async () => {
    const account0 = await wallet.getAccountByPath("0'/0/0")
    const account1 = await wallet.getAccountByPath("0'/0/1")

    const TRANSFER = {
      token: testToken.address.toString(),
      recipient: account1._wallet.address.toString(),
      amount: 1_000
    }

    const { fee: quoteFee } = await account0.quoteTransfer(TRANSFER)

    expect(quoteFee).toBe(ACTIVE_ACCOUNT_FEE)

    const { fee } = await account0.transfer(TRANSFER)

    expect(fee).toBe(quoteFee)

    const account0JettonWalletAddress = await testToken.getWalletAddress(account0._wallet.address)
    const account1JettonWalletAddress = await testToken.getWalletAddress(account1._wallet.address)

    const internalTransferBody = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(0, 64)
      .storeCoins(TRANSFER.amount)
      .storeAddress(account1._wallet.address)
      .storeAddress(account0._wallet.address)
      .storeBit(false)
      .storeCoins(1n)
      .storeMaybeRef()
      .endCell()

    expect(blockchain.transactions).toHaveTransaction({
      from: account0._wallet.address,
      to: account0JettonWalletAddress,
      body: internalTransferBody,
      success: true
    })

    expect(blockchain.transactions).toHaveTransaction({
      from: account0JettonWalletAddress,
      to: account1JettonWalletAddress,
      success: true
    })
  })

  test('should derive two accounts by their paths, transfer a token from account 1 to 2 and get the correct balances and token balances', async () => {
    const account0 = await wallet.getAccountByPath("0'/0/0")
    const account1 = await wallet.getAccountByPath("0'/0/1")

    const balanceBefore0 = await account0.getTokenBalance(testToken.address.toString())
    const balanceBefore1 = await account1.getTokenBalance(testToken.address.toString())

    const TRANSFER = {
      token: testToken.address.toString(),
      recipient: account1._wallet.address.toString(),
      amount: 1_000
    }

    await account0.transfer(TRANSFER)

    const account0JettonWalletAddress = await testToken.getWalletAddress(account0._wallet.address)
    const account1JettonWalletAddress = await testToken.getWalletAddress(account1._wallet.address)

    const internalTransferBody = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(0, 64)
      .storeCoins(TRANSFER.amount)
      .storeAddress(account1._wallet.address)
      .storeAddress(account0._wallet.address)
      .storeBit(false)
      .storeCoins(1n)
      .storeMaybeRef()
      .endCell()

    expect(blockchain.transactions).toHaveTransaction({
      from: account0._wallet.address,
      to: account0JettonWalletAddress,
      body: internalTransferBody,
      success: true
    })

    expect(blockchain.transactions).toHaveTransaction({
      from: account0JettonWalletAddress,
      to: account1JettonWalletAddress,
      success: true
    })

    const balanceAfter0 = await account0.getTokenBalance(testToken.address.toString())
    const balanceAfter1 = await account1.getTokenBalance(testToken.address.toString())

    expect(balanceAfter0).toBe(balanceBefore0 - TRANSFER.amount)
    expect(balanceAfter1).toBe(balanceBefore1 + TRANSFER.amount)
  })

  test('should derive an account, sign a message and verify its signature', async () => {
    const account0 = await wallet.getAccount()

    const message = 'Hello, world!'

    const signature = await account0.sign(message)

    const isValid = await account0.verify(message, signature)

    expect(isValid).toBe(true)
  })

  test('should dispose the wallet and erase the private keys of the accounts', async () => {
    const account0 = await wallet.getAccount(0)
    const account1 = await wallet.getAccount(1)

    wallet.dispose()

    const MESSAGE = 'Hello, world!'

    const TRANSACTION = {
      to: account1._wallet.address.toString(),
      value: 1_000
    }

    const TRANSFER = {
      token: testToken.address.toString(),
      recipient: account1._wallet.address.toString(),
      amount: 100
    }

    for (const account of [account0, account1]) {
      expect(account.keyPair.privateKey).toBe(undefined)

      await expect(account.sign(MESSAGE)).rejects.toThrow('bad secret key size')
      await expect(account.sendTransaction(TRANSACTION)).rejects.toThrow('bad secret key size')
      await expect(account.transfer(TRANSFER)).rejects.toThrow('bad secret key size')
    }
  })

  test('should create a wallet with a low transfer max fee, derive an account, try to transfer some tokens and gracefully fail', async () => {
    const wallet = new WalletManagerTon(SEED_PHRASE, { tonClient, transferMaxFee: 0 })
    const account = await wallet.getAccount()

    const TRANSFER = {
      token: testToken.address.toString(),
      recipient: account1._wallet.address.toString(),
      amount: 100
    }

    await expect(account.transfer(TRANSFER)).rejects.toThrow('Exceeded maximum fee cost for transfer operations.')
  })
})
