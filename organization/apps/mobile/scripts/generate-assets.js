/**
 * Asset Generation Script for Broxiva Mobile App
 *
 * This script generates placeholder PNG assets for the mobile app.
 * Run: node scripts/generate-assets.js
 *
 * Requirements: npm install canvas
 */

const fs = require('fs');
const path = require('path');

// Check if canvas is available
let canvas;
try {
  canvas = require('canvas');
} catch (e) {
  console.log('Canvas module not found. Install with: npm install canvas');
  console.log('Alternatively, convert the SVG files manually to PNG.');
  process.exit(0);
}

const { createCanvas } = canvas;

const BRAND_COLOR = '#6366f1';
const WHITE = '#ffffff';

function generateIcon(width, height, text, outputPath) {
  const cvs = createCanvas(width, height);
  const ctx = cvs.getContext('2d');

  // Background
  ctx.fillStyle = BRAND_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Round corners for icon
  if (width === height && width <= 1024) {
    const radius = width * 0.125;
    ctx.fillStyle = BRAND_COLOR;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();
  }

  // Text
  ctx.fillStyle = WHITE;
  ctx.font = `bold ${Math.floor(width * 0.4)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  // Save
  const buffer = cvs.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

function generateSplash(width, height, outputPath) {
  const cvs = createCanvas(width, height);
  const ctx = cvs.getContext('2d');

  // Background
  ctx.fillStyle = BRAND_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Logo text
  ctx.fillStyle = WHITE;
  ctx.font = `bold ${Math.floor(width * 0.08)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Broxiva', width / 2, height * 0.45);

  // Tagline
  ctx.font = `${Math.floor(width * 0.03)}px Arial`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('Shop Smart, Buy Better', width / 2, height * 0.52);

  // Save
  const buffer = cvs.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Generate assets
generateIcon(1024, 1024, 'CB', path.join(assetsDir, 'icon.png'));
generateSplash(1284, 2778, path.join(assetsDir, 'splash.png'));
generateIcon(108, 108, 'CB', path.join(assetsDir, 'adaptive-icon.png'));
generateIcon(48, 48, 'CB', path.join(assetsDir, 'favicon.png'));

console.log('\nAll assets generated successfully!');
