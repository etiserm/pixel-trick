import { useEffect, useMemo, useRef, useState } from 'react'
import {
  averageCoverage,
  calculateCoverage,
  drawMicroscope,
  drawPreview,
  findMicroscopeCrop,
  MICROSCOPE_COLUMNS,
  MICROSCOPE_ROWS,
  readPixel,
} from './renderer'
import './App.css'

const breakdownStages = [
  {
    label: '01 / GRAYSCALE',
    name: 'AVERAGE COVERAGE',
    mode: 'grayscale',
    description: 'Start with the grayscale comparison. Each pixel uses the same average coverage for red, green, and blue.',
  },
  {
    label: '02 / RED',
    name: 'RED CHANNEL',
    mode: 'red',
    description: 'The renderer calculates the coverage of the red subpixel independently.',
  },
  {
    label: '03 / GREEN',
    name: 'GREEN CHANNEL',
    mode: 'green',
    description: 'The green subpixel receives its own coverage value at every pixel position.',
  },
  {
    label: '04 / BLUE',
    name: 'BLUE CHANNEL',
    mode: 'blue',
    description: 'The blue subpixel is sampled separately, creating a different edge profile.',
  },
  {
    label: '05 / COMPOSITE',
    name: 'FINAL RGB OUTPUT',
    mode: 'rgb',
    description: 'The three independently calculated channels combine to produce the final image.',
  },
]

