import assert from 'node:assert/strict'
import test from 'node:test'
import { parkingAreas } from './campusData.js'
import { buildings, nextClass, permits, suggestSpot } from './parking.js'
import { availableSpots, isParkingStall } from './parkingSimulation.js'

const weekday = new Date(2026, 10, 24, 9, 20)
const afterHours = new Date(2026, 10, 24, 21)

test('finds the next meeting across the weekend and across courses', () => {
  const course = { name: 'COSC 3360', days: [2, 4], start: '15:30' }
  const now = new Date(2026, 10, 20, 12)
  assert.equal(nextClass([course], now).time.getTime(), new Date(2026, 10, 24, 15, 30).getTime())
  assert.equal(nextClass([course, { name: 'Monday class', days: [1], start: '09:00' }], now).name, 'Monday class')
})

test('suggests a Hammerhead stall for Zone D', () => {
  const spot = suggestSpot('D', buildings[0], undefined, weekday)
  assert.equal(spot.lot, 'Hammerhead Lot')
  assert.equal(spot.id, 'H-021')
})

test('replaces reported stalls and returns no suggestion when all eligible stalls are occupied', () => {
  const building = buildings[0]
  const candidates = availableSpots('D', building, weekday).sort((a, b) => a.walk - b.walk)
  const occupied = candidates.slice(0, 2).map(spot => spot.id)
  const replacement = suggestSpot('D', building, undefined, weekday, occupied)

  assert.equal(replacement.id, candidates[2].id)
  assert.equal(replacement.availableInArea, candidates.length - occupied.length)
  assert.equal(replacement.modeledInArea, candidates[2].modeledInArea)
  assert.equal(suggestSpot('D', building, undefined, weekday, candidates.map(spot => spot.id)), null)
})

test('offers Zones A–D and limits Zone B to the garage top floor', () => {
  const locations = zone => new Set(availableSpots(zone, buildings[0], afterHours).map(spot => spot.lot))
  assert.deepEqual([...locations('A')].filter(lot => lot.startsWith('Bayside')), [1, 2, 3, 4].map(floor => `Bayside Parking Garage · Floor ${floor}`))
  assert.deepEqual([...locations('B')].filter(lot => lot.startsWith('Bayside')), ['Bayside Parking Garage · Floor 4'])
  assert.deepEqual(Object.keys(permits), ['A', 'B', 'C', 'D'])
  assert.deepEqual(parkingAreas.filter(([, , zones]) => zones.includes('D')).map(([, lot]) => lot), ['Hammerhead Lot'])
  for (const zone of ['miramar', 'momentum', 'rec']) {
    assert.equal(suggestSpot(zone, buildings[0], undefined, weekday), null)
  }
  for (const id of ['RF-008', 'RF-B02', 'R7-A04', 'MV-A01']) {
    assert.equal(isParkingStall(id), false)
  }
  assert.equal(isParkingStall('H-021'), true)
})

test('models repeatable peak demand and ranks lots by destination', () => {
  const morning = availableSpots('A', buildings[0], weekday)
  const evening = availableSpots('A', buildings[0], afterHours)
  assert.deepEqual(morning, availableSpots('A', buildings[0], weekday))
  assert.ok(morning.length < evening.length)
  assert.equal(new Set(evening.map(spot => spot.id)).size, evening.length)
  assert.equal(suggestSpot('A', 'Performing Arts Center', undefined, weekday).lot, 'Sand Dollar Lot')
  assert.equal(suggestSpot('A', 'Harte Research Institute', undefined, weekday).lot, 'Harte Research Institute Lot')
})

test('only suggests parking near the destination on the same campus', () => {
  const meeting = new Date(2026, 10, 24, 10)
  const mainland = 'Woo Sung Lee Alumni Welcome Center'
  const parking = availableSpots('C', buildings[0], weekday)
  assert.ok(parking.length > 0)
  assert.ok(parking.every(spot => !spot.id.startsWith('AL-')))
  assert.equal(suggestSpot('C', mainland, meeting, weekday).lot, 'Woo Sung Lee Alumni Welcome Center Lot')
  assert.equal(suggestSpot('D', mainland, meeting, weekday), null)
})
