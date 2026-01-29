# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SDM-TCP System                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│   TX Mode (Sender)   │          │   RX Mode (Receiver) │
└──────────────────────┘          └──────────────────────┘
         │                                    │
         v                                    v
┌──────────────────┐              ┌──────────────────┐
│  SOCKS5 Proxy    │              │   Microphone     │
│  (Port 1080)     │              │   Audio Input    │
└──────────────────┘              └──────────────────┘
         │                                    │
         v                                    v
┌──────────────────┐              ┌──────────────────┐
│  Compression     │              │  FSK Demodulator │
│  (VOIP)          │              │  (Audio → Data)  │
└──────────────────┘              └──────────────────┘
         │                                    │
         v                                    v
┌──────────────────┐              ┌──────────────────┐
│  AES-256-GCM     │              │  Packet Parser   │
│  Encryption      │              │  (CRC Check)     │
└──────────────────┘              └──────────────────┘
         │                                    │
         v                                    v
┌──────────────────┐              ┌──────────────────┐
│  Protocol Layer  │◄────ACK──────┤  Protocol Layer  │
│  (Packets + ACK) │─────DATA────►│  (Send ACKs)     │
└──────────────────┘              └──────────────────┘
         │                                    │
         v                                    v
┌──────────────────┐              ┌──────────────────┐
│  FSK Modulator   │              │  AES-256-GCM     │
│  (Data → Audio)  │              │  Decryption      │
└──────────────────┘              └──────────────────┘
         │                                    │
         v                                    v
┌──────────────────┐              ┌──────────────────┐
│   Speaker        │              │  Decompression   │
│   Audio Output   │              │  (if enabled)    │
└──────────────────┘              └──────────────────┘
                                           │
                                           v
                                  ┌──────────────────┐
                                  │  Network Stack   │
                                  │  (Data Forward)  │
                                  └──────────────────┘
```

## Component Layers

### 1. Application Layer
- **SOCKS5 Proxy**: Accepts TCP connections from applications
- **Material-UI Interface**: User controls and monitoring

### 2. Compression Layer (Optional)
- **VOIP Mode**: Maximum compression for voice data
- **Algorithm**: DEFLATE (zlib level 9)
- **Ratio**: 2-10x depending on data type

### 3. Security Layer
- **Encryption**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Authentication**: GCM auth tags prevent tampering

### 4. Transport Layer
- **Reliable Delivery**: ACK/NACK protocol
- **Sliding Window**: 4 packets in flight
- **Retransmission**: Automatic on timeout or NACK
- **Error Detection**: CRC32 checksums

### 5. Data Link Layer
- **Packet Structure**: Type + SeqNum + Length + CRC + Data
- **Max Payload**: 246 bytes per packet
- **Fragmentation**: Automatic for large messages

### 6. Physical Layer
- **Modulation**: FSK (Frequency Shift Keying)
- **Frequencies**: 1200 Hz (bit 0), 2400 Hz (bit 1)
- **Bit Rate**: 1200 bps
- **Sample Rate**: 48 kHz
- **Medium**: Audio (speaker → microphone)

## Data Flow

### TX Mode (Transmit)

1. **Application** → SOCKS5 Proxy (TCP connection)
2. **Proxy** → Compression (optional, if VOIP mode)
3. **Compression** → Encryption (AES-256-GCM)
4. **Encryption** → Protocol Layer (fragmentation, sequencing)
5. **Protocol** → FSK Modulator (binary → audio frequencies)
6. **Modulator** → Speaker (audio output)

### RX Mode (Receive)

1. **Microphone** → Audio samples (48 kHz)
2. **Samples** → FSK Demodulator (audio → binary)
3. **Demodulator** → Protocol Layer (reassembly, CRC check)
4. **Protocol** → Send ACK/NACK via TX path
5. **Protocol** → Decryption (AES-256-GCM)
6. **Decryption** → Decompression (if enabled)
7. **Decompression** → Network Stack (forward to destination)

## Key Features

### Reliability Mechanisms

1. **Error Detection**
   - CRC32 checksums on all packets
   - GCM authentication tags
   - Invalid packets trigger NACK

2. **Automatic Recovery**
   - Timeout-based retransmission (2 seconds)
   - NACK-triggered immediate retransmission
   - Up to 5 retry attempts

3. **Flow Control**
   - Sliding window (4 packets)
   - Prevents buffer overflow
   - Maintains steady transmission rate

### Security Features

1. **Confidentiality**
   - AES-256 encryption
   - Random IVs for each packet
   - No key reuse

2. **Integrity**
   - GCM authentication tags
   - CRC32 for transport layer
   - Prevents tampering and bit errors

3. **Key Management**
   - Password-based key derivation
   - PBKDF2 with 100,000 iterations
   - Salt: 'sdm-tcp-salt' (fixed, for simplicity)

## Performance Characteristics

### Throughput

| Configuration | Bit Rate | Effective Rate |
|--------------|----------|----------------|
| Raw FSK | 1200 bps | 1200 bps |
| With Protocol | 1200 bps | ~1100 bps |
| With Encryption | 1200 bps | ~900 bps |
| With Compression | 1200 bps | 1800-9000 bps* |

*Depends on compression ratio (2-10x for typical data)

### Latency

| Component | Latency |
|-----------|---------|
| FSK Modulation | ~8 ms per packet |
| Audio Transmission | Instant (local) |
| Demodulation | ~8 ms |
| Encryption/Decryption | ~1 ms |
| Total (one-way) | ~20-50 ms |
| Round-trip (with ACK) | ~40-100 ms |

### Reliability

| Metric | Value |
|--------|-------|
| Max Retries | 5 |
| Timeout | 2 seconds |
| Success Rate | >99% (good audio quality) |
| Packet Loss Recovery | Automatic |

## Technology Stack

### Core Library (Node.js/TypeScript)
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Crypto**: Native Node.js crypto module
- **Compression**: zlib

### Desktop Application (Electron)
- **Framework**: Electron 28
- **UI**: React 18 + Material-UI 5
- **Build**: Vite + TypeScript
- **Audio**: Web Audio API

### Android Application (Future)
- **Framework**: React Native or Native Kotlin
- **Audio**: Android AudioRecord/AudioTrack APIs
- **UI**: React Native Paper or Material Design

## Deployment

### Desktop (macOS, Linux, Windows)
- **Package**: Electron Builder
- **Format**: DMG (macOS), AppImage/deb (Linux), exe (Windows)
- **Size**: ~100-150 MB (includes Electron runtime)

### Android (Future)
- **Package**: APK/AAB
- **Format**: Android application package
- **Size**: ~20-30 MB
- **Requirements**: Android 8.0+ (API level 26)

## Future Enhancements

1. **Adaptive Bit Rate**: Adjust based on channel quality
2. **Forward Error Correction**: Reed-Solomon or Turbo codes
3. **OFDM**: Multi-carrier for better resilience
4. **Automatic Gain Control**: Optimize audio levels
5. **Channel Estimation**: Real-time quality monitoring
6. **Multiple Channels**: Parallel transmission
7. **WebRTC Integration**: Browser-based operation
