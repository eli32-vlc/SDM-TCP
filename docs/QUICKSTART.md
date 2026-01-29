# Quick Start Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- For macOS builds: Xcode Command Line Tools
- For Android builds: Android Studio and JDK 17

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/eli32-vlc/SDM-TCP.git
cd SDM-TCP
```

### 2. Build Core Library

```bash
cd core
npm install
npm run build
cd ..
```

### 3. Build Desktop Application

```bash
cd macos
npm install
npm run build
cd ..
```

## Running the Application

### Development Mode

```bash
cd macos
npm run dev
```

This will start:
- Vite development server on port 5173
- Electron application window

### Production Build

```bash
cd macos
npm run build
npm run package:mac  # For macOS DMG
```

## Usage

### TX Mode (Transmitter)

1. **Launch the application**
2. **Select TX Mode** by clicking the "TX Mode (Transmit)" button
3. **Enter a password** for encryption (e.g., "mysecurepassword")
4. **Set SOCKS5 port** (default: 1080)
5. **Click "Start TX"**
6. **Configure your applications** to use SOCKS5 proxy:
   - Host: `localhost` or `127.0.0.1`
   - Port: `1080` (or your configured port)

#### Example: Configure Firefox
1. Open Settings → Network Settings
2. Select "Manual proxy configuration"
3. Set SOCKS Host: `127.0.0.1`, Port: `1080`
4. Select "SOCKS v5"
5. Click OK

### RX Mode (Receiver)

1. **Launch the application**
2. **Select RX Mode** by clicking the "RX Mode (Receive)" button
3. **Enter the same password** used by the transmitter
4. **Click "Start RX"**
5. **Allow microphone access** when prompted
6. The application will automatically:
   - Capture audio from the microphone
   - Decode FSK modulation
   - Decrypt packets with AES-256
   - Forward data to the network

## Testing

### Simple Test (Same Machine)

1. **Open two instances** of the application
2. **First instance**: Set to TX mode, start it
3. **Second instance**: Set to RX mode, start it
4. **Position speakers near microphone** or use audio routing software
5. **Configure browser** to use SOCKS5 proxy (localhost:1080)
6. **Browse the internet** - data will be transmitted via audio!

### Cross-Machine Test

1. **Machine A (TX)**: Run in TX mode
2. **Machine B (RX)**: Run in RX mode, place near Machine A
3. **Test audio link** by browsing from Machine A

## Features

### Encryption
- **AES-256-GCM** encryption
- Password-based key derivation (PBKDF2)
- Authenticated encryption with tamper detection

### Reliability
- **Automatic retransmission** on packet loss
- **ACK/NACK protocol** for acknowledgments
- **CRC32 checksums** for error detection
- **Sliding window** protocol (4 packets)

### VOIP Support
- **Compression** for better bandwidth utilization
- **Optimized for voice data**
- Trading speed for reliability

### Performance
- **Bit rate**: 1200 bps
- **Effective rate**: ~900 bps (with encryption)
- **Compressed rate**: 1800-9000 bps (with compression)

## Troubleshooting

### "Microphone access denied"
- Grant microphone permissions in system settings
- macOS: System Settings → Privacy & Security → Microphone

### "No audio detected"
- Check microphone is working
- Increase speaker volume
- Reduce ambient noise
- Check audio input device selection

### "Connection timeout"
- Verify both TX and RX use the same password
- Check audio path between devices
- Reduce distance or increase volume
- Check for interference

### "Build failed"
- Ensure Node.js 18+ is installed
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Build core library first: `cd core && npm run build`

## Advanced Configuration

### Custom Bit Rate

Edit `core/src/audio/fsk.ts` and modify:
```typescript
constructor(
  sampleRate: number = 48000,
  bitRate: number = 1200,  // Increase for higher speed
  ...
)
```

### Custom Frequencies

Modify FSK frequencies for different audio characteristics:
```typescript
freq0: number = 1200,  // Frequency for bit 0
freq1: number = 2400,  // Frequency for bit 1
```

### Enable VOIP Compression

In your application code:
```typescript
const compression = new Compression({ enableVoIP: true });
```

## CI/CD

GitHub Actions automatically builds the project on push:
- Core library compilation
- macOS application build
- Linting and security checks

See `.github/workflows/build.yml` for details.

## Security Notes

- **Never use weak passwords** - use strong, random passwords
- **Passwords are transmitted via audio** - ensure secure environment
- **Audio can be intercepted** - use in trusted environments
- **AES-256 is strong** but audio channel is vulnerable to recording

## License

MIT License - See LICENSE file for details.
