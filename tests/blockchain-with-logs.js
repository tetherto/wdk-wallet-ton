import { Blockchain, LocalBlockchainStorage, Executor } from '@ton/sandbox'

export default class BlockchainWithLogs extends Blockchain {
  constructor (opts) {
    super(opts)

    this._transactions = []
  }

  get transactions () {
    return this._transactions
  }

  get lastTransaction () {
    return this._transactions.at(-1)
  }

  openContract (contract) {
    const sandboxContract = super.openContract(contract)

    const transactions = this._transactions

    return new Proxy(sandboxContract, {
      get (target, prop) {
        const original = target[prop]

        if (typeof original === 'function' && typeof prop === 'string' && prop.startsWith('send')) {
          return async (...args) => {
            const result = await original.apply(target, args)

            transactions.push(...result.transactions)

            return result
          }
        }

        return original
      }
    })
  }

  static async create (opts) {
    return new BlockchainWithLogs({
      executor: opts?.executor ?? await Executor.create(),
      storage: opts?.storage ?? new LocalBlockchainStorage(),
      meta: opts?.meta ?? await import('@ton/test-utils')?.contractsMeta,
      ...opts
    })
  }
}
