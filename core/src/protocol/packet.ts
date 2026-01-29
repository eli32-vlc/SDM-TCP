import { crc32 } from './crc32';

export enum PacketType {
  DATA = 0x01,
  ACK = 0x02,
  NACK = 0x03,
  SYN = 0x04,
  FIN = 0x05,
}

export interface Packet {
  type: PacketType;
  sequenceNumber: number;
  data: Buffer;
  checksum: number;
}

/**
 * Protocol handler for SDM-TCP packets
 */
export class Protocol {
  private static readonly HEADER_SIZE = 10; // type(1) + seq(4) + length(2) + checksum(4) = 11, but we'll use 10
  private static readonly MAX_DATA_SIZE = 246; // 256 - HEADER_SIZE
  
  /**
   * Create a packet
   */
  static createPacket(type: PacketType, sequenceNumber: number, data: Buffer = Buffer.alloc(0)): Packet {
    if (data.length > this.MAX_DATA_SIZE) {
      throw new Error(`Data too large: ${data.length} > ${this.MAX_DATA_SIZE}`);
    }

    const packet: Packet = {
      type,
      sequenceNumber,
      data,
      checksum: 0,
    };

    // Calculate checksum
    packet.checksum = this.calculateChecksum(packet);
    return packet;
  }

  /**
   * Serialize packet to buffer
   */
  static serialize(packet: Packet): Buffer {
    const buffer = Buffer.alloc(10 + packet.data.length);
    
    buffer.writeUInt8(packet.type, 0);
    buffer.writeUInt32BE(packet.sequenceNumber, 1);
    buffer.writeUInt16BE(packet.data.length, 5);
    buffer.writeUInt32BE(packet.checksum, 6);
    
    if (packet.data.length > 0) {
      packet.data.copy(buffer, 10);
    }
    
    return buffer;
  }

  /**
   * Deserialize buffer to packet
   */
  static deserialize(buffer: Buffer): Packet {
    if (buffer.length < 10) {
      throw new Error('Invalid packet: too short');
    }

    const type = buffer.readUInt8(0) as PacketType;
    const sequenceNumber = buffer.readUInt32BE(1);
    const dataLength = buffer.readUInt16BE(5);
    const checksum = buffer.readUInt32BE(6);
    
    if (buffer.length < 10 + dataLength) {
      throw new Error('Invalid packet: data length mismatch');
    }

    const data = buffer.subarray(10, 10 + dataLength);
    
    const packet: Packet = {
      type,
      sequenceNumber,
      data,
      checksum,
    };

    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(packet);
    if (calculatedChecksum !== checksum) {
      throw new Error(`Checksum mismatch: ${calculatedChecksum} !== ${checksum}`);
    }

    return packet;
  }

  /**
   * Calculate checksum for packet
   */
  private static calculateChecksum(packet: Packet): number {
    const buffer = Buffer.alloc(7 + packet.data.length);
    
    buffer.writeUInt8(packet.type, 0);
    buffer.writeUInt32BE(packet.sequenceNumber, 1);
    buffer.writeUInt16BE(packet.data.length, 5);
    
    if (packet.data.length > 0) {
      packet.data.copy(buffer, 7);
    }
    
    return crc32(buffer);
  }

  /**
   * Split data into packets
   */
  static splitData(data: Buffer, startSeq: number = 0): Packet[] {
    const packets: Packet[] = [];
    let offset = 0;
    let seq = startSeq;

    while (offset < data.length) {
      const chunkSize = Math.min(this.MAX_DATA_SIZE, data.length - offset);
      const chunk = data.subarray(offset, offset + chunkSize);
      packets.push(this.createPacket(PacketType.DATA, seq++, chunk));
      offset += chunkSize;
    }

    return packets;
  }

  /**
   * Reassemble packets into data
   */
  static reassembleData(packets: Packet[]): Buffer {
    // Sort by sequence number
    const sorted = packets.slice().sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    return Buffer.concat(sorted.map(p => p.data));
  }
}
