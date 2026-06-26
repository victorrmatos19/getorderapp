// Gera assets/sounds/chime.wav — chime de 2 notas (Lá5 880Hz → Ré6 1174.66Hz),
// espelhando o som sintetizado da cozinha web (useCozinhaAlerta). 16-bit PCM mono 44.1kHz.
const fs = require('fs')
const path = require('path')

const RATE = 44100
const notes = [
  { freq: 880, start: 0.0, dur: 0.15 },
  { freq: 1174.66, start: 0.16, dur: 0.15 },
]
const totalSec = 0.5
const n = Math.floor(RATE * totalSec)
const samples = new Float32Array(n)

for (const note of notes) {
  const s0 = Math.floor(note.start * RATE)
  const dN = Math.floor(note.dur * RATE)
  for (let i = 0; i < dN; i++) {
    const t = i / RATE
    // envelope: ataque rápido (~20ms) + decay exponencial
    const atk = Math.min(1, t / 0.02)
    const dec = Math.exp(-t * 18)
    const env = atk * dec * 0.32
    const idx = s0 + i
    if (idx < n) samples[idx] += Math.sin(2 * Math.PI * note.freq * t) * env
  }
}

// clamp e converte p/ int16
const data = Buffer.alloc(n * 2)
for (let i = 0; i < n; i++) {
  const v = Math.max(-1, Math.min(1, samples[i]))
  data.writeInt16LE(Math.round(v * 32767), i * 2)
}

// header WAV (PCM mono 16-bit)
const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + data.length, 4)
header.write('WAVE', 8)
header.write('fmt ', 12)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20) // PCM
header.writeUInt16LE(1, 22) // mono
header.writeUInt32LE(RATE, 24)
header.writeUInt32LE(RATE * 2, 28) // byte rate
header.writeUInt16LE(2, 32) // block align
header.writeUInt16LE(16, 34) // bits
header.write('data', 36)
header.writeUInt32LE(data.length, 40)

const out = path.join(__dirname, '..', 'assets', 'sounds', 'chime.wav')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, Buffer.concat([header, data]))
console.log('wrote', out, (header.length + data.length), 'bytes')
