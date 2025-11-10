import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '@/store/useAppStore';
import type { Hotspot, Pool } from '@/store/useAppStore';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPanelProps {
  height?: string;
  showControls?: boolean;
  filterPoolId?: string; // optional: student view
}

const PALETTE = {
  red:   { stroke: '#ef4444', fill: '#fee2e2' },
  blue:  { stroke: '#3b82f6', fill: '#dbeafe' },
  green: { stroke: '#22c55e', fill: '#dcfce7' },
} as const;

function themeFor(pool: Pool) {
  if (pool.id.includes('red')) return PALETTE.red;
  if (pool.id.includes('blue')) return PALETTE.blue;
  return PALETTE.green;
}

function ll(hs: Hotspot[], id: string): [number, number] | null {
  const h = hs.find(x => x.id === id);
  return h ? [h.lat, h.lng] : null;
}

export default function MapPanel({ height = '600px', showControls = true, filterPoolId }: MapPanelProps) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  const hotspots  = useAppStore(s => s.hotspots);
  const studentsA = useAppStore(s => s.students);
  const driversA  = useAppStore(s => s.drivers);
  const poolsA    = useAppStore(s => s.pools);
  const tripsA    = useAppStore(s => s.trips);
  const step      = useAppStore(s => s.demoStep);

  // Optional pool filter (student page)
  const pools   = filterPoolId ? poolsA.filter(p => p.id === filterPoolId) : poolsA;
  const trips   = filterPoolId ? tripsA.filter(t => t.poolId === filterPoolId) : tripsA;
  const drivers = filterPoolId
    ? driversA.filter(d => d.assignedPoolId === filterPoolId || pools.some(p => p.driverId === d.id))
    : driversA;
  const students = filterPoolId
    ? studentsA.filter(st => pools.some(p => p.studentIds.includes(st.id)))
    : studentsA;

  // Map init
  useEffect(() => {
    if (!mapDiv.current || map.current) return;
    map.current = L.map(mapDiv.current, { center: [30.3558, 76.3651], zoom: 15, zoomControl: showControls });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; layer.current = null; };
  }, [showControls]);

  // Render logic
  useEffect(() => {
    if (!map.current || !layer.current) return;
    const g = layer.current;
    g.clearLayers();

    // 0) Before seed: show nothing
    if (step === 'idle') return;

    // Hotspot labels (subtle)
    hotspots.forEach(h => {
      const icon = L.divIcon({
        className: 'hs',
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:8px;height:8px;border-radius:9999px;background:#172554;border:2px solid #60a5fa"></div>
          <span style="margin-top:2px;font-size:11px;padding:2px 6px;background:rgba(2,6,23,.35);border-radius:8px;color:#e2e8f0">${h.name}</span>
        </div>`,
        iconSize: [100,40], iconAnchor: [50,20],
      });
      L.marker([h.lat, h.lng], { icon }).addTo(g);
    });

    // 1) After seed: 12 bluish-green dots
    if (step === 'seeded') {
      students.forEach(s => {
        const pos = ll(hotspots, s.pickup);
        if (!pos) return;
        const icon = L.divIcon({
          className: 'student',
          html: `<div style="
              width:22px;height:22px;border-radius:9999px;
              background:${s.color || '#14F4C5'};
              border:3px solid rgba(20,244,197,.35);
              box-shadow:0 0 0 6px rgba(20,244,197,.18);
          "></div>`,
          iconSize: [22,22], iconAnchor: [11,11],
        });
        L.marker(pos, { icon }).bindTooltip(`${s.name} (${s.roll})`).addTo(g);
      });
      return;
    }

    // 2) After pools: show only pool bubbles; bubbles attach to autos once trips start
    // Draw autos + routes
    drivers.forEach(d => {
      const trip = trips.find(t => t.driverId === d.id);
      const pos = (trip?.currentPosition || [d.lat, d.lng]) as [number, number];

      const icon = L.divIcon({
        className: 'auto',
        html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:30px;height:30px;border-radius:10px;
            background:#0ea5e9;color:white;border:2px solid #94a3b8;
            box-shadow:0 8px 20px rgba(2,6,23,.3)
          ">🚗</div>`,
        iconSize: [30,30], iconAnchor: [15,15],
      });
      L.marker(pos, { icon }).bindTooltip(`${d.name} • ${d.plate}`).addTo(g);

      if (trip?.route?.length) {
        const th = themeFor(pools.find(p => p.id === trip.poolId)!);
        L.polyline(trip.route as [number, number][], { color: th.stroke, weight: 5, opacity: .9 }).addTo(g);
      }
    });

    // Pool bubbles
    pools.forEach(p => {
      const th = themeFor(p);
      const trip = trips.find(t => t.poolId === p.id);
      let pos: [number, number] | null = null;
      if (trip?.currentPosition) pos = trip.currentPosition;
      if (!pos) pos = ll(hotspots, p.pickup);
      if (!pos) return;

      const bubble = L.divIcon({
        className: 'pool',
        html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:38px;height:38px;border-radius:9999px;
            background:${th.fill};border:4px solid ${th.stroke};
            box-shadow:0 0 0 8px ${th.stroke}33, 0 10px 30px rgba(2,6,23,.35);
            font-weight:700;color:#0f172a
        ">${p.studentIds.length}</div>`,
        iconSize: [38,38], iconAnchor: [19,19],
      });
      L.marker(pos, { icon: bubble })
        .bindTooltip(`Pool: ${p.id}\nPickup: ${p.pickup}\nDrop: ${p.drop}`)
        .addTo(g);

      // final drop pin when completed
      if (trip && trip.status === 'completed') {
        const end = trip.route[trip.route.length - 1] as [number, number];
        L.circleMarker(end, { radius: 6, color: th.stroke, weight: 3, fillColor: th.fill, fillOpacity: 1 })
          .bindTooltip(`Dropped: ${p.drop}`)
          .addTo(g);
      }
    });

  }, [hotspots, students, drivers, pools, trips, step, filterPoolId]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height }}>
      <div ref={mapDiv} className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/40 pointer-events-none" />
    </div>
  );
}
