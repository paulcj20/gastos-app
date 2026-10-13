// Genera icon-192.png e icon-512.png sin dependencias: node tools/icono.js
const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');

function crc32(buf) {
  let crc = ~0;
  for (const b of buf) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}

function bloque(tipo, datos) {
  const cuerpo = Buffer.concat([Buffer.from(tipo), datos]);
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

// Barras blancas ascendentes sobre fondo verde; todo dentro de la zona segura de un ícono adaptable.
const FONDO = [15, 118, 110], BLANCO = [255, 255, 255];
const BARRAS = [[0.30, 0.40, 0.56], [0.45, 0.55, 0.44], [0.60, 0.70, 0.30]];
const BASE = 0.70, RADIO = 0.03;

function dentroDeBarra(u, v) {
  return BARRAS.some(([x0, x1, tope]) => {
    if (u < x0 || u > x1 || v < tope || v > BASE) return false;
    // esquinas superiores redondeadas
    const cx = u < x0 + RADIO ? x0 + RADIO : u > x1 - RADIO ? x1 - RADIO : u;
    return v >= tope + RADIO || Math.hypot(u - cx, v - (tope + RADIO)) <= RADIO;
  });
}

function png(lado) {
  const M = 3; // muestras por eje, para suavizar bordes
  const filas = Buffer.alloc(lado * (1 + lado * 4));
  for (let y = 0; y < lado; y++) {
    const inicio = y * (1 + lado * 4);
    filas[inicio] = 0;
    for (let x = 0; x < lado; x++) {
      let cubierto = 0;
      for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
        if (dentroDeBarra((x + (i + 0.5) / M) / lado, (y + (j + 0.5) / M) / lado)) cubierto++;
      }
      const t = cubierto / (M * M);
      const p = inicio + 1 + x * 4;
      for (let c = 0; c < 3; c++) filas[p + c] = Math.round(FONDO[c] + (BLANCO[c] - FONDO[c]) * t);
      filas[p + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0); ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    bloque('IHDR', ihdr), bloque('IDAT', zlib.deflateSync(filas, { level: 9 })), bloque('IEND', Buffer.alloc(0)),
  ]);
}

for (const lado of [192, 512]) {
  fs.writeFileSync(path.join(__dirname, '..', `icon-${lado}.png`), png(lado));
}
