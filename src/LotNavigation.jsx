import { useEffect, useRef, useState } from 'react'

const width = 400
const height = 470
const driveTime = 16_000
const layouts = {
  Tarpon: { lane: 212, entrance: 72, spaces: [188, 240, 292] },
  'Sea Horse': { lane: 180, entrance: 326, spaces: [224, 172] },
  Hammerhead: { lane: 240, entrance: 85, spaces: [204, 256] },
  'Rec Field': { lane: 198, entrance: 318, spaces: [216] },
}

function drawMap(canvas, layout, route, activeSpace) {
  const context = canvas.getContext('2d')
  const theme = getComputedStyle(canvas)
  context.setTransform(2, 0, 0, 2, 0, 0)
  const { lane, entrance, spaces } = layout
  const rect = (color, x, y, w, h) => {
    context.fillStyle = color
    context.fillRect(x, y, w, h)
  }
  const line = (points, color, thickness) => {
    context.beginPath()
    points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y))
    context.strokeStyle = color
    context.lineWidth = thickness
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.stroke()
  }
  const label = (text, x, y, color = '#546579') => {
    context.font = '600 12px system-ui'
    context.textAlign = 'center'
    context.fillStyle = color
    context.fillText(text, x, y)
  }
  const road = (points, size) => {
    line(points, '#d5dcd9', size + 3)
    line(points, '#fff', size)
  }
  rect('#e9eee8', 0, 0, width, height)
  rect('#dcebd7', 0, 0, width, 94)
  rect('#dcebd7', 0, 419, width, 51)
  rect('#dcebd7', entrance < 200 ? 290 : 12, 310, 100, 47)
  rect('#dbebf2', 382, 0, 18, 470)
  const side = entrance < 200 ? 1 : -1
  const paths = side > 0 ? [[146, 272], [146, 342], [300, 342], [300, 385]] : [[253, 268], [253, 340], [89, 340], [89, 385]]
  line(paths, '#d2dad4', 6)
  line(paths, '#f9fbf8', 4)
  const landscaping = side > 0 ? 156 : 31
  rect('#dcebd7', landscaping, 304, 137, 29)
  rect('#cbded0', landscaping + 10, 313, 117, 8)
  rect('#e0e1db', side > 0 ? 317 : 21, 322, 47, 28)
  rect('#eceae4', side > 0 ? 320 : 24, 325, 41, 22)
  road([[0, 109], [110, 105], [254, 108], [390, 96]], 15)
  road([[0, 391], [104, 388], [293, 388], [400, 373]], 38)
  road([[entrance, 388], [entrance, lane]], 31)
  road([[54, lane], [346, lane]], 39)
  const bankStart = Math.min(...spaces) - 40
  const bankEnd = Math.max(...spaces) + 40
  rect('#e2e6e5', bankStart, lane - 58, bankEnd - bankStart, 38)
  rect('#e2e6e5', bankStart, lane + 20, bankEnd - bankStart, 38)
  for (let x = bankStart + 4; x < bankEnd; x += 13) {
    rect('#fff', x, lane - 53, 1, 32)
    rect('#fff', x, lane + 21, 1, 32)
  }
  rect('#b9dafa', activeSpace - 10, lane - 57, 20, 36)
  for (const [x, y] of [[22, 141], [36, 159], [19, 177], [361, 140], [368, 160], [28, 333], [44, 340], [348, 431], [366, 445], [72, 438], [90, 451]]) {
    context.beginPath()
    context.arc(x, y, 5, 0, Math.PI * 2)
    context.fillStyle = '#bfd8b6'
    context.fill()
  }
  label('Aisle ' + layout.aisle, 200, lane + 83)
  label('Lot access road', 200, 409)
  line(route, '#fff', 16)
  line(route, theme.getPropertyValue('--deep-blue').trim(), 11)
  line(route, theme.getPropertyValue('--blue').trim(), 7)
}

