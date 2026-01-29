# Core Library

The core library provides the fundamental components for the Software Defined Modem:

## Components

### Crypto (`src/crypto/`)
- **encryption.ts**: AES-256-GCM encryption/decryption

### Protocol (`src/protocol/`)
- **packet.ts**: Packet structure and serialization
- **transport.ts**: Reliable transport with ACKs and retries
- **crc32.ts**: CRC32 checksum calculation

### Audio (`src/audio/`)
- **fsk.ts**: FSK modulation/demodulation for audio transmission

### SOCKS5 (`src/socks5/`)
- **proxy.ts**: SOCKS5 proxy server for TX mode

## Building

```bash
npm install
npm run build
```

## Usage

```typescript
import { FSKModulator, ReliableTransport, SOCKS5Proxy } from 'sdm-tcp-core';

// Initialize components
const modulator = new FSKModulator();
const transport = new ReliableTransport('password');
const proxy = new SOCKS5Proxy({ port: 1080 });

// Start proxy
await proxy.start();
```
