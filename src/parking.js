import { destinations, permits } from './campusData.js'
import { availableSpots } from './parkingSimulation.js'

export const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export { permits }
export const buildings = destinations.map(([name]) => name)
const parkingLeadMinutes = 40

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

export function suggestSpot(zone, building, meetingTime, now = new Date()) {
  if (!Object.hasOwn(permits, zone)) return null
  const arrival = meetingTime
    ? new Date(Math.max(now.getTime(), meetingTime.getTime() - parkingLeadMinutes * 60_000))
    : now
  return availableSpots(zone, building, arrival).sort((a, b) => a.walk - b.walk)[0] ?? null
}