export default function LotNavigation({ spot, solidSurfaces, onOccupied, onEnd, onPark }) {
  const canvas = useRef(null)
  const turn = useRef(null)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const layout = layouts[spot.lot] ?? layouts.Tarpon
  const { lane, entrance, spaces } = layout
  const stall = spaces[spot.column]
  const corners = [[entrance, 388], [entrance, lane], [stall, lane]]
  const segments = [388 - lane, Math.abs(stall - entrance), 48]
  const total = segments.reduce((sum, length) => sum + length, 0)
  const arrived = elapsed >= driveTime
  const travelled = total * elapsed / driveTime
  const step = travelled < segments[0] ? 0 : travelled < segments[0] + segments[1] ? 1 : 2
  const direction = stall > entrance ? 1 : -1
  const turns = [entrance < stall ? 'Turn right' : 'Turn left', entrance < stall ? 'Turn left' : 'Turn right']
  const positions = [
    [entrance, 388 - travelled, 0],
    [entrance + direction * (travelled - segments[0]), lane, direction * 90],
    [stall, lane - (travelled - segments[0] - segments[1]), 0],
  ]
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [x, y, heading] = reducedMotion && !arrived ? [...corners[step], positions[step][2]] : positions[step]

  useEffect(() => {
    drawMap(canvas.current, { ...layout, aisle: spot.aisle }, [[entrance, 388], [entrance, lane], [stall, lane], [stall, lane - 48]], stall)
    turn.current.focus()
  }, [layout, entrance, lane, stall, spot.aisle])

  useEffect(() => {
    if (paused || arrived) return
    let last = performance.now()
    const timer = setInterval(() => {
      const now = performance.now()
      const delta = now - last
      last = now
      setElapsed(value => Math.min(driveTime, value + delta))
    }, 100)
    return () => clearInterval(timer)
  }, [paused, arrived])

  return <main className={arrived ? 'navigation-screen arrived' : 'navigation-screen'} data-solid={solidSurfaces}>
    <div className="map-stage">
      <div className="lot-map" role="img" aria-label={`Route from the ${spot.lot} Lot entrance to space ${spot.id} in aisle ${spot.aisle}`}>
        <canvas ref={canvas} width={width * 2} height={height * 2} aria-hidden="true" />
        <span className="stall-pin" style={{ left: `${stall / width * 100}%`, top: `${(lane - 48) / height * 100}%` }}><b>P</b>{spot.id}</span>
        {!arrived && <span className="driver-marker" style={{ left: `${x / width * 100}%`, top: `${y / height * 100}%`, rotate: `${heading}deg` }} />}
      </div>
      <div className="turn-card">
        <span className="turn-arrow" aria-hidden="true">{arrived ? '✓' : step === 1 ? '↑' : (step === 0 ? turns[0] : turns[1]) === 'Turn right' ? '↱' : '↰'}</span>
        <div>
          <p>{paused ? 'Route paused' : spot.lot + ' Lot'}</p>
          <h1 ref={turn} tabIndex={-1} aria-live="polite">{arrived ? `Arrived at ${spot.id}` : step === 0 ? `${turns[0]} into aisle ${spot.aisle}` : step === 1 ? `Continue toward ${spot.id}` : `${turns[1]} into ${spot.id}`}</h1>
        </div>
        <button className="nav-back" onClick={onEnd} aria-label="Back to parking">←</button>
      </div>
      {!arrived && <button className="route-pause" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume route' : 'Pause route'}>{paused ? '▶' : 'Ⅱ'}</button>}
    </div>
    <section className="route-sheet" aria-label="Parking destination">
      <div className="route-destination">
        <div><h2>{spot.id}</h2><p>{spot.lot} Lot · Aisle {spot.aisle}</p></div>
        <span className="route-time">{arrived ? 'Arrived' : `${Math.ceil((driveTime - elapsed) / 1000)} sec`}</span>
      </div>
      <div className="route-actions">
        <button className="secondary" onClick={onOccupied}>Spot occupied</button>
        <button onClick={onPark}>I’ve parked</button>
      </div>
    </section>
  </main>
}
