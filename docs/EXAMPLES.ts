import { 
  FSKModulator, 
  ReliableTransport, 
  SOCKS5Proxy, 
  Compression 
} from 'sdm-tcp-core';

/**
 * Example: TX Mode (Transmitter)
 * 
 * This example shows how to set up a transmitter that:
 * 1. Starts a SOCKS5 proxy
 * 2. Encrypts and compresses data
 * 3. Modulates to audio and plays through speakers
 */
async function exampleTxMode() {
  const PASSWORD = 'your-secure-password';
  const PROXY_PORT = 1080;

  // Initialize components
  const modulator = new FSKModulator();
  const transport = new ReliableTransport(PASSWORD);
  const compression = new Compression({ enableVoIP: true });
  const proxy = new SOCKS5Proxy({ port: PROXY_PORT });

  // Handle proxy requests
  proxy.on('request', async (req: any) => {
    console.log(`SOCKS5 request: ${req.address}:${req.port}`);

    try {
      // Create connection request
      const connectionData = Buffer.from(JSON.stringify({
        address: req.address,
        port: req.port,
      }));

      // Compress data
      const compressed = await compression.compress(connectionData);

      // Send via transport (will encrypt automatically)
      await transport.sendData(compressed, async (packet: Buffer) => {
        // Modulate to audio
        const audioSamples = modulator.modulate(packet);
        
        // Play audio (implementation depends on platform)
        await playAudio(audioSamples);
        
        console.log(`Transmitted packet: ${packet.length} bytes`);
      });

      // Reply success to SOCKS5 client
      req.reply(true);
      
    } catch (error) {
      console.error('TX error:', error);
      req.reply(false);
    }
  });

  // Start proxy
  await proxy.start();
  console.log(`SOCKS5 proxy listening on port ${PROXY_PORT}`);
  
  // Keep running
  console.log('TX mode active. Press Ctrl+C to stop.');
}

/**
 * Example: RX Mode (Receiver)
 * 
 * This example shows how to set up a receiver that:
 * 1. Captures audio from microphone
 * 2. Demodulates and decrypts data
 * 3. Forwards data to network
 */
async function exampleRxMode() {
  const PASSWORD = 'your-secure-password';

  // Initialize components
  const modulator = new FSKModulator();
  const transport = new ReliableTransport(PASSWORD);
  const compression = new Compression({ enableVoIP: true });

  // Set up receive callback
  transport.onReceive(async (encryptedData: Buffer) => {
    try {
      // Decompress data
      const decompressed = await compression.decompress(encryptedData);
      
      // Parse connection request
      const connectionInfo = JSON.parse(decompressed.toString());
      console.log(`Received request: ${connectionInfo.address}:${connectionInfo.port}`);
      
      // Forward to network (implementation depends on use case)
      await forwardToNetwork(connectionInfo);
      
    } catch (error) {
      console.error('RX error:', error);
    }
  });

  // Start audio capture
  console.log('RX mode active. Listening for audio...');
  
  // Capture audio samples (implementation depends on platform)
  startAudioCapture(async (audioSamples: Float32Array) => {
    try {
      // Demodulate audio to data
      const packet = modulator.demodulate(audioSamples);
      
      // Handle with transport layer
      transport.handleReceivedPacket(packet, async (ackPacket: Buffer) => {
        // Send ACK back via audio
        const ackAudio = modulator.modulate(ackPacket);
        await playAudio(ackAudio);
      });
      
    } catch (error) {
      // Ignore demodulation errors (noise, incomplete packets)
      if (error.message !== 'Invalid packet') {
        console.error('Demodulation error:', error);
      }
    }
  });

  console.log('RX mode active. Press Ctrl+C to stop.');
}

/**
 * Example: Simple Data Transmission
 * 
 * Shows how to send a simple message without SOCKS5 proxy
 */
