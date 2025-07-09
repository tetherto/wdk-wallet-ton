import { Blockchain, LocalBlockchainStorage, Executor } from '@ton/sandbox'

export default class BlockchainWithLogs extends Blockchain {
  constructor (opts) {
    super(opts)

    this.transactions = []
  }

  openContract (contract) {
    const openedContract = super.openContract(contract)
    const loggedTransactions = this.transactions

    return new Proxy(openedContract, {
      get (target, prop) {
        const original = target[prop]

        if (typeof prop === 'string' && prop.startsWith('send') && typeof original === 'function') {
          return async (...args) => {
            const result = await original.apply(target, args)

            if (result && Array.isArray(result.transactions)) {
              loggedTransactions.push(...result.transactions)
            }

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
