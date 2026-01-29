/**
 * FSK (Frequency Shift Keying) modulation for audio transmission
 * Uses 1200 Hz for '0' and 2400 Hz for '1'
 */

export class FSKModulator {
  private sampleRate: number;
  private bitRate: number;
  private freq0: number; // Frequency for bit 0
  private freq1: number; // Frequency for bit 1
  private samplesPerBit: number;

  constructor(
    sampleRate: number = 48000,
    bitRate: number = 1200,
    freq0: number = 1200,
    freq1: number = 2400
  ) {
    this.sampleRate = sampleRate;
    this.bitRate = bitRate;
    this.freq0 = freq0;
    this.freq1 = freq1;
    this.samplesPerBit = sampleRate / bitRate;
  }

  /**
   * Modulate binary data to audio samples
   */
  modulate(data: Buffer): Float32Array {
    const bits: boolean[] = [];
    
    // Add preamble for synchronization (alternating 1010...)
    for (let i = 0; i < 16; i++) {
      bits.push(i % 2 === 1);
    }
    
    // Convert bytes to bits
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      for (let bit = 7; bit >= 0; bit--) {
        bits.push((byte & (1 << bit)) !== 0);
      }
    }

    const totalSamples = Math.ceil(bits.length * this.samplesPerBit);
    const samples = new Float32Array(totalSamples);

    let sampleIndex = 0;
    for (const bit of bits) {
      const freq = bit ? this.freq1 : this.freq0;
      const samplesInBit = Math.ceil(this.samplesPerBit);

      for (let i = 0; i < samplesInBit && sampleIndex < totalSamples; i++) {
        const t = sampleIndex / this.sampleRate;
        samples[sampleIndex] = Math.sin(2 * Math.PI * freq * t) * 0.8; // 80% amplitude
        sampleIndex++;
      }
    }

    return samples;
  }

  /**
   * Demodulate audio samples to binary data
   */
  demodulate(samples: Float32Array): Buffer {
    const bits: boolean[] = [];
    let i = 0;

    // Skip preamble detection (simplified for now)
    // In production, we'd use cross-correlation to find the preamble
    const preambleLength = Math.ceil(16 * this.samplesPerBit);
    i = Math.min(preambleLength, samples.length);

    while (i + this.samplesPerBit <= samples.length) {
      const bitSamples = samples.slice(i, i + this.samplesPerBit);
      const bit = this.detectBit(bitSamples);
      bits.push(bit);
      i += this.samplesPerBit;
    }

    // Convert bits to bytes
    const bytes: number[] = [];
    for (let j = 0; j < bits.length - 7; j += 8) {
      let byte = 0;
      for (let k = 0; k < 8; k++) {
        if (bits[j + k]) {
          byte |= (1 << (7 - k));
        }
      }
      bytes.push(byte);
    }

    return Buffer.from(bytes);
  }

  /**
   * Detect bit value from samples using Goertzel algorithm
   */
  private detectBit(samples: Float32Array): boolean {
    const power0 = this.goertzel(samples, this.freq0);
    const power1 = this.goertzel(samples, this.freq1);
    return power1 > power0;
  }

  /**
   * Goertzel algorithm for frequency detection
   */
  private goertzel(samples: Float32Array, targetFreq: number): number {
    const k = Math.round((samples.length * targetFreq) / this.sampleRate);
    const omega = (2 * Math.PI * k) / samples.length;
    const coeff = 2 * Math.cos(omega);

    let s1 = 0;
    let s2 = 0;

    for (const sample of samples) {
      const s0 = sample + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }

    return s1 * s1 + s2 * s2 - coeff * s1 * s2;
  }
}
