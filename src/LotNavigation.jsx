import { useEffect, useMemo, useRef, useState } from 'react'
import CampusRouteMap from './CampusRouteMap.jsx'
import { campusRoute, maneuverText, remainingManeuverFeet } from './campusRoute.js'
import { canSpeakDirections, speakDirection } from './navigationSpeech.js'

const driveTime = 20_000

function spokenText(text, spotId) {
  return `${text.replace(spotId, [...spotId.replaceAll('-', '')].join(' '))}.`
}

function timedDrive(route, spotId) {
  const { steps, total } = route
  let elapsed = 0
  const segments = steps.map((step, index) => {
    const from = steps[index - 1]?.at ?? 0
    const target = index === steps.length - 1 ? total : step.at
    const feet = remainingManeuverFeet(route, step, from)
    const prompt = maneuverText(step, feet)
    const promptTime = 300 + spokenText(prompt, spotId).split(/\s+/).length * 350
    const duration = Math.max(promptTime, (target - from) / total * driveTime)
    const segment = { from, target, start: elapsed, duration, feet, prompt }
    elapsed += duration
    return segment
  })
  return { segments, duration: elapsed }
}

function parkingLotName(spot) {
  return spot.road ? spot.lot : `${spot.lot} Lot`
}

export function ParkingMapPreview({ spot, highContrast, mapStyle }) {
  const route = useMemo(() => campusRoute(spot), [spot])
  return route && <CampusRouteMap route={route} spot={spot} lotName={parkingLotName(spot)}
    highContrast={highContrast} mapStyle={mapStyle} preview />
}

export default function LotNavigation({
  spot, destination, highContrast, directionsOnly, mapStyle, voiceDirections,
  onMapStyleChange, onVoiceChange, onOccupied, onPark,
}) {
  const turn = useRef(null)
  const animation = useRef({ distance: 0, paint: null })
  const [{ arrived, stepIndex, remainingFeet }, setDriveStatus] = useState({
    arrived: false, stepIndex: 0, remainingFeet: null,
  })
  const [voiceUnavailable, setVoiceUnavailable] = useState(false)
  const lotName = parkingLotName(spot)
  const route = useMemo(() => campusRoute(spot), [spot])
  const driveTiming = useMemo(() => timedDrive(route, spot.id), [route, spot.id])
  const { steps, total, hasStall } = route
  const step = steps[stepIndex]
  const segment = driveTiming.segments[stepIndex]
  const feet = remainingFeet ?? segment.feet
  const arrivalText = hasStall ? `Arrived at demo spot ${spot.id}` : `Arrived at the ${route.destination}`
  const arrow = arrived ? '✓' : step.arrow
  const instruction = arrived ? arrivalText : maneuverText(step, feet)
  const supportsVoice = canSpeakDirections()

  useEffect(() => { turn.current.focus() }, [spot.id])

  useEffect(() => {
    if (!voiceDirections || !supportsVoice || document.hidden) return
    const message = arrived ? arrivalText : maneuverText(step, remainingManeuverFeet(route, step, animation.current.distance))
    const stop = speakDirection(spokenText(message, spot.id), setVoiceUnavailable)
    const stopIfHidden = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', stopIfHidden)
    return () => {
      document.removeEventListener('visibilitychange', stopIfHidden)
      stop()
    }
  }, [voiceDirections, supportsVoice, arrived, arrivalText, route, spot.id, step])

  useEffect(() => {
    if (arrived) return
    const startedAt = performance.now()
    const drive = animation.current
    let lastStep = -1
    let lastFeet = -1
    const { segments, duration } = driveTiming

    function animate(now) {
      const elapsed = Math.min(duration, Math.max(0, now - startedAt))
      const activeStep = segments.findLastIndex(segment => segment.start <= elapsed)
      const { from, target, start, duration: segmentTime } = segments[activeStep]
      const progress = Math.min(1, (elapsed - start) / segmentTime)
      drive.distance = from + (target - from) * progress
      drive.paint?.()
      const finished = elapsed === duration
      const nextFeet = remainingManeuverFeet(route, route.steps[activeStep], drive.distance)
      if (activeStep !== lastStep || nextFeet !== lastFeet || finished) {
        lastStep = activeStep
        lastFeet = nextFeet
        setDriveStatus({ arrived: finished, stepIndex: activeStep, remainingFeet: nextFeet })
      }
      if (!finished) frame = requestAnimationFrame(animate)
    }

    let frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [arrived, driveTiming, route])

  return <main className={arrived ? 'navigation-screen arrived' : 'navigation-screen'}>
    <div className={directionsOnly ? 'map-stage' : 'map-stage map-stage-full'}>
      <div className="turn-card">
        <span className="turn-arrow" aria-hidden="true">{arrow}</span>
        <div>
          <p>Campus drive demo</p>
          <h1 ref={turn} tabIndex={-1}>{instruction}</h1>
          <span className="route-announcement" aria-live="polite">{arrived ? arrivalText : segment.prompt}</span>
        </div>
      </div>
      {!directionsOnly && <div className="navigation-map">
        <CampusRouteMap route={route} spot={spot} lotName={lotName} highContrast={highContrast} mapStyle={mapStyle}
          distance={total} animation={!arrived ? animation.current : undefined} />
        <div className="map-style-control" role="group" aria-label="Map style">
          <button type="button" aria-pressed={mapStyle === 'standard'} onClick={() => onMapStyleChange('standard')}>Standard</button>
          <button type="button" aria-pressed={mapStyle === 'aerial'} onClick={() => onMapStyleChange('aerial')}>Aerial</button>
        </div>
      </div>}
    </div>
    <section className="route-sheet" aria-label="Parking destination">
      <div className="route-destination">
        <div><h2>{spot.id}</h2><p>{lotName} · Demo stall</p></div>
        <div className="route-status">
          {arrived && <span className="route-arrival">Arrived</span>}
          {supportsVoice && <button className="secondary route-voice" type="button" aria-label="Voice directions"
            aria-pressed={voiceDirections} onClick={() => onVoiceChange(!voiceDirections)}>
            {voiceDirections ? 'Voice on' : 'Voice off'}
          </button>}
        </div>
      </div>
      {voiceDirections && (!supportsVoice || voiceUnavailable) && <p className="route-voice-status" role="status">Voice unavailable</p>}
      {arrived && <div className="route-walk">
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
