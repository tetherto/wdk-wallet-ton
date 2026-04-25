# @tetherto/wdk-wallet-ton

[![npm version](https://img.shields.io/npm/v/%40tetherto%2Fwdk-wallet-ton?style=flat-square)](https://www.npmjs.com/package/@tetherto/wdk-wallet-ton)
[![npm downloads](https://img.shields.io/npm/dw/%40tetherto%2Fwdk-wallet-ton?style=flat-square)](https://www.npmjs.com/package/@tetherto/wdk-wallet-ton)
[![license](https://img.shields.io/npm/l/%40tetherto%2Fwdk-wallet-ton?style=flat-square)](https://github.com/tetherto/wdk-wallet-ton/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-docs.wdk.tether.io-0A66C2?style=flat-square)](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-ton)

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.

A simple and secure package to manage BIP-44 wallets for the TON blockchain. This package provides a clean API for creating, managing, and interacting with TON wallets using BIP-39 seed phrases and TON-specific derivation paths.

## About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://docs.wdk.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control.

For detailed documentation about the complete WDK ecosystem, visit [docs.wdk.tether.io](https://docs.wdk.tether.io).

## Installation

```bash
npm install @tetherto/wdk-wallet-ton
```

## Quick Start

```javascript
import WalletManagerTon from '@tetherto/wdk-wallet-ton'

const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const wallet = new WalletManagerTon(seedPhrase, {
  tonClient: {
    url: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  },
  transferMaxFee: 1_000_000_000n,
})

const account = await wallet.getAccount(0)
const address = await account.getAddress()
console.log('Address:', address)

wallet.dispose()
```

## Key Capabilities

- **BIP-44 Derivation Paths**: Standard TON derivation support (`m/44'/607'`)
- **Multi-Account Management**: Derive multiple accounts from a single seed phrase
- **Native TON Transactions**: Quote and send TON transfers through a unified wallet API
- **Jetton Support**: Query balances and transfer Jettons
- **Message Signing**: Sign messages and verify signatures with TON accounts
- **Fee Estimation**: Retrieve current network fee rates and quote transaction costs
- **Read-Only Accounts**: Monitor TON wallets from public keys without private-key access
- **Secure Memory Disposal**: Clear private keys from memory when done

## Compatibility

- **TON Mainnet**
- **TON Testnet**
- **TON Center-compatible clients** for balance, transaction, and fee queries

## Documentation

| Topic | Description | Link |
|-------|-------------|------|
| Overview | Module overview and feature summary | [Wallet TON Overview](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-ton) |
| Usage | End-to-end integration walkthrough | [Wallet TON Usage](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-ton/usage) |
| Configuration | TON client and transfer configuration | [Wallet TON Configuration](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-ton/configuration) |
| API Reference | Complete class and type reference | [Wallet TON API Reference](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-ton/api-reference) |

## Examples

| Example | Description |
|---------|-------------|
| [Create Wallet](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/create-wallet.ts) | Initialize a wallet manager and derive TON accounts from a seed phrase |
| [Manage Accounts](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/manage-accounts.ts) | Work with multiple accounts and custom BIP-44 derivation paths |
| [Check Balances](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/check-balances.ts) | Query native TON and Jetton balances for owned accounts |
| [Read-Only Account](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/read-only-account.ts) | Monitor balances for any TON wallet without a private key |
| [Send Transaction](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/send-transaction.ts) | Estimate fees and send native TON transactions |
| [Token Transfer](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/token-transfer.ts) | Transfer Jettons and estimate transfer fees |
| [Sign & Verify Message](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/sign-verify-message.ts) | Sign messages and verify signatures |
| [Fee Management](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/fee-management.ts) | Retrieve current network fee rates |
| [Memory Management](https://github.com/tetherto/wdk-examples/blob/main/wallet-ton/memory-management.ts) | Securely dispose wallets and clear private keys from memory |

> For detailed walkthroughs, see the [Usage Guide](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-ton/usage).
> See all runnable examples in the [wdk-examples](https://github.com/tetherto/wdk-examples) repository.

## Community

Join the [WDK Discord](https://discord.gg/arYXDhHB2w) to connect with other developers.

## Support

For support, please [open an issue](https://github.com/tetherto/wdk-wallet-ton/issues) on GitHub or reach out via [email](mailto:wallet-info@tether.io).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
