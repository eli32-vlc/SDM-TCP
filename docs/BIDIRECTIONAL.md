# Bidirectional (2-Way) Mode Guide

## Overview

Bidirectional mode enables **full-duplex communication** where both devices can simultaneously transmit and receive data over audio. This is essential for TCP-like bidirectional communication.

## How It Works

In bidirectional mode, each device operates as both a transmitter and receiver:

```
Device A (Bidirectional)          Device B (Bidirectional)
┌─────────────────────┐          ┌─────────────────────┐
│ Speaker → ─────────→│────────→ │→ Microphone         │
│                     │          │                     │
│ Microphone ←────────│←─────────│← Speaker            │
└─────────────────────┘          └─────────────────────┘
     TX + RX                           TX + RX
```

### Key Features

1. **Simultaneous TX and RX**: Both send and receive at the same time
2. **Single Audio Channel**: Uses time-division multiplexing
3. **SOCKS5 Proxy**: For outgoing network connections
4. **Automatic ACKs**: Sent via audio back to transmitter
5. **True TCP Support**: Enables request-response patterns

## Use Cases

### 1. Interactive Chat Applications
- Send messages while receiving responses
- Real-time bidirectional messaging

### 2. Remote Control
- Send commands to remote device
- Receive status updates back

### 3. File Transfer
- Upload and download simultaneously
- Acknowledgments for each chunk

### 4. VoIP/Video Calls
- Send and receive audio/video streams
- Critical for real-time communication

## Setup

### Device A (Bidirectional Mode)

1. Launch SDM-TCP application
2. Select **"2-Way"** mode
3. Enter password: `shared-secret-123`
4. Set SOCKS5 port: `1080`
5. Click "Start"
6. Allow microphone access

### Device B (Bidirectional Mode)

1. Launch SDM-TCP application
2. Select **"2-Way"** mode
3. Enter **same password**: `shared-secret-123`
4. Set SOCKS5 port: `1081` (different port)
5. Click "Start"
6. Allow microphone access

### Audio Setup

Position devices:
- **Option 1**: Speakers near each other's microphones
- **Option 2**: Use audio cables (speaker out → line in)
- **Option 3**: Virtual audio routing software

## Communication Flow

### Example: HTTP Request/Response

```
Browser → SOCKS5 (Device A) → Audio TX → Device B RX → Internet
                                                  ↓
Browser ← Audio RX ← Device B TX ← HTTP Response ←
```

1. **Client sends HTTP request**:
   - Browser connects to SOCKS5 proxy on Device A
   - Device A encrypts and transmits via audio
   - Device B receives and decrypts
   - Device B forwards to internet

2. **Server sends HTTP response**:
   - Device B receives response from internet
   - Device B encrypts and transmits via audio
   - Device A receives and decrypts
   - Device A forwards to browser

## Technical Details

### Protocol Coordination

- **Collision Avoidance**: Devices detect silence before transmitting
- **ACK Priority**: ACKs are sent immediately, data queued
- **Retry Mechanism**: Automatic retransmission on timeout
- **Flow Control**: Sliding window prevents overwhelm

### Bandwidth Sharing

With 1200 bps available:
- **Typical split**: 600 bps each direction
- **With ACKs**: ~500 bps data each way
- **Asymmetric**: Can prioritize one direction

## Performance

### Throughput

| Metric | Value |
|--------|-------|
| Total Bitrate | 1200 bps |
| Per Direction | ~500-600 bps |
| Latency (RTT) | 100-200 ms |
| Overhead | 20-30% (protocol + ACKs) |

### Reliability

- **ACK Success Rate**: >99%
- **Packet Loss Recovery**: Automatic
- **Max Retries**: 5 per packet
- **Error Detection**: CRC32 + AES-GCM

## Best Practices

### 1. Audio Quality

- Use high-quality speakers and microphones
- Reduce ambient noise
- Optimal volume: 70-80%
- Test audio path before data transmission

### 2. Password Management

- Use strong, random passwords
- Both devices must use identical password
- Change passwords regularly

### 3. Network Configuration

- Configure applications to use SOCKS5 proxy
- Set appropriate timeouts (5+ seconds)
- Use connection pooling for efficiency

### 4. Troubleshooting

**Symptom**: Data not received
- Check audio levels (too low or too high)
- Verify same password on both devices
- Check microphone permissions

**Symptom**: Slow performance
- Reduce packet size
- Minimize retransmissions
- Check for audio interference

**Symptom**: Connection drops
- Increase retry timeout
- Check audio quality
- Reduce transmission rate

## Limitations

1. **Half-Bandwidth**: Each direction gets ~50% of total bitrate
2. **Increased Latency**: More packets in flight
3. **Complexity**: More chance of conflicts
4. **Audio Quality Critical**: Poor audio affects both directions

## Advanced Configuration

### Programmatic Usage

```typescript
import { BidirectionalModem } from 'sdm-tcp-core';

// Initialize
const modem = new BidirectionalModem('password', { port: 1080 });

// Start bidirectional mode
await modem.start();

// Handle received data
modem.on('data-received', (data: Buffer) => {
  console.log('Received:', data.toString());
});

// Handle audio output
modem.on('audio-output', (samples: number[]) => {
  playAudio(samples); // Your audio implementation
});

// Process incoming audio
await modem.processAudio(audioSamples);

// Send data directly
await modem.sendData(Buffer.from('Hello!'));

// Stop
await modem.stop();
```

### Custom Protocols

You can implement custom protocols on top of bidirectional mode:

```typescript
// Simple request-response
async function sendRequest(modem: BidirectionalModem, request: string) {
  const requestId = generateId();
  const packet = JSON.stringify({ id: requestId, data: request });
  
  await modem.sendData(Buffer.from(packet));
  
  return new Promise((resolve) => {
    modem.on('data-received', (data) => {
      const response = JSON.parse(data.toString());
      if (response.id === requestId) {
        resolve(response.data);
      }
    });
  });
}
```

## Comparison with Simplex Modes

| Feature | TX Only | RX Only | Bidirectional |
|---------|---------|---------|---------------|
| Transmit | Yes | No | Yes |
| Receive | No | Yes | Yes |
| SOCKS5 | Yes | No | Yes |
| Microphone | No | Yes | Yes |
| Speaker | Yes | No | Yes |
| Bandwidth | 1200 bps | 1200 bps | ~600 bps each |
| Use Case | One-way send | One-way receive | Interactive |

## Security Considerations

### Bidirectional Risks

1. **Both directions encrypted**: Each direction uses AES-256
2. **ACKs can be spoofed**: Attacker with audio access could fake ACKs
3. **Timing attacks**: Bidirectional reveals communication patterns
4. **Audio recording**: Anyone can record both directions

### Mitigation

- Use in controlled environments
- Implement application-level authentication
- Consider frequency hopping (future enhancement)
- Monitor for suspicious patterns

## Future Enhancements

1. **Collision Detection**: Detect simultaneous transmission
2. **Priority Queues**: Critical packets sent first
3. **Adaptive Bandwidth**: Dynamic allocation per direction
4. **Multiple Channels**: Parallel frequency channels
5. **Compression**: Per-direction compression strategies

## Conclusion

Bidirectional mode enables true 2-way communication over audio, making SDM-TCP suitable for interactive applications. While it reduces per-direction bandwidth, it provides the flexibility needed for TCP-like protocols and request-response patterns.

For simple one-way communication, use TX or RX modes. For interactive applications requiring bidirectional data flow, use 2-Way mode.
