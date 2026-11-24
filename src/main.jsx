import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { destinations } from './campusData.js'
import { days, nextClass, parkingLeadMinutes, permits, suggestSpot } from './parking.js'
import { isParkingStall } from './parkingSimulation.js'
import LotNavigation, { ParkingMapPreview } from './LotNavigation.jsx'
import './styles.css'

const storageKey = 'campuspark.v1'
const tabs = { parking: 'Parking', schedule: 'Schedule', settings: 'Settings' }
const tabIconPaths = {
  parking: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm5 14V7h3a2.5 2.5 0 0 1 0 5h-3',
  schedule: 'M3 10h18M8 3v4m8-4v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 9h2m4 0h2m-8 3h2',
  settings: 'M10 3h4l.6 2.5 1.5.9 2.5-.7 2 3.5-1.8 1.8v2l1.8 1.8-2 3.5-2.5-.7-1.5.9L14 21h-4l-.6-2.5-1.5-.9-2.5.7-2-3.5L5.2 13v-2L3.4 9.2l2-3.5 2.5.7 1.5-.9L10 3Zm5 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
}
const home = { page: 'parking', canGoBack: false }
const weekdays = [1, 2, 3, 4, 5, 6, 0]
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
const buildingOptions = [...destinations].sort(([a], [b]) => a.localeCompare(b))

function meetingHours(start, end) {
  function label(value) {
    const [hour, minute] = value.split(':').map(Number)
    return timeFormat.format(new Date(2000, 0, 1, hour, minute))
  }
  const from = label(start)
  const to = label(end)
  return `${from.slice(-2) === to.slice(-2) ? from.slice(0, -3) : from}–${to}`
}

function classCountdown(start, now) {
  const remaining = start - now
  if (remaining <= 0) return 'Starts now'
  if (remaining < 60_000) return 'Starts in less than 1 min'

  const minutes = Math.ceil(remaining / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor(minutes / 60) % 24
  const parts = []
  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours) parts.push(`${hours} hr`)
  if (!days && minutes % 60) parts.push(`${minutes % 60} min`)
  return `Starts in ${parts.join(' ')}`
}

function load() {
  const defaults = {
    zone: '', courses: [], occupied: [], solidSurfaces: false, textSize: 'system',
    highContrast: false, motion: 'system', directionsOnly: false, mapStyle: 'standard', voiceDirections: true,
  }
  try {
    const saved = { ...defaults, ...JSON.parse(localStorage.getItem(storageKey)) }
    delete saved.parked
    delete saved.preferWalking
    if (saved.mapStyle !== 'aerial') saved.mapStyle = 'standard'
    saved.voiceDirections = saved.voiceDirections !== false
    if (!Object.hasOwn(permits, saved.zone)) saved.zone = ''
    saved.occupied = Array.isArray(saved.occupied) ? [...new Set(saved.occupied.filter(isParkingStall))] : []
    saved.setupComplete = saved.setupComplete ?? Boolean(saved.zone && saved.courses.length)
    return saved
  } catch {
    return defaults
  }
}

function readScreen(historyState) {
  const screen = historyState?.campusPark ?? home
  if (screen.page === 'about') return { ...screen, page: 'settings' }
  if (screen.page === 'building-parking' && !buildingOptions.some(([name]) => name === screen.building)) return home
  if (['route', 'replacement', 'complete'].includes(screen.page)) {
    const spot = screen.trip?.spot
    const destination = screen.trip?.destination ?? screen.trip?.course
    if (!isParkingStall(spot?.id) || spot.shuttle || !destination?.building) return home
    return { ...screen, trip: { spot, destination } }
  }
  return screen
}

