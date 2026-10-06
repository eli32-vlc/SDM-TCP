import { Protocol, Packet, PacketType } from '../protocol/packet';
import { CryptoEngine } from '../crypto/encryption';

export interface ReliableTransportOptions {
  maxRetries?: number;
  timeoutMs?: number;
  windowSize?: number;
}

/**
 * Reliable transport layer with ACKs and retries
 */
export class ReliableTransport {
  private crypto: CryptoEngine;
  private maxRetries: number;
  private timeoutMs: number;
  private windowSize: number;
  private pendingAcks: Map<number, { packet: Packet; retries: number; timestamp: number }>;
  private receivedSeqs: Set<number>;
  private maxReceivedSeqs: number = 1000; // Limit memory usage
  private pendingMessage: Buffer[] = []; // Plaintext chunks of the message being reassembled
  private onPacketReceived?: (data: Buffer) => void;

  constructor(password: string, options: ReliableTransportOptions = {}) {
    this.crypto = new CryptoEngine(password);
    this.maxRetries = options.maxRetries || 5;
    this.timeoutMs = options.timeoutMs || 2000;
    this.windowSize = options.windowSize || 4;
    this.pendingAcks = new Map();
    this.receivedSeqs = new Set();
  }

  /**
   * Send data reliably
   */
  async sendData(data: Buffer, onTransmit: (packet: Buffer) => Promise<void>): Promise<void> {
    // Split the plaintext into packets first, then encrypt each packet
    // independently. Every packet then carries its own AES-256-GCM IV
    // and authentication tag, so the receiver can authenticate and
    // decrypt each packet on its own (and retransmit a single corrupted
    // packet without invalidating the rest of the message).
    const maxPlaintextSize = Protocol.MAX_DATA_SIZE - CryptoEngine.ENCRYPTION_OVERHEAD;
    const packets = Protocol.splitData(data, 0, maxPlaintextSize).map(p =>
      Protocol.createPacket(PacketType.DATA, p.sequenceNumber, this.crypto.encrypt(p.data))
    );

    // Mark the end of the message so the receiver knows when the full
    // payload has arrived and can deliver it via onReceive().
    packets.push(Protocol.createPacket(PacketType.FIN, packets.length));

    // Send packets with sliding window
    for (let i = 0; i < packets.length; i += this.windowSize) {
      const window = packets.slice(i, i + this.windowSize);
      await this.sendWindow(window, onTransmit);
    }
  }

  /**
   * Send a window of packets
   */
  private async sendWindow(packets: Packet[], onTransmit: (packet: Buffer) => Promise<void>): Promise<void> {
    // Send all packets in window
    for (const packet of packets) {
      const serialized = Protocol.serialize(packet);
      await onTransmit(serialized);
      this.pendingAcks.set(packet.sequenceNumber, {
        packet,
        retries: 0,
        timestamp: Date.now(),
      });
    }

    // Wait for ACKs
    await this.waitForAcks(packets.map(p => p.sequenceNumber), onTransmit);
  }

  /**
   * Wait for ACKs with timeout and retries
   */
  private async waitForAcks(seqs: number[], onTransmit: (packet: Buffer) => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    while (seqs.some(seq => this.pendingAcks.has(seq))) {
      // Check for timeouts
      for (const seq of seqs) {
        const pending = this.pendingAcks.get(seq);
        if (pending && Date.now() - pending.timestamp > this.timeoutMs) {
          if (pending.retries >= this.maxRetries) {
            throw new Error(`Max retries exceeded for packet ${seq}`);
          }
          
          // Retransmit
          const serialized = Protocol.serialize(pending.packet);
          await onTransmit(serialized);
          pending.retries++;
          pending.timestamp = Date.now();
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Overall timeout
      if (Date.now() - startTime > this.timeoutMs * (this.maxRetries + 1)) {
        throw new Error('Transmission timeout');
      }
    }
  }

  /**
   * Handle received packet
   */
  handleReceivedPacket(buffer: Buffer, onTransmit: (packet: Buffer) => Promise<void>): void {
    try {
      const packet = Protocol.deserialize(buffer);
      
      if (packet.type === PacketType.ACK) {
        // Remove from pending
        this.pendingAcks.delete(packet.sequenceNumber);
      } else if (packet.type === PacketType.DATA) {
        // Check if already received; ACK anyway so the sender can
        // advance its window.
        if (this.receivedSeqs.has(packet.sequenceNumber)) {
          this.sendPacket(PacketType.ACK, packet.sequenceNumber, onTransmit);
          return;
        }

        // Each packet carries its own encrypted payload: authenticate and
        // decrypt it independently, then buffer the plaintext. The
        // complete message is delivered when the FIN packet arrives.
        if (this.onPacketReceived) {
          try {
            const decrypted = this.crypto.decrypt(packet.data);
            this.receivedSeqs.add(packet.sequenceNumber);
            this.pendingMessage.push(decrypted);
            this.sendPacket(PacketType.ACK, packet.sequenceNumber, onTransmit);

            // Limit memory usage by removing old sequence numbers
            if (this.receivedSeqs.size > this.maxReceivedSeqs) {
              const oldestSeq = Math.min(...Array.from(this.receivedSeqs));
              this.receivedSeqs.delete(oldestSeq);
            }
          } catch (err) {
            console.error('Decryption failed:', err);
            // Not marked as received, and NACK (instead of ACK) so the
            // sender retransmits this packet.
            this.sendPacket(PacketType.NACK, packet.sequenceNumber, onTransmit);
          }
        } else {
          this.receivedSeqs.add(packet.sequenceNumber);
          this.sendPacket(PacketType.ACK, packet.sequenceNumber, onTransmit);
        }
      } else if (packet.type === PacketType.FIN) {
        // End of message: the reassembled plaintext is complete.
        this.sendPacket(PacketType.ACK, packet.sequenceNumber, onTransmit);
        if (this.onPacketReceived) {
          this.onPacketReceived(Buffer.concat(this.pendingMessage));
        }
        this.pendingMessage = [];
        // Sequence numbers restart with each message.
        this.receivedSeqs.clear();
      } else if (packet.type === PacketType.NACK) {
        // Retransmit immediately
        const pending = this.pendingAcks.get(packet.sequenceNumber);
        if (pending) {
          const serialized = Protocol.serialize(pending.packet);
          onTransmit(serialized).catch(err => console.error('Failed to retransmit:', err));
          pending.timestamp = Date.now();
        }
      }
    } catch (err) {
      console.error('Failed to handle packet:', err);
    }
  }

  /**
   * Set callback for received packets
   */
  onReceive(callback: (data: Buffer) => void): void {
    this.onPacketReceived = callback;
  }

  /**
   * Serialize and send a control packet (ACK/NACK)
   */
  private sendPacket(type: PacketType, sequenceNumber: number, onTransmit: (packet: Buffer) => Promise<void>): void {
    const serialized = Protocol.serialize(Protocol.createPacket(type, sequenceNumber));
    onTransmit(serialized).catch(err => console.error(`Failed to send ${PacketType[type]}:`, err));
  }
}
