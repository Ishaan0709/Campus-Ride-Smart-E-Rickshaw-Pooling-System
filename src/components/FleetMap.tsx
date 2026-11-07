import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Ride } from "@/engine/types";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapPerson {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status?: string;
  detail?: string;
  color?: string;
  badge?: string;
}

export interface MapHex {
  id: string;
  boundary: [number, number][];
  center: [number, number];
  count: number;
}

export interface MapLink {
  id: string;
  from: [number, number];
  to: [number, number];
  color: string;
  label: string;
  strong?: boolean;
}

interface FleetMapProps {
  drivers: MapPerson[];
  students: MapPerson[];
  rides?: Ride[];
  hexes?: MapHex[];
  links?: MapLink[];
  onPick?: (lat: number, lng: number) => void;
}

const STATUS_COLOR: Record<string, string> = {
  available: "#157a3a",
  assigned: "#9a3412",
  occupied: "#7B0000",
  offline: "#6b7280",
};

function pin(html: string, width: number, height: number) {
  return L.divIcon({
    className: "campus-pin",
    html,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
  });
}

export default function FleetMap({ drivers, students, rides = [], hexes = [], links, onPick }: FleetMapProps) {
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
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    for (const hex of hexes) {
      const hot = hex.count > 0;
      L.polygon(hex.boundary, {
        color: hot ? "#7B0000" : "#334155",
        weight: hot ? 1.5 : 1,
        fillColor: hot ? "#7B0000" : "#64748b",
        fillOpacity: hot ? Math.min(0.45, 0.12 + hex.count * 0.08) : 0.04,
      })
        .bindTooltip(hot ? `${hex.count} student ${hex.count === 1 ? "request" : "requests"} in this hex` : "No requests in this hex")
        .addTo(layer);
      if (hot) {
        L.marker(hex.center, {
          interactive: false,
          icon: pin(
            `<div style="font:600 11px Inter,sans-serif;color:#7B0000;text-align:center;text-shadow:0 0 4px #fff">${hex.count}</div>`,
            24,
            16,
          ),
        }).addTo(layer);
      }
    }

    const drawn = links ?? rides.flatMap((ride) => {
      const driver = drivers.find((item) => item.id === ride.driverId);
      if (!driver || !["OFFERED", "ACCEPTED", "OTP_VERIFIED", "IN_PROGRESS"].includes(ride.status)) return [];
      return [{
        id: ride.id,
        from: [driver.lat, driver.lng] as [number, number],
        to: [ride.pickup.lat, ride.pickup.lng] as [number, number],
        color: "#7B0000",
        label: `${ride.studentName} → ${driver.name}`,
        strong: true,
      }];
    });

    for (const link of drawn) {
      L.polyline([link.from, link.to], {
        color: link.color,
        weight: link.strong ? 4 : 2,
        opacity: link.strong ? 0.9 : 0.35,
      }).bindTooltip(link.label).addTo(layer);
    }

    for (const student of students) {
      const color = student.color ?? "#1d4ed8";
      if (student.badge) {
        L.marker([student.lat, student.lng], {
          icon: pin(
            `<div style="background:#fff;color:${color};border:2px solid ${color};border-radius:999px;padding:3px 8px;font:600 12px Inter,sans-serif;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.25)">${student.badge}</div>`,
            88,
            26,
          ),
        }).bindTooltip(student.detail ?? student.name).addTo(layer);
      } else {
        L.circleMarker([student.lat, student.lng], {
          radius: 7,
          color,
          fillColor: color,
          fillOpacity: 0.9,
        }).bindTooltip(student.detail ?? student.name).addTo(layer);
      }
    }

    for (const driver of drivers) {
      const color = driver.color ?? STATUS_COLOR[driver.status ?? ""] ?? "#111827";
      if (driver.badge) {
        L.marker([driver.lat, driver.lng], {
          zIndexOffset: 500,
          icon: pin(
            `<div style="background:${color};color:#fff;border-radius:12px;padding:4px 8px;font:600 12px Inter,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);text-align:center;line-height:1.2">${driver.badge}${driver.detail ? `<div style="font-weight:500;font-size:11px">${driver.detail}</div>` : ""}</div>`,
            92,
            38,
          ),
        }).bindTooltip(`${driver.name}. ${driver.detail ?? driver.status ?? ""}`).addTo(layer);
      } else {
        L.circleMarker([driver.lat, driver.lng], {
          radius: 9,
          color,
          fillColor: color,
          fillOpacity: 0.95,
        }).bindTooltip(`${driver.name} · ${driver.status ?? ""}`).addTo(layer);
      }
    }
  }, [drivers, students, rides, hexes, links]);

  return <div ref={node} className="h-full min-h-[420px] w-full" />;
}
