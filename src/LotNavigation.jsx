import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const width = 400
const height = 470
const driveTime = 16_000
const driveZoom = 1.55
const driveLookAhead = 38
const simulatedSpaces = Array.from({ length: 8 }, (_, column) => 88 + column * 32)
const legacyLayouts = {
  Tarpon: { lane: 212, entrance: 72, spaces: [188, 240, 292] },
  'Sea Horse': { lane: 180, entrance: 326, spaces: [224, 172] },
  Hammerhead: { lane: 240, entrance: 85, spaces: [204, 256] },
}

function aisleLayout(spot) {
  const layout = spot.road ? {
    lane: 168 + (spot.row % 4) * 23,
    entrance: spot.row % 2 === 0 ? 54 : 346,
    spaces: simulatedSpaces,
  } : legacyLayouts[spot.lot] ?? legacyLayouts.Tarpon
  return {
    ...layout,
    aisle: spot.aisle,
    road: spot.road,
    spaceWidth: spot.road ? 32 : 13,
  }
}

function routePoints({ entrance, lane, spaces }, column) {
  const stall = spaces[column]
  return [[entrance, 388], [entrance, lane], [stall, lane], [stall, lane - 48]]
}

function cameraPan(position, size) {
  return Math.min(0, Math.max(1 - driveZoom, .5 - position / size * driveZoom)) * 100
}