function PixelBreakdown({ text, map }) {
  const canvasRef = useRef(null)
  const [stage, setStage] = useState(0)
  const { mode } = breakdownStages[stage]

  useEffect(() => {
    drawPreview(canvasRef.current, map, mode)
  }, [map, mode])

  const buttonStyle = (active, disabled = false) => ({
    flex: '1 1 110px',
    minHeight: '42px',
    padding: '10px 8px',
    border: active
      ? '1px solid #4ce5ed'
      : '1px solid #263b40',
    background: active
      ? 'rgba(76, 229, 237, 0.12)'
      : 'transparent',
    color: active ? '#4ce5ed' : '#82969b',
    fontSize: '10px',
    letterSpacing: '0.7px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'monospace',
    opacity: disabled ? 0.45 : 1,
  })

  return (
    <section
      style={{
        margin: '70px 0',
        padding: 'clamp(20px, 4vw, 42px)',
        background: 'rgba(8, 17, 21, 0.92)',
        border: '1px solid rgba(65, 220, 230, 0.25)',
        position: 'relative',
      }}
    >
      <div
        style={{
          color: '#4ce5ed',
          fontSize: '10px',
          letterSpacing: '2px',
          marginBottom: '16px',
          fontFamily: 'monospace',
        }}
      >
        MODULE_03 / RENDERING PROCESS
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '28px',
        }}
      >
        <div>
          <h2
            style={{
              color: '#edf7f8',
              fontSize: 'clamp(27px, 4vw, 42px)',
              margin: 0,
              letterSpacing: '-1.5px',
            }}
          >
            From shape to light.
          </h2>
          <p
            style={{
              color: '#8da3a9',
              fontSize: '13px',
              lineHeight: 1.7,
              marginBottom: 0,
            }}
          >
            Follow the rendering process one channel at a time.
          </p>
        </div>

        <div
          style={{
            color: '#4ce5ed',
            fontSize: '10px',
            letterSpacing: '1px',
            fontFamily: 'monospace',
          }}
        >
          Input: <span className="breakdown-word">{text || 'blank'}</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        {breakdownStages.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={stage === index}
            onClick={() => setStage(index)}
            style={buttonStyle(stage === index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        style={{
          border: '1px solid #24373b',
          background: '#000',
          padding: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#789197',
            fontSize: '10px',
            letterSpacing: '1px',
            fontFamily: 'monospace',
            marginBottom: '12px',
          }}
        >
          <span>{breakdownStages[stage].name}</span>
          <span>FRAME 0{stage + 1} / 05</span>
        </div>

        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${breakdownStages[stage].name}: ${breakdownStages[stage].description}`}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
          }}
        />
      </div>

      <div
        style={{
          minHeight: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          marginTop: '20px',
        }}
      >
        <p
          style={{
            color: '#a5b8bc',
            fontSize: '13px',
            lineHeight: 1.7,
            maxWidth: '520px',
            margin: 0,
          }}
        >
          {breakdownStages[stage].description}
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setStage(current => Math.max(0, current - 1))}
            disabled={stage === 0}
            style={buttonStyle(false, stage === 0)}
          >
            ← BACK
          </button>

          <button
            type="button"
            onClick={() => setStage(current => Math.min(4, current + 1))}
            disabled={stage === 4}
            style={{
              ...buttonStyle(stage !== 4, stage === 4),
              background: stage === 4 ? 'transparent' : '#4ce5ed',
              color: stage === 4 ? '#405055' : '#071215',
              fontWeight: 700,
            }}
          >
            NEXT STEP →
          </button>
        </div>
      </div>
    </section>
  )
}

function App() {
  const [sampleText, setSampleText] = useState('Amazing')
  const [mode, setMode] = useState('rgb')
  const [shift, setShift] = useState(0)
  const [stripeOrder, setStripeOrder] = useState('RGB')
  const [selectedPixel, setSelectedPixel] = useState(null)
  const [pinnedCrop, setPinnedCrop] = useState(null)

  const grayscaleCanvas = useRef(null)
  const rgbCanvas = useRef(null)
  const grayscaleEdgeCanvas = useRef(null)
  const rgbEdgeCanvas = useRef(null)
  const microscopeCanvas = useRef(null)

  const map = useMemo(
    () => calculateCoverage(sampleText, { shift, stripeOrder }),
    [sampleText, shift, stripeOrder],
  )
  const crop = useMemo(() => pinnedCrop ?? findMicroscopeCrop(map), [map, pinnedCrop])
  const cell = selectedPixel ?? crop.selectedPixel
  const modelX = crop.startX + cell.col
  const modelY = crop.startY + cell.row
  const selectedValues = readPixel(map, modelX, modelY)
  const grayscaleCoverage = averageCoverage(selectedValues.r, selectedValues.g, selectedValues.b)
  const hasWord = sampleText.trim().length > 0

  useEffect(() => {
    drawPreview(grayscaleCanvas.current, map, 'grayscale')
  }, [map])

  useEffect(() => {
    drawPreview(rgbCanvas.current, map, mode)
  }, [map, mode])

  useEffect(() => {
    drawPreview(grayscaleEdgeCanvas.current, map, 'grayscale', crop)
    drawPreview(rgbEdgeCanvas.current, map, mode, crop)
  }, [map, mode, crop])

  useEffect(() => {
    drawMicroscope(microscopeCanvas.current, map, crop, cell)
  }, [map, crop, cell])

  const changeWord = (event) => {
    setSampleText(event.target.value)
    setShift(0)
    setPinnedCrop(null)
    setSelectedPixel(null)
  }

  const changeShift = (value) => {
    if (!hasWord || value === shift) return
    setPinnedCrop(crop)
    setShift(value)
  }

  const changeOrder = (order) => {
    if (order === stripeOrder) return
    setPinnedCrop(crop)
    setStripeOrder(order)
  }

  const findEdge = () => {
    setPinnedCrop(findMicroscopeCrop(map))
    setSelectedPixel(null)
  }

  const handleMicroscopeClick = (event) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const col = Math.floor((event.clientX - rect.left - canvas.clientLeft) / canvas.clientWidth * MICROSCOPE_COLUMNS)
    const row = Math.floor((event.clientY - rect.top - canvas.clientTop) / canvas.clientHeight * MICROSCOPE_ROWS)

    if (col >= 0 && col < MICROSCOPE_COLUMNS && row >= 0 && row < MICROSCOPE_ROWS) {
      setSelectedPixel({ col, row })
    }
  }

  const handleMicroscopeKeyDown = (event) => {
    const movement = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key]

    if (!movement) return

    event.preventDefault()
    const col = Math.max(0, Math.min(MICROSCOPE_COLUMNS - 1, cell.col + movement[0]))
    const row = Math.max(0, Math.min(MICROSCOPE_ROWS - 1, cell.row + movement[1]))
    if (col !== cell.col || row !== cell.row) setSelectedPixel({ col, row })
  }

  const percent = (value) => Math.round(value * 100) + '%'
  const presetShift = shift === 0.33 ? 0 : 0.33
  const presetLabel = presetShift === 0 ? 'Reset to 0 px' : 'Set offset to +0.33 px'

  return (
    <main className="app">
      <div className="scanline" />

      <header className="navbar">
        <a className="brand" href="#" aria-label="Pixel Trick home">
          <span className="brand-mark" aria-hidden="true">PX</span>
          <span>PIXEL<span className="brand-muted">TRICK</span></span>
        </a>
        <a className="nav-guide" href="#how-it-works">How it works</a>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <div className="eyebrow">SUBPIXEL RENDERING</div>
          <h1 id="hero-title">How screens draw <span>a letter’s edge.</span></h1>
          <p className="intro">
            One LCD pixel can have three coloured strips. Move a letter across them and see
            why the red, green, and blue values can differ within a single pixel.
          </p>
          <a className="explore" href="#lab">Try the experiment <span aria-hidden="true">↘</span></a>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="rgb-orb">
            <span className="orb-red" />
            <span className="orb-green" />
            <span className="orb-blue" />
            <div className="orb-center">PX</div>
          </div>
        </div>
      </section>

      <section className="lab" id="lab" tabIndex={-1} aria-labelledby="lab-title">
        <div className="section-heading">
          <div>
            <h2 id="lab-title">See the edge change.</h2>
            <p className="section-description">
              Enter a word and compare its magnified edges. Then shift it and watch the outlined pixel.
            </p>
          </div>
        </div>

        <div className="primary-controls">
          <div className="controls">
            <label htmlFor="sample">Word to render</label>
            <div className="input-wrap">
              <input
                id="sample"
                value={sampleText}
                maxLength={18}
                onChange={changeWord}
                placeholder="Type a word to begin"
              />
            </div>
          </div>

          <div className="offset-control">
            <div className="control-info">
              <label htmlFor="shift">Horizontal offset</label>
              <span>{shift.toFixed(2)} px</span>
            </div>
            <div className="offset-actions">
              <input
                id="shift"
                className="slider"
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={shift}
                disabled={!hasWord}
                aria-valuetext={shift.toFixed(2) + ' model pixels'}
                onChange={(event) => changeShift(Number(event.target.value))}
              />
              <button
                type="button"
                className="offset-preset"
                disabled={!hasWord}
                onClick={() => changeShift(presetShift)}
              >
                {presetLabel}
              </button>
            </div>
          </div>
        </div>

        <div className="lab-results">
          <div>
            <div className="comparison">
              <div className="preview-card">
                <div className="preview-top"><span className="status-dot grey" /> Grayscale</div>
                <canvas
                  ref={grayscaleCanvas}
                  className="preview-canvas"
                  role="img"
                  aria-label={'Grayscale rendering of ' + (sampleText || 'blank input')}
                />
                <div className="edge-preview">
                  <span>Magnified edge</span>
                  <canvas ref={grayscaleEdgeCanvas} className="edge-canvas" role="img" aria-label="Magnified grayscale letter edge" />
                </div>
              </div>
              <div className="preview-card rgb-card">
                <div className="preview-top">
                  <span className={'status-dot ' + (mode === 'rgb' ? 'rgb-dot' : 'grey')} />
                  {mode === 'rgb' ? 'Subpixel ' + stripeOrder : 'Grayscale comparison'}
                </div>
                <canvas
                  ref={rgbCanvas}
                  className="preview-canvas"
                  role="img"
                  aria-label={(mode === 'rgb' ? 'Subpixel ' + stripeOrder : 'Grayscale') + ' rendering of ' + (sampleText || 'blank input')}
                />
                <div className="edge-preview">
                  <span>Magnified edge</span>
                  <canvas
                    ref={rgbEdgeCanvas}
                    className="edge-canvas"
                    role="img"
                    aria-label={mode === 'rgb' ? 'Magnified subpixel letter edge' : 'Magnified grayscale letter edge'}
                  />
                </div>
              </div>
            </div>
            <p className="comparison-note">
              Both close-ups show the same edge. On an LCD with matching stripes, subpixel rendering uses each of the three colour strips separately to place the edge more precisely. Differences in coverage can also leave a coloured fringe.
            </p>
          </div>

          <div className="microscope">
            <div className="microscope-heading">
              <h3>Pixel microscope</h3>
              <button type="button" className="edge-button" onClick={findEdge} disabled={!hasWord}>
                Find an edge
              </button>
            </div>
            <div className="microscope-layout">
              <canvas
                ref={microscopeCanvas}
                className="microscope-canvas"
                tabIndex={0}
                aria-label="Magnified subpixel grid"
                aria-describedby="microscope-help"
                onClick={handleMicroscopeClick}
                onKeyDown={handleMicroscopeKeyDown}
              />

              <div className="microscope-readout">
                <div className="pixel-inspector" aria-live="polite" aria-atomic="true">
                  <div className="inspector-title">
                    <span>Selected model pixel</span>
                    <span>X: {modelX + 1} / Y: {modelY + 1}</span>
                  </div>
                  <div className="channel-values">
                    {[
                      ['Red', selectedValues.r],
                      ['Green', selectedValues.g],
                      ['Blue', selectedValues.b],
                    ].map(([name, value]) => (
                      <div key={name} className={'channel-value ' + name.toLowerCase() + '-value'}>
                        <span className="value-name">{name}</span>
                        <strong>{percent(value)}</strong>
                        <div className="value-track" aria-hidden="true"><span style={{ width: percent(value) }} /></div>
                      </div>
                    ))}
                  </div>
                  {hasWord && (
                    <div className="grayscale-calculation">
                      <div className="grayscale-calculation-title">Grayscale average</div>
                      <div className="grayscale-equation">
                        ({percent(selectedValues.r)} + {percent(selectedValues.g)} + {percent(selectedValues.b)}) ÷ 3
                      </div>
                      <div>≈ <strong>{percent(grayscaleCoverage)}</strong> in each channel</div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="offset-preset microscope-shift"
                  disabled={!hasWord}
                  onClick={() => changeShift(presetShift)}
                >
                  {presetLabel}
                </button>
                <p className="microscope-note" id="microscope-help">
                  Select a cell by tapping it or using the arrow keys. The outline stays on the same pixel when you shift the word.
                </p>
              </div>
            </div>
          </div>
        </div>

        <details className="advanced">
          <summary>Display settings</summary>
          <div className="experiment-controls">
            <div className="control-group" role="group" aria-labelledby="order-label">
              <div className="control-info" id="order-label">Subpixel order</div>
              <div className="mode-buttons">
                {['RGB', 'BGR'].map(order => (
                  <button
                    key={order}
                    type="button"
                    aria-pressed={stripeOrder === order}
                    className={stripeOrder === order ? 'active' : ''}
                    onClick={() => changeOrder(order)}
                  >
                    {order}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group" role="group" aria-labelledby="mode-label">
              <div className="control-info" id="mode-label">Second preview</div>
              <div className="mode-buttons">
                <button type="button" aria-pressed={mode === 'rgb'} className={mode === 'rgb' ? 'active' : ''} onClick={() => setMode('rgb')}>
                  Subpixel
                </button>
                <button type="button" aria-pressed={mode === 'grayscale'} className={mode === 'grayscale' ? 'active' : ''} onClick={() => setMode('grayscale')}>
                  Grayscale
                </button>
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-topline">
          <span className="section-index">02</span>
          <span>HOW THE MODEL WORKS</span>
          <span className="section-line" />
          <span>3 STAGES</span>
        </div>

        <div className="how-heading">
          <div>
            <div className="eyebrow">AFTER THE EXPERIMENT</div>
            <h2>FROM LETTER SHAPE<br /><span>TO PIXEL COLOUR.</span></h2>
          </div>
          <p>
            The browser draws the letter shape into a mask. Pixel Trick averages
            16 samples in each of the three model strips, then uses those coverage values as RGB intensities.
          </p>
        </div>

        <div className="how-grid">
          <article className="how-card">
            <div className="how-number">01 / PIXEL STRUCTURE</div>
            <div className="diagram pixel-diagram">
              <span className="diagram-stripe red-stripe" />
              <span className="diagram-stripe green-stripe" />
              <span className="diagram-stripe blue-stripe" />
              <div className="diagram-caption">R / G / B</div>
            </div>
            <h3>Three light components.</h3>
            <p>
              A typical RGB LCD pixel has red, green, and blue components.
              Together, they make the pixel's colour.
            </p>
            <div className="card-index">FIG. 001</div>
          </article>

          <article className="how-card">
            <div className="how-number">02 / COVERAGE DATA</div>
            <div className="diagram coverage-diagram" aria-hidden="true">
              <span className="diagram-stripe coverage-stripe red-stripe" />
              <span className="diagram-stripe coverage-stripe green-stripe" />
              <span className="diagram-stripe coverage-stripe blue-stripe" />
              <div className="diagram-caption">EXAMPLE COVERAGE</div>
            </div>
            <h3>The edge crosses each one differently.</h3>
            <p>
              A letter edge can cover each component by a different amount.
              The renderer calculates all three values separately.
            </p>
            <div className="card-index">FIG. 002</div>
          </article>

          <article className="how-card">
            <div className="how-number">03 / VISUAL OUTPUT</div>
            <div className="diagram result-diagram">
              <span className="result-pixel" />
              <div className="diagram-caption">EXAMPLE OUTPUT</div>
            </div>
            <h3>Three values make one colour.</h3>
            <p>
              The renderer combines the channel values into one simulated pixel.
              This can make an edge appear smoother on compatible displays.
            </p>
            <div className="card-index">FIG. 003</div>
          </article>
        </div>

        <div className="how-footnote">
          <span>!</span>
          This is a software simulation of subpixel coverage. It does not measure your screen or increase its physical resolution.
        </div>
      </section>

      <PixelBreakdown text={sampleText} map={map} />

      <section className="why-section">
        <div className="section-topline">
          <span className="section-index">04</span>
          <span>REAL-WORLD APPLICATION</span>
          <span className="section-line" />
          <span>WHY IT MATTERS</span>
        </div>

        <div className="why-heading">
          <div>
            <div className="eyebrow">BEYOND THE PIXEL</div>
            <h2>SMALL DETAILS.<br />
              <span>BIG DIFFERENCE.</span>
            </h2>
          </div>
          <p>
            Subpixel rendering is one of the hidden techniques
            that can make digital text look smoother and more refined.
          </p>
        </div>

        <div className="why-grid">
          <article className="why-card">
            <span className="why-number">01 / READABILITY</span>
            <h3>Sharper-looking text.</h3>
            <p>
              By adjusting red, green and blue coverage separately,
              software can create smoother-looking letter edges
              on compatible displays.
            </p>
          </article>

          <article className="why-card">
            <span className="why-number">02 / DISPLAY ORDER</span>
            <h3>RGB is not always RGB.</h3>
            <p>
              Some LCD panels arrange their colour components
              in RGB order, others in BGR. The rendering method
              needs to account for that layout.
            </p>
          </article>

          <article className="why-card">
            <span className="why-number">03 / LIMITATIONS</span>
            <h3>It depends on the screen.</h3>
            <p>
              Subpixel rendering is not universal. Display type,
              pixel orientation and viewing conditions can affect
              the result. It does not add physical pixels.
            </p>
          </article>
        </div>

        <div className="how-footnote">
          <span>!</span>
          This interactive experiment models RGB LCD subpixel coverage.
          Actual display technologies may behave differently.
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark">PX</span>
          PIXEL<span>TRICK</span>
        </div>
        <p>LOOK CLOSER. SEE THE PIXEL.</p>
        <span className="footer-version">DISPLAY TECHNOLOGY / RESEARCH LOG 001</span>
      </footer>
    </main>
  )
}

export default App
