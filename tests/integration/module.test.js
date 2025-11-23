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

const PUBLIC_KEY_0 = '5b963f3bf46b01c8641255e9f03827708cb2bde63451404f4cdc37b195059eb5'
const PRIVATE_KEY_0 = '8da177404dd00fcffd21951d608a37036c4de0e883c8cbf97b8abee5cf3dc3e35b963f3bf46b01c8641255e9f03827708cb2bde63451404f4cdc37b195059eb5'

const PUBLIC_KEY_1 = '7d30d6ca34b2f19a1fcce37352c959ba13fbbae45c318da3a0e74095a915362c'
const PRIVATE_KEY_1 = '9e37403f3c3e38deff1b58402a51ae069caf3fb61bf517108dc8e9536b2fb89d7d30d6ca34b2f19a1fcce37352c959ba13fbbae45c318da3a0e74095a915362c'

const ACCOUNT_0 = {
  index: 0,
  path: "m/44'/607'/0'",
  address: 'UQASomfWf2V7N46QrW4umfpARQBwKORp_z6I_8u2jUG29cYa',
  keyPair: {
    publicKey: Buffer.from(PUBLIC_KEY_0, 'hex'),
    privateKey: Buffer.from(PRIVATE_KEY_0, 'hex')
  }
}

const ACCOUNT_1 = {
  index: 1,
  path: "m/44'/607'/1'",
  address: 'UQD3CRdkxEJL89-0TvBLTon261m8ImL2ivGgQ_50OW-XhKpY',
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
      const account = new WalletAccountTon(SEED_PHRASE, `${index}'`)
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
    const account0 = await wallet.getAccountByPath("0'")
    const account1 = await wallet.getAccountByPath("1'")

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
    
    expect(hash).toBe('1709a81900680ad42b9d97b5c3b3dbda78dc794ec8e87ab727bc04c8e3075f36')
  })

  test('should derive two accounts by their paths, transfer a token from account 0 to 1 and get the correct balances and token balances', async () => {
    const account0 = await wallet.getAccountByPath("0'")
    const account1 = await wallet.getAccountByPath("1'")

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
