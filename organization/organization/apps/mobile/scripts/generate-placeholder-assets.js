/**
 * Generate placeholder PNG assets using Jimp (pure JavaScript, no native dependencies)
 * Run: node scripts/generate-placeholder-assets.js
 */

const fs = require('fs');
const path = require('path');

// Simple 1x1 PNG generator (placeholder)
// This creates minimal valid PNG files that can be replaced with real assets

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typeData = Buffer.from(type);
  const combined = Buffer.concat([typeData, data]);

  const crcValue = crc32(combined);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crcValue);

  return Buffer.concat([length, combined, crcBuffer]);
}

function createSolidPNG(width, height, r, g, b) {
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);    // bit depth
  ihdr.writeUInt8(2, 9);    // color type (RGB)
  ihdr.writeUInt8(0, 10);   // compression
  ihdr.writeUInt8(0, 11);   // filter
  ihdr.writeUInt8(0, 12);   // interlace

  // IDAT chunk (image data)
  const zlib = require('zlib');
  const scanlineLength = width * 3 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLength;
    rawData[offset] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      rawData[offset + 1 + x * 3] = r;
      rawData[offset + 2 + x * 3] = g;
      rawData[offset + 3 + x * 3] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // IEND chunk
  const iend = Buffer.alloc(0);

  // Combine all chunks
  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', iend)
  ]);
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Brand color: #6366f1 -> RGB(99, 102, 241)
const r = 99, g = 102, b = 241;

// Generate assets
const assets = [
  { name: 'icon.png', width: 1024, height: 1024 },
  { name: 'splash.png', width: 1284, height: 2778 },
  { name: 'adaptive-icon.png', width: 108, height: 108 },
  { name: 'favicon.png', width: 48, height: 48 },
];

console.log('Generating placeholder PNG assets...');
console.log('Brand color: #6366f1 (indigo)');
console.log('');

for (const asset of assets) {
  const pngData = createSolidPNG(asset.width, asset.height, r, g, b);
  const outputPath = path.join(assetsDir, asset.name);
  fs.writeFileSync(outputPath, pngData);
  console.log(`✅ Generated: ${asset.name} (${asset.width}x${asset.height})`);
}

console.log('');
console.log('All placeholder assets generated!');
console.log('Replace with production assets before release.');
