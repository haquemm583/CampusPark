export const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const zones = ['A', 'B', 'C', 'D']
export const buildings = ['Center for Instruction', 'Bay Hall', 'Island Hall', 'Mary and Jeff Bell Library']

// The lot names and permit rules are real. Stall IDs and walk times are demo data.
const lots = [
  { lot: 'Tarpon', permits: 'AB', nearby: buildings[0], stalls: [['T-B014', 4], ['T-B016', 5], ['T-B018', 6]] },
  { lot: 'Sea Horse', permits: 'ABC', nearby: buildings[2], stalls: [['SH-012', 7], ['SH-014', 8]] },
  { lot: 'Hammerhead', permits: 'ABCD', nearby: buildings[1], stalls: [['H-021', 10], ['H-023', 11]] },
  { lot: 'Rec Field', permits: 'ABCD', nearby: buildings[3], stalls: [['RF-008', 15]] },
]

export function nextClass(courses, now = new Date()) {
  let next = null
  for (const course of courses) {
    const [hour, minute] = course.start.split(':').map(Number)
    for (let offset = 0; offset <= 7; offset++) {
      const time = new Date(now)
      time.setDate(time.getDate() + offset)
      time.setHours(hour, minute, 0, 0)
      if (!course.days.includes(time.getDay()) || time < now) continue
      if (!next || time < next.time) next = { ...course, time }
      break
    }
  }
  return next
}

export function suggestSpot(zone, building, occupied) {
  if (!zones.includes(zone)) return null
  const candidates = lots.filter(lot => lot.permits.includes(zone)).flatMap(lot =>
    lot.stalls.map(([id, minutes], column) => ({
      id, column, lot: lot.lot, aisle: lot.lot === 'Tarpon' ? 'B' : '1',
      walk: minutes + (lot.nearby === building ? 0 : 5),
    })),
  )
  return candidates.filter(spot => !occupied.includes(spot.id)).sort((a, b) => a.walk - b.walk)[0] ?? null
}
