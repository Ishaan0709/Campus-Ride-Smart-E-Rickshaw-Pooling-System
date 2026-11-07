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
  /** Pixel offset for the name, so nearby labels do not cover each other. */
  dx?: number;
  dy?: number;
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
  dash?: string;
}

interface FleetMapProps {
  drivers: MapPerson[];
  students: MapPerson[];
  rides?: Ride[];
  hexes?: MapHex[];
  links?: MapLink[];
  fitKey?: string;
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

function dotLabel(color: string, text: string, dx = 0, dy = -16) {
  return L.divIcon({
    className: "campus-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="position:relative;width:0;height:0">
      <span style="position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:99px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15)"></span>
      <span style="position:absolute;left:${dx}px;top:${dy}px;transform:translate(-50%,-100%);font:600 11px/16px Inter,sans-serif;color:#1c1917;background:rgba(255,255,255,.95);border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:0 6px;white-space:nowrap">${text}</span>
    </div>`,
  });
}

export default function FleetMap({ drivers, students, rides = [], hexes = [], links, fitKey, onPick }: FleetMapProps) {
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

    const drawn: MapLink[] = links ?? rides.flatMap((ride) => {
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
        opacity: link.strong ? 0.9 : 0.45,
        dashArray: link.dash,
      }).bindTooltip(link.label).addTo(layer);
    }

    for (const student of students) {
      const color = student.color ?? "#1d4ed8";
      if (student.badge) {
        L.marker([student.lat, student.lng], {
          icon: dotLabel(color, student.badge, student.dx ?? 0, student.dy ?? -14),
          zIndexOffset: 400,
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
          icon: dotLabel(color, driver.badge, driver.dx ?? 0, driver.dy ?? 22),
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitKey) return;
    const points = [...drivers, ...students];
    if (points.length < 2) return;
    map.fitBounds(points.map((point) => [point.lat, point.lng] as [number, number]), {
      padding: [64, 64],
      maxZoom: 16,
    });
  }, [fitKey]);

  return <div ref={node} className="h-full min-h-[420px] w-full" />;
}
