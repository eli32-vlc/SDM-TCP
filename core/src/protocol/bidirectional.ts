import { ReliableTransport } from '../protocol/transport';
import { FSKModulator } from '../audio/fsk';
import { SOCKS5Proxy, SOCKS5ProxyOptions } from '../socks5/proxy';
import { EventEmitter } from 'events';

/**
 * Bidirectional (Full-Duplex) modem mode
 * Allows both transmitting and receiving simultaneously
 */
export class BidirectionalModem extends EventEmitter {
  private transport: ReliableTransport;
  private modulator: FSKModulator;
  private proxy: SOCKS5Proxy | null = null;
  private isActive: boolean = false;

  constructor(password: string, proxyOptions?: SOCKS5ProxyOptions) {
    super();
    this.transport = new ReliableTransport(password);
    this.modulator = new FSKModulator();
    
    if (proxyOptions) {
      this.proxy = new SOCKS5Proxy(proxyOptions);
    }
  }

  /**
   * Start bidirectional mode
   */
  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Bidirectional mode already active');
    }

    // Set up receive callback
    this.transport.onReceive((data: Buffer) => {
      this.emit('data-received', data);
    });

    // Start SOCKS5 proxy if configured (TX capability)
    if (this.proxy) {
      this.proxy.on('request', async (req: any) => {
        try {
          const connectionData = Buffer.from(JSON.stringify({
            address: req.address,
            port: req.port,
          }));

          // Send via transport
          await this.transport.sendData(connectionData, async (packet: Buffer) => {
            const samples = this.modulator.modulate(packet);
            this.emit('audio-output', Array.from(samples));
          });

          req.reply(true);
        } catch (error) {
          console.error('TX error:', error);
          req.reply(false);
        }
      });

      await this.proxy.start();
    }

    this.isActive = true;
  }

  /**
   * Stop bidirectional mode
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;

    if (this.proxy) {
      await this.proxy.stop();
    }

    this.isActive = false;
    this.removeAllListeners();
  }

  /**
   * Process incoming audio samples (RX capability)
   */
  async processAudio(samples: number[]): Promise<void> {
    if (!this.isActive) {
      throw new Error('Bidirectional mode not active');
    }

    try {
      const audioData = new Float32Array(samples);
      const packet = this.modulator.demodulate(audioData);

      // Handle with transport layer
      this.transport.handleReceivedPacket(packet, async (ackPacket: Buffer) => {
        // Send ACK via audio
        const ackSamples = this.modulator.modulate(ackPacket);
        this.emit('audio-output', Array.from(ackSamples));
      });
    } catch (error) {
      // Ignore demodulation errors (noise, incomplete packets)
      if ((error as Error).message !== 'Invalid packet') {
        console.error('Audio processing error:', error);
      }
    }
  }

  /**
   * Send data directly (bypassing SOCKS5)
   */
  async sendData(data: Buffer): Promise<void> {
    if (!this.isActive) {
      throw new Error('Bidirectional mode not active');
    }

    await this.transport.sendData(data, async (packet: Buffer) => {
      const samples = this.modulator.modulate(packet);
      this.emit('audio-output', Array.from(samples));
    });
  }

  /**
   * Check if bidirectional mode is active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}
