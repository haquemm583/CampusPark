import { useEffect, useMemo, useRef } from 'react'
import { routePosition } from './campusRoute.js'

const roadWidths = { service: 5, local: 9, major: 13 }

function tracePaths(shapes, close = false) {
  const path = new Path2D()
  for (const [first, ...rest] of shapes) {
    path.moveTo(...first)
    for (const point of rest) path.lineTo(...point)
    if (close) path.closePath()
  }
  return path
}

function standardLayers({ water, green, lots, buildings, roads, labels }) {
  return {
    water: tracePaths(water, true),
    green: tracePaths(green, true),
    lots: tracePaths(lots, true),
    buildings: tracePaths(buildings, true),
    roads: Object.entries(roadWidths).map(([type, width]) => ({
      path: tracePaths(roads.filter(([kind]) => kind === type).map(([, points]) => points)),
      width,
    })),
    labels,
  }
}

function drawMapLabels(context, labels, screenPoint, width, height, highContrast) {
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const placed = []
  const names = new Set()
  for (const [kind, name, position] of labels) {
    if (names.has(name)) continue
    const [x, y] = screenPoint(position)
    const labelY = y - (kind === 'road' ? 14 : 0)
    context.font = kind === 'lot' ? '700 13px system-ui' : '600 12px system-ui'
    const halfWidth = context.measureText(name).width / 2 + 5
    const bounds = { left: x - halfWidth, right: x + halfWidth, top: labelY - 9, bottom: labelY + 9 }
    if (bounds.left < 7 || bounds.right > width - 7 || bounds.top < 7 || bounds.bottom > height - 20) continue
    if (placed.some(label => bounds.left < label.right && bounds.right > label.left &&
      bounds.top < label.bottom && bounds.bottom > label.top)) continue
    context.strokeStyle = '#fff'
    context.lineWidth = 3
    context.strokeText(name, x, labelY)
    context.fillStyle = highContrast ? '#000' : '#395362'
    context.fillText(name, x, labelY)
    names.add(name)
    placed.push(bounds)
  }
}

function drawStandardMap(context, layers, projection, screenPoint, width, height, highContrast) {
  context.fillStyle = highContrast ? '#fff' : '#f3f1e8'
  context.fillRect(0, 0, width, height)
  context.save()
  context.transform(...projection)
  context.fillStyle = '#b9dfe9'
  context.fill(layers.water)
  context.fillStyle = '#d8e7cd'
  context.fill(layers.green)
  context.fillStyle = '#e2e8e9'
  context.fill(layers.lots)
  context.fillStyle = '#dcd8d0'
  context.fill(layers.buildings)
  context.strokeStyle = highContrast ? '#56616a' : '#beb9ad'
  context.lineWidth = 1
  context.stroke(layers.buildings)
  for (const { path, width } of layers.roads) {
    context.strokeStyle = highContrast ? '#536675' : '#c8d0d3'
    context.lineWidth = width + 2
    context.stroke(path)
  }
  for (const { path, width } of layers.roads) {
    context.strokeStyle = '#fff'
    context.lineWidth = width
    context.stroke(path)
  }
  context.restore()
  drawMapLabels(context, layers.labels, screenPoint, width, height, highContrast)
}

function strokeLine(context, points, color, width) {
  context.beginPath()
  context.moveTo(...points[0])
  for (const point of points.slice(1)) context.lineTo(...point)
  context.strokeStyle = color
  context.lineWidth = width
  context.stroke()
}

function drawVehicle(context, [x, y], angle, color) {
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.beginPath()
  context.arc(0, 0, 15, 0, 2 * Math.PI)
  context.fillStyle = color
  context.fill()
  context.strokeStyle = '#fff'
  context.lineWidth = 3
  context.stroke()
  context.beginPath()
  context.moveTo(8, 0)
  context.lineTo(-7, 6)
  context.lineTo(-4, 0)
  context.lineTo(-7, -6)
  context.closePath()
  context.fillStyle = '#fff'
  context.fill()
  context.restore()
}

