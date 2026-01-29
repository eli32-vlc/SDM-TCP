# macOS Application

Desktop application for SDM-TCP modem built with Electron and React with Material-UI.

## Features

- **TX Mode**: SOCKS5 proxy server that transmits data through audio
- **RX Mode**: Receives and decodes audio data
- **Material-UI**: Modern, responsive interface
- **Cross-platform**: Works on macOS, Linux, and Windows

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

1. Install core library dependencies:
```bash
cd ../core
npm install
npm run build
```

2. Install application dependencies:
```bash
cd ../macos
npm install
```

## Development

Run in development mode:
```bash
npm run dev
```

This starts both the Vite dev server (port 5173) and Electron.

## Building

Build for production:
```bash
npm run build
```

## Packaging

Create distributable packages:

```bash
# macOS DMG
npm run package:mac

# All platforms
npm run package
```

## Usage

### TX Mode (Transmit)
1. Select "TX Mode"
2. Enter encryption password
3. Set SOCKS5 port (default: 1080)
4. Click "Start TX"
5. Configure applications to use SOCKS5 proxy at `localhost:1080`

### RX Mode (Receive)
1. Select "RX Mode"
2. Enter encryption password (must match TX)
3. Click "Start RX"
4. Allow microphone access when prompted
5. Audio data will be automatically decoded and forwarded

## Architecture

```
macos/
├── src/
│   ├── electron/       # Electron main process
│   │   ├── main.ts     # Application entry
│   │   └── preload.ts  # IPC bridge
│   └── renderer/       # React UI
│       ├── App.tsx     # Main component
│       └── index.tsx   # React entry
├── public/             # Static assets
└── dist/               # Build output
```

## Technical Details

- **Sample Rate**: 48 kHz
- **Bit Rate**: 1200 bps
- **Modulation**: FSK (1200 Hz / 2400 Hz)
- **Encryption**: AES-256-GCM
- **Protocol**: Custom with CRC32 and retries
