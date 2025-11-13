// Simple script to create placeholder icons for SafeNode extension
// Run this in Node.js: node create_icons.js

const fs = require('fs');
const path = require('path');

// Minimal PNG data for a 16x16 purple gradient icon with lock
const createIcon = (size) => {
  // This creates a very basic PNG with purple gradient and white lock
  const canvas = Buffer.alloc(size * size * 4);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      
      // Purple to pink gradient
      const ratio = y / size;
      const r = Math.floor(139 + (236 - 139) * ratio);
      const g = Math.floor(92 + (72 - 92) * ratio);
      const b = Math.floor(246 + (137 - 246) * ratio);
      
      canvas[i] = r;     // R
      canvas[i + 1] = g; // G
      canvas[i + 2] = b; // B
      canvas[i + 3] = 255; // A
      
      // Simple lock icon (white)
      const centerX = size / 2;
      const centerY = size / 2;
      const lockSize = size * 0.6;
      
      if (x >= centerX - lockSize/2 && x <= centerX + lockSize/2 &&
          y >= centerY - lockSize/3 && y <= centerY + lockSize/2) {
        canvas[i] = 255;
        canvas[i + 1] = 255;
        canvas[i + 2] = 255;
      }
    }
  }
  
  return canvas;
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Create all required icon sizes
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const iconData = createIcon(size);
  const filename = path.join(iconsDir, `icon-${size}.png`);
  
  // Write as raw PNG data (this is a simplified approach)
  fs.writeFileSync(filename, iconData);
  console.log(`Created icon-${size}.png`);
});

console.log('All icons created! You can now load the extension.');
