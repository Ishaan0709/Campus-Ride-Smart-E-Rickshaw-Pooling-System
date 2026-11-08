import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { AlgoDrawer } from "@/components/LabReveal";
import { etaMinutes, haversineKm } from "@/engine/distance";
import { placeById } from "@/lib/campus";

const AGIRA = placeById("agira-hall");
const PRITHVI = placeById("prithvi-hall");
const LIBRARY = placeById("library");
const TAN = placeById("tan");
const AUDI = placeById("auditorium");
const GATE = placeById("main-gate");

interface Point {
  lat: number;
  lng: number;
}

interface Rider {
  id: string;
  name: string;
  destName: string;
  dest: Point;
  at: Point;
  dx: number;
  dy: number;
}

interface RideStop {
  id: string;
  kind: "pick" | "drop";
  place: string;
  at: Point;
  riders: Rider[];
  km: number;
  min: number;
}

interface RidePlan {
  start: Point;
  stops: RideStop[];
  dropKm: number;
  longKm: number;
  longOrder: string;
}

function shift(place: Point, northM: number, eastM: number): Point {
  return {
    lat: place.lat + northM / 111_000,
    lng: place.lng + eastM / (111_000 * Math.cos((place.lat * Math.PI) / 180)),
  };
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  items.forEach((item, index) => {
    for (const rest of permutations(items.filter((_, itemIndex) => itemIndex !== index))) {
      out.push([item, ...rest]);
    }
  });
  return out;
}

function pathKm(from: Point, order: Rider[]) {
  let total = 0;
  let cursor = from;
  for (const rider of order) {
    total += haversineKm(cursor, rider.dest);
    cursor = rider.dest;
  }
  return total;
}

function buildPlan(): RidePlan {
  const riders: Rider[] = [
    { id: "riya", name: "Riya", destName: "Library", dest: LIBRARY, at: shift(AGIRA, 28, -34), dx: -78, dy: -36 },
    { id: "arjun", name: "Arjun", destName: "TAN Block", dest: TAN, at: shift(AGIRA, 40, 22), dx: 6, dy: -58 },
    { id: "sara", name: "Sara", destName: "Auditorium", dest: AUDI, at: shift(AGIRA, -18, 28), dx: 76, dy: -30 },
    { id: "kabir", name: "Kabir", destName: "Main Gate", dest: GATE, at: shift(PRITHVI, 24, -30), dx: -92, dy: -40 },
  ];
  const orders = permutations(riders);
  const ranked = [...orders].sort((a, b) => pathKm(PRITHVI, a) - pathKm(PRITHVI, b));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const agiraKm = haversineKm(shift(AGIRA, -420, 40), AGIRA);
  const prithviKm = haversineKm(AGIRA, PRITHVI);
  const stops: RideStop[] = [
    {
      id: "agira",
      kind: "pick",
      place: "Agira Hall",
      at: AGIRA,
      riders: riders.slice(0, 3),
      km: agiraKm,
      min: etaMinutes(agiraKm),
    },
    {
      id: "prithvi",
      kind: "pick",
      place: "Prithvi Hall",
      at: PRITHVI,
      riders: [riders[3]],
      km: prithviKm,
      min: etaMinutes(prithviKm),
    },
  ];
  let cursor: Point = PRITHVI;
  for (const rider of best) {
    const km = haversineKm(cursor, rider.dest);
    stops.push({
      id: rider.id,
      kind: "drop",
      place: rider.destName,
      at: rider.dest,
      riders: [rider],
      km,
      min: etaMinutes(km),
    });
    cursor = rider.dest;
  }
  return {
    start: shift(AGIRA, -420, 40),
    stops,
    dropKm: pathKm(PRITHVI, best),
    longKm: pathKm(PRITHVI, worst),
    longOrder: worst.map((rider) => rider.destName).join(", then "),
  };
}

function destNudge(name: string) {
  if (name === "Library") return { dx: -56, dy: -20 };
  if (name === "TAN Block") return { dx: 70, dy: -46 };
  if (name === "Main Gate") return { dx: 48, dy: 36 };
  return { dx: 4, dy: 40 };
}

