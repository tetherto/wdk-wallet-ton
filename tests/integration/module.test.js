import { beforeEach, describe, expect, test } from '@jest/globals'

import { Address, beginCell } from '@ton/ton'
import { JettonMinter } from '@ton-community/assets-sdk'
import * as bip39 from 'bip39'

import BlockchainWithLogs from '../blockchain-with-logs.js'
import FakeTonClient, { ACTIVE_ACCOUNT_FEE } from '../fake-ton-client.js'

import WalletManagerTon, { WalletAccountReadOnlyTon, WalletAccountTon } from '../../index.js'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'
const INVALID_SEED_PHRASE = 'invalid seed phrase'
const SEED = bip39.mnemonicToSeedSync(SEED_PHRASE)

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

        const { hash, fee } = await account0.sendTransaction(TRANSACTION)

        expect(blockchain.transactions).toHaveTransaction({
            from: account0._wallet.address,
            to: account1._wallet.address,
            value: 1_000_000n,
            success: true
          })

        expect(hash).toBe('e3dafa8c96cee59affae9a9ce1c1ac0661ba2b041bee6b46fd188f61ee70582a')

        expect(fee).toBe(ACTIVE_ACCOUNT_FEE)
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

        const { hash, fee } = await account0.sendTransaction(TRANSACTION)

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

    test("should derive an account by its path, quote the cost of transferring a token and transfer a token", async () => {
        const account0 = await wallet.getAccount(ACCOUNT0.path)
        const account1 = await wallet.getAccount(ACCOUNT1.path)
        
})