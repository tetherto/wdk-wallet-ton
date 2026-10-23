import { beforeEach, describe, expect, test, jest } from '@jest/globals'
import { Address, beginCell } from '@ton/ton'
import { JettonMinter } from '@ton-community/assets-sdk'

import BlockchainWithLogs from './blockchain-with-logs.js'
import FakeTonClient from './fake-ton-client.js'
import { WalletAccountReadOnlyTonAddress } from '../index.js'

const ADDRESS = 'UQAvTZZjLwb1qnnuP1szbILyQyZT2zpSRX_Bw-fh4O9QojNi'
const INITIAL_TOKEN_BALANCE = 100_000n

describe('WalletAccountReadOnlyTonAddress', () => {
  let blockchain, treasury, testToken, tonClient, account

  beforeEach(async () => {
    blockchain = await BlockchainWithLogs.create()
    treasury = await blockchain.treasury('treasury')
    const minter = JettonMinter.createFromConfig({
      admin: treasury.address,
      content: beginCell().storeStringTail('TestToken').endCell()
    })
    testToken = blockchain.openContract(minter)
    await testToken.sendDeploy(treasury.getSender())

    tonClient = new FakeTonClient(blockchain)
    account = new WalletAccountReadOnlyTonAddress(ADDRESS, { tonClient })
  })

  test('returns the supplied address without deriving another wallet version', async () => {
    await expect(account.getAddress()).resolves.toBe(ADDRESS)
  })

  test('reads the native balance through the configured client', async () => {
    const getBalance = jest.spyOn(tonClient, 'getBalance').mockResolvedValue(42n)
    await expect(account.getBalance()).resolves.toBe(42n)
    expect(getBalance).toHaveBeenCalledTimes(1)
    expect(getBalance.mock.calls[0][0].equals(Address.parse(ADDRESS))).toBe(true)
  })

  test('reads the derived Jetton wallet and validates its owner and master', async () => {
    await testToken.sendMint(treasury.getSender(), Address.parse(ADDRESS), INITIAL_TOKEN_BALANCE)
    await expect(account.getTokenBalance(testToken.address.toString())).resolves.toBe(INITIAL_TOKEN_BALANCE)
  })

  test('rejects a Jetton wallet that reports a different owner or master', async () => {
    const unexpected = Address.parse('UQAMM7wsXH_0T7aLFJvyD1RS_KBSt6AqGV8c4i_2PUMscnoY')
    const stack = {
      readBigNumber: jest.fn().mockReturnValue(1n),
      readAddress: jest.fn()
        .mockReturnValueOnce(unexpected)
        .mockReturnValueOnce(testToken.address)
    }
    jest.spyOn(account, '_getJettonWalletAddress').mockResolvedValue(unexpected)
    jest.spyOn(tonClient, 'callGetMethod').mockResolvedValue({ stack })

    await expect(account.getTokenBalance(testToken.address.toString()))
      .rejects.toThrow('owner or master does not match')
  })

  test('requires a TON client for balance queries', async () => {
    const disconnected = new WalletAccountReadOnlyTonAddress(ADDRESS)
    await expect(disconnected.getBalance()).rejects.toThrow('connected to ton center')
    await expect(disconnected.getTokenBalance(testToken.address.toString())).rejects.toThrow('connected to ton center')
  })

  test('rejects malformed addresses', () => {
    expect(() => new WalletAccountReadOnlyTonAddress('not-an-address')).toThrow()
  })
})
