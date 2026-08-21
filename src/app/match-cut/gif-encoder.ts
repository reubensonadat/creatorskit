// Lightweight GIF Encoder for High-Performance Match Cut Export
// Converts HTML Canvas frames into a standard looping animated GIF in pure client-side TypeScript

export class SimpleGifEncoder {
  private width: number;
  private height: number;
  private delay: number; // in 1/100ths of a second
  private data: number[] = [];

  constructor(width: number, height: number, delayMs: number) {
    this.width = width;
    this.height = height;
    this.delay = Math.max(2, Math.round(delayMs / 10)); // GIF delay unit is 10ms
    this.writeHeader();
  }

  private writeHeader() {
    // GIF89a Header
    this.writeString('GIF89a');
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.data.push(0x70); // No global color table, 7 color resolution
    this.data.push(0);    // Background color index
    this.data.push(0);    // Pixel aspect ratio

    // Netscape Application Extension for Looping
    this.data.push(0x21, 0xff, 0x0b);
    this.writeString('NETSCAPE2.0');
    this.data.push(0x03, 0x01, 0x00, 0x00, 0x00);
  }

  private writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.data.push(str.charCodeAt(i));
    }
  }

  private writeShort(val: number) {
    this.data.push(val & 0xff);
    this.data.push((val >> 8) & 0xff);
  }

  public addFrame(ctx: CanvasRenderingContext2D) {
    const imgData = ctx.getImageData(0, 0, this.width, this.height);
    const rgba = imgData.data;

    // Build a 64-color quantized palette for maximum encoding speed & crisp text
    const palette: [number, number, number][] = [];
    const colorMap = new Map<number, number>();

    // Quantize 8-bit channels into 4-bit bins
    for (let i = 0; i < rgba.length; i += 4) {
      const r = (rgba[i] >> 5) << 5;
      const g = (rgba[i + 1] >> 5) << 5;
      const b = (rgba[i + 2] >> 5) << 5;
      const key = (r << 16) | (g << 8) | b;
      if (!colorMap.has(key) && palette.length < 256) {
        colorMap.set(key, palette.length);
        palette.push([r, g, b]);
      }
    }

    // Ensure palette has power of 2 size
    let palSize = 2;
    while (palSize < palette.length && palSize < 256) {
      palSize <<= 1;
    }
    while (palette.length < palSize) {
      palette.push([0, 0, 0]);
    }
    const colorDepth = Math.max(1, Math.ceil(Math.log2(palSize)));

    // Graphics Control Extension
    this.data.push(0x21, 0xf9, 0x04);
    this.data.push(0x00); // disposal method: no action
    this.writeShort(this.delay);
    this.data.push(0x00); // transparent color index
    this.data.push(0x00); // block terminator

    // Image Descriptor
    this.data.push(0x2c);
    this.writeShort(0); // Left
    this.writeShort(0); // Top
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.data.push(0x80 | (colorDepth - 1)); // Local Color Table flag + bit depth

    // Local Color Table
    for (let i = 0; i < palSize; i++) {
      this.data.push(palette[i][0], palette[i][1], palette[i][2]);
    }

    // Convert pixel data to palette indices
    const indices: number[] = new Array(this.width * this.height);
    let p = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      const r = (rgba[i] >> 5) << 5;
      const g = (rgba[i + 1] >> 5) << 5;
      const b = (rgba[i + 2] >> 5) << 5;
      const key = (r << 16) | (g << 8) | b;
      indices[p++] = colorMap.get(key) ?? 0;
    }

    // Write LZW compressed image data
    this.writeLZW(indices, colorDepth);
  }

  private writeLZW(indices: number[], colorDepth: number) {
    const minCodeSize = Math.max(2, colorDepth);
    this.data.push(minCodeSize);

    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;

    let curBit = 0;
    let curByte = 0;
    const packet: number[] = [];

    const emitBits = (code: number, bits: number) => {
      curByte |= (code << curBit) & 0xff;
      curBit += bits;
      while (curBit >= 8) {
        packet.push(curByte & 0xff);
        if (packet.length === 255) {
          this.data.push(255);
          for (let b = 0; b < 255; b++) this.data.push(packet[b]);
          packet.length = 0;
        }
        curByte = (code >> (bits - (curBit - 8))) & 0xff;
        curBit -= 8;
      }
    };

    emitBits(clearCode, codeSize);

    let prefix = indices[0];
    const dict = new Map<string, number>();

    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const pk = `${prefix},${k}`;
      if (dict.has(pk)) {
        prefix = dict.get(pk)!;
      } else {
        emitBits(prefix, codeSize);
        dict.set(pk, nextCode++);

        if (nextCode === (1 << codeSize) && codeSize < 12) {
          codeSize++;
        } else if (nextCode >= 4094) {
          emitBits(clearCode, codeSize);
          dict.clear();
          codeSize = minCodeSize + 1;
          nextCode = eoiCode + 1;
        }
        prefix = k;
      }
    }

    emitBits(prefix, codeSize);
    emitBits(eoiCode, codeSize);

    if (curBit > 0) {
      packet.push(curByte & 0xff);
    }
    if (packet.length > 0) {
      this.data.push(packet.length);
      for (let b = 0; b < packet.length; b++) this.data.push(packet[b]);
    }
    this.data.push(0x00); // Block Terminator
  }

  public finish(): Blob {
    this.data.push(0x3b); // Trailer
    return new Blob([new Uint8Array(this.data)], { type: 'image/gif' });
  }
}