function drawMap(canvas, layout, route, top, highContrast) {
  const context = canvas.getContext('2d')
  const theme = getComputedStyle(canvas)
  const labelSize = Number.parseFloat(theme.fontSize) * (highContrast ? .875 : .75)
  context.setTransform(2, 0, 0, 2, 0, -top * 2)
  const { lane, entrance, spaces } = layout
  const [activeSpace] = route.at(-1)
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
  const label = (text, x, y) => {
    context.font = `${highContrast ? 700 : 600} ${labelSize}px system-ui`
    context.textAlign = 'center'
    context.fillStyle = highContrast ? '#000' : '#546579'
    context.fillText(text, x, y)
  }
  const road = (points, size) => {
    line(points, highContrast ? '#555' : '#d5dcd9', size + 3)
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
  const bankStart = Math.min(...spaces) - 16
  const bankEnd = Math.max(...spaces) + 16
  rect('#e2e6e5', bankStart, lane - 58, bankEnd - bankStart, 38)
  rect('#e2e6e5', bankStart, lane + 20, bankEnd - bankStart, 38)
  for (let x = bankStart; x <= bankEnd; x += layout.spaceWidth) {
    rect(highContrast ? '#555' : '#fff', x, lane - 53, 1, 32)
    rect(highContrast ? '#555' : '#fff', x, lane + 21, 1, 32)
  }
  if (highContrast) rect('#000', activeSpace - 12, lane - 59, 24, 40)
  rect(highContrast ? '#ffdc4c' : '#b9dafa', activeSpace - 10, lane - 57, 20, 36)
  for (const [x, y] of [[22, 141], [36, 159], [19, 177], [361, 140], [368, 160], [28, 333], [44, 340], [348, 431], [366, 445], [72, 438], [90, 451]]) {
    context.beginPath()
    context.arc(x, y, 5, 0, Math.PI * 2)
    context.fillStyle = '#bfd8b6'
    context.fill()
  }
  label('Aisle ' + layout.aisle, 200, lane + 75)
  label('Lot entrance', entrance, 420)
  label(layout.road ?? 'Lot access road', 200, 447)
  const blue = theme.getPropertyValue('--blue').trim()
  const deepBlue = theme.getPropertyValue('--deep-blue').trim()
  line(route, '#fff', 16)
  line(route, deepBlue, 11)
  line(route, blue, 7)
  if (!top) {
    const [x, y] = route[0]
    context.beginPath()
    context.arc(x, y, 5, 0, Math.PI * 2)
    context.fillStyle = '#fff'
    context.fill()
    context.lineWidth = 2
    context.strokeStyle = deepBlue
    context.stroke()
  }
}

function LotMap({ spot, highContrast, textSize, preview = false, camera, children }) {
  const canvas = useRef(null)
  const layout = useMemo(() => aisleLayout(spot), [spot])
  const route = useMemo(() => routePoints(layout, spot.column), [layout, spot.column])
  const [stallX, stallY] = route.at(-1)
  const lotName = spot.road ? spot.lot : `${spot.lot} Lot`
  const top = preview ? layout.lane - 96 : 0
  const mapHeight = preview ? 180 : height

  useEffect(() => {
    drawMap(canvas.current, layout, route, top, highContrast)
  }, [layout, route, top, highContrast, textSize])

  return <div className={preview ? 'lot-map parking-map-preview' : 'lot-map'} role="img"
    style={preview ? { aspectRatio: `${width} / ${mapHeight}` } : undefined}
    aria-label={`Route from the lot entrance through aisle ${spot.aisle} to parking spot ${spot.id} in ${lotName}`}>
    <div ref={camera} className="lot-map-scene" style={camera ? { '--map-zoom': driveZoom } : undefined}>
      <canvas ref={canvas} width={width * 2} height={mapHeight * 2} aria-hidden="true" />
      <span className="stall-pin" style={{ left: `${stallX / width * 100}%`, top: `${(stallY - top) / mapHeight * 100}%` }}><b>P</b>{spot.id}</span>
      {children}
    </div>
  </div>
}

export function ParkingMapPreview({ spot, highContrast, textSize }) {
  return <LotMap spot={spot} highContrast={highContrast} textSize={textSize} preview />
}

export default function LotNavigation({ spot, destination, highContrast, textSize, motion, directionsOnly, onEnd, onOccupied, onPark }) {
  const turn = useRef(null)
  const marker = useRef(null)
  const camera = useRef(null)
  const elapsed = useRef(0)
  const [{ completed, animatedStep }, setDriveStatus] = useState({ completed: false, animatedStep: 0 })
  const [manualStep, setManualStep] = useState(0)
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const manual = directionsOnly || motion === 'reduce' || (motion === 'system' && systemReducedMotion)
  const lotName = spot.road ? spot.lot : `${spot.lot} Lot`
  const route = useMemo(() => routePoints(aisleLayout(spot), spot.column), [spot])
  const [[entrance, startY], [, lane], [stall], [, stallY]] = route
  const arrived = !manual && completed
  const step = manual ? manualStep : animatedStep
  const direction = stall > entrance ? 1 : -1
  const instructions = [
    [direction === 1 ? '↱' : '↰', `Turn ${direction === 1 ? 'right' : 'left'} at aisle ${spot.aisle}`],
    [direction === 1 ? '↰' : '↱', `Turn ${direction === 1 ? 'left' : 'right'} into ${spot.id}`],
    ['↑', `Pull into spot ${spot.id}`],
  ]
  const [arrow, instruction] = arrived ? ['✓', `Arrived at ${spot.id}`] : instructions[step]

  useEffect(() => { turn.current.focus() }, [spot.id])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => setSystemReducedMotion(preference.matches)
    preference.addEventListener('change', syncPreference)
    syncPreference()
    return () => preference.removeEventListener('change', syncPreference)
  }, [])

  useLayoutEffect(() => {
    if (manual || arrived) return
    const scene = camera.current
    const firstTurn = startY - lane
    const secondTurn = firstTurn + Math.abs(stall - entrance)
    const total = secondTurn + lane - stallY
    const startedAt = performance.now() - elapsed.current
    let lastStep
    const positionAt = distance => [
      entrance + direction * Math.min(Math.max(0, distance - firstTurn), secondTurn - firstTurn),
      startY - Math.min(distance, firstTurn) - Math.max(0, distance - secondTurn),
    ]
    function moveVehicle(distance) {
      const [x, y] = positionAt(distance)
      const [aheadX, aheadY] = positionAt(Math.min(total, distance + driveLookAhead))
      marker.current.style.translate = `${x / width * 100}% ${y / height * 100}%`
      scene.style.translate = `${cameraPan(aheadX, width)}% ${cameraPan(aheadY, height)}%`
    }
    function animate(now) {
      if (!marker.current) return
      elapsed.current = Math.min(driveTime, Math.max(0, now - startedAt))
      const distance = total * elapsed.current / driveTime
      const step = distance < firstTurn ? 0 : distance < secondTurn ? 1 : 2
      const completed = elapsed.current === driveTime
      moveVehicle(distance)
      if (step !== lastStep || completed) {
        lastStep = step
        setDriveStatus({ completed, animatedStep: step })
      }
      if (!completed) frame = requestAnimationFrame(animate)
    }
    moveVehicle(total * elapsed.current / driveTime)
    let frame = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frame)
      scene.style.removeProperty('translate')
    }
  }, [manual, arrived, entrance, startY, lane, stall, stallY, direction])

  return <main className={arrived ? 'navigation-screen arrived' : 'navigation-screen'}>
    <div className={directionsOnly ? 'map-stage' : 'map-stage map-stage-full'}>
      <div className="turn-card">
        <span className="turn-arrow" aria-hidden="true">{arrow}</span>
        <div>
          <p>Simulated drive{manual && ` · Step ${step + 1} of ${instructions.length}`}</p>
          <h1 ref={turn} tabIndex={-1} aria-live="polite">{instruction}</h1>
        </div>
        <button className="nav-back" onClick={onEnd} aria-label="Back to parking">←</button>
      </div>
      {!directionsOnly && <LotMap spot={spot} highContrast={highContrast} textSize={textSize}
        camera={!manual && !arrived ? camera : undefined}>
        {!manual && !arrived && <span ref={marker} className="driver-position" aria-hidden="true"
          style={{ translate: `${entrance / width * 100}% ${startY / height * 100}%` }}>
          <span className="driver-marker" style={{ rotate: animatedStep === 1 ? `${direction * 90}deg` : undefined }} />
        </span>}
      </LotMap>}
    </div>
    <section className="route-sheet" aria-label="Parking destination">
      <div className="route-destination">
        <div><h2>{spot.id}</h2><p>{lotName} · Aisle {spot.aisle}</p></div>
        {arrived && <span className="route-arrival">Arrived</span>}
      </div>
      {manual && <>
        <h2>Route directions</h2>
        <ol className="route-steps">{instructions.map(([, text], index) => <li key={text}
          aria-current={index === step ? 'step' : undefined}>{text}</li>)}</ol>
        <div className="route-step-controls">
          <button className="secondary" type="button" disabled={step === 0} onClick={() => setManualStep(step - 1)}>Previous step</button>
          <button className="secondary" type="button" disabled={step === instructions.length - 1}
            onClick={() => setManualStep(step + 1)}>Next step</button>
        </div>
      </>}
      {(arrived || manual && step === instructions.length - 1) && <div className="route-walk">
        <strong>{destination.building}{destination.room && ` · ${destination.room}`}</strong>
        <p>About {Math.ceil(spot.walk)} min walk</p>
      </div>}
      <div className="route-actions">
        <button type="button" className="secondary" onClick={onOccupied}>Spot occupied</button>
        <button type="button" onClick={onPark}>I’ve parked</button>
      </div>
    </section>
  </main>
}
