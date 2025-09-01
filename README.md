# @wdk/wallet-ton

A simple and secure package to manage BIP-44 wallets for the TON blockchain. This package provides a clean API for creating, managing, and interacting with TON wallets using BIP-39 seed phrases and TON-specific derivation paths.

## 🔍 About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://wallet.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control. 

For detailed documentation about the complete WDK ecosystem, visit [docs.wallet.tether.io](https://docs.wallet.tether.io).

## 🌟 Features

- **BIP-39 Seed Phrase Support**: Generate and validate BIP-39 mnemonic seed phrases
- **TON Derivation Paths**: Support for BIP-44 standard derivation paths for TON (m/44'/607')
- **Multi-Account Management**: Create and manage multiple accounts from a single seed phrase
- **TON Address Support**: Generate and manage TON addresses using V5R1 wallet contracts
- **Message Signing**: Sign and verify messages using TON cryptography
- **Transaction Management**: Send transactions and get fee estimates
- **Jetton Support**: Query native TON and Jetton token balances
- **TypeScript Support**: Full TypeScript definitions included
- **Memory Safety**: Secure private key management with automatic memory cleanup using sodium-universal
- **Provider Flexibility**: Support for custom TON RPC endpoints and TON Center API

## ⬇️ Installation

To install the `@wdk/wallet-ton` package, follow these instructions:

### Public Release

Once the package is publicly available, you can install it using npm:

```bash
npm install @wdk/wallet-ton
```

### Private Access

If you have access to the private repository, install the package from the develop branch on GitHub:

```bash
npm install git+https://github.com/tetherto/wdk-wallet-ton.git#develop
```
After installation, ensure your package.json includes the dependency correctly:

```json
"dependencies": {
  // ... other dependencies ...
  "@wdk/wallet-ton": "git+ssh://git@github.com:tetherto/wdk-wallet-ton.git#develop"
  // ... other dependencies ...
}
```

## 🚀 Quick Start

### Importing from `@wdk/wallet-ton`

1. WalletManagerTon: Main class for managing wallets
2. WalletAccountTon: Use this for full access accounts
3. WalletAccountReadOnlyTon: Use this for read-only accounts

### Creating a New Wallet

```javascript
import WalletManagerTon, { WalletAccountTon, WalletAccountReadOnlyTon } from '@wdk/wallet-ton'

// Use a BIP-39 seed phrase (replace with your own secure phrase)
const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

// Create wallet manager with TON client config
const wallet = new WalletManagerTon(seedPhrase, {
  tonClient: {
    url: 'https://toncenter.com/api/v3',
    secretKey: 'your-api-key' // Optional
  }
})

// Get a full access account
const account = await wallet.getAccount(0)

// Convert to a read-only account
const readOnlyAccount = await account.toReadOnlyAccount()
```

### Managing Multiple Accounts

```javascript
import WalletManagerTon from '@wdk/wallet-ton'

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
const customAccount = await wallet.getAccountByPath("0'/0/5")
const customAddress = await customAccount.getAddress()
console.log('Custom account address:', customAddress)
```

### Checking Balances

#### Owned Account

For accounts where you have the seed phrase and full access:

```javascript
import WalletManagerTon from '@wdk/wallet-ton'

// Assume wallet and account are already created
// Get native TON balance (in nanotons)
const balance = await account.getBalance()
console.log('Native TON balance:', balance, 'nanotons')

// Get Jetton token balance
const jettonAddress = 'EQ...'; // Jetton contract address
const jettonBalance = await account.getTokenBalance(jettonAddress);
console.log('Jetton token balance:', jettonBalance);
```

#### Read-Only Account

For addresses where you don't have the seed phrase:

```javascript
import { WalletAccountReadOnlyTon } from '@wdk/wallet-ton'

// Use the public key directly
const publicKey = '...'; // Replace with the actual public key

// Create a read-only account
const readOnlyAccount = new WalletAccountReadOnlyTon(publicKey, {
  tonClient: {
    url: 'https://toncenter.com/api/v3',
    secretKey: 'your-api-key' // Optional
  }
})

// Check the balance
const balance = await readOnlyAccount.getBalance()
console.log('Read-only account balance:', balance)
```

### Sending Transactions

Send TON and estimate fees using `WalletAccountTon`. Requires TON Center client configuration.

```javascript
// Send native TON
const result = await account.sendTransaction({
  to: 'EQ...', // TON address
  value: 1000000000, // 1 TON in nanotons
  bounceable: true // Optional: specify if the address is bounceable
})
console.log('Transaction hash:', result.hash)
console.log('Transaction fee:', result.fee, 'nanotons')

// Get transaction fee estimate
const quote = await account.quoteSendTransaction({
  to: 'EQ...',
  value: 1000000000,
  bounceable: true
});
console.log('Estimated fee:', quote.fee, 'nanotons');
```

### Token Transfers

Transfer Jetton tokens and estimate fees using `WalletAccountTon`. Requires TON Center client configuration.

```javascript
// Transfer Jetton tokens
const transferResult = await account.transfer({
  token: 'EQ...',      // Jetton contract address
  recipient: 'EQ...',  // Recipient's TON address
  amount: 1000000      // Amount in Jetton's base units
});
console.log('Transfer hash:', transferResult.hash);
console.log('Transfer fee:', transferResult.fee, 'nanotons');

// Quote token transfer
const transferQuote = await account.quoteTransfer({
  token: 'EQ...',      // Jetton contract address
  recipient: 'EQ...',  // Recipient's TON address
  amount: 1000000      // Amount in Jetton's base units 
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
| [WalletManagerTon](#walletmanagerton) | Main class for managing TON wallets | [Constructor](#constructor), [Methods](#methods) |
| [WalletAccountTon](#walletaccountton) | Individual TON wallet account implementation | [Constructor](#constructor-1), [Methods](#methods-1), [Properties](#properties) |
| [WalletAccountReadOnlyTon](#walletaccountreadonlyton) | Read-only TON wallet account | [Constructor](#constructor-2), [Methods](#methods-2) |

### WalletManagerTon

The main class for managing TON wallets.  
Extends `WalletManager` from `@wdk/wallet`.

#### Constructor

```javascript
new WalletManagerTon(seed, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `config` (object): Configuration object
  - `tonClient` (object | TonClient): TON client configuration or instance
    - `url` (string): TON Center API URL (e.g., 'https://toncenter.com/api/v3')
    - `secretKey` (string, optional): API key for TON Center
  - `transferMaxFee` (number, optional): Maximum fee amount for transfer operations (in nanotons)

**Example:**
```javascript
const wallet = new WalletManagerTon(seedPhrase, {
  tonClient: {
    url: 'https://toncenter.com/api/v3',
    secretKey: 'your-api-key'
  },
  transferMaxFee: 1000000000 // Maximum fee in nanotons
})
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAccount(index)` | Returns a wallet account at the specified index | `Promise<WalletAccountTon>` |
| `getAccountByPath(path)` | Returns a wallet account at the specified BIP-44 derivation path | `Promise<WalletAccountTon>` |
| `getFeeRates()` | Returns current fee rates for transactions | `Promise<{normal: number, fast: number}>` |
| `dispose()` | Disposes all wallet accounts, clearing private keys from memory | `void` |

##### `getAccount(index)`
Returns a wallet account at the specified index.

**Parameters:**
- `index` (number, optional): The index of the account to get (default: 0)

**Returns:** `Promise<WalletAccountTon>` - The wallet account

**Example:**
```javascript
const account = await wallet.getAccount(0)
```

##### `getAccountByPath(path)`
Returns a wallet account at the specified BIP-44 derivation path.

**Parameters:**
- `path` (string): The derivation path (e.g., "0'/0/0")

**Returns:** `Promise<WalletAccountTon>` - The wallet account

**Example:**
```javascript
const account = await wallet.getAccountByPath("0'/0/1")
```

##### `getFeeRates()`
Returns current fee rates for transactions based on blockchain config.

**Returns:** `Promise<FeeRates>` - Object containing normal and fast fee rates (in nanotons)

**Example:**
```javascript
const feeRates = await wallet.getFeeRates()
console.log('Normal fee rate:', feeRates.normal, 'nanotons')
console.log('Fast fee rate:', feeRates.fast, 'nanotons')
```

##### `dispose()`
Disposes all wallet accounts, clearing private keys from memory.

**Example:**
```javascript
wallet.dispose()
```

### WalletAccountTon

Represents an individual wallet account. Implements `IWalletAccount` from `@wdk/wallet`.

#### Constructor

```javascript
new WalletAccountTon(seed, path, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `path` (string): BIP-44 derivation path (e.g., "0'/0/0")
- `config` (object): Configuration object
  - `tonClient` (object | TonClient): TON client configuration or instance
    - `url` (string): TON Center API URL
    - `secretKey` (string, optional): API key for TON Center
  - `transferMaxFee` (number, optional): Maximum fee amount for transfer operations

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAddress()` | Returns the account's TON address | `Promise<string>` |
| `sign(message)` | Signs a message using the account's private key | `Promise<string>` |
| `verify(message, signature)` | Verifies a message signature | `Promise<boolean>` |
| `sendTransaction(tx)` | Sends a TON transaction | `Promise<{hash: string, fee: number}>` |
| `quoteSendTransaction(tx)` | Estimates the fee for a TON transaction | `Promise<{fee: number}>` |
| `transfer(options)` | Transfers Jetton tokens to another address | `Promise<{hash: string, fee: number}>` |
| `quoteTransfer(options)` | Estimates the fee for a Jetton transfer | `Promise<{fee: number}>` |
| `getBalance()` | Returns the native TON balance (in nanotons) | `Promise<number>` |
| `getTokenBalance(tokenAddress)` | Returns the balance of a specific Jetton token | `Promise<number>` |
| `dispose()` | Disposes the wallet account, clearing private keys from memory | `void` |

##### `getAddress()`
Returns the account's address.

**Returns:** `Promise<string>` - The account's TON address

**Example:**
```javascript
const address = await account.getAddress()
console.log('Account address:', address)
```

##### `sign(message)`
Signs a message using the account's private key.

**Parameters:**
- `message` (string): The message to sign

**Returns:** `Promise<string>` - The message signature

**Example:**
```javascript
const signature = await account.sign('Hello, World!')
console.log('Signature:', signature)
```

##### `verify(message, signature)`
Verifies a message signature.

**Parameters:**
- `message` (string): The original message
- `signature` (string): The signature to verify

**Returns:** `Promise<boolean>` - True if the signature is valid

**Example:**
```javascript
const isValid = await account.verify('Hello, World!', signature)
console.log('Signature valid:', isValid)
```

##### `sendTransaction(tx)`
Sends a TON transaction.

**Parameters:**
- `tx` (object): The transaction object
  - `to` (string): Recipient TON address (e.g., 'EQ...')
  - `value` (number): Amount in nanotons
  - `bounceable` (boolean, optional): Whether the destination address is bounceable

**Returns:** `Promise<{hash: string, fee: number}>` - Object containing hash and fee (in nanotons)

**Example:**
```javascript
const result = await account.sendTransaction({
  to: 'EQ...', // TON address
  value: 1000000000, // 1 TON in nanotons
  bounceable: true
});
console.log('Transaction hash:', result.hash);
console.log('Transaction fee:', result.fee, 'nanotons');
```

##### `transfer(options)`
Transfers Jetton tokens to another address.

**Parameters:**
- `options` (object): Transfer options
  - `token` (string): Jetton contract address (e.g., 'EQ...')
  - `recipient` (string): Recipient TON address (e.g., 'EQ...')
  - `amount` (number): Amount in Jetton's base units

**Returns:** `Promise<{hash: string, fee: number}>` - Object containing hash and fee (in nanotons)

**Example:**
```javascript
const result = await account.transfer({
  token: 'EQ...',      // Jetton contract address
  recipient: 'EQ...',  // Recipient's TON address
  amount: 1000000      // Amount in Jetton's base units
});
console.log('Transfer hash:', result.hash);
console.log('Transfer fee:', result.fee, 'nanotons');
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
- `config` (object): Configuration object
  - `tonClient` (object | TonClient): TON client configuration or instance
    - `url` (string): TON Center API URL
    - `secretKey` (string, optional): API key for TON Center

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getBalance()` | Returns the native TON balance (in nanotons) | `Promise<number>` |
| `getTokenBalance(tokenAddress)` | Returns the balance of a specific Jetton token | `Promise<number>` |
| `quoteSendTransaction(tx)` | Estimates the fee for a TON transaction | `Promise<{fee: number}>` |
| `quoteTransfer(options)` | Estimates the fee for a Jetton transfer | `Promise<{fee: number}>` |

## 🌐 Supported Networks

This package works with the TON blockchain, including:

- **TON Mainnet**
- **TON Testnet**

## 🔒 Security Considerations

- **Seed Phrase Security**: Always store your seed phrase securely and never share it
- **Private Key Management**: The package handles private keys internally with memory safety features using sodium-universal
- **Provider Security**: Use trusted TON Center endpoints and consider using your own node for production applications
- **Transaction Validation**: Always validate transaction details before signing
- **Memory Cleanup**: Use the `dispose()` method to clear private keys from memory when done
- **Fee Limits**: Set `transferMaxFee` in config to prevent excessive transaction fees
- **Address Validation**: Be careful with bounceable vs non-bounceable addresses

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

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.
