import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Ride } from "@/engine/types";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface FleetMapProps {
  drivers: { id: string; name: string; lat: number; lng: number; status: string }[];
  students: { id: string; name: string; lat: number; lng: number }[];
  rides?: Ride[];
  onPick?: (lat: number, lng: number) => void;
}

const STATUS_COLOR: Record<string, string> = {
  available: "#157a3a",
  assigned: "#9a3412",
  occupied: "#7B0000",
  offline: "#6b7280",
};

export default function FleetMap({ drivers, students, rides = [], onPick }: FleetMapProps) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!node.current || mapRef.current) return;
    const map = L.map(node.current, { center: [30.3532, 76.3665], zoom: 15 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("click", (event) => pickRef.current?.(event.latlng.lat, event.latlng.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const ride of rides) {
      const driver = drivers.find((item) => item.id === ride.driverId);
      if (!driver || !["OFFERED", "ACCEPTED", "OTP_VERIFIED", "IN_PROGRESS"].includes(ride.status)) continue;
      L.polyline(
        [
          [driver.lat, driver.lng],
          [ride.pickup.lat, ride.pickup.lng],
          [ride.drop.lat, ride.drop.lng],
        ],
        { color: "#7B0000", weight: 3, opacity: 0.8 },
      ).addTo(layer);
    }

    for (const student of students) {
      L.circleMarker([student.lat, student.lng], {
        radius: 7,
        color: "#1d4ed8",
        fillColor: "#1d4ed8",
        fillOpacity: 0.9,
      }).bindTooltip(student.name).addTo(layer);
    }

    for (const driver of drivers) {
      L.circleMarker([driver.lat, driver.lng], {
        radius: 9,
        color: STATUS_COLOR[driver.status] ?? "#111827",
        fillColor: STATUS_COLOR[driver.status] ?? "#111827",
        fillOpacity: 0.95,
      }).bindTooltip(`${driver.name} · ${driver.status}`).addTo(layer);
    }
  }, [drivers, students, rides]);

  return <div ref={node} className="h-full min-h-[420px] w-full" />;
}
