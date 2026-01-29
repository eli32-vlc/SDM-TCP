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
    // Encrypt data
    const encrypted = this.crypto.encrypt(data);
    
    // Split into packets
    const packets = Protocol.splitData(encrypted);
    
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
        // Send ACK
        const ack = Protocol.createPacket(PacketType.ACK, packet.sequenceNumber);
        const serialized = Protocol.serialize(ack);
        onTransmit(serialized).catch(err => console.error('Failed to send ACK:', err));
        
        // Check if already received
        if (this.receivedSeqs.has(packet.sequenceNumber)) {
          return;
        }
        
        this.receivedSeqs.add(packet.sequenceNumber);
        
        // Decrypt and forward
        if (this.onPacketReceived) {
          try {
            const decrypted = this.crypto.decrypt(packet.data);
            this.onPacketReceived(decrypted);
          } catch (err) {
            console.error('Decryption failed:', err);
            // Send NACK
            const nack = Protocol.createPacket(PacketType.NACK, packet.sequenceNumber);
            const serializedNack = Protocol.serialize(nack);
            onTransmit(serializedNack).catch(e => console.error('Failed to send NACK:', e));
          }
        }
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
}
