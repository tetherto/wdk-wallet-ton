# @wdk/wallet-management-ton

A TON wallet management service that provides functionality for creating, restoring, and managing TON wallets using mnemonic phrases and key pairs.

## Features

- Create new wallets with mnemonic phrases
- Restore wallets from mnemonic phrases
- Validate mnemonic phrases
- Generate new mnemonic phrases
- Get wallet details with key pairs
- Create key pairs from seeds or secret keys
- Sign and verify data
- Manage multiple accounts using seeds

## Installation

```bash
npm install @wdk/wallet-management-ton
```

## Usage

```typescript
import { WDKWalletManagementTON } from '@wdk/wallet-management-ton';

const walletService = new WDKWalletManagementTON();

// Create a new wallet
const { mnemonic, keyPair } = await walletService.createWallet();

// Restore wallet from mnemonic
const restoredKeyPair = await walletService.restoreWalletFromPhrase(mnemonic);

// Validate mnemonic
const isValid = await walletService.validateMnemonic(mnemonic);

// Generate new mnemonic
const newMnemonic = await walletService.generateMnemonic(24);

// Get wallet details with default seed
const walletDetails = await walletService.getWalletDetails(mnemonic);

// Get wallet details with custom seed
const customSeed = walletService.getSeed(1); // For account index 1
const walletDetails2 = await walletService.getWalletDetails(mnemonic, customSeed);

// Create key pair from seed
const seed = Buffer.alloc(32); // 32-byte seed
const keyPair = await walletService.createKeyPairFromSeed(seed);

// Sign data
const signature = await walletService.signData(data, secretKey);

// Verify signature
const isValid = await walletService.verifySignature(data, signature, publicKey);

// Sign and verify in one operation
const { signature, isValid } = await walletService.signAndVerify(data, keyPair);
```

## API Reference

### `createWallet()`
Creates a new random wallet with mnemonic phrase.

### `restoreWalletFromPhrase(mnemonicPhrase: string[])`
Restores a wallet from a mnemonic phrase.

### `validateMnemonic(mnemonicPhrase: string[])`
Validates a mnemonic phrase.

### `generateMnemonic(wordCount?: number)`
Creates a new mnemonic phrase.

### `normalizeMnemonic(src: string[])`
Normalizes a mnemonic phrase by converting to lowercase and trimming.

### `getWalletDetails(mnemonicPhrase: string[], seed?: string)`
Gets wallet details from a mnemonic phrase, optionally using a custom seed.

### `getSeed(accountIndex: number)`
Generates a TON seed for a given account index.

### `createKeyPairFromSeed(seed: Buffer)`
Creates a key pair from a seed.

### `createKeyPairFromSecretKey(secretKey: Buffer)`
Creates a key pair from a secret key.

### `signData(data: Buffer, secretKey: Buffer)`
Signs data using a key pair's secret key.

### `verifySignature(data: Buffer, signature: Buffer, publicKey: Buffer)`
Verifies a signature for given data.

### `signAndVerify(data: Buffer, keyPair: KeyPair)`
Signs and verifies data using a key pair.

## License

MIT 