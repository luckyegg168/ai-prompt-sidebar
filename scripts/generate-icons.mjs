/**
 * Generate extension icons as PNG files using Canvas.
 * Run: node scripts/generate-icons.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";

// Simple "BMP-like" PNG generator — creates a minimal valid PNG
// We create a simple icon with a gradient-like pattern

function createPNG(size) {
  // Create raw pixel data (RGBA)
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        // Inside circle — purple gradient
        const t = dist / r;
        pixels[idx] = Math.round(99 + t * 30);     // R
        pixels[idx + 1] = Math.round(102 - t * 40); // G
        pixels[idx + 2] = Math.round(241 - t * 30); // B
        pixels[idx + 3] = 255;                       // A

        // Draw chart bars icon in center
        const bw = Math.max(1, Math.round(size * 0.06)); // bar width
        const barArea = size * 0.5;
        const barLeft = cx - barArea / 2;
        const barBottom = cy + r * 0.45;
        const gap = barArea / 4;

        const bars = [
          { x: barLeft + gap * 0, h: barArea * 0.4 },
          { x: barLeft + gap * 1, h: barArea * 0.7 },
          { x: barLeft + gap * 2, h: barArea * 1.0 },
          { x: barLeft + gap * 3, h: barArea * 0.55 },
        ];

        for (const bar of bars) {
          if (x >= bar.x && x < bar.x + bw && y >= barBottom - bar.h && y <= barBottom) {
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
            pixels[idx + 3] = 255;
          }
        }
      } else {
        // Outside circle — transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  return encodePNG(size, size, pixels);
}

// Minimal PNG encoder
function encodePNG(width, height, rgba) {
  const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function adler32(buf) {
    let a = 1, b = 0;
    for (let i = 0; i < buf.length; i++) {
      a = (a + buf[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = new TextEncoder().encode(type);
    const len = data.length;
    const buf = new Uint8Array(4 + 4 + len + 4);
    buf[0] = (len >>> 24) & 0xff;
    buf[1] = (len >>> 16) & 0xff;
    buf[2] = (len >>> 8) & 0xff;
    buf[3] = len & 0xff;
    buf.set(typeBytes, 4);
    buf.set(data, 8);
    const crcData = new Uint8Array(4 + len);
    crcData.set(typeBytes, 0);
    crcData.set(data, 4);
    const crc = crc32(crcData);
    buf[8 + len] = (crc >>> 24) & 0xff;
    buf[9 + len] = (crc >>> 16) & 0xff;
    buf[10 + len] = (crc >>> 8) & 0xff;
    buf[11 + len] = crc & 0xff;
    return buf;
  }

  // IHDR
  const ihdr = new Uint8Array(13);
  ihdr[0] = (width >>> 24) & 0xff;
  ihdr[1] = (width >>> 16) & 0xff;
  ihdr[2] = (width >>> 8) & 0xff;
  ihdr[3] = width & 0xff;
  ihdr[4] = (height >>> 24) & 0xff;
  ihdr[5] = (height >>> 16) & 0xff;
  ihdr[6] = (height >>> 8) & 0xff;
  ihdr[7] = height & 0xff;
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data (filter byte 0 + RGBA for each row)
  const rawRows = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawRows[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 4) + 1 + x * 4;
      rawRows[di] = rgba[si];
      rawRows[di + 1] = rgba[si + 1];
      rawRows[di + 2] = rgba[si + 2];
      rawRows[di + 3] = rgba[si + 3];
    }
  }

  // Compress with deflate (store, no compression — simple but valid)
  const blocks = [];
  const MAX_BLOCK = 65535;
  for (let i = 0; i < rawRows.length; i += MAX_BLOCK) {
    const end = Math.min(i + MAX_BLOCK, rawRows.length);
    const len = end - i;
    const isLast = end === rawRows.length;
    const header = new Uint8Array(5);
    header[0] = isLast ? 1 : 0;
    header[1] = len & 0xff;
    header[2] = (len >>> 8) & 0xff;
    header[3] = (~len) & 0xff;
    header[4] = ((~len) >>> 8) & 0xff;
    blocks.push(header);
    blocks.push(rawRows.slice(i, end));
  }

  const adler = adler32(rawRows);
  const totalDeflateLen = 2 + blocks.reduce((s, b) => s + b.length, 0) + 4;
  const deflated = new Uint8Array(totalDeflateLen);
  deflated[0] = 0x78; // CMF
  deflated[1] = 0x01; // FLG
  let offset = 2;
  for (const b of blocks) {
    deflated.set(b, offset);
    offset += b.length;
  }
  deflated[offset] = (adler >>> 24) & 0xff;
  deflated[offset + 1] = (adler >>> 16) & 0xff;
  deflated[offset + 2] = (adler >>> 8) & 0xff;
  deflated[offset + 3] = adler & 0xff;

  const ihdrChunk = chunk("IHDR", ihdr);
  const idatChunk = chunk("IDAT", deflated);
  const iendChunk = chunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(
    SIGNATURE.length + ihdrChunk.length + idatChunk.length + iendChunk.length
  );
  let pos = 0;
  png.set(SIGNATURE, pos); pos += SIGNATURE.length;
  png.set(ihdrChunk, pos); pos += ihdrChunk.length;
  png.set(idatChunk, pos); pos += idatChunk.length;
  png.set(iendChunk, pos);

  return Buffer.from(png);
}

// Generate
if (!existsSync("icons")) mkdirSync("icons", { recursive: true });

for (const size of [16, 48, 128]) {
  const png = createPNG(size);
  writeFileSync(`icons/icon${size}.png`, png);
  console.log(`✅ Generated icons/icon${size}.png (${png.length} bytes)`);
}
