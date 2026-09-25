import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { writeFile } from 'node:fs/promises'

const sizes = [16, 24, 32, 48, 64, 128, 256]
const svgPath = 'bakery-icon.svg'

const pngBuffers = await Promise.all(sizes.map((size) => sharp(svgPath).resize(size, size).png().toBuffer()))
const icoBuffer = await pngToIco(pngBuffers)
await writeFile('bakery-icon.ico', icoBuffer)
console.log('wrote bakery-icon.ico')
