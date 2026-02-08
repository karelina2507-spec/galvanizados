import fs from 'fs';

function crearIconoSVG(tamaño, archivo) {
  const svg = `
<svg width="${tamaño}" height="${tamaño}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${tamaño}" height="${tamaño}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${tamaño * 0.3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">GT</text>
</svg>`;

  fs.writeFileSync(archivo, svg.trim());
  console.log(`✓ Creado: ${archivo}`);
}

crearIconoSVG(192, 'public/icon-192.svg');
crearIconoSVG(512, 'public/icon-512.svg');

console.log('\n¡Iconos SVG creados exitosamente!');
console.log('Ahora puedes convertirlos a PNG usando una herramienta online como:');
console.log('https://convertio.co/es/svg-png/');
