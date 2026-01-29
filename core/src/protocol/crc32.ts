/**
 * CRC32 checksum calculation
 */

const CRC32_TABLE: number[] = [];

// Initialize CRC32 lookup table
function initCRC32Table() {
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    CRC32_TABLE[i] = crc;
  }
}

initCRC32Table();

/**
 * Calculate CRC32 checksum
 */
export function crc32(buffer: Buffer): number {
  let crc = 0xFFFFFFFF;
  
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    crc = CRC32_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
