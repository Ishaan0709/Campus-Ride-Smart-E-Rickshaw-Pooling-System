import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '@/store/useAppStore';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPanelProps {
  height?: string;
  showControls?: boolean;
}

export default function MapPanel({ height = '600px', showControls = true }: MapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const stopsRef = useRef<Map<string, L.Layer[]>>(new Map());

  const hotspots = useAppStore((state) => state.hotspots);
  const students = useAppStore((state) => state.students);
  const drivers = useAppStore((state) => state.drivers);
  const trips = useAppStore((state) => state.trips);
  const pools = useAppStore((state) => state.pools);

  const getPoolColors = (poolId?: string) => {
    const idx = poolId ? pools.findIndex((p) => p.id === poolId) : -1;
    if (idx === 0) return { stroke: 'hsl(var(--primary))', shadow: 'hsl(var(--primary) / 0.35)' };
    if (idx === 1) return { stroke: 'hsl(var(--secondary))', shadow: 'hsl(var(--secondary) / 0.35)' };
    return { stroke: 'hsl(var(--accent))', shadow: 'hsl(var(--accent) / 0.35)' };
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = L.map(mapContainer.current, {
      center: [30.3558, 76.3651], // TIET
      zoom: 15,
      zoomControl: showControls,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      className: 'map-tiles',
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [showControls]);

  // Update hotspot markers
  useEffect(() => {
    if (!mapInstance.current) return;

    hotspots.forEach((hotspot) => {
      const key = `hotspot-${hotspot.id}`;
      
      if (!markersRef.current.has(key)) {
        const icon = L.divIcon({
          className: 'hotspot-marker',
          html: `<div class="flex flex-col items-center">
            <div class="w-3 h-3 bg-muted rounded-full border-2 border-primary/50"></div>
            <span class="text-xs text-muted-foreground mt-1 whitespace-nowrap px-2 py-0.5 glass rounded">${hotspot.name}</span>
          </div>`,
          iconSize: [100, 40],
          iconAnchor: [50, 20],
        });

        const marker = L.marker([hotspot.lat, hotspot.lng], { icon }).addTo(mapInstance.current);
        markersRef.current.set(key, marker);
      }
    });
  }, [hotspots]);

  // Update student markers
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove old student markers
    markersRef.current.forEach((marker, key) => {
      if (key.startsWith('student-')) {
        marker.remove();
        markersRef.current.delete(key);
      }
    });

    students.forEach((student) => {
      const hotspot = hotspots.find((h) => h.id === student.pickup);
      if (!hotspot) return;

      const key = `student-${student.id}`;
      const statusColors: Record<string, string> = {
        waiting: 'bg-warning',
        pooled: 'bg-primary',
        assigned: 'bg-primary',
        enroute: 'bg-success',
        completed: 'bg-muted',
      };

      const colors = getPoolColors(student.poolId);

      const icon = L.divIcon({
        className: 'student-marker',
        html: `<div class="w-6 h-6 ${statusColors[student.status]} rounded-full border-2 shadow-lg pulse-ring" style="border-color: ${colors.stroke}; box-shadow: 0 0 0 3px ${colors.shadow};"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([hotspot.lat, hotspot.lng], { icon })
        .bindPopup(`<strong>${student.name}</strong><br/>${student.roll}<br/>Status: ${student.status}`)
        .addTo(mapInstance.current!);
      
      markersRef.current.set(key, marker);
    });
  }, [students, hotspots]);

  // Update driver markers and trip routes
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove old driver markers
    markersRef.current.forEach((marker, key) => {
      if (key.startsWith('driver-')) {
        marker.remove();
        markersRef.current.delete(key);
      }
    });

    // Remove old routes
    polylinesRef.current.forEach((polyline) => {
      polyline.remove();
    });
    polylinesRef.current.clear();

    // Remove old stop markers
    stopsRef.current.forEach((layers) => {
      layers.forEach((layer) => layer.remove());
    });
    stopsRef.current.clear();

    drivers.forEach((driver) => {
      const key = `driver-${driver.id}`;
      const trip = trips.find((t) => t.driverId === driver.id);
      const position = (trip?.currentPosition || [driver.lat, driver.lng]) as [number, number];

      const icon = L.divIcon({
        className: 'driver-marker',
        html: `<div class="flex flex-col items-center">
          <div class="w-8 h-8 bg-secondary rounded-lg border-2 border-primary shadow-lg glow-primary flex items-center justify-center text-xs font-bold">🚗</div>
          <span class="text-xs text-primary-foreground mt-1 font-mono">${driver.plate}</span>
        </div>`,
        iconSize: [80, 50],
        iconAnchor: [40, 25],
      });

      const marker = L.marker(position, { icon })
        .bindPopup(`<strong>${driver.name}</strong><br/>${driver.plate}<br/>Status: ${driver.status}`)
        .addTo(mapInstance.current!);
      markersRef.current.set(key, marker);

      if (trip && trip.route.length > 0) {
        const colors = getPoolColors(trip.poolId);
        const polyline = L.polyline(trip.route as [number, number][], {
          color: colors.stroke,
          weight: 4,
          opacity: 0.9,
        }).addTo(mapInstance.current!);
        polylinesRef.current.set(`route-${trip.id}`, polyline);

        // Stops: pickup (start), mid-pickup for pool-2, and drop (end)
        const stops: L.Layer[] = [];
        const start = trip.route[0] as [number, number];
        const end = trip.route[trip.route.length - 1] as [number, number];
        stops.push(
          L.circleMarker(start, { radius: 5, color: colors.stroke, weight: 2, fillColor: colors.stroke, fillOpacity: 0.9 })
            .bindTooltip('Pickup', { permanent: false })
            .addTo(mapInstance.current!)
        );

        // Mid pickup at Hostel B for pool-2
        if (trip.poolId === 'pool-2') {
          const mid = [30.3548, 76.3645] as [number, number];
          stops.push(
            L.circleMarker(mid, { radius: 5, color: colors.stroke, weight: 2, fillColor: colors.stroke, fillOpacity: 0.9 })
              .bindTooltip('Pickup (Hostel B)', { permanent: false })
              .addTo(mapInstance.current!)
          );
        }

        stops.push(
          L.circleMarker(end, { radius: 5, color: colors.stroke, weight: 2, fillColor: colors.stroke, fillOpacity: 0.9 })
            .bindTooltip('Drop', { permanent: false })
            .addTo(mapInstance.current!)
        );

        stopsRef.current.set(`stops-${trip.id}`, stops);
      }
    });
  }, [drivers, trips]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height }}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Dark overlay for styling */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/40 pointer-events-none" />
    </div>
  );
}
