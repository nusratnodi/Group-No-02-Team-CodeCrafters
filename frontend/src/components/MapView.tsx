import { useEffect, useMemo } from "react"
import L from "leaflet"
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet"
import type { LatLng } from "../api/types"

export type MarkerKind = "primary" | "place" | "start" | "end" | "user"

export interface MapMarker {
  id: string | number
  lat: number
  lng: number
  kind?: MarkerKind
  label?: string
  text?: string
  active?: boolean
  onClick?: () => void
}

const SIZES: Record<MarkerKind, [number, number]> = {
  primary: [30, 30],
  place: [26, 26],
  start: [36, 36],
  end: [36, 36],
  user: [20, 20],
}

function markerIcon(kind: MarkerKind, text = "", active = false) {
  const [w, h] = SIZES[kind]
  return L.divIcon({
    className: "tz-marker",
    html: `<span class="tz-pin ${kind}${active ? " active" : ""}">${text}</span>`,
    iconSize: [w, h],
    iconAnchor: kind === "primary" ? [w / 2, h + 4] : [w / 2, h / 2],
    tooltipAnchor: [0, -h / 2],
  })
}

/** Re-fits the map when the set of points changes (not on every render). */
function FitView({ points, zoom, padLeft }: { points: [number, number][]; zoom: number; padLeft: number }) {
  const map = useMap()
  const signature = JSON.stringify(points)
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) map.setView(points[0], zoom)
    else map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [padLeft + 40, 40], paddingBottomRight: [40, 40], maxZoom: 15 })
    // `signature` captures the points; re-running on the array identity would fight the user's panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, zoom, padLeft, map])
  return null
}

function PanToActive({ marker }: { marker?: MapMarker }) {
  const map = useMap()
  useEffect(() => {
    if (marker) map.panTo([marker.lat, marker.lng])
  }, [marker, map])
  return null
}

function DragWatcher({ onMoved }: { onMoved: (center: LatLng) => void }) {
  useMapEvents({
    dragend: (event) => {
      const center = event.target.getCenter()
      onMoved({ lat: center.lat, lng: center.lng })
    },
  })
  return null
}

/** A Leaflet map styled for Tripza, with pins and an optional route line. */
export default function MapView({
  markers,
  route,
  zoom = 13,
  padLeft = 0,
  className = "map-box",
  onMoved,
}: {
  markers: MapMarker[]
  route?: [number, number][]
  zoom?: number
  padLeft?: number
  className?: string
  onMoved?: (center: LatLng) => void
}) {
  const points = useMemo<[number, number][]>(
    () => (route && route.length > 1 ? route : markers.map((m) => [m.lat, m.lng] as [number, number])),
    [markers, route],
  )
  const center = points[0] ?? [23.8103, 90.4125]
  const active = markers.find((m) => m.active)

  return (
    <div className={className}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} attributionControl>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {route && route.length > 1 && (
          <Polyline positions={route} pathOptions={{ color: "#0e7c86", weight: 6, opacity: 0.9, lineCap: "round" }} />
        )}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={markerIcon(marker.kind ?? "place", marker.text, marker.active)}
            eventHandlers={marker.onClick ? { click: marker.onClick } : undefined}
            zIndexOffset={marker.active ? 1000 : 0}
          >
            {marker.label && <Tooltip direction="top">{marker.label}</Tooltip>}
          </Marker>
        ))}
        <FitView points={points} zoom={zoom} padLeft={padLeft} />
        <PanToActive marker={active} />
        {onMoved && <DragWatcher onMoved={onMoved} />}
      </MapContainer>
    </div>
  )
}