function pin(color: string, text: string, dx: number, dy: number, radius = 5) {
  return L.divIcon({
    className: "campus-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="position:relative;width:0;height:0">
      <span style="position:absolute;left:-${radius}px;top:-${radius}px;width:${radius * 2}px;height:${radius * 2}px;border-radius:99px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.18)"></span>
      <span style="position:absolute;left:${dx}px;top:${dy}px;transform:translate(-50%,-100%);font:600 11px/16px Inter,sans-serif;color:#1c1917;background:rgba(255,255,255,.95);border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:1px 7px;white-space:nowrap">${text}</span>
    </div>`,
  });
}

interface Story {
  title: string;
  body: string;
  aboard: Rider[];
  dropped: Rider[];
  active: number;
  driving: boolean;
}

function storyFor(plan: RidePlan, active: number, driving: boolean, done: boolean): Story {
  const aboard: Rider[] = [];
  const dropped: Rider[] = [];
  const seen = Math.min(active, plan.stops.length - 1);
  if (active >= 0) {
    for (let index = 0; index <= seen; index += 1) {
      const stop = plan.stops[index];
      if (driving && index === active) continue;
      if (stop.kind === "pick") aboard.push(...stop.riders);
      else {
        stop.riders.forEach((rider) => {
          const seat = aboard.findIndex((person) => person.id === rider.id);
          if (seat >= 0) aboard.splice(seat, 1);
          dropped.push(rider);
        });
      }
    }
  }

  if (done) {
    const rideKm = plan.stops.reduce((sum, stop) => sum + stop.km, 0);
    return {
      title: "Everyone is at their own stop",
      body: `The auto picked up three students at Agira Hall, then Kabir at Prithvi Hall, ${plan.stops[1].km.toFixed(2)} km away. Four seats were full. The drops run Library, TAN Block, Auditorium, Main Gate: ${plan.dropKm.toFixed(2)} km, about ${etaMinutes(plan.dropKm).toFixed(1)} min. The whole ride is ${rideKm.toFixed(2)} km. Going to ${plan.longOrder} would have been ${plan.longKm.toFixed(2)} km.`,
      aboard,
      dropped,
      active: plan.stops.length,
      driving: false,
    };
  }

  if (active < 0) {
    return {
      title: "Three together, one hostel over",
      body: "Riya, Arjun and Sara are at Agira Hall. Kabir is a short distance away at Prithvi Hall. They are going to four different places. Press Start and the auto drives the whole ride.",
      aboard,
      dropped,
      active: -1,
      driving: false,
    };
  }

  const stop = plan.stops[active];
  if (driving) {
    return {
      title: `Driving to ${stop.place}`,
      body: `${stop.km.toFixed(2)} km from the last stop, about ${stop.min.toFixed(1)} min at 18 km/h. ${aboard.length} of 4 seats are taken.`,
      aboard,
      dropped,
      active,
      driving: true,
    };
  }

  if (stop.kind === "pick" && stop.riders.length === 3) {
    return {
      title: "Three students sit at Agira",
      body: "Riya, Arjun and Sara are standing in the same place, so one stop fills three seats. Riya is going to the Library, Arjun to TAN Block, and Sara to the Auditorium.",
      aboard,
      dropped,
      active,
      driving: false,
    };
  }

  if (stop.kind === "pick") {
    return {
      title: "Kabir fills the last seat",
      body: `Prithvi Hall is ${stop.km.toFixed(2)} km from Agira, about ${stop.min.toFixed(1)} min. Kabir gets in and the auto is full. It can leave for the drops.`,
      aboard,
      dropped,
      active,
      driving: false,
    };
  }

  const rider = stop.riders[0];
  return {
    title: `${rider.name} steps out at ${stop.place}`,
    body: `This stop is ${stop.km.toFixed(2)} km from the previous one, about ${stop.min.toFixed(1)} min. ${aboard.length === 0 ? "The auto is empty." : `${aboard.length} of 4 seats are still taken.`}`,
    aboard,
    dropped,
    active,
    driving: false,
  };
}

export default function RideTheater({ started }: { started: boolean }) {
  const plan = useMemo(() => buildPlan(), []);
  const node = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [story, setStory] = useState<Story>(() => storyFor(plan, -1, false, false));
  const bag = useRef<{
    map: L.Map | null;
    auto: L.Marker | null;
    trail: L.Polyline | null;
    students: Map<string, L.Marker>;
    dests: Map<string, L.Marker>;
  }>({ map: null, auto: null, trail: null, students: new Map(), dests: new Map() });

  useEffect(() => {
    if (!node.current || bag.current.map) return;
    const map = L.map(node.current, { zoomControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const mark = (at: Point, color: string, text: string, dx: number, dy: number, radius = 5) => (
      L.marker([at.lat, at.lng], { icon: pin(color, text, dx, dy, radius), interactive: false }).addTo(map)
    );

    mark(AGIRA, "#78716c", "Agira Hall", -96, 46, 4);
    mark(PRITHVI, "#78716c", "Prithvi Hall", 8, 46, 4);
    plan.stops[0].riders.forEach((rider) => {
      bag.current.students.set(rider.id, mark(rider.at, "#1d4ed8", rider.name, rider.dx, rider.dy));
    });
    const kabir = plan.stops[1].riders[0];
    bag.current.students.set(kabir.id, mark(kabir.at, "#1d4ed8", kabir.name, kabir.dx, kabir.dy));
    plan.stops.filter((stop) => stop.kind === "drop").forEach((stop) => {
      const rider = stop.riders[0];
      const nudge = destNudge(rider.destName);
      bag.current.dests.set(rider.id, mark(rider.dest, "#166534", rider.destName, nudge.dx, nudge.dy));
    });

    const planLine = [plan.start, ...plan.stops.map((stop) => stop.at)];
    L.polyline(planLine.map((point) => [point.lat, point.lng] as [number, number]), {
      color: "#a8a29e",
      weight: 3,
      dashArray: "7 8",
      opacity: 0.9,
    }).addTo(map);
    bag.current.trail = L.polyline([[plan.start.lat, plan.start.lng]], { color: "#7B0000", weight: 5, opacity: 0.95 }).addTo(map);
    bag.current.auto = L.marker([plan.start.lat, plan.start.lng], {
      icon: pin("#7B0000", "0/4", 24, -2, 8),
      zIndexOffset: 800,
      interactive: false,
    }).addTo(map);

    map.fitBounds(planLine.map((point) => [point.lat, point.lng] as [number, number]), { padding: [54, 54], maxZoom: 16 });
    bag.current.map = map;
    setMapReady(true);
    const fit = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.clearTimeout(fit);
      map.remove();
      bag.current = { map: null, auto: null, trail: null, students: new Map(), dests: new Map() };
      setMapReady(false);
    };
  }, [plan]);

  useEffect(() => {
    const { auto, trail, students, dests } = bag.current;
    if (!mapReady || !auto || !trail) return;

    const resetMarks = () => {
      auto.setLatLng([plan.start.lat, plan.start.lng]);
      auto.setIcon(pin("#7B0000", "0/4", 24, -2, 8));
      trail.setLatLngs([[plan.start.lat, plan.start.lng]]);
      students.forEach((marker) => marker.setOpacity(1));
      plan.stops.filter((stop) => stop.kind === "drop").forEach((stop) => {
        const rider = stop.riders[0];
        const nudge = destNudge(rider.destName);
        dests.get(rider.id)?.setIcon(pin("#166534", rider.destName, nudge.dx, nudge.dy));
      });
    };

    if (!started) {
      resetMarks();
      setStory(storyFor(plan, -1, false, false));
      return;
    }

    let cancelled = false;
    let last = performance.now();
    let leg = 0;
    let elapsed = 0;
    let phase: "travel" | "dwell" = "travel";
    const trailPoints: [number, number][] = [[plan.start.lat, plan.start.lng]];
    const points = [plan.start, ...plan.stops.map((stop) => stop.at)];

    const paint = (index: number, driving: boolean, done = false) => {
      if (cancelled) return;
      const next = storyFor(plan, done ? plan.stops.length : index, driving, done);
      const count = next.aboard.length;
      auto.setIcon(pin("#7B0000", `${count}/4`, 24, -2, 8));
      plan.stops.flatMap((stop) => stop.riders).forEach((rider) => {
        const marker = students.get(rider.id);
        const sitting = next.aboard.some((person) => person.id === rider.id) || next.dropped.some((person) => person.id === rider.id);
        marker?.setOpacity(sitting ? 0 : 1);
      });
      next.dropped.forEach((rider) => {
        const nudge = destNudge(rider.destName);
        dests.get(rider.id)?.setIcon(pin("#166534", `${rider.name} out`, nudge.dx, nudge.dy));
      });
      setStory(next);
    };

    paint(0, true);

    const timer = window.setInterval(() => {
      if (cancelled) return;
      const now = performance.now();
      const dt = Math.min(40, now - last);
      last = now;
      elapsed += dt;
      const from = points[leg];
      const to = points[leg + 1];
      const travelMs = Math.round(Math.min(3400, Math.max(1700, plan.stops[leg].km * 2800)));
      const dwellMs = plan.stops[leg].kind === "pick" ? 1600 : 1300;
      if (phase === "travel") {
        const t = Math.min(1, elapsed / travelMs);
        const eased = t * t * (3 - 2 * t);
        const lat = from.lat + (to.lat - from.lat) * eased;
        const lng = from.lng + (to.lng - from.lng) * eased;
        auto.setLatLng([lat, lng]);
        trail.setLatLngs([...trailPoints, [lat, lng]]);
        if (t >= 1) {
          trailPoints.push([to.lat, to.lng]);
          phase = "dwell";
          elapsed = 0;
          paint(leg, false);
        }
      } else if (elapsed >= dwellMs) {
        leg += 1;
        elapsed = 0;
        phase = "travel";
        if (leg >= plan.stops.length) {
          paint(plan.stops.length, false, true);
          window.clearInterval(timer);
          return;
        }
        paint(leg, true);
      }
    }, 32);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [started, mapReady, plan]);

  const empties = Math.max(0, 4 - story.aboard.length);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="max-w-3xl text-lg text-gray-600">
        One auto, four students, four destinations. It takes the three who are already together, then the student at the next hostel, and only then starts the drops.
      </p>
      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="relative">
          <div ref={node} className="h-[540px] w-full" />
          <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-xs rounded-2xl bg-white/95 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B0000]">Now</p>
            <p className="mt-1 text-lg font-semibold leading-snug">{story.title}</p>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-2xl bg-white/95 px-3 py-2 text-xs text-gray-600 shadow-sm">
            <span className="mr-3">Maroon · where the auto has been</span>
            <span>Grey · the rest of the ride</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {plan.stops.map((stop, index) => {
          const state = story.active > index ? "done" : story.active === index ? "now" : "wait";
          return (
            <span
              key={stop.id}
              className={`rounded-full px-3 py-2 text-sm ${state === "now" ? "bg-[#1c1917] text-white" : state === "done" ? "bg-[#e7e5e4] text-gray-500" : "bg-white text-gray-700 shadow-sm"}`}
            >
              {stop.kind === "pick" ? "Pick up" : "Drop"} · {stop.place}
            </span>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">{story.title}</h2>
          <p className="mt-3 text-base leading-7 text-gray-600">{story.body}</p>
        </article>
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Seats</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {story.aboard.map((rider) => (
              <span key={rider.id} className="rounded-2xl bg-[#1c1917] px-3 py-3 text-white">
                <span className="block text-sm font-semibold">{rider.name}</span>
                <span className="block text-xs text-white/70">{rider.destName}</span>
              </span>
            ))}
            {Array.from({ length: empties }, (_, index) => (
              <span key={`empty-${index}`} className="grid place-items-center rounded-2xl border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-400">
                Empty
              </span>
            ))}
          </div>
          {story.dropped.length > 0 && (
            <p className="mt-4 text-sm leading-6 text-gray-500">
              Out: {story.dropped.map((rider) => `${rider.name} at ${rider.destName}`).join(" · ")}
            </p>
          )}
        </article>
      </div>

      <AlgoDrawer
        title="Why the auto moves this way"
        rows={[
          { label: "First stop", value: "Riya, Arjun and Sara share Agira Hall. The auto stops once and three seats fill. Their destinations stay different: Library, TAN Block, and the Auditorium." },
          { label: "The fourth seat", value: `Kabir is at Prithvi Hall, ${plan.stops[1].km.toFixed(2)} km from Agira, about ${plan.stops[1].min.toFixed(1)} min. That is the next pickup. He sits, and the auto is at 4 of 4.` },
          { label: "Drop order", value: `With a full auto, the drops are the shortest path through the four places: Library, TAN Block, Auditorium, then Main Gate. That drive is ${plan.dropKm.toFixed(2)} km, about ${etaMinutes(plan.dropKm).toFixed(1)} min. The order they sat down is not what chooses the next stop.` },
          { label: "A longer way", value: `Visiting ${plan.longOrder} instead would drive ${plan.longKm.toFixed(2)} km after the pickups. The auto takes the shorter one.` },
          { label: "The clock", value: "The minutes on the cards are real travel at 18 km/h. The marker on the map is sped up so the whole ride can be watched in one pass." },
        ]}
      />
    </main>
  );
}
