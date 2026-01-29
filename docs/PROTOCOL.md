# Protocol Specification

## Overview

SDM-TCP uses audio-based FSK (Frequency Shift Keying) modulation to transmit data reliably over acoustic channels.

## Physical Layer

### FSK Modulation

- **Bit 0**: 1200 Hz carrier frequency
- **Bit 1**: 2400 Hz carrier frequency
- **Sample Rate**: 48 kHz
- **Bit Rate**: 1200 bps (bits per second)
- **Samples per bit**: 40

### Preamble

Each transmission begins with a 16-bit alternating pattern (1010...) for synchronization.

## Data Link Layer

### Packet Structure

```
+--------+--------+--------+----------+--------+
| Type   | SeqNum | Length | Checksum | Data   |
| 1 byte | 4 bytes| 2 bytes| 4 bytes  | 0-246  |
+--------+--------+--------+----------+--------+
```

- **Type**: Packet type (DATA, ACK, NACK, SYN, FIN)
- **SeqNum**: Sequence number (32-bit unsigned)
- **Length**: Data length in bytes
- **Checksum**: CRC32 checksum
- **Data**: Payload (max 246 bytes)

### Packet Types

- `DATA (0x01)`: Data packet
- `ACK (0x02)`: Acknowledgment
- `NACK (0x03)`: Negative acknowledgment (request retransmission)
- `SYN (0x04)`: Synchronization/handshake
- `FIN (0x05)`: Connection termination

## Transport Layer

### Reliable Delivery

1. **Sliding Window**: Up to 4 packets in flight
2. **Timeout**: 2 seconds per packet
3. **Max Retries**: 5 attempts
4. **ACK/NACK**: Explicit acknowledgments

### Retransmission

- Automatic retransmission on timeout
- Immediate retransmission on NACK
- Exponential backoff (optional)

## Security Layer

### Encryption

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations, SHA-256)
- **IV**: Random 96-bit (12 bytes)
- **Auth Tag**: 128-bit (16 bytes)

### Encrypted Packet Format

```
+--------+----------+---------------+
| IV     | AuthTag  | Encrypted Data|
| 12 byte| 16 bytes | Variable      |
+--------+----------+---------------+
```

## Compression

### VOIP Mode

When enabled:
- **Algorithm**: DEFLATE (zlib)
- **Level**: Maximum (9)
- **Purpose**: Reduce bandwidth for voice data

### Trade-offs

- Higher compression = More processing time
- Better for slow bitrate channels
- Critical for VOIP where latency tolerance is higher

## Performance Characteristics

### Theoretical Throughput

- **Raw bit rate**: 1200 bps
- **Packet overhead**: 10 bytes
- **Max payload**: 246 bytes
- **Effective rate**: ~1100 bps (with overhead)

### With Encryption

- **IV + Auth Tag**: 28 bytes overhead
- **Effective rate**: ~900 bps

### With Compression (VOIP)

- **Compression ratio**: 2-10x (varies with data)
- **Effective rate**: 1800-9000 bps (compressed)

## Error Handling

### Detection

- CRC32 checksum for data integrity
- GCM authentication for tampering detection

### Recovery

1. Request retransmission (NACK)
2. Automatic timeout and retry
3. Connection reset after max retries

## Future Improvements

- Adaptive bit rate based on channel quality
- Forward Error Correction (FEC)
- Multi-carrier modulation (OFDM)
- Dynamic compression levels