function cameraView(route, progress, width, height, preview, follow) {
  if (follow) {
    const [x, y] = routePosition(route, progress).point
    // Sample across the corner so the camera turns gradually with the vehicle.
    const [behindX, behindY] = routePosition(route, progress - 20).point
    const [aheadX, aheadY] = routePosition(route, progress + 16).point
    const heading = Math.atan2(aheadY - behindY, aheadX - behindX)
    const rotation = -Math.PI / 2 - heading
    const zoom = Math.max(width / 250, height / 400)
    const cos = Math.cos(rotation) * zoom
    const sin = Math.sin(rotation) * zoom
    return { cos, sin, x: width / 2 - (cos * x - sin * y), y: height * .73 - (sin * x + cos * y) }
  }

  const [focusX, focusY] = preview ? route.points.at(-1) : routePosition(route, progress + 55).point
  const zoom = Math.max(width / (preview ? 510 : 430), height / (preview ? 295 : 575))
  const cropWidth = width / zoom
  const cropHeight = height / zoom
  const left = Math.max(0, Math.min(focusX - cropWidth / 2, route.width - cropWidth))
  const top = Math.max(0, Math.min(focusY - cropHeight * .55, route.height - cropHeight))
  return { cos: zoom, sin: 0, x: -left * zoom, y: -top * zoom }
}

function paintRouteMap(canvas, pin, photo, layers, route, progress, preview, highContrast, follow) {
  const { width, height } = canvas.getBoundingClientRect()
  if (!width || !height) return

  const pixelRatio = Math.min(2, window.devicePixelRatio || 1)
  const pixelsWide = Math.round(width * pixelRatio)
  const pixelsHigh = Math.round(height * pixelRatio)
  if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
    canvas.width = pixelsWide
    canvas.height = pixelsHigh
  }
  const context = canvas.getContext('2d')
  context.setTransform(pixelsWide / width, 0, 0, pixelsHigh / height, 0, 0)
  context.lineJoin = 'round'
  context.lineCap = 'round'

  const destination = route.points.at(-1)
  const { cos, sin, x: originX, y: originY } = cameraView(route, progress, width, height, preview, follow)
  const projection = [cos, sin, -sin, cos, originX, originY]
  const screenPoint = ([x, y]) => [originX + cos * x - sin * y, originY + sin * x + cos * y]

  if (photo?.naturalWidth && photo.complete) {
    context.fillStyle = '#f3f1e8'
    context.fillRect(0, 0, width, height)
    context.save()
    context.transform(...projection)
    context.drawImage(photo, ...route.imageOrigin)
    context.restore()
  } else {
    drawStandardMap(context, layers, projection, screenPoint, width, height, highContrast)
  }

  const line = route.points.map(screenPoint)
  const color = highContrast ? '#000' : '#0069bf'
  strokeLine(context, line, '#fff', 11)
  strokeLine(context, line, color, 6)
  if (!preview && progress < route.total) {
    const { point, angle } = routePosition(route, progress)
    drawVehicle(context, screenPoint(point), follow ? -Math.PI / 2 : angle, color)
  }
  const [x, y] = screenPoint(destination)
  pin.style.left = x + 'px'
  pin.style.top = y + 'px'
  pin.hidden = x < 12 || x > width - 12 || y < 18 || y > height
}

export default function CampusRouteMap({ route, spot, lotName, preview = false, highContrast, mapStyle, distance = 0, animation }) {
  const canvas = useRef(null)
  const pin = useRef(null)
  const photo = useRef(null)
  const layers = useMemo(() => standardLayers(route.basemap), [route.basemap])
  const aerial = mapStyle === 'aerial'
  const [label, description] = route.hasStall
    ? [spot.id, 'to a simulated stall'] : ['Parking access', 'to the parking access point']

  useEffect(() => {
    if (!aerial) return
    const image = new Image()
    image.src = route.image
    photo.current = image
    return () => { photo.current = null }
  }, [aerial, route.image])

  useEffect(() => {
    const surface = canvas.current
    const marker = pin.current
    const image = photo.current
    const paint = () => paintRouteMap(surface, marker, image, layers, route,
      animation?.distance ?? distance, preview, highContrast, Boolean(animation))

    if (animation) animation.paint = paint
    if (image) image.onload = paint
    const observer = new ResizeObserver(paint)
    observer.observe(surface)
    paint()
    return () => {
      observer.disconnect()
      if (image) image.onload = null
      if (animation) animation.paint = null
    }
  }, [aerial, layers, route, preview, highContrast, distance, animation])

  return <div className={preview ? 'lot-map parking-map-preview' : 'lot-map'}>
    <div className="lot-map-image" role="img" aria-label={lotName + ' route ' + description}>
      <canvas ref={canvas} aria-hidden="true" />
      <span ref={pin} className="stall-pin" hidden aria-hidden="true"><b>P</b>{label}</span>
    </div>
    <span className="map-credit">{aerial && 'USDA NAIP 2022 · TxGIO · '}<a href="https://www.openstreetmap.org/copyright"
      target="_blank" rel="noreferrer">© OpenStreetMap</a></span>
  </div>
}
