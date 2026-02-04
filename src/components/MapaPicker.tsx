import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapaPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialPosition?: [number, number]
}

export interface MapaPickerRef {
  buscarDireccion: (direccion: string) => void
}

function LocationMarker({
  onLocationSelect,
  markerPosition,
  setMarkerPosition
}: {
  onLocationSelect: (lat: number, lng: number) => void
  markerPosition: [number, number] | null
  setMarkerPosition: (pos: [number, number]) => void
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setMarkerPosition([lat, lng])
      onLocationSelect(lat, lng)
    },
  })

  return markerPosition === null ? null : <Marker position={markerPosition} />
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(center, zoom)
  }, [center, zoom, map])

  return null
}

const MapaPicker = forwardRef<MapaPickerRef, MapaPickerProps>(({ onLocationSelect, initialPosition }, ref) => {
  const defaultCenter: [number, number] = initialPosition || [-34.9011, -56.1645]
  const [center, setCenter] = useState<[number, number]>(defaultCenter)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)

  const buscarCoordenadas = async (direccion: string) => {
    if (!direccion || direccion.trim() === '') {
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          direccion + ', Uruguay'
        )}&limit=1`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        const newPosition: [number, number] = [lat, lng]
        setCenter(newPosition)
        setMarkerPosition(newPosition)
        handleLocationSelect(lat, lng)
      }
    } catch (error) {
      console.error('Error buscando coordenadas:', error)
    }
  }

  useImperativeHandle(ref, () => ({
    buscarDireccion: buscarCoordenadas
  }))

  const handleLocationSelect = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      const data = await response.json()

      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      onLocationSelect(lat, lng, address)
    } catch (error) {
      console.error('Error obteniendo dirección:', error)
      onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    }
  }

  return (
    <div style={{ marginTop: '0.5rem', height: '400px', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} zoom={15} />
        <LocationMarker
          onLocationSelect={handleLocationSelect}
          markerPosition={markerPosition}
          setMarkerPosition={setMarkerPosition}
        />
      </MapContainer>
    </div>
  )
})

MapaPicker.displayName = 'MapaPicker'

export default MapaPicker
