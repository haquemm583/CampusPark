import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { buildings, days, nextClass, suggestSpot, zones } from './parking.js'
import LotNavigation from './LotNavigation.jsx'
import './styles.css'

const storageKey = 'campuspark.v1'
const tabs = { parking: 'Parking', schedule: 'Schedule', about: 'About' }
const tabIcons = { parking: 'P', schedule: '▤', about: 'ⓘ' }
const home = { page: 'parking', canGoBack: false }
const weekdays = [1, 2, 3, 4, 5, 6, 0]
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function load() {
  const defaults = { zone: '', courses: [], occupied: [], solidSurfaces: false }
  try {
    const saved = { ...defaults, ...JSON.parse(localStorage.getItem(storageKey)) }
    delete saved.parked
    return saved
  } catch {
    return defaults
  }
}

function App() {
  const [data, setData] = useState(load)
  const [screen, setScreen] = useState(() => history.state?.campusPark ?? home)
  const { page, canGoBack, trip } = screen
  const [now, setNow] = useState(() => new Date())
  const heading = useRef(null)
  const { courses, zone, occupied, solidSurfaces } = data
  const editing = courses.find(course => course.id === screen.courseId)
  const next = nextClass(courses, now)
  const suggestion = next && suggestSpot(zone, next.building, occupied)
  const replacement = trip && suggestSpot(zone, trip.course.building, occupied)

  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(data)), [data])
  useEffect(() => {
    const syncScreen = event => setScreen(event.state?.campusPark ?? home)
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
  useEffect(() => { heading.current?.focus() }, [page])

  function update(fields) {
    setData(current => ({ ...current, ...fields }))
  }

  function navigate(page, details = {}, replace = false) {
    const nextScreen = { page, ...details, canGoBack: !replace || canGoBack }
    if (replace) history.replaceState({ campusPark: nextScreen }, '')
    else history.pushState({ campusPark: nextScreen }, '')
    setScreen(nextScreen)
  }

  function back() {
    if (canGoBack) history.back()
  }

  function selectTab(tab) {
    if (tab === page) return
    if (tab === 'parking') back()
    else navigate(tab, {}, page !== 'parking')
  }

  function edit(course) {
    navigate('edit', { courseId: course?.id })
  }

  function start(spot, course) {
    navigate('route', { trip: { spot, course } }, page === 'replacement')
  }

  function reportOccupied() {
    update({ occupied: [...new Set([...occupied, trip.spot.id])] })
    navigate('replacement', { trip }, true)
  }

  const titles = {
    parking: 'Find parking', schedule: 'Schedule & permit', edit: editing ? 'Edit class' : 'Add class',
    route: trip && `${trip.spot.lot} Lot`, replacement: replacement ? 'Another space nearby' : 'No spaces available',
    complete: 'You’re parked', about: 'About CampusPark',
  }

  if (page === 'route') return <LotNavigation key={trip.spot.id} spot={trip.spot} solidSurfaces={solidSurfaces} onOccupied={reportOccupied} onEnd={back} onPark={() => {
    navigate('complete', { trip }, true)
  }} />

  return (
    <div className="app" data-solid={solidSurfaces}>
      <header className="app-header">
        {canGoBack && <button className="back secondary" onClick={back}>← Back</button>}
        <span className="wordmark"><img className="app-mark" src="/campuspark-icon.png" alt="" />CampusPark</span>
      </header>
      <main className={page === 'complete' ? 'completion-page' : 'content-page'}>
        {page === 'complete' && <span className="completion-mark" aria-hidden="true">✓</span>}
        <h1 ref={heading} tabIndex={-1}>{titles[page]}</h1>

        {page === 'parking' && <>
          {!zone || !next ? <section className="screen-section">
            <p className="intro">Choose your permit zone and add a class to find parking near your next destination.</p>
            <button className="primary-action" onClick={() => navigate('schedule')}>Set up schedule & permit</button>
          </section> : <>
            {suggestion ? <SpotRecommendation spot={suggestion} title="Suggested space" action="Start navigation" onClick={() => start(suggestion, next)} />
              : <section className="screen-section">
                <h2>No available spaces</h2>
                <p>All eligible spaces have been reported occupied.</p>
                <button className="primary-action" onClick={() => navigate('schedule')}>Edit schedule & permit</button>
              </section>}
            <dl className="detail-list">
              <div className="detail-row">
                <dt>Next class</dt>
                <dd><strong>{next.name}</strong><span>{dateFormat.format(next.time)}</span><span>{next.building} · {next.room}</span></dd>
              </div>
              <div className="detail-row"><dt>Parking permit</dt><dd><strong>Zone {zone}</strong></dd></div>
            </dl>
          </>}
        </>}

        {page === 'schedule' && <>
          <section className="screen-section">
            <div className="section-heading">
              <h2>Parking permit</h2>
              <span className="muted">{zone ? `Zone ${zone}` : 'Select a zone'}</span>
            </div>
            <div className="permit-choices" role="group" aria-label="Parking permit zone">
              {zones.map(value => <button key={value} className="chip" aria-pressed={zone === value} onClick={() => update({ zone: value })}>Zone {value}</button>)}
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
                  <span>
                    <strong>{course.name}</strong>
                    <span>{weekdays.filter(day => course.days.includes(day)).map(day => days[day]).join(', ')} · {course.start}–{course.end}</span>
                    <span>{course.building} · {course.room}</span>
                  </span>
                  <span className="row-chevron" aria-hidden="true">›</span>
                </button>
              </li>)}</ul>}
          </section>
        </>}

        {page === 'edit' && <CourseForm course={editing} onCancel={back} onSave={course => {
          update({ courses: editing ? courses.map(item => item.id === course.id ? course : item) : [...courses, course] })
          back()
        }} onDelete={editing ? () => {
          if (!window.confirm(`Delete ${editing.name}?`)) return
          update({ courses: courses.filter(item => item.id !== editing.id) })
          back()
        } : undefined} />}

        {page === 'replacement' && <>
          <p className="alert" role="status">{trip.spot.id} is occupied.</p>
          {replacement
            ? <SpotRecommendation spot={replacement} title="Suggested replacement" action={`Navigate to ${replacement.id}`} onClick={() => start(replacement, trip.course)} />
            : <p>No eligible spots remain.</p>}
        </>}

        {page === 'complete' && <>
          <p className="completion-location">{trip.spot.lot} Lot · {trip.spot.id}</p>
          <p className="muted">Head to {trip.course.building}, {trip.course.room} for {trip.course.name}.</p>
          <button className="primary-action" onClick={back}>Done</button>
        </>}

        {page === 'about' && <>
          <section className="screen-section">
            <h2>Pixel People</h2>
            <p>Built for the TAMU-CC Human Computer Interaction project.</p>
            <p>Schedules and parking preferences are stored on this device.</p>
          </section>
          <section className="screen-section section-divider">
            <h2>Appearance</h2>
            <label className="appearance-option">
              <input type="checkbox" checked={solidSurfaces} onChange={event => update({ solidSurfaces: event.target.checked })} />
              Reduce transparency
            </label>
          </section>
          <button className="text-action align-start" onClick={() => { update({ occupied: [] }); back() }}>Clear occupied reports</button>
        </>}
      </main>
      {page in tabs && <nav aria-label="Main navigation">
        {Object.entries(tabs).map(([key, label]) => <button key={key} aria-current={page === key ? 'page' : undefined} onClick={() => selectTab(key)}>
          <span className="tab-icon" aria-hidden="true">{tabIcons[key]}</span>{label}
        </button>)}
      </nav>}
    </div>
  )
}

function SpotRecommendation({ spot, title, action, onClick }) {
  return <section className="recommendation">
    <h2>{title}</h2>
    <strong className="spot">{spot.id}</strong>
    <p>{spot.lot} Lot · estimated {spot.walk} min walk</p>
    <button className="primary-action" onClick={onClick}>{action}</button>
  </section>
}

function CourseForm({ course, onSave, onCancel, onDelete }) {
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
    <label>Building<select name="building" defaultValue={course?.building}>{buildings.map(building => <option key={building}>{building}</option>)}</select></label>
    <label>Room<input name="room" defaultValue={course?.room} required /></label>
    {error && <p role="alert" className="alert">{error}</p>}
    <button className="primary-action" type="submit">Save class</button>
    <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
    {onDelete && <button type="button" className="text-action danger" onClick={onDelete}>Delete class</button>}
  </form>
}

createRoot(document.getElementById('root')).render(<App />)
