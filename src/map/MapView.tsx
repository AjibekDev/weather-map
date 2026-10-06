import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [74.59, 42.87],
      zoom: 9,
    })
    return () => map.remove()
  }, [])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}