async function exampleSimpleTransmission() {
  const PASSWORD = 'test-password';
  
  // TX side
  const txModulator = new FSKModulator();
  const txTransport = new ReliableTransport(PASSWORD);
  
  const message = Buffer.from('Hello, SDM-TCP!');
  
  await txTransport.sendData(message, async (packet: Buffer) => {
    const audioSamples = txModulator.modulate(packet);
    console.log(`TX: Sending ${audioSamples.length} audio samples`);
    // Play audio...
  });

  // RX side
  const rxModulator = new FSKModulator();
  const rxTransport = new ReliableTransport(PASSWORD);
  
  rxTransport.onReceive((data: Buffer) => {
    console.log(`RX: Received message: ${data.toString()}`);
  });

  // When audio is captured...
  // const audioSamples = ...; // from microphone
  // const packet = rxModulator.demodulate(audioSamples);
  // rxTransport.handleReceivedPacket(packet, async (ack) => { ... });
}

/**
 * Example: Performance Testing
 * 
 * Measure throughput and latency
 */
async function examplePerformanceTest() {
  const modulator = new FSKModulator();
  
  // Test modulation speed
  const testData = Buffer.alloc(246); // Max packet size
  testData.fill(0x42);
  
  console.time('Modulation');
  const audioSamples = modulator.modulate(testData);
  console.timeEnd('Modulation');
  
  console.log(`Data size: ${testData.length} bytes`);
  console.log(`Audio samples: ${audioSamples.length}`);
  console.log(`Duration: ${audioSamples.length / 48000} seconds`);
  console.log(`Bit rate: ${(testData.length * 8) / (audioSamples.length / 48000)} bps`);
  
  // Test demodulation
  console.time('Demodulation');
  const recovered = modulator.demodulate(audioSamples);
  console.timeEnd('Demodulation');
  
  // Verify correctness
  const match = Buffer.compare(testData, recovered) === 0;
  console.log(`Data integrity: ${match ? 'OK' : 'FAILED'}`);
}

/**
 * Example: Compression Evaluation
 * 
 * Test compression ratios for different data types
 */
async function exampleCompressionTest() {
  const compression = new Compression({ enableVoIP: true });
  
  const testCases = [
    { name: 'Text', data: Buffer.from('Hello World '.repeat(20)) },
    { name: 'JSON', data: Buffer.from(JSON.stringify({ key: 'value' }).repeat(10)) },
    { name: 'Binary', data: Buffer.alloc(200).fill(0x42) },
    { name: 'Random', data: Buffer.from(Array.from({ length: 200 }, () => Math.random() * 256)) },
  ];

  for (const test of testCases) {
    const compressed = await compression.compress(test.data);
    const ratio = compression.getCompressionRatio(test.data, compressed);
    
    console.log(`${test.name}:`);
    console.log(`  Original: ${test.data.length} bytes`);
    console.log(`  Compressed: ${compressed.length} bytes`);
    console.log(`  Ratio: ${(ratio * 100).toFixed(1)}%`);
    console.log(`  Savings: ${((1 - ratio) * 100).toFixed(1)}%`);
    
    // Verify decompression
    const decompressed = await compression.decompress(compressed);
    const match = Buffer.compare(test.data, decompressed) === 0;
    console.log(`  Integrity: ${match ? 'OK' : 'FAILED'}\n`);
  }
}

// Platform-specific implementations (to be provided by app)
async function playAudio(samples: Float32Array): Promise<void> {
  // Web Audio API (browser/Electron)
  // or
  // Native audio APIs (Android/iOS)
  throw new Error('Platform-specific implementation required');
}

async function startAudioCapture(callback: (samples: Float32Array) => void): Promise<void> {
  // Web Audio API (browser/Electron)
  // or
  // Native audio APIs (Android/iOS)
  throw new Error('Platform-specific implementation required');
}

async function forwardToNetwork(connectionInfo: any): Promise<void> {
  // Implement network forwarding logic
  throw new Error('Network forwarding implementation required');
}

// Export examples
export {
  exampleTxMode,
  exampleRxMode,
  exampleSimpleTransmission,
  examplePerformanceTest,
  exampleCompressionTest,
};
