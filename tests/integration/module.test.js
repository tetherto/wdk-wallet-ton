import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import { Address, beginCell } from '@ton/ton'
import { JettonMinter } from '@ton-community/assets-sdk'

import BlockchainWithLogs from '../blockchain-with-logs.js'
import FakeTonClient, { ACTIVE_ACCOUNT_FEE } from '../fake-ton-client.js'

function calculateQueryId (highRandom, lowRandom) {
  const high = BigInt(Math.floor(highRandom * 0x100000000))
  const low = BigInt(Math.floor(lowRandom * 0x100000000))
  const queryId = (high << 32n) | low
  return queryId
}

const originalMathRandom = Math.random
function restoreMathRandom () {
  global.Math.random = originalMathRandom
}

const abs = x => x < 0n ? -x : x

const { default: WalletManagerTon, WalletAccountTon } = await import('../../index.js')

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

const PUBLIC_KEY_0 = 'f2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'
const PRIVATE_KEY_0 = '904a9fec5f3e5bea8f1b4c5180828843e6acd58c198967fd56b4159b44b5a68ef2ade24192b5a0fba669da730d105088a3a848519f43b27f24bdd8395eb26b8f'

const PUBLIC_KEY_1 = '7ad5a20de91962a8afd8ff6247d2928df3f557e404154dde6471800c92fdacb1'
const PRIVATE_KEY_1 = '4ef354693bf43b4a71cfb562ed7d41fdba27521faccbb27336715fad849364457ad5a20de91962a8afd8ff6247d2928df3f557e404154dde6471800c92fdacb1'

const ACCOUNT_0 = {
  index: 0,
  path: "m/44'/607'/0'/0/0",
  address: 'UQAvTZZjLwb1qnnuP1szbILyQyZT2zpSRX_Bw-fh4O9QojNi',
  keyPair: {
    publicKey: Buffer.from(PUBLIC_KEY_0, 'hex'),
    privateKey: Buffer.from(PRIVATE_KEY_0, 'hex')
  }
}

const ACCOUNT_1 = {
  index: 1,
  path: "m/44'/607'/0'/0/1",
  address: 'UQCKSPZPsdyq3FRW9SHtRNY1Ni6qCNbTErQLHUpytJFej_vG',
  keyPair: {
    publicKey: Buffer.from(PUBLIC_KEY_1, 'hex'),
    privateKey: Buffer.from(PRIVATE_KEY_1, 'hex')
  }
}

const TREASURY_BALANCE = 1_000_000_000_000n

