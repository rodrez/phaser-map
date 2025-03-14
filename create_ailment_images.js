const fs = require('fs');
const path = require('path');

// Ensure the ailments directory exists
const ailmentsDir = path.join(__dirname, 'assets', 'ailments');
if (!fs.existsSync(ailmentsDir)) {
  fs.mkdirSync(ailmentsDir, { recursive: true });
  console.log(`Created directory: ${ailmentsDir}`);
}

// Function to create a simple SVG for an ailment
function createAilmentSVG(name, color) {
  return `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="black" opacity="0.2" rx="4" ry="4"/>
  <circle cx="16" cy="16" r="12" fill="${color}" opacity="0.8"/>
  <text x="16" y="20" font-family="Arial" font-size="10" text-anchor="middle" fill="white">${name}</text>
</svg>`;
}

// Define the ailments with their colors
const ailments = [
  { name: 'poison', color: '#00aa00' }, // Green
  { name: 'fire', color: '#aa0000' },   // Red
  { name: 'frozen', color: '#00aaff' }, // Light blue
  { name: 'stunned', color: '#ffaa00' }, // Orange
  { name: 'pinned', color: '#888888' }   // Gray
];

// Create SVG files for each ailment
ailments.forEach(ailment => {
  const svgContent = createAilmentSVG(ailment.name, ailment.color);
  const filePath = path.join(ailmentsDir, `${ailment.name}-32.svg`);
  fs.writeFileSync(filePath, svgContent);
  console.log(`Created ailment SVG: ${filePath}`);
});

console.log('All ailment SVGs created successfully!'); 