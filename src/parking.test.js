import assert from 'node:assert/strict'
import test from 'node:test'
import { buildings, nextClass, suggestSpot } from './parking.js'

test('finds the next meeting across the weekend and across courses', () => {
  const course = { name: 'COSC 3360', days: [2, 4], start: '15:30' }
  const now = new Date(2026, 10, 20, 12)
  assert.equal(nextClass([course], now).time.getTime(), new Date(2026, 10, 24, 15, 30).getTime())
  assert.equal(nextClass([course, { name: 'Monday class', days: [1], start: '09:00' }], now).name, 'Monday class')
})

test('replaces an occupied stall and respects permit eligibility', () => {
  assert.equal(suggestSpot('A', buildings[0], []).id, 'T-B014')
  assert.equal(suggestSpot('A', buildings[0], ['T-B014']).id, 'T-B016')
  assert.equal(suggestSpot('D', buildings[0], []).lot, 'Hammerhead')
  assert.equal(suggestSpot('D', buildings[0], ['H-021', 'H-023', 'RF-008']), null)
})
