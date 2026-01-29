import zlib from 'zlib';
import { promisify } from 'util';

const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

export interface CompressionOptions {
  level?: number; // 0-9, higher = better compression but slower
  enableVoIP?: boolean; // Optimize for voice data
}

/**
 * Compression utilities for VOIP support
 * Trades speed for reliability with compression
 */
export class Compression {
  private level: number;
  private enableVoIP: boolean;

  constructor(options: CompressionOptions = {}) {
    this.level = options.level || 6; // Default compression level
    this.enableVoIP = options.enableVoIP || false;
  }

  /**
   * Compress data
   * @param data Data to compress
   * @returns Compressed data
   */
  async compress(data: Buffer): Promise<Buffer> {
    try {
      const compressed = await deflate(data, {
        level: this.enableVoIP ? 9 : this.level, // Max compression for VOIP
      });
      return compressed;
    } catch (error) {
      console.error('Compression failed:', error);
      throw error;
    }
  }

  /**
   * Decompress data
   * @param data Compressed data
   * @returns Decompressed data
   */
  async decompress(data: Buffer): Promise<Buffer> {
    try {
      const decompressed = await inflate(data);
      return decompressed;
    } catch (error) {
      console.error('Decompression failed:', error);
      throw error;
    }
  }

  /**
   * Calculate compression ratio
   */
  getCompressionRatio(original: Buffer, compressed: Buffer): number {
    return compressed.length / original.length;
  }

  /**
   * Enable VOIP mode (maximum compression)
   */
  enableVoIPMode(): void {
    this.enableVoIP = true;
    this.level = 9;
  }

  /**
   * Disable VOIP mode
   */
  disableVoIPMode(): void {
    this.enableVoIP = false;
    this.level = 6;
  }
}
