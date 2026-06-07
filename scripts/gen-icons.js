#!/usr/bin/env node
// Run this to generate placeholder icons if you don't have real ones
// node scripts/gen-icons.js
const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function genIcon(size, filename) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.4}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('G', size / 2, size / 2)
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'assets', filename), canvas.toBuffer('image/png'))
  console.log('Generated', filename)
}

const dir = path.join(__dirname, '..', 'src', 'assets')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
genIcon(256, 'icon.png')
genIcon(32, 'tray-icon.png')
