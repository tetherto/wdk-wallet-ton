# @wdk/wallet-ton

A simple and secure package to manage BIP-32 wallets for TON blockchain. This package provides a clean API for creating, managing, and interacting with Ethereum-compatible wallets using BIP-39 seed phrases and BIP-44 derivation paths.

A simple and secure package to manage BIP-32 wallets for the TON blockchain. This package provides a clean API for creating, managing, and interacting with TON wallets using BIP-39 seed phrases and TON-specific derivation paths.

## About WDK

This module is part of the **WDK (Wallet Development Kit)** project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control. 

For detailed documentation about the complete WDK ecosystem, visit [docs.wallet.tether.io](https://docs.wallet.tether.io).

## Features

- **BIP-39 Seed Phrase Support**: Generate and validate BIP-39 mnemonic seed phrases
- **TON Derivation Paths**: Support for BIP-44 standard derivation paths for TON
- **Multi-Account Management**: Create and manage multiple accounts from a single seed phrase
- **TON Address Support:** Generate and manage TON addresses
- **Message Signing:** Sign and verify messages using TON cryptography
- **Transaction Management**: Send transactions and get fee estimates
- **Jetton Support:** Query native TON and Jetton token balances.
- **TypeScript Support**: Full TypeScript definitions included
- **Memory Safety**: Secure private key management with automatic memory cleanup
- **Provider Flexibility:** Support for custom TON RPC endpoints

## Installation

```bash
npm install @wdk/wallet-ton
```

## Quick Start

### Creating a New Wallet

```javascript
import WalletManagerTon from '@wdk/wallet-ton'

import WalletAccountTon from '@wdk/wallet-ton'


// Use a BIP-39 seed phrase (replace with your own secure phrase)
const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

// Create wallet manager with TON RPC provider
const wallet = new WalletManagerTon(seedPhrase, {
  tonClient: { url: 'https://toncenter.com/api/v2/jsonRPC' } // or any other TON RPC provider
})
```

### Managing Multiple Accounts

```javascript
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

```javascript
// Get native token balance (ETH, MATIC, BNB, etc.)
const balance = await account.getBalance()
console.log('Native TON balance:', balance, 'nanotons')

// Get Jetton token balance
const jettonAddress = 'EQC...'; // Jetton master contract address (TON format)
const jettonBalance = await account.getTokenBalance(jettonAddress);
console.log('Jetton token balance:', jettonBalance);
```

### Sending Transactions

```javascript
// Send native TON
const result = await account.sendTransaction({
  to: 'EQC...', // TON address, e.g., starts with EQ...
  value: 1000000000 // 1 TON in nanotons (1 TON = 1_000_000_000 nanotons)
})
console.log('Transaction hash:', result.hash)
console.log('Transaction fee:', result.fee, 'nanotons')


// Get transaction fee estimate
const quote = await account.quoteSendTransaction({
  to: 'EQC...',
  value: 1000000000
});
console.log('Estimated fee:', quote.fee, 'nanotons');
```

### Token Transfers

```javascript
// Transfer Jettons
const transferResult = await account.transfer({
  token: 'EQC...',      // Jetton master contract address
  recipient: 'EQC...',  // Recipient's TON address
  amount: 1000000000    // Amount in Jetton's base units
});
console.log('Transfer hash:', transferResult.hash);
console.log('Transfer fee:', transferResult.fee, 'nanotons');

// Quote token transfer
const transferQuote = await account.quoteTransfer({
  token: 'EQC...',      // Jetton master contract address
  recipient: 'EQC...',  // Recipient's TON address
  amount: 1000000000    // Amount in Jetton's base units 
})
console.log('Transfer fee estimate:', transferQuote.fee, 'nanotons')
```

### Message Signing and Verification

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

```javascript
// Get current fee rates
const feeRates = await wallet.getFeeRates();
console.log('Normal fee rate:', feeRates.normal, 'nanotons');
console.log('Fast fee rate:', feeRates.fast, 'nanotons');
```

### Memory Management

```javascript
// Dispose wallet accounts to clear private keys from memory
account.dispose()

// Dispose entire wallet manager
wallet.dispose()
```

## API Reference

### Table of Contents

| Class | Description | Methods |
|-------|-------------|---------|
| [WalletManagerTon](#walletmanagerton) | Main class for managing TON wallets | [Constructor](#constructor), [Methods](#methods), [Properties](#properties) |
| [WalletAccountTon](#walletaccountton) | Individual TON wallet account implementation | [Constructor](#constructor-1), [Methods](#methods), [Properties](#properties-1) |


### WalletManagerTon

The main class for managing TON wallets. Extends `AbstractWalletManager` from `@wdk/wallet`.

#### Constructor

```javascript
new WalletManagerTon(seed, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `config` (object, optional): Configuration object
  - `tonClient` (object, optional): TON client configuration
    - `url` (string): TON RPC endpoint URL (e.g., 'https://toncenter.com/api/v2/jsonRPC')
    - `secretKey` (string, optional): API key for the TON RPC endpoint, if required
  - `transferMaxFee` (number, optional): Maximum fee amount for transfer operations (in nanotons)

**Example:**
```javascript
const wallet = new WalletManagerTon(seedPhrase, {
  tonClient: { url: 'https://toncenter.com/api/v2/jsonRPC' },
  transferMaxFee: 10000000 // Maximum fee in nanotons (e.g., 0.01 TON)
})
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAccount(index)` | Returns a wallet account at the specified index | `Promise<WalletAccountTon>` |
| `getAccountByPath(path)` | Returns a wallet account at the specified BIP-44 derivation path | `Promise<WalletAccountTon>` |
| `getFeeRates()` | Returns current fee rates for normal and fast transactions | `Promise<{normal: number, fast: number}>` |
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
Returns current fee rates for normal and fast transactions.

**Returns:** `Promise<FeeRates>` - Object containing normal and fast fee rates

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

#### Properties

##### `seed`
The wallet's seed phrase.

**Type:** `string | Uint8Array`

**Example:**
```javascript
console.log('Seed phrase:', wallet.seed)
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
- `config` (object, optional): Configuration object
  - `tonClient` (object, optional): TON client configuration
    - `url` (string): TON RPC endpoint URL (e.g., 'https://toncenter.com/api/v2/jsonRPC')
    - `secretKey` (string, optional): API key for the TON RPC endpoint, if required
  - `transferMaxFee` (number, optional): Maximum fee amount for transfer operations (in nanotons)

**Example:**
```javascript
const account = new WalletAccountTon(seedPhrase, "0'/0/0", {
  tonClient: { url: 'https://toncenter.com/api/v2/jsonRPC' },
  transferMaxFee: 10000000 // Maximum fee in nanotons (e.g., 0.01 TON)
})
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| [`getAddress()`](#getaddress) | Returns the account's TON address | `Promise<string>` |
| [`sign(message)`](#signmessage) | Signs a message using the account's private key | `Promise<string>` |
| [`verify(message, signature)`](#verifymessage-signature) | Verifies a message signature | `Promise<boolean>` |
| [`sendTransaction(tx)`](#sendtransactiontx) | Sends a TON transaction and returns the result with hash and fee | `Promise<{hash: string, fee: number}>` |
| [`quoteSendTransaction(tx)`](#quotesendtransactiontx) | Estimates the fee for a TON transaction | `Promise<{fee: number}>` |
| [`transfer(options)`](#transferoptions) | Transfers Jettons (TON tokens) to another address | `Promise<{hash: string, fee: number}>` |
| [`quoteTransfer(options)`](#quotetransferoptions) | Estimates the fee for a Jetton transfer | `Promise<{fee: number}>` |
| [`getBalance()`](#getbalance) | Returns the native TON balance (in nanotons) | `Promise<number>` |
| [`getTokenBalance(tokenAddress)`](#gettokenbalancetokenaddress) | Returns the balance of a specific Jetton (TON token) | `Promise<number>` |
| [`dispose()`](#dispose-1) | Disposes the wallet account, clearing private keys from memory | `void` |

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
Sends a TON transaction and returns the result with hash and fee.

**Parameters:**
- `tx` (object): The transaction object
  - `to` (string): Recipient TON address (e.g., 'EQC...')
  - `value` (number): Amount in nanotons (1 TON = 1,000,000,000 nanotons)
  - `bounceable` (boolean, optional): Whether the address is bounceable (TON-specific, optional)


**Returns:** `Promise<{hash: string, fee: number}>` - Object containing hash and fee (in nanotons)

**Example:**
```javascript
const result = await account.sendTransaction({
  to: 'EQC...', // TON address
  value: 1000000000 // 1 TON in nanotons
});
console.log('Transaction hash:', result.hash);
console.log('Transaction fee:', result.fee, 'nanotons');
```

##### `quoteSendTransaction(tx)`
Estimates the fee for a transaction.

**Parameters:**
- `tx` (object): The transaction object (same as sendTransaction)
  - `to` (string): Recipient TON address (e.g., 'EQC...')
  - `value` (number): Amount in nanotons (1 TON = 1,000,000,000 nanotons)
  - `bounceable` (boolean, optional): Whether the address is bounceable (TON-specific, optional)

**Returns:** `Promise<{fee: number}>` - Object containing fee estimate (in nanotons)

**Example:**
```javascript
const quote = await account.quoteSendTransaction({
  to: 'EQC...', // TON address
  value: 1000000000 // 1 TON in nanotons
});
console.log('Estimated fee:', quote.fee, 'nanotons');
```

##### `transfer(options)`
Transfers Jettons (TON tokens) to another address.

**Parameters:**
- `options` (object): Transfer options
  - `token` (string): Jetton master contract address (TON format, e.g., 'EQC...')
  - `recipient` (string): Recipient TON address (e.g., 'EQC...')
  - `amount` (number): Amount in Jetton's base units

**Returns:** `Promise<{hash: string, fee: number}>` - Object containing hash and fee (in nanotons)

**Example:**
```javascript
const result = await account.transfer({
  token: 'EQC...',      // Jetton master contract address
  recipient: 'EQC...',  // Recipient's TON address
  amount: 1000000000    // Amount in Jetton's base units
});
console.log('Transfer hash:', result.hash);
console.log('Transfer fee:', result.fee, 'nanotons');
```

##### `quoteTransfer(options)`
Estimates the fee for a Jetton (TON token) transfer.

**Parameters:**
- `options` (object): Transfer options (same as transfer)
  - `token` (string): Jetton master contract address (TON format, e.g., 'EQC...')
  - `recipient` (string): Recipient TON address (e.g., 'EQC...')
  - `amount` (number): Amount in Jetton's base units

**Returns:** `Promise<{fee: number}>` - Object containing fee estimate (in nanotons)

**Example:**
```javascript
const quote = await account.quoteTransfer({
  token: 'EQC...',      // Jetton master contract address
  recipient: 'EQC...',  // Recipient's TON address
  amount: 1000000000    // Amount in Jetton's base units
});
console.log('Transfer fee estimate:', quote.fee, 'nanotons');
```

##### `getBalance()`
Returns the native TON balance (in nanotons).

**Returns:** `Promise<number>` - Balance in nanotons

**Example:**
```javascript
const balance = await account.getBalance();
console.log('Balance:', balance, 'nanotons');
```

##### `getTokenBalance(tokenAddress)`
Returns the balance of a specific Jetton (TON token).

**Parameters:**
- `tokenAddress` (string): The Jetton master contract address (TON format, e.g., 'EQC...')

**Returns:** `Promise<number>` - Token balance in base units 

**Example:**
```javascript
const tokenBalance = await account.getTokenBalance('EQC...');
console.log('Token balance:', tokenBalance, 'nanotons');
```

##### `dispose()`
Disposes the wallet account, clearing private keys from memory.

**Example:**
```javascript
account.dispose()
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | The derivation path's index of this account |
| `path` | `string` | The full derivation path of this account |
| `keyPair` | `{publicKey: Buffer, privateKey: Buffer}` | The account's public and private key pair as buffers |

**Example:**
```javascript
const { publicKey, privateKey } = account.keyPair
console.log('Public key length:', publicKey.length)
console.log('Private key length:', privateKey.length)
```

## Supported Networks

This package works with the TON blockchain (The Open Network), including:

- TON Mainnet
- TON Testnet

## Security Considerations

- **Seed Phrase Security**: Always store your seed phrase securely and never share it
- **Private Key Management**: The package handles private keys internally with memory safety features
- **Provider Security**: Use trusted RPC endpoints and consider using your own node for production applications
- **Transaction Validation**: Always validate transaction details before signing
- **Memory Cleanup**: Use the `dispose()` method to clear private keys from memory when done
- **Fee Limits**: Set `transferMaxFee` in config to prevent excessive transaction fees

## Examples

### Complete Wallet Setup

```javascript
import WalletManagerEvm from '@wdk/wallet-evm'

async function setupWallet() {
  // Use a BIP-39 seed phrase (replace with your own secure phrase)
  const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
  
  // Create wallet manager
  const wallet = new WalletManagerTon(seedPhrase, {
    tonClient: { url: 'https://toncenter.com/api/v2/jsonRPC' }
  })
  
  // Get first account
  const account = await wallet.getAccount(0)
  const address = await account.getAddress()
  console.log('Wallet address:', address)
  
  // Check balance
  const balance = await account.getBalance()
  console.log('Balance:', balance, 'nanotons')
  
  return { wallet, account, address, balance }
}
```

### Multi-Account Management

```javascript
async function manageMultipleAccounts(wallet) {
  const accounts = []
  
  // Create 5 accounts
  for (let i = 0; i < 5; i++) {
    const account = await wallet.getAccount(i)
    const address = await account.getAddress()
    const balance = await account.getBalance()
    
    accounts.push({
      index: i,
      address,
      balance
    })
  }
  
  return accounts
}
```

## Development

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

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For support, please open an issue on the GitHub repository.

---

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.