import campusRoads from './campusRoads.json' with { type: 'json' }

const regions = {
  // The Island Campus photo extends north and west of the original route coordinate grid.
  island: { image: '/naip-island-campus.jpg', imageOrigin: [-300, -300], width: 2350, height: 2300, feetPerUnit: 2.06 },
  alumni: { image: '/naip-alumni-center.jpg', imageOrigin: [0, 0], width: 1120, height: 1265, feetPerUnit: 2.02 },
}

function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function heading(a, b) {
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

function interpolate(a, b, fraction) {
  return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction]
}

export function campusRoute(spot) {
  const [prefix] = spot.id.split('-', 1)
  const area = /^BG[1-4]$/.test(prefix) ? 'BG' : prefix
  const choices = campusRoads.routes[area]
  if (!choices?.length) return null

  const region = area === 'AL' ? 'alumni' : 'island'
  const { path, stallSide, streetNames, aisles } = choices[(spot.row ?? 0) % choices.length]
  const points = [...path]
  const hasStall = Boolean(stallSide)
  if (hasStall) {
    // Only the short pull-in from the mapped or photo-traced aisle is simulated.
    const end = points.pop()
    const start = points.at(-1)
    const fraction = .15 + (spot.column ?? 0) * .1
    const pullIn = interpolate(start, end, fraction)
    const angle = heading(start, end) + stallSide * Math.PI / 2
    points.push(pullIn, [pullIn[0] + 8 * Math.cos(angle), pullIn[1] + 8 * Math.sin(angle)])
  }

  const distances = [0]
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + distance(points[i - 1], points[i]))
  }

  const steps = []
  const lastRoadPoint = points.length - (hasStall ? 2 : 1)
  for (let i = 1; i < lastRoadPoint; i++) {
    const turn = heading(points[i], points[i + 1]) - heading(points[i - 1], points[i])
    const angle = Math.atan2(Math.sin(turn), Math.cos(turn))
    if (Math.abs(angle) < Math.PI / 4) continue
    const right = angle > 0
    const turnText = right ? 'Turn right' : 'Turn left'
    const street = streetNames[i]
    let text = turnText
    if (street && street !== streetNames[i - 1]) text += ` onto ${street}`
    if (!street && streetNames[i - 1] && aisles.includes(i)) text += ' into the parking lot'
    const previous = steps.at(-1)
    if (text === turnText && previous?.text.startsWith(turnText) &&
      (distances[i] - previous.at) * regions[region].feetPerUnit < 25) continue
    steps.push({ arrow: right ? '↱' : '↰', text, at: distances[i] })
  }

  const total = distances.at(-1)
  const destination = area === 'BG' ? 'garage entrance' : 'parking access'
  steps.push({
    arrow: 'P',
    text: hasStall ? `Pull into demo spot ${spot.id}` : `Arrive at the ${destination}`,
    at: distances[lastRoadPoint],
  })

  return { ...regions[region], basemap: campusRoads.maps[region], points, distances, steps, total, hasStall, destination }
}

export function remainingManeuverFeet(route, step, progress) {
  const feet = (step.at - progress) * route.feetPerUnit
  if (feet <= 15) return 0
  const increment = feet < 50 ? 10 : feet < 200 ? 25 : 50
  return Math.round(feet / increment) * increment
}

export function maneuverText({ text }, feet) {
  return feet ? `In ${feet} feet, ${text[0].toLowerCase()}${text.slice(1)}` : text
}

export function routePosition(route, progress) {
  const { points, distances, total } = route
  const traveled = Math.min(total, Math.max(0, progress))
  const next = distances.findIndex((value, index) => index > 0 && value >= traveled)
  const start = points[next - 1]
  const end = points[next]
  const fraction = (traveled - distances[next - 1]) / (distances[next] - distances[next - 1])
  return { point: interpolate(start, end, fraction), angle: heading(start, end) }
}
