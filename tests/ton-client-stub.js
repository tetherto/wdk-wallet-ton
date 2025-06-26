import { TonClient } from '@ton/ton'
export default class TonClientStub extends TonClient {
  constructor (blockchain) {
    super({ endpoint: '/' })
    this._blockchain = blockchain
  }

  async callGetMethod (address, name, stack) {
    const result = await this._blockchain.runGetMethod(address, name, stack)

    if (result.exitCode !== 0) {
      throw new Error(`Get method failed with exit code ${result.exitCode}`)
    }

    return {
      gasUsed: result.gas_used,
      exitCode: result.exit_code,
      stack: result.stackReader
    }
  }

  async estimateExternalMessageFee (_address, _args) {
    const response = { source_fees: { in_fwd_fee: 1, storage_fee: 1, gas_fee: 1, fwd_fee: 1 } }

    return response
  }

  open (src) {
    return this._blockchain.openContract(src)
  }
}
