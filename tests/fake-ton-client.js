import { TonClient } from '@ton/ton'

export const UNINITIALIZED_ACCOUNT_FEE = 4_494_400

const UNINITIALIZED_ACCOUNT_SOURCE_FEES = { in_fwd_fee: 3_536_400, storage_fee: 0, gas_fee: 958_000, fwd_fee: 0 }

export const ACTIVE_ACCOUNT_FEE = 3_117_820

const ACTIVE_ACCOUNT_SOURCE_FEES = { in_fwd_fee: 734_400, storage_fee: 7_820, gas_fee: 1_975_600, fwd_fee: 400_000 }

export default class FakeTonClient extends TonClient {
  constructor (blockchain) {
    super({ endpoint: '/' })

    this._blockchain = blockchain
  }

  async callGetMethod (address, name, stack) {
    const result = await this._blockchain.runGetMethod(address, name, stack)

    if (result.exitCode !== 0) {
      throw new Error(`Unable to execute get method. Got exit_code: ${result.exitCode}`)
    }

    return { gasUsed: result.gasUsed, stack: result.stackReader }
  }

  async getContractState (address) {
    const contract = await this._blockchain.getContract(address)

    const { state } = contract.accountState

    return { code: state?.code, data: state?.data }
  }

  async estimateExternalMessageFee (address, args) {
    if (args.initCode && args.initData) {
      return { source_fees: UNINITIALIZED_ACCOUNT_SOURCE_FEES }
    }

    return { source_fees: ACTIVE_ACCOUNT_SOURCE_FEES }
  }

  async getTransactions (address, opts) {
    return this._blockchain.transactions.filter(tx => tx.hash().toString('hex') === opts.hash)
  }

  open (src) {
    return this._blockchain.openContract(src)
  }
}
