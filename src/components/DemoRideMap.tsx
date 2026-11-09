import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { placeById } from "@/lib/campus";
import {
  DEMO_DRIVER,
  demoScene,
  type DemoDriver,
  type DemoRide,
} from "@/lib/demoAccounts";

interface DemoRideMapProps {
  ride: DemoRide | null;
  parked: DemoDriver;
}

function pin(html: string) {
  return L.divIcon({
    className: "campus-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html,
  });
}

function label(color: string, text: string, dx: number, dy: number, radius = 5) {
  return pin(`<div style="position:relative;width:0;height:0">
    <span style="position:absolute;left:-${radius}px;top:-${radius}px;width:${radius * 2}px;height:${radius * 2}px;border-radius:99px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.18)"></span>
    <span style="position:absolute;left:${dx}px;top:${dy}px;transform:translate(-50%,-100%);font:600 11px/16px Inter,sans-serif;color:#1c1917;background:rgba(255,255,255,.95);border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:1px 7px;white-space:nowrap">${text}</span>
  </div>`);
}

function autoIcon(aboard: boolean, student: string) {
  const driver = DEMO_DRIVER.name.split(" ")[0];
  const text = aboard ? `${driver} + ${student}` : driver;
  const rider = aboard
    ? `<span style="position:absolute;left:7px;top:-6px;width:11px;height:11px;border-radius:99px;background:#1d4ed8;border:2px solid #fff"></span>`
    : "";
  return pin(`<div style="position:relative;width:0;height:0">
    <span style="position:absolute;left:-16px;top:-14px;width:${aboard ? 36 : 28}px;height:28px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 1px 4px rgba(0,0,0,.18)"></span>
    <span style="position:absolute;left:-8px;top:-7px;width:14px;height:14px;border-radius:99px;background:#7B0000;border:2px solid #fff"></span>
    ${rider}
    <span style="position:absolute;left:${aboard ? 10 : 0}px;top:16px;transform:translate(-50%,0);font:600 11px/16px Inter,sans-serif;color:#1c1917;background:#fff;border:1px solid rgba(123,0,0,.28);border-radius:999px;padding:2px 8px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.08)">${text}</span>
  </div>`);
}

