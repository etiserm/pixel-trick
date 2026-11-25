const MODEL_WIDTH = 480
const MODEL_HEIGHT = 128
const SUBPIXELS = 3
const SAMPLES = 4
const SCALE = SUBPIXELS * SAMPLES
const MAX_FONT_SIZE = 70
const FONT = 'Arial, sans-serif'

export const MICROSCOPE_COLUMNS = 16
export const MICROSCOPE_ROWS = 7

function channelOrder(stripeOrder) {
  return stripeOrder === 'BGR' ? [2, 1, 0] : [0, 1, 2]
}

export function calculateCoverage(text, { shift = 0, stripeOrder = 'RGB' } = {}) {
  const width = MODEL_WIDTH
  const height = MODEL_HEIGHT
  const mask = document.createElement('canvas')
  mask.width = width * SCALE
  mask.height = height * SAMPLES

  const ctx = mask.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas context unavailable')

  ctx.fillStyle = '#fff'
  ctx.font = `600 ${MAX_FONT_SIZE}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const word = text || ' '
  const measuredWidth = ctx.measureText(word).width
  const fontSize = measuredWidth > width * 0.9
    ? MAX_FONT_SIZE * width * 0.9 / measuredWidth
    : MAX_FONT_SIZE

  ctx.font = `600 ${fontSize}px ${FONT}`
  ctx.scale(SCALE, SAMPLES)
  ctx.fillText(word, width / 2 + shift, height / 2)

  const { data } = ctx.getImageData(0, 0, mask.width, mask.height)
  const coverage = new Float32Array(width * height * SUBPIXELS)
  const order = channelOrder(stripeOrder)
  const sampleWeight = 1 / (255 * SAMPLES * SAMPLES)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * SUBPIXELS

      for (let sub = 0; sub < SUBPIXELS; sub++) {
        const maskX = x * SCALE + sub * SAMPLES
        let sum = 0

        // Each stripe averages the alpha of its 4 × 4 block in the enlarged mask.
        for (let sy = 0; sy < SAMPLES; sy++) {
          const alphaIndex = ((y * SAMPLES + sy) * mask.width + maskX) * 4 + 3
          for (let sx = 0; sx < SAMPLES; sx++) {
            sum += data[alphaIndex + sx * 4]
          }
        }

        coverage[pixelIndex + order[sub]] = sum * sampleWeight
      }
    }
  }

  return { coverage, width, height, fontSize, stripeOrder }
}

export function readPixel(map, x, y) {
  const index = (y * map.width + x) * SUBPIXELS
  const [r, g, b] = map.coverage.subarray(index, index + SUBPIXELS)
  return { r, g, b }
}

export function averageCoverage(r, g, b) {
  return (r + g + b) / SUBPIXELS
}

export function drawPreview(canvas, map, mode = 'rgb', region = {}) {
  const { width = map.width, height = map.height, startX = 0, startY = 0 } = region
  const { coverage } = map
  canvas.width = width
  canvas.height = height

  const output = canvas.getContext('2d')
  if (!output) return

  const image = output.createImageData(width, height)

  for (let pixel = 0; pixel < width * height; pixel++) {
    const x = startX + pixel % width
    const y = startY + Math.floor(pixel / width)
    const sourceIndex = (y * map.width + x) * SUBPIXELS
    const targetIndex = pixel * 4
    const r = coverage[sourceIndex]
    const g = coverage[sourceIndex + 1]
    const b = coverage[sourceIndex + 2]

    if (mode === 'grayscale') {
      const value = Math.round(averageCoverage(r, g, b) * 255)
      image.data[targetIndex] = value
      image.data[targetIndex + 1] = value
      image.data[targetIndex + 2] = value
    } else {
      image.data[targetIndex] = mode === 'rgb' || mode === 'red' ? Math.round(r * 255) : 0
      image.data[targetIndex + 1] = mode === 'rgb' || mode === 'green' ? Math.round(g * 255) : 0
      image.data[targetIndex + 2] = mode === 'rgb' || mode === 'blue' ? Math.round(b * 255) : 0
    }

    image.data[targetIndex + 3] = 255
  }

  output.putImageData(image, 0, 0)
}

export function findMicroscopeCrop(map) {
  const { width, height, coverage } = map
  let bestX = Math.floor(width / 2)
  let bestY = Math.floor(height / 2)
  let bestScore = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * SUBPIXELS
      const r = coverage[index]
      const g = coverage[index + 1]
      const b = coverage[index + 2]
      const spread = Math.max(r, g, b) - Math.min(r, g, b)

      if (spread === 0) continue

      // Prefer an edge with unequal channels, including at least one partial stripe.
      const partial = Number(r > 0.02 && r < 0.98)
        + Number(g > 0.02 && g < 0.98)
        + Number(b > 0.02 && b < 0.98)
      const average = (r + g + b) / SUBPIXELS
      const score = spread * 2 + partial * 0.12 - Math.abs(average - 0.5) * 0.1

      if (score > bestScore) {
        bestScore = score
        bestX = x
        bestY = y
      }
    }
  }

  const startX = Math.max(
    0,
    Math.min(width - MICROSCOPE_COLUMNS, bestX - Math.floor(MICROSCOPE_COLUMNS / 2))
  )
  const startY = Math.max(
    0,
    Math.min(height - MICROSCOPE_ROWS, bestY - Math.floor(MICROSCOPE_ROWS / 2))
  )

  return {
    startX,
    startY,
    width: MICROSCOPE_COLUMNS,
    height: MICROSCOPE_ROWS,
    selectedPixel: { col: bestX - startX, row: bestY - startY },
  }
}

export function drawMicroscope(canvas, map, crop, selectedPixel) {
  const cellSize = 24
  const stripeWidth = cellSize / SUBPIXELS
  canvas.width = MICROSCOPE_COLUMNS * cellSize
  canvas.height = MICROSCOPE_ROWS * cellSize

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, coverage, stripeOrder } = map
  const order = channelOrder(stripeOrder)

  for (let row = 0; row < MICROSCOPE_ROWS; row++) {
    for (let col = 0; col < MICROSCOPE_COLUMNS; col++) {
      const x = col * cellSize
      const y = row * cellSize
      const index = ((crop.startY + row) * width + crop.startX + col) * SUBPIXELS

      for (let sub = 0; sub < SUBPIXELS; sub++) {
        const channel = order[sub]
        const intensity = Math.round(coverage[index + channel] * 255)
        ctx.fillStyle = `rgb(${channel === 0 ? intensity : 0}, ${channel === 1 ? intensity : 0}, ${channel === 2 ? intensity : 0})`
        ctx.fillRect(x + sub * stripeWidth, y, stripeWidth, cellSize)
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 0.7
      ctx.strokeRect(x, y, cellSize, cellSize)
    }
  }

  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  const cell = selectedPixel ?? crop.selectedPixel
  ctx.strokeRect(
    cell.col * cellSize + 1,
    cell.row * cellSize + 1,
    cellSize - 2,
    cellSize - 2
  )
}
