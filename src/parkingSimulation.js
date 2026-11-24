import { destinations, parkingAreas, walkCorridors, walkNodes } from './campusData.js'

const minutesPerMapUnit = 1 / 145
const walkingEdges = Object.fromEntries(Object.keys(walkNodes).map(node => [node, []]))

function mapDistance([x1, y1], [x2, y2]) {
  return Math.hypot(x2 - x1, y2 - y1)
}

for (const corridor of walkCorridors) {
  for (let index = 1; index < corridor.length; index++) {
    const [from, to] = [corridor[index - 1], corridor[index]]
    const distance = mapDistance(walkNodes[from], walkNodes[to])
    walkingEdges[from].push([to, distance])
    walkingEdges[to].push([from, distance])
  }
}

function walkingDistances(start) {
  const distances = { [start]: 0 }
  const remaining = new Set(Object.keys(walkNodes))
  while (remaining.size) {
    const [closest] = [...remaining].sort((a, b) => (distances[a] ?? Infinity) - (distances[b] ?? Infinity))
    if (distances[closest] === undefined) break
    remaining.delete(closest)
    for (const [neighbor, distance] of walkingEdges[closest]) {
      distances[neighbor] = Math.min(distances[neighbor] ?? Infinity, distances[closest] + distance)
    }
  }
  return distances
}

const destinationByName = new Map(destinations.map(destination => [destination[0], destination]))

const legacyStallIds = {
  T: ['T-B014', 'T-B016', 'T-B018'],
  SH: ['SH-012', 'SH-014'],
  H: ['H-021', 'H-023'],
}

const areas = parkingAreas.map(([id, name, permits, node, x, y, road, rows, profile]) => ({
  id, name, permits, node, road, profile,
  offset: mapDistance([x, y], walkNodes[node]),
  stalls: Array.from({ length: rows * 8 }, (_, index) => {
    const row = Math.floor(index / 8)
    const column = index % 8
    const aisle = String.fromCharCode(65 + (id === 'T' ? (row + 1) % rows : row))
    return {
      id: legacyStallIds[id]?.[index] ?? `${id}-${aisle}${String(column + 1).padStart(2, '0')}`,
      aisle, row, column,
    }
  }),
}))

const stallIds = new Set(areas.flatMap(area => area.stalls.map(stall => stall.id)))

export function isParkingStall(id) {
  return stallIds.has(id)
}

function calendarDay(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

function minuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
}

function within(value, start, end) {
  return value >= start && value <= end
}

function dayType(date) {
  const day = calendarDay(date)
  if (within(day, 20261204, 20261210) && day !== 20261206 ||
      within(day, 20270505, 20270511) && day !== 20270509) return 'exams'
  if (date.getDay() === 0 || date.getDay() === 6) return 'weekend'
  if ([20260907, 20261125, 20261126, 20261127, 20261203, 20270504].includes(day) ||
      within(day, 20270308, 20270312)) return 'break'
  return within(day, 20260824, 20261202) || within(day, 20270119, 20270503) ? 'classDay' : 'break'
}

const peakLoad = {
  core: 0.89, commuter: 0.78, arts: 0.71, recreation: 0.66, overflow: 0.61,
}

function parkingDemand(area, arrival, type) {
  const hour = minuteOfDay(arrival) / 60
  const peak = peakLoad[area.profile]
  const eveningUse = ['arts', 'recreation'].includes(area.profile)
  if (type === 'weekend' || type === 'break') return eveningUse && within(hour, 11, 20) ? 0.42 : 0.22
  if (hour < 7) return 0.17
  if (hour < 9) return peak - 0.15
  if (hour < 14) return peak - (arrival.getDay() === 5 ? 0.16 : 0)
  if (hour < 17) return peak - 0.19
  if (hour < 21 && eveningUse) return peak - 0.04
  return 0.22
}

function occupancySample(key) {
  let hash = 2166136261
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b)
  return ((hash ^ (hash >>> 16)) >>> 0) / 2 ** 32
}

export function availableSpots(zone, building, arrival, occupied = []) {
  const [, , destination, x, y] = destinationByName.get(building) ?? destinations[0]
  const distances = walkingDistances(destination)
  const destinationOffset = mapDistance([x, y], walkNodes[destination])
  const type = dayType(arrival)
  const date = calendarDay(arrival)
  const reportedStalls = new Set(occupied)
  const candidates = []

  for (const area of areas) {
    if (!area.permits.includes(zone) || !(area.node in distances)) continue
    const spots = []
    const load = parkingDemand(area, arrival, type) + (type === 'exams' ? 0.05 : 0)
    const floor = area.id.startsWith('BG') ? Number(area.id.slice(2)) : 0
    const walkBetween = (distances[area.node] + destinationOffset) * minutesPerMapUnit
    const dateKey = `${date}:${area.id}`
    for (const stall of area.stalls) {
      if (reportedStalls.has(stall.id)) continue
      const rowLoad = Math.max(0, load - stall.row * 0.018)
      if (occupancySample(`${dateKey}:${stall.id}`) < rowLoad) continue

      const exitMinutes = 0.35 + (area.offset + stall.row * 11 + stall.column * 3) * minutesPerMapUnit + floor * 0.35
      spots.push({ ...stall, lot: area.name, road: area.road, walk: exitMinutes + walkBetween })
    }
    for (const spot of spots) {
      candidates.push({ ...spot, availableInArea: spots.length, modeledInArea: area.stalls.length })
    }
  }
  return candidates
}