const INITIAL_BALANCE = 1_000_000_000n
const INITIAL_TOKEN_BALANCE = 100_000n

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
  let blockchain, treasury, testToken, tonClient, wallet

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
    wallet = new WalletManagerTon(SEED_PHRASE, { tonClient })
    
    for (const { index, address } of [ACCOUNT_0, ACCOUNT_1]) {
      const account = new WalletAccountTon(SEED_PHRASE, `0'/0/${index}`)
      await sendTonsTo(address, INITIAL_BALANCE, { init: account._wallet.init })
      await sendTestTokensTo(address, INITIAL_TOKEN_BALANCE)
    }
  })

  afterEach(() => {
    restoreMathRandom()
  })

  test('should derive an account, quote the cost of a tx and send the tx', async () => {
    const account0 = await wallet.getAccount()

    const TRANSACTION = {
      to: ACCOUNT_1.address,
      value: 1_000_000n
    }

    const { fee: quoteFee } = await account0.quoteSendTransaction(TRANSACTION)

    const { fee } = await account0.sendTransaction(TRANSACTION)

    expect(blockchain.transactions).toHaveTransaction({
      from: Address.parse(ACCOUNT_0.address),
      to: Address.parse(ACCOUNT_1.address),
      value: 1_000_000n,
      success: true
    })

    expect(quoteFee).toBe(ACTIVE_ACCOUNT_FEE)

    expect(fee).toBe(quoteFee)
  })

  test('should derive two accounts, send a tx from account 0 to 1 and get the correct balances', async () => {
    const account0 = await wallet.getAccount()
    const account1 = await wallet.getAccount(1)

    const balance0 = await account0.getBalance()
    const balance1 = await account1.getBalance()

    const TRANSACTION = {
      to: await account1.getAddress(),
      value: 1_000_000n
    }

    await account0.sendTransaction(TRANSACTION)

    const finalBalance0 = await account0.getBalance()
    const finalBalance1 = await account1.getBalance()

    const fee = 3087600n
    const receivingFee = 311200n

    expect(abs(balance0 - finalBalance0 - 1_000_000n - fee)).toBeLessThanOrEqual(1n)
    expect(abs(finalBalance1 - (balance1 + 1_000_000n - receivingFee))).toBeLessThanOrEqual(1n)
  })

  test('should derive an account by its path, quote the cost of transferring a token and transfer a token', async () => {
    const account0 = await wallet.getAccountByPath("0'/0/0")
    const account1 = await wallet.getAccountByPath("0'/0/1")

    const TRANSFER = {
      token: testToken.address.toString(),
      recipient: ACCOUNT_1.address,
      amount: 1_000n
    }

    global.Math.random = jest.fn()
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.25)
    const expectedQueryId = calculateQueryId(0.5, 0.25)

    const { fee: quoteFee } = await account0.quoteTransfer(TRANSFER)

    const { hash, fee } = await account0.transfer(TRANSFER)

    const account0JettonWalletAddress = await testToken.getWalletAddress(Address.parse(ACCOUNT_0.address))
    const account1JettonWalletAddress = await testToken.getWalletAddress(Address.parse(ACCOUNT_1.address))

    const internalTransferBody = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(expectedQueryId, 64)
      .storeCoins(TRANSFER.amount)
      .storeAddress(account1._wallet.address)
      .storeAddress(account0._wallet.address)
      .storeBit(false)
      .storeCoins(1n)
      .storeMaybeRef(null)
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

    expect(quoteFee).toBe(ACTIVE_ACCOUNT_FEE)

    expect(fee).toBe(quoteFee)
    
    expect(hash).toBe('80d5f87f50b39be73b038e968dc19bae93ae7a216287ee604575f7bd3a99a957')
  })

  test('should derive two accounts by their paths, transfer a token from account 0 to 1 and get the correct balances and token balances', async () => {
    const account0 = await wallet.getAccountByPath("0'/0/0")
    const account1 = await wallet.getAccountByPath("0'/0/1")

    const balance0 = await account0.getBalance()

    const tokenBalance0 = await account0.getTokenBalance(testToken.address.toString())
    const tokenBalance1 = await account1.getTokenBalance(testToken.address.toString())

    const TRANSFER = {
      token: testToken.address.toString(),
      recipient: ACCOUNT_1.address,
      amount: 1_000n
    }

    await account0.transfer(TRANSFER)

    const finalBalance0 = await account0.getBalance()

    const fee = 31216833n

    expect(abs(balance0 - finalBalance0 - fee)).toBeLessThanOrEqual(1n)

    const finalTokenBalance0 = await account0.getTokenBalance(testToken.address.toString())
    const finalTokenBalance1 = await account1.getTokenBalance(testToken.address.toString())

    expect(finalTokenBalance0).toBe(tokenBalance0 - TRANSFER.amount)
    expect(finalTokenBalance1).toBe(tokenBalance1 + TRANSFER.amount)
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
      value: 1_000n
    }

    const TRANSFER = {
      token: testToken.address.toString(),
      recipient: ACCOUNT_1.address,
      amount: 100n
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
    const account0 = await wallet.getAccount()
    const account1 = await wallet.getAccount(1)

    const TRANSFER = {
      token: testToken.address.toString(),
      recipient: ACCOUNT_1.address,
      amount: 100
    }

    await expect(account0.transfer(TRANSFER)).rejects.toThrow('Exceeded maximum fee cost for transfer operations.')
  })
})