function App() {
  const [data, setData] = useState(load)
  const [screen, setScreen] = useState(() => readScreen(history.state))
  const { building, canGoBack, trip } = screen
  const destination = trip?.destination
  const page = data.setupComplete ? screen.page : 'setup'
  const isTabPage = Object.hasOwn(tabs, page)
  const { previousPage = isTabPage ? 'parking' : null } = screen
  const activeTab = isTabPage ? page : page === 'edit' ? (previousPage ?? 'schedule') : 'parking'
  const routing = page === 'route'
  const [now, setNow] = useState(() => new Date())
  const heading = useRef(null)
  const permitButton = useRef(null)
  const { courses, zone, occupied, solidSurfaces, textSize, highContrast, motion, directionsOnly, mapStyle, voiceDirections } = data
  const opaqueSurfaces = solidSurfaces || highContrast
  const hasPermit = Object.hasOwn(permits, zone)
  const editing = courses.find(course => course.id === screen.courseId)
  const next = nextClass(courses, now)
  const suggestion = page === 'parking' && next && suggestSpot(zone, next.building, next.time, now, occupied)
  const buildingSuggestion = page === 'building-parking' && suggestSpot(zone, building, undefined, now, occupied)
  const replacement = page === 'replacement' &&
    suggestSpot(zone, destination.building, undefined, now, [...occupied, trip.spot.id])

  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(data)), [data])
  useLayoutEffect(() => {
    document.documentElement.dataset.textSize = textSize
    document.documentElement.dataset.highContrast = highContrast
  }, [textSize, highContrast])
  useEffect(() => {
    const syncScreen = event => setScreen(readScreen(event.state))
    window.addEventListener('popstate', syncScreen)
    return () => window.removeEventListener('popstate', syncScreen)
  }, [])
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  useEffect(() => {
    const target = page === 'schedule' && screen.focusPermit ? permitButton.current : heading.current
    target?.focus()
  }, [page, screen.focusPermit])

  function update(fields) {
    setData(current => ({ ...current, ...fields }))
  }

  function navigate(page, details = {}, replace = false) {
    const nextScreen = { page, ...details, previousPage: replace ? previousPage : screen.page, canGoBack: !replace || canGoBack }
    if (replace) history.replaceState({ campusPark: nextScreen }, '')
    else history.pushState({ campusPark: nextScreen }, '')
    setScreen(nextScreen)
  }

  function back() {
    if (canGoBack) history.back()
  }

  function selectTab(tab) {
    if (tab === page) return
    if (tab === 'parking' && previousPage === 'parking' && canGoBack) back()
    else navigate(tab, {}, page !== 'parking' && canGoBack)
  }

  function edit(course) {
    navigate('edit', { courseId: course?.id })
  }

  function start(spot, destination) {
    navigate('route', { trip: { spot, destination } }, page === 'replacement')
  }

  function reportOccupied() {
    const { id } = trip.spot
    setData(current => current.occupied.includes(id) ? current : { ...current, occupied: [...current.occupied, id] })
    setNow(new Date())
    navigate('replacement', { trip }, true)
  }

  function finishSetup(zone, course) {
    history.replaceState({ campusPark: home }, '')
    setScreen(home)
    setData(current => ({
      ...current,
      zone,
      courses: course ? [...current.courses, course] : current.courses,
      setupComplete: true,
    }))
  }

  const titles = {
    parking: 'Find parking', schedule: 'Schedule & permit', edit: editing ? 'Edit class' : 'Add class',
    buildings: 'Choose a campus building', 'building-parking': building,
    replacement: replacement ? 'Another parking spot' : 'No replacement available',
    complete: 'You’re parked', settings: 'Settings',
  }

  return (
    <div className={routing ? 'app route-app' : 'app'} data-solid={opaqueSurfaces} data-motion={motion}>
      {!routing && <header className="app-header">
        <div className="wordmark">
          <img className="app-mark" src="/campuspark-icon.png" alt="" width="44" height="44" />
          <span className="wordmark-name">CampusPark</span>
        </div>
        <img className="campus-logo" src="/tamucc-logo-white.png" alt="Texas A&amp;M University-Corpus Christi" width="2760" height="1220" />
      </header>}
      {routing ? <LotNavigation key={trip.spot.id} spot={trip.spot} destination={destination} highContrast={highContrast}
        motion={motion} directionsOnly={directionsOnly} mapStyle={mapStyle} onMapStyleChange={mapStyle => update({ mapStyle })}
        voiceDirections={voiceDirections} onVoiceChange={voiceDirections => update({ voiceDirections })}
        onOccupied={reportOccupied}
        onPark={() => navigate('complete', { trip }, true)} />
        : page === 'setup' ? <FirstLaunch zone={zone} hasClass={courses.length > 0} heading={heading} onFinish={finishSetup} />
        : <main key={page} className={page === 'complete' ? 'completion-page' : 'content-page'}
          data-tab-content={isTabPage ? '' : undefined}>
        {page === 'complete' && <span className="completion-mark" aria-hidden="true">✓</span>}
        <h1 ref={heading} tabIndex={-1}>{titles[page]}</h1>
        {page === 'parking' && <time className="current-date" dateTime={now.toISOString()}>{dateFormat.format(now)}</time>}

        {page === 'parking' && <>
          {hasPermit && <button className="secondary" onClick={() => navigate('buildings')}>Choose a building</button>}
          {!hasPermit || !next ? <section className="screen-section">
            <p className="intro">{!hasPermit
              ? 'Choose your TAMU-CC parking permit to see where you can park.'
              : 'Add a class to get automatic parking suggestions for your schedule.'}</p>
            <button className="primary-action" onClick={() => !hasPermit ? navigate('schedule', { focusPermit: true }) : edit(null)}>
              {!hasPermit ? 'Choose permit zone' : 'Add your first class'}
            </button>
          </section> : <>
            {suggestion ? <SpotRecommendation spot={suggestion} directionsOnly={directionsOnly} highContrast={highContrast} mapStyle={mapStyle}
              onClick={() => start(suggestion, next)} />
              : <section className="screen-section">
                <h2>No parking suggestions</h2>
                <p>{occupied.length > 0
                  ? 'You can clear occupied reports in Settings to include those spots in suggestions again.'
                  : 'Try checking your permit zone for parking near your next class.'}</p>
                <button className="primary-action" onClick={() => navigate('schedule', { focusPermit: true })}>Check permit zone</button>
              </section>}
            <dl className="detail-list">
              <div className="detail-row">
                <dt>Next class</dt>
                <dd>
                  <strong>{next.name}</strong>
                  <span>{dateFormat.format(next.time)}</span>
                  <span className="class-countdown">{classCountdown(next.time, now)}</span>
                  <span>{next.building} · {next.room}</span>
                </dd>
              </div>
              <div className="detail-row"><dt>Parking permit</dt><dd><strong>{permits[zone]}</strong></dd></div>
            </dl>
          </>}
        </>}

        {page === 'buildings' && <>
          <button className="secondary" onClick={back}>Back to parking</button>
          <BuildingPicker onSelect={building => {
            setNow(new Date())
            navigate('building-parking', { building })
          }} />
        </>}

        {page === 'building-parking' && <>
          {buildingSuggestion
            ? <SpotRecommendation spot={buildingSuggestion} directionsOnly={directionsOnly} highContrast={highContrast} mapStyle={mapStyle}
                onClick={() => start(buildingSuggestion, { building })} />
            : <p role="status">There are no suggested spots for your permit near this building right now.</p>}
          <button className="secondary" onClick={back}>Choose another building</button>
        </>}

        {page === 'schedule' && <>
          <section className="screen-section">
            <div className="section-heading">
              <h2>Parking permit</h2>
              {!hasPermit && <span className="muted">Select a permit</span>}
            </div>
            <div className="permit-choices" role="group" aria-label="Parking permit">
              {Object.entries(permits).map(([value, label], index) => <button key={value}
                ref={(hasPermit ? value === zone : index === 0) ? permitButton : undefined}
                className="chip" aria-pressed={zone === value} onClick={() => update({ zone: value })}>{label}</button>)}
            </div>
          </section>
          <section className="screen-section section-divider">
            <div className="section-heading">
              <h2>Your classes</h2>
              <button className="text-action" onClick={() => edit(null)}>Add class</button>
            </div>
            {courses.length === 0 ? <p className="muted">Your schedule is empty. Add your first class.</p>
              : <ul className="course-list">{courses.map(course => <li key={course.id}>
                <button className="course-row" onClick={() => edit(course)}>
                  <span className="course-days">{course.days.length === 7 ? 'Daily'
                    : weekdays.filter(day => course.days.includes(day)).map(day => days[day]).join(' · ')}</span>
                  <span className="course-copy">
                    <strong>{course.name}</strong>
                    <span>{meetingHours(course.start, course.end)}</span>
                    <span>{course.building} · {course.room}</span>
                  </span>
                  <span className="row-chevron" aria-hidden="true">›</span>
                </button>
              </li>)}</ul>}
          </section>
        </>}

        {page === 'edit' && <>
          <CourseForm course={editing} onCancel={back} onSave={course => {
          update({ courses: editing ? courses.map(item => item.id === course.id ? course : item) : [...courses, course] })
          back()
        }} onDelete={editing ? () => {
          if (!window.confirm(`Delete ${editing.name}?`)) return
          update({ courses: courses.filter(item => item.id !== editing.id) })
          back()
        } : undefined} />
        </>}

        {page === 'replacement' && <>
          <p className="alert" role="status">Parking spot {trip.spot.id} was reported occupied.</p>
          {replacement
            ? <SpotRecommendation spot={replacement} directionsOnly={directionsOnly} highContrast={highContrast} mapStyle={mapStyle}
                label="Suggested replacement" action={`Navigate to ${replacement.id}`} onClick={() => start(replacement, destination)} />
            : <p>There are no other suggested spots for your permit near {destination.building} right now.</p>}
          <button className="secondary" onClick={back}>Back to parking</button>
        </>}

        {page === 'complete' && <>
          <p className="completion-location">{trip.spot.road ? trip.spot.lot : `${trip.spot.lot} Lot`} · {trip.spot.id}</p>
          <div className="walking-destination">
            <span className="section-icon" aria-hidden="true">🚶︎</span>
            <div>
              <strong>{destination.building}{destination.room && ` · ${destination.room}`}</strong>
              {destination.name && <p className="muted">{destination.name}</p>}
              <p className="muted">About {Math.ceil(trip.spot.walk)} min walk</p>
            </div>
          </div>
          <button className="primary-action" onClick={back}>Done</button>
        </>}

        {page === 'settings' && <>
          <section className="screen-section">
            <h2 className="icon-heading"><span className="section-icon" aria-hidden="true">◐</span>Appearance</h2>
            <label className="setting-option">
              <input type="checkbox" checked={solidSurfaces} onChange={event => update({ solidSurfaces: event.target.checked })} />
              Reduce transparency
            </label>
            <label>
              Text size
              <select value={textSize} onChange={event => update({ textSize: event.target.value })}>
                <option value="system">System</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra large</option>
              </select>
            </label>
            <label className="setting-option">
              <input type="checkbox" checked={highContrast} onChange={event => update({ highContrast: event.target.checked })} />
              High contrast
            </label>
          </section>
          <section className="screen-section section-divider">
            <h2>Route accessibility</h2>
            <label>
              Reduce motion
              <select value={motion} onChange={event => update({ motion: event.target.value })}>
                <option value="system">System</option>
                <option value="reduce">On</option>
                <option value="animate">Off</option>
              </select>
            </label>
            <label>
              Directions view
              <select value={directionsOnly ? 'directions' : 'map'} onChange={event => update({ directionsOnly: event.target.value === 'directions' })}>
                <option value="map">Map and directions</option>
                <option value="directions">Directions only</option>
              </select>
            </label>
          </section>
          <section className="screen-section section-divider">
            <h2>Parking reports</h2>
            <p>CampusPark skips spots you report as occupied until you clear your reports.</p>
            <button className="secondary" disabled={occupied.length === 0} onClick={() => update({ occupied: [] })}>Clear occupied reports</button>
          </section>
          <section className="section-divider" aria-labelledby="settings-help">
            <h2 id="settings-help">Help &amp; information</h2>
            <details className="settings-details">
              <summary>Privacy &amp; saved data</summary>
              <p>Your class schedule, permit zone, preferences, and occupied reports are saved in this browser or in the Android app. CampusPark uses them on your device and works without an account or location access.</p>
              <p>To delete your saved information, clear this site's data in your browser or clear CampusPark's app storage in Android settings.</p>
            </details>
            <details className="settings-details">
              <summary>How we suggest parking</summary>
              <p>CampusPark finds parking for your next class or a building you choose on the Parking screen. It suggests the spot with the shortest estimated walk that your permit covers on the same campus.</p>
              <p>CampusPark estimates demand by lot, day, and time. For a class, it looks ahead to {parkingLeadMinutes} minutes before class, or uses the current time if you’re already within that window. If you choose a building, it uses the current time.</p>
              <p>If you see no suggestion, check your permit zone under Schedule.</p>
            </details>
            <details className="settings-details">
              <summary>Navigation &amp; parking rules</summary>
              <p>Availability is simulated, so check whether a spot is open when you arrive. Suggestions do not reserve a space.</p>
              <p>The in-lot route is an approximate preview. The marker moves on a timer. Choose Directions only or turn on Reduce motion to advance through the steps yourself.</p>
              <p>Follow posted signs. CampusPark covers standard permit parking in Zones A–D. Check with Parking Services for visitor, accessible, and reserved parking.</p>
              <p><a href="https://www.tamucc.edu/finance-and-administration/auxiliary-services/parking-services/index">TAMU-CC Parking Services</a></p>
            </details>
            <details className="settings-details">
              <summary>About CampusPark</summary>
              <p>CampusPark is a student project by Pixel People for the Human Computer Interaction course at Texas A&amp;M University-Corpus Christi.</p>
            </details>
          </section>
        </>}
      </main>}
      <nav aria-label="Main navigation">
        {Object.entries(tabs).map(([key, label]) => <button key={key} type="button" disabled={page === 'setup'}
          aria-current={key === activeTab ? (isTabPage ? 'page' : 'location') : undefined} onClick={() => selectTab(key)}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d={tabIconPaths[key]} />
          </svg>
          {label}
        </button>)}
      </nav>
    </div>
  )
}