export default function DemoRideMap({ ride, parked }: DemoRideMapProps) {
  const node = useRef<HTMLDivElement>(null);
  const rideRef = useRef(ride);
  const parkedRef = useRef(parked);
  rideRef.current = ride;
  parkedRef.current = parked;
  const [caption, setCaption] = useState({ title: `${DEMO_DRIVER.name.split(" ")[0]} is waiting`, detail: "No student is in the auto yet." });

  useEffect(() => {
    if (!node.current) return;
    const map = L.map(node.current, { zoomControl: false, center: [30.3532, 76.3665], zoom: 16 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const plan = L.polyline([], { color: "#a8a29e", weight: 3, dashArray: "7 8", opacity: 0.95 }).addTo(map);
    const trail = L.polyline([], { color: "#7B0000", weight: 5, opacity: 0.95 }).addTo(map);
    const pickup = L.marker([parked.lat, parked.lng], { icon: label("#78716c", "Pickup", -72, 36, 4), interactive: false, opacity: 0 }).addTo(map);
    const drop = L.marker([parked.lat, parked.lng], { icon: label("#166534", "Drop", 72, 36, 4), interactive: false, opacity: 0 }).addTo(map);
    const student = L.marker([parked.lat, parked.lng], { icon: label("#1d4ed8", "Student", 0, -36), interactive: false, opacity: 0, zIndexOffset: 400 }).addTo(map);
    const auto = L.marker([parked.lat, parked.lng], { icon: autoIcon(false, ""), interactive: false, zIndexOffset: 800 }).addTo(map);

    let lastIcon = "";
    let lastFit = "";
    let lastTitle = "";
    const timer = window.setInterval(() => {
      const current = rideRef.current;
      const home = parkedRef.current;
      const scene = current
        ? demoScene(current, home)
        : {
            driver: { lat: home.lat, lng: home.lng },
            student: { lat: home.lat, lng: home.lng },
            aboard: false,
            title: `${DEMO_DRIVER.name.split(" ")[0]} is at ${placeById(home.placeId).name}`,
            detail: "The seat is empty until a student shares the OTP.",
            trailFrom: { lat: home.lat, lng: home.lng },
            headingTo: { lat: home.lat, lng: home.lng },
          };
      const first = current?.studentName.split(" ")[0] ?? "";
      const iconKey = `${scene.aboard}-${first}-${current?.status ?? "idle"}`;
      if (iconKey !== lastIcon) {
        auto.setIcon(autoIcon(scene.aboard, first));
        lastIcon = iconKey;
      }
      auto.setLatLng([scene.driver.lat, scene.driver.lng]);

      if (current) {
        const near = (point: { lat: number; lng: number }) => Math.abs(scene.driver.lat - point.lat) < 0.00008 && Math.abs(scene.driver.lng - point.lng) < 0.00008;
        pickup.setLatLng([current.pickup.lat, current.pickup.lng]);
        pickup.setIcon(label("#78716c", current.pickupLabel, 0, 52, 4));
        pickup.setOpacity(near(current.pickup) ? 0 : 1);
        drop.setLatLng([current.drop.lat, current.drop.lng]);
        drop.setIcon(label("#166534", current.dropLabel, 0, 52, 4));
        drop.setOpacity(near(current.drop) ? 0 : 1);
        const waiting = !scene.aboard;
        student.setLatLng([scene.student.lat, scene.student.lng]);
        student.setOpacity(waiting ? 1 : 0);
        student.setIcon(label("#1d4ed8", current.status === "COMPLETED" ? `${first} out` : first, current.status === "COMPLETED" ? 8 : 0, -40));
        const samePoint = scene.trailFrom.lat === scene.driver.lat && scene.trailFrom.lng === scene.driver.lng;
        trail.setLatLngs(samePoint ? [] : [[scene.trailFrom.lat, scene.trailFrom.lng], [scene.driver.lat, scene.driver.lng]]);
        const arrived = scene.driver.lat === scene.headingTo.lat && scene.driver.lng === scene.headingTo.lng;
        plan.setLatLngs(arrived ? [] : [[scene.driver.lat, scene.driver.lng], [scene.headingTo.lat, scene.headingTo.lng]]);
      } else {
        pickup.setOpacity(0);
        drop.setOpacity(0);
        student.setOpacity(0);
        trail.setLatLngs([]);
        plan.setLatLngs([]);
      }

      if (scene.title !== lastTitle) {
        lastTitle = scene.title;
        setCaption({ title: scene.title, detail: scene.detail });
      }

      const fitKey = current ? `${current.id}:${current.status}` : `parked:${home.placeId}`;
      if (fitKey !== lastFit) {
        lastFit = fitKey;
        const points: [number, number][] = current
          ? [
              [current.origin?.lat ?? home.lat, current.origin?.lng ?? home.lng],
              [current.pickup.lat, current.pickup.lng],
              [current.drop.lat, current.drop.lng],
              [scene.student.lat, scene.student.lng],
            ]
          : [[home.lat, home.lng]];
        if (points.length > 1) {
          map.fitBounds(points, { paddingTopLeft: [28, 96], paddingBottomRight: [96, 64], maxZoom: 16 });
        } else {
          map.setView(points[0], 16);
        }
      }
    }, 32);

    const fit = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(fit);
      map.remove();
    };
  }, []);

  return (
    <div className="relative h-full min-h-[420px]">
      <div ref={node} className="h-full min-h-[420px] w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[230px] rounded-2xl bg-white/95 px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B0000]">Now</p>
        <p className="mt-1 text-base font-semibold leading-snug">{caption.title}</p>
        <p className="mt-1 text-xs leading-5 text-gray-600">{caption.detail}</p>
      </div>
    </div>
  );
}
