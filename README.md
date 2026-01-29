# SDM-TCP - Software Defined Modem

[![Build Status](https://github.com/eli32-vlc/SDM-TCP/workflows/Build%20SDM-TCP/badge.svg)](https://github.com/eli32-vlc/SDM-TCP/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A cross-platform software-defined modem that transmits data over audio channels with support for Android and macOS.

## Features

- **AES-256 Encryption**: All data is encrypted before transmission
- **ACKs and Retries**: Reliable packet delivery with automatic retransmission
- **VOIP Support**: Optimized for voice with compression and reliability
- **SOCKS5 Proxy**: Long-lived proxy connections for TX mode
- **Cross-Platform**: Supports both Android and macOS (desktop version works on all platforms)
- **Material-UI**: Modern, responsive interface

## Quick Start

```bash
# Build core library
cd core && npm install && npm run build

# Build and run desktop app
cd ../macos && npm install && npm run dev
```

See [Quick Start Guide](docs/QUICKSTART.md) for detailed instructions.

### RX Mode (Receive)
- Captures audio through microphone
- Decodes and demodulates audio signal
- Handles packet errors with retry requests
- Decrypts packets and forwards data

### TX Mode (Transmit)
- Exposes SOCKS5 proxy server
- Encrypts and encodes data
- Modulates and transmits through speaker
- Maintains long-lived connections

## Project Structure

```
SDM-TCP/
├── core/           # Shared core library (protocol, crypto, encoding)
├── android/        # Android application
├── macos/          # macOS application
├── docs/           # Documentation
└── .github/        # CI/CD workflows
```

## Getting Started

### Prerequisites
- Node.js 18+ (for core library)
- Android Studio (for Android build)
- Xcode (for macOS build)

### Building

See platform-specific README files:
- [Core Library](core/README.md)
- [Android App](android/README.md)
- [macOS App](macos/README.md)

## Protocol Specification

The SDM-TCP protocol uses FSK (Frequency Shift Keying) modulation to transmit binary data over audio:

- **Carrier Frequencies**: 1200 Hz (0) and 2400 Hz (1)
- **Bit Rate**: 1200 bps
- **Packet Size**: 256 bytes
- **Error Detection**: CRC32
- **Encryption**: AES-256-GCM

## License

MIT License