function BuildingPicker({ onSelect }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const matches = buildingOptions.filter(([name, code]) => name.toLowerCase().includes(query) || code.toLowerCase().includes(query))

  return <>
    <label>Search buildings
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} />
    </label>
    {matches.length > 0 ? <ul className="building-list">
      {matches.map(([name, code]) => <li key={name}>
        <button type="button" className="building-row" onClick={() => onSelect(name)}>
          <span className="building-name">{name}</span>
          {code && <span className="building-code muted">{code}</span>}
          <span className="row-chevron" aria-hidden="true">›</span>
        </button>
      </li>)}
    </ul> : <p role="status">No buildings match your search.</p>}
  </>
}

function FirstLaunch({ zone, hasClass, heading, onFinish }) {
  const [permit, setPermit] = useState(zone)
  const [showClass, setShowClass] = useState(false)

  useLayoutEffect(() => {
    heading.current?.focus()
  }, [heading, showClass])

  return <main className="first-launch">
    <section className="setup-card" aria-labelledby="setup-title">
      <ol className="setup-steps" aria-label="Setup progress">
        <li data-done={showClass} aria-current={showClass ? undefined : 'step'}>
          <span className="step-marker" aria-hidden="true">{showClass ? '✓' : '1'}</span>Permit
        </li>
        <li aria-current={showClass ? 'step' : undefined}>
          <span className="step-marker" aria-hidden="true">2</span>Class schedule
        </li>
      </ol>
      <h1 id="setup-title" ref={heading} tabIndex={-1}>{showClass ? 'Add your first class' : 'Welcome to CampusPark'}</h1>
      <div className="setup-panel" hidden={!showClass}>
        <p className="intro">CampusPark uses your schedule to find parking near your next class.</p>
        <CourseForm submitLabel="Finish setup" cancelLabel="Back to permit"
          onSave={course => onFinish(permit, course)} onCancel={() => setShowClass(false)} />
        <button type="button" className="text-action" onClick={() => onFinish(permit)}>Add a class later</button>
      </div>
      {!showClass && <form className="course-form" onSubmit={event => {
        event.preventDefault()
        if (hasClass) onFinish(permit)
        else setShowClass(true)
      }}>
        <p className="intro">Choose your TAMU-CC permit to get parking suggestions. Setup is saved on this device.</p>
        <label>Parking permit
          <select value={permit} onChange={event => setPermit(event.target.value)} required>
            <option value="" disabled>Select your permit zone</option>
            {Object.entries(permits).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="primary-action" type="submit">{hasClass ? 'Finish setup' : 'Continue'}</button>
      </form>}
    </section>
  </main>
}

function SpotRecommendation({ spot, directionsOnly, highContrast, mapStyle, label = 'Suggested parking spot', action = 'Start navigation', onClick }) {
  return <section className="recommendation">
    <p className="recommendation-label">{label}</p>
    <h2 className="spot">{spot.road ? spot.lot : `${spot.lot} Lot`}</h2>
    <p><strong>Parking spot {spot.id}</strong> · About {Math.ceil(spot.walk)} min walk</p>
    {!directionsOnly && <ParkingMapPreview spot={spot} highContrast={highContrast} mapStyle={mapStyle} />}
    <button className="primary-action" onClick={onClick}>{action}</button>
    {spot.road && <p className="recommendation-note">{spot.road} · Estimated availability · {spot.availableInArea} of {spot.modeledInArea} spots</p>}
  </section>
}

function CourseForm({ course, onSave, onCancel, onDelete, submitLabel = 'Save class', cancelLabel = 'Cancel' }) {
  const [error, setError] = useState('')

  function save(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const name = fields.get('name').trim()
    const room = fields.get('room').trim()
    const start = fields.get('start')
    const end = fields.get('end')
    const selectedDays = fields.getAll('days').map(Number)
    if (!name || !room || !selectedDays.length || start >= end) {
      setError('Enter the course and room, choose meeting days, and set an end time after the start.')
      return
    }
    onSave({ id: course?.id ?? crypto.randomUUID(), name, room, start, end, days: selectedDays, building: fields.get('building') })
  }

  return <form className="course-form" onSubmit={save}>
    <label>Course name / number<input name="name" defaultValue={course?.name} required /></label>
    <fieldset>
      <legend>Meeting days</legend>
      <div className="choices">
        {weekdays.map(day => <label key={day} className="day"><input type="checkbox" name="days" value={day} defaultChecked={course?.days.includes(day)} /> {days[day]}</label>)}
      </div>
    </fieldset>
    <div className="times">
      <label>Start time<input name="start" type="time" defaultValue={course?.start} required /></label>
      <label>End time<input name="end" type="time" defaultValue={course?.end} required /></label>
    </div>
    <label>Building<select name="building" defaultValue={course?.building ?? destinations[0][0]}>
      {buildingOptions.map(([building, code]) => <option key={building} value={building}>{code ? `${building} (${code})` : building}</option>)}
    </select></label>
    <label>Room<input name="room" defaultValue={course?.room} required /></label>
    {error && <p role="alert" className="alert">{error}</p>}
    <button className="primary-action" type="submit">{submitLabel}</button>
    <button type="button" className="secondary" onClick={onCancel}>{cancelLabel}</button>
    {onDelete && <button type="button" className="text-action danger" onClick={onDelete}>Delete class</button>}
  </form>
}

createRoot(document.getElementById('root')).render(<App />)
