# @tetherto/wdk-wallet-ton

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.

A simple and secure package to manage BIP-44 wallets for the TON blockchain. This package provides a clean API for creating, managing, and interacting with TON wallets using BIP-39 seed phrases and TON-specific derivation paths.

## 🔍 About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://wallet.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control. 

For detailed documentation about the complete WDK ecosystem, visit [docs.wallet.tether.io](https://docs.wallet.tether.io).

## 🌟 Features

- **TON Derivation Paths**: Support for BIP-44 standard derivation paths for TON (m/44'/607')
- **Multi-Account Management**: Create and manage multiple accounts from a single seed phrase
- **Transaction Management**: Send transactions and get fee estimates
- **Jetton Support**: Query native TON and Jetton token balances using smart contract interactions
- **Message Signing**: Sign and verify messages using TON cryptography

## ⬇️ Installation

To install the `@tetherto/wdk-wallet-ton` package, follow these instructions:

You can install it using npm:

```bash
npm install @tetherto/wdk-wallet-ton
```

## 🚀 Quick Start

### Importing from `@tetherto/wdk-wallet-ton`

### Creating a New Wallet

```javascript
import WalletManagerTon, { WalletAccountTon, WalletAccountReadOnlyTon } from '@tetherto/wdk-wallet-ton'

// Use a BIP-39 seed phrase (replace with your own secure phrase)
const seedPhrase = 'test only example nut use this real life secret phrase must random'

// Create wallet manager with TON client config
const wallet = new WalletManagerTon(seedPhrase, {
  tonClient: {
    url: 'https://toncenter.com/api/v3',
    secretKey: 'your-api-key' // Optional
  },
  transferMaxFee: 1000000000 // Optional: Maximum fee in nanotons
})

// Get a full access account
const account = await wallet.getAccount(0)

// Convert to a read-only account
const readOnlyAccount = await account.toReadOnlyAccount()
```

### Managing Multiple Accounts

```javascript
import WalletManagerTon from '@tetherto/wdk-wallet-ton'

// Assume wallet is already created
// Get the first account (index 0)
const account = await wallet.getAccount(0)
const address = await account.getAddress()
console.log('Account 0 address:', address)

// Get the second account (index 1)
const account1 = await wallet.getAccount(1)
const address1 = await account1.getAddress()
console.log('Account 1 address:', address1)

// Get account by custom derivation path
// Full path will be m/44'/607'/0'/0/5
const customAccount = await wallet.getAccountByPath("0'/0/5")
const customAddress = await customAccount.getAddress()
console.log('Custom account address:', customAddress)

// Note: All addresses are TON addresses (EQ... or UQ...)
// All accounts inherit the provider configuration from the wallet manager
```

### Checking Balances

#### Owned Account

For accounts where you have the seed phrase and full access:

```javascript
import WalletManagerTon from '@tetherto/wdk-wallet-ton'

// Assume wallet and account are already created
// Get native TON balance (in nanotons)
const balance = await account.getBalance()
console.log('Native TON balance:', balance, 'nanotons') // 1 TON = 1000000000 nanotons

// Get Jetton token balance
const jettonContract = 'EQ...' // Jetton contract address
const jettonBalance = await account.getTokenBalance(jettonContract);
console.log('Jetton balance:', jettonBalance);

// Note: TON client is required for balance checks
// Make sure wallet was created with a tonClient configuration
```

#### Read-Only Account

For addresses where you don't have the seed phrase:

```javascript
import { WalletAccountReadOnlyTon } from '@tetherto/wdk-wallet-ton'

// Create a read-only account with public key
const publicKey = '...'; // Replace with the actual public key
const readOnlyAccount = new WalletAccountReadOnlyTon(publicKey, {
  tonClient: {
    url: 'https://toncenter.com/api/v3',
    secretKey: 'your-api-key' // Optional
  }
})

// Check native TON balance
const balance = await readOnlyAccount.getBalance()
console.log('Native balance:', balance, 'nanotons')

// Check Jetton token balance using contract
const jettonBalance = await readOnlyAccount.getTokenBalance('EQ...') // Example Jetton contract
console.log('Jetton balance:', jettonBalance)

// Note: Jetton balance checks use the standard Jetton wallet interface
// Make sure the contract address is correct and implements the Jetton standard
```

### Sending Transactions

Send TON and estimate fees using `WalletAccountTon`. Requires TON Center client configuration.

```javascript
// Send native TON
const result = await account.sendTransaction({
  to: 'EQ...', // Example TON address
  value: 1000000000n, // 1 TON in nanotons
  bounceable: true // Optional: specify if the address is bounceable
})
console.log('Transaction hash:', result.hash)
console.log('Transaction fee:', result.fee, 'nanotons')

// Get transaction fee estimate
const quote = await account.quoteSendTransaction({
  to: 'EQ...',
  value: 1000000000n,
  bounceable: true
});
console.log('Estimated fee:', quote.fee, 'nanotons');
```

### Token Transfers

Transfer Jetton tokens and estimate fees using `WalletAccountTon`. Uses standard Jetton transfer function.

```javascript
// Transfer Jetton tokens
const transferResult = await account.transfer({
  token: 'EQ...',      // Jetton contract address
  recipient: 'EQ...,  // Recipient's TON address
  amount: 1000000000n     // Amount in Jetton's base units (use BigInt for large numbers)
});
console.log('Transfer hash:', transferResult.hash);
console.log('Transfer fee:', transferResult.fee, 'nanotons');

// Quote token transfer fee
const transferQuote = await account.quoteTransfer({
  token: 'EQ...',      // Jetton contract address
  recipient: 'EQ...',  // Recipient's TON address
  amount: 1000000000n     // Amount in Jetton's base units
})
console.log('Transfer fee estimate:', transferQuote.fee, 'nanotons')
```

### Message Signing and Verification

Sign and verify messages using `WalletAccountTon`.

```javascript
// Sign a message
const message = 'Hello, TON!'
const signature = await account.sign(message)
console.log('Signature:', signature)

// Verify a signature
const isValid = await account.verify(message, signature)
console.log('Signature valid:', isValid)
```

### Fee Management

Retrieve current fee rates using `WalletManagerTon`.

```javascript
// Get current fee rates
const feeRates = await wallet.getFeeRates();
console.log('Normal fee rate:', feeRates.normal, 'nanotons');
console.log('Fast fee rate:', feeRates.fast, 'nanotons');
```

### Memory Management

Clear sensitive data from memory using `dispose` methods in `WalletAccountTon` and `WalletManagerTon`.

```javascript
// Dispose wallet accounts to clear private keys from memory
account.dispose()

// Dispose entire wallet manager
wallet.dispose()
```

## 📚 API Reference

### Table of Contents

| Class | Description | Methods |
|-------|-------------|---------|
| [WalletManagerTon](#walletmanagerton) | Main class for managing TON wallets. Extends `WalletManager` from `@tetherto/wdk-wallet`. | [Constructor](#constructor), [Methods](#methods) |
| [WalletAccountTon](#walletaccountton) | Individual TON wallet account implementation. Extends `WalletAccountReadOnlyTon` and implements `IWalletAccount` from `@tetherto/wdk-wallet`. | [Constructor](#constructor-1), [Methods](#methods-1), [Properties](#properties) |
| [WalletAccountReadOnlyTon](#walletaccountreadonlyton) | Read-only TON wallet account. Extends `WalletAccountReadOnly` from `@tetherto/wdk-wallet`. | [Constructor](#constructor-2), [Methods](#methods-2) |

### WalletManagerTon

The main class for managing TON wallets.  
Extends `WalletManager` from `@tetherto/wdk-wallet`.

#### Constructor

```javascript
new WalletManagerTon(seed, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `config` (object, optional): Configuration object
  - `tonClient` (object | TonClient): TON client configuration or instance
    - `url` (string): TON Center API URL (e.g., 'https://toncenter.com/api/v3')
    - `secretKey` (string, optional): API key for TON Center
  - `transferMaxFee` (number | bigint, optional): Maximum fee amount for transfer operations (in nanotons)

**Example:**
```javascript
const wallet = new WalletManagerTon(seedPhrase, {
  tonClient: {
    url: 'https://toncenter.com/api/v3',
    secretKey: 'your-api-key'
  },
  transferMaxFee: '1000000000' // Maximum fee in nanotons
})
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAccount(index)` | Returns a wallet account at the specified index | `Promise<WalletAccountTon>` |
| `getAccountByPath(path)` | Returns a wallet account at the specified BIP-44 derivation path | `Promise<WalletAccountTon>` |
| `getFeeRates()` | Returns current fee rates for transactions | `Promise<{normal: bigint, fast: bigint}>` |
| `dispose()` | Disposes all wallet accounts, clearing private keys from memory | `void` |

##### `getAccount(index)`
Returns a TON wallet account at the specified index using BIP-44 derivation path m/44'/607'.

**Parameters:**
- `index` (number, optional): The index of the account to get (default: 0)

**Returns:** `Promise<WalletAccountTon>` - The TON wallet account

**Example:**
```javascript
const account = await wallet.getAccount(0)
const address = await account.getAddress()
console.log('TON account address:', address)
```

##### `getAccountByPath(path)`
Returns a TON wallet account at the specified BIP-44 derivation path.

**Parameters:**
- `path` (string): The derivation path (e.g., "0'/0/0", "1'/0/5")

**Returns:** `Promise<WalletAccountTon>` - The TON wallet account

**Example:**
```javascript
const account = await wallet.getAccountByPath("0'/0/1")
const address = await account.getAddress()
console.log('Custom path address:', address)
```

##### `getFeeRates()`
Returns current fee rates for TON transactions from the network.

**Returns:** `Promise<{normal: bigint, fast: bigint}>` - Object containing fee rates in nanotons
- `normal`: Standard fee rate for normal confirmation speed
- `fast`: Higher fee rate for faster confirmation

**Example:**
```javascript
const feeRates = await wallet.getFeeRates()
console.log('Normal fee rate:', feeRates.normal, 'nanotons')
console.log('Fast fee rate:', feeRates.fast, 'nanotons')

// Use in transaction
const result = await account.sendTransaction({
  to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  value: 1000000000n // 1 TON in nanotons
})
```

##### `dispose()`
Disposes all TON wallet accounts and clears sensitive data from memory.

**Returns:** `void`

**Example:**
```javascript
wallet.dispose()
// All accounts and private keys are now securely wiped from memory
```

### WalletAccountTon

Represents an individual wallet account. Implements `IWalletAccount` from `@tetherto/wdk-wallet`.

#### Constructor

```javascript
new WalletAccountTon(seed, path, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `path` (string): BIP-44 derivation path (e.g., "0'/0/0")
- `config` (object, optional): Configuration object
  - `tonClient` (object | TonClient): TON client configuration or instance
    - `url` (string): TON Center API URL
    - `secretKey` (string, optional): API key for TON Center
  - `transferMaxFee` (number | bigint, optional): Maximum fee amount for transfer operations (in nanotons)

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAddress()` | Returns the account's TON address | `Promise<string>` |
| `sign(message)` | Signs a message using the account's private key | `Promise<string>` |
| `verify(message, signature)` | Verifies a message signature | `Promise<boolean>` |
| `sendTransaction(tx)` | Sends a TON transaction | `Promise<{hash: string, fee: bigint}>` |
| `quoteSendTransaction(tx)` | Estimates the fee for a TON transaction | `Promise<{fee: bigint}>` |
| `transfer(options)` | Transfers Jetton tokens to another address | `Promise<{hash: string, fee: bigint}>` |
| `quoteTransfer(options)` | Estimates the fee for a Jetton transfer | `Promise<{fee: bigint}>` |
| `getBalance()` | Returns the native TON balance (in nanotons) | `Promise<bigint>` |
| `getTokenBalance(tokenAddress)` | Returns the balance of a specific Jetton token | `Promise<bigint>` |
| `dispose()` | Disposes the wallet account, clearing private keys from memory | `void` |

##### `getAddress()`
Returns the account's TON address.

**Returns:** `Promise<string>` - The TON address

**Example:**
```javascript
const address = await account.getAddress()
console.log('TON address:', address) // EQBvW8Z5...
```

##### `sign(message)`
Signs a message using the account's private key.

**Parameters:**
- `message` (string): Message to sign

**Returns:** `Promise<string>` - Signature as hex string

**Example:**
```javascript
const signature = await account.sign('Hello TON!')
console.log('Signature:', signature)
```

##### `verify(message, signature)`
Verifies a message signature using the account's public key.

**Parameters:**
- `message` (string): Original message
- `signature` (string): Signature as hex string

**Returns:** `Promise<boolean>` - True if signature is valid

**Example:**
```javascript
const isValid = await account.verify('Hello TON!', signature)
console.log('Signature valid:', isValid)
```

##### `sendTransaction(tx)`
Sends a TON transaction and broadcasts it to the network.

**Parameters:**
- `tx` (object): The transaction object
  - `to` (string): Recipient TON address (e.g., 'EQ...')
  - `value` (number | bigint): Amount in nanotons
  - `bounceable` (boolean, optional): Whether the destination address is bounceable

**Returns:** `Promise<{hash: string, fee: bigint}>` - Object containing hash and fee (in nanotons)

**Example:**
```javascript
const result = await account.sendTransaction({
  to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  value: 1000000000n, // 1 TON in nanotons
  bounceable: true
})
console.log('Transaction hash:', result.hash)
console.log('Fee paid:', result.fee, 'nanotons')
```

##### `quoteSendTransaction(tx)`
Estimates the fee for a TON transaction without broadcasting it.

**Parameters:**
- `tx` (object): Same as sendTransaction parameters
  - `to` (string): Recipient TON address
  - `value` (number | bigint): Amount in nanotons
  - `bounceable` (boolean, optional): Whether the destination address is bounceable

**Returns:** `Promise<{fee: bigint}>` - Object containing estimated fee (in nanotons)

**Example:**
```javascript
const quote = await account.quoteSendTransaction({
  to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  value: 1000000000n // 1 TON in nanotons
})
console.log('Estimated fee:', quote.fee, 'nanotons')
console.log('Estimated fee in TON:', Number(quote.fee) / 1e9)
```

##### `transfer(options)`
Transfers Jetton tokens to another address and broadcasts the transaction.

**Parameters:**
- `options` (object): Transfer options
  - `to` (string): Recipient TON address
  - `tokenAddress` (string): Jetton master contract address
  - `value` (number | bigint): Amount in Jetton's smallest unit
  - `bounceable` (boolean, optional): Whether the destination address is bounceable

**Returns:** `Promise<{hash: string, fee: bigint}>` - Object containing hash and fee (in nanotons)

**Example:**
```javascript
const result = await account.transfer({
  to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  tokenAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', // USDT Jetton
  value: 1000000n, // 1 USDT (6 decimals)
  bounceable: true
})
console.log('Transfer hash:', result.hash)
console.log('Gas fee:', result.fee, 'nanotons')
```

##### `quoteTransfer(options)`
Estimates the fee for a Jetton token transfer without broadcasting it.

**Parameters:**
- `options` (object): Same as transfer parameters
  - `to` (string): Recipient TON address
  - `tokenAddress` (string): Jetton master contract address
  - `value` (number | bigint): Amount in Jetton's smallest unit
  - `bounceable` (boolean, optional): Whether the destination address is bounceable

**Returns:** `Promise<{fee: bigint}>` - Object containing estimated fee (in nanotons)

**Example:**
```javascript
const quote = await account.quoteTransfer({
  to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  tokenAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', // USDT Jetton
  value: 1000000n // 1 USDT (6 decimals)
})
console.log('Estimated transfer fee:', quote.fee, 'nanotons')
```

##### `getBalance()`
Returns the account's native TON balance in nanotons.

**Returns:** `Promise<bigint>` - Balance in nanotons

**Example:**
```javascript
const balance = await account.getBalance()
console.log('TON balance:', balance, 'nanotons')
console.log('Balance in TON:', Number(balance) / 1e9)
```

##### `getTokenBalance(tokenAddress)`
Returns the balance of a specific Jetton token.

**Parameters:**
- `tokenAddress` (string): The Jetton master contract address

**Returns:** `Promise<bigint>` - Token balance in Jetton's smallest unit

**Example:**
```javascript
// Get USDT Jetton balance (6 decimals)
const usdtBalance = await account.getTokenBalance('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs')
console.log('USDT balance:', Number(usdtBalance) / 1e6)
```

##### `dispose()`
Disposes the wallet account, securely erasing the private key from memory.

**Returns:** `void`

**Example:**
```javascript
account.dispose()
// Private key is now securely wiped from memory
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | The derivation path's index of this account |
| `path` | `string` | The full derivation path of this account |
| `keyPair` | `object` | The account's key pair (⚠️ Contains sensitive data) |

⚠️ **Security Note**: The `keyPair` property contains sensitive cryptographic material. Never log, display, or expose the private key.

### WalletAccountReadOnlyTon

Represents a read-only wallet account.

#### Constructor

```javascript
new WalletAccountReadOnlyTon(publicKey, config)
```

**Parameters:**
- `publicKey` (string | Uint8Array): The account's public key
- `config` (object, optional): Configuration object
  - `tonClient` (object | TonClient): TON client configuration or instance
    - `url` (string): TON Center API URL
    - `secretKey` (string, optional): API key for TON Center

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getBalance()` | Returns the native TON balance (in nanotons) | `Promise<bigint>` |
| `getTokenBalance(tokenAddress)` | Returns the balance of a specific Jetton token | `Promise<bigint>` |
| `quoteSendTransaction(tx)` | Estimates the fee for a TON transaction | `Promise<{fee: bigint}>` |
| `quoteTransfer(options)` | Estimates the fee for a Jetton transfer | `Promise<{fee: bigint}>` |

##### `getBalance()`
Returns the account's native TON balance in nanotons.

**Returns:** `Promise<bigint>` - Balance in nanotons

**Example:**
```javascript
const balance = await readOnlyAccount.getBalance()
console.log('TON balance:', balance, 'nanotons')
console.log('Balance in TON:', Number(balance) / 1e9)
```

##### `getTokenBalance(tokenAddress)`
Returns the balance of a specific Jetton token.

**Parameters:**
- `tokenAddress` (string): The Jetton master contract address

**Returns:** `Promise<bigint>` - Token balance in Jetton's smallest unit

**Example:**
```javascript
// Get USDT Jetton balance (6 decimals)
const usdtBalance = await readOnlyAccount.getTokenBalance('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs')
console.log('USDT balance:', Number(usdtBalance) / 1e6)
```

##### `quoteSendTransaction(tx)`
Estimates the fee for a TON transaction without broadcasting it.

**Parameters:**
- `tx` (object): The transaction object
  - `to` (string): Recipient TON address (e.g., 'EQ...')
  - `value` (number | bigint): Amount in nanotons
  - `bounceable` (boolean, optional): Whether the destination address is bounceable

**Returns:** `Promise<{fee: bigint}>` - Object containing estimated fee (in nanotons)

**Example:**
```javascript
const quote = await readOnlyAccount.quoteSendTransaction({
  to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  value: 1000000000n, // 1 TON in nanotons
  bounceable: true
})
console.log('Estimated fee:', quote.fee, 'nanotons')
console.log('Estimated fee in TON:', Number(quote.fee) / 1e9)
```

##### `quoteTransfer(options)`
Estimates the fee for a Jetton token transfer without broadcasting it.

**Parameters:**
- `options` (object): Transfer options
  - `to` (string): Recipient TON address
  - `tokenAddress` (string): Jetton master contract address
  - `value` (number | bigint): Amount in Jetton's smallest unit
  - `bounceable` (boolean, optional): Whether the destination address is bounceable

**Returns:** `Promise<{fee: bigint}>` - Object containing estimated fee (in nanotons)

**Example:**
```javascript
const quote = await readOnlyAccount.quoteTransfer({
  to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  tokenAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', // USDT Jetton
  value: 1000000n, // 1 USDT (6 decimals)
  bounceable: true
})
console.log('Estimated transfer fee:', quote.fee, 'nanotons')
console.log('Estimated fee in TON:', Number(quote.fee) / 1e9)
```

## 🌐 Supported Networks

This package works with the TON blockchain, including:

- **TON Mainnet**
- **TON Testnet**

## 🔒 Security Considerations

- **Seed Phrase Security**: Always store your seed phrase securely and never share it
- **Private Key Management**: The package handles private keys internally with memory safety features
- **Provider Security**: Use trusted TON Center endpoints and consider running your own node for production
- **Transaction Validation**: Always validate transaction details before signing
- **Memory Cleanup**: Use the `dispose()` method to clear private keys from memory when done
- **Fee Limits**: Set `transferMaxFee` in config to prevent excessive transaction fees
- **Address Validation**: Be careful with bounceable vs non-bounceable addresses
- **Gas Estimation**: Always estimate gas before sending transactions
- **Contract Interactions**: Verify Jetton contract addresses before transfers

## 🛠️ Development

### Building

```bash
# Install dependencies
npm install

# Build TypeScript definitions
npm run build:types

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🆘 Support

For support, please open an issue on the GitHub repository.

---
