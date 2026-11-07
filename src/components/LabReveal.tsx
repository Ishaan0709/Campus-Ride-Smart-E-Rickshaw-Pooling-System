import { useMemo, useState } from "react";
import FleetMap, { type MapLink, type MapPerson } from "@/components/FleetMap";
import { haversineKm } from "@/engine/distance";
import { greedyMatches } from "@/engine/matching/greedy";
import { scoreDriver } from "@/engine/matching/score";
import type { DriverRecord, RideRequest } from "@/engine/types";
import { placeById } from "@/lib/campus";

type Play = "group" | "seat" | "tie";

const AGIRA = placeById("agira-hall");
const PRITHVI = placeById("prithvi-hall");
const LIBRARY = placeById("library");
const AUDI = placeById("auditorium");

function shift(northM: number, eastM: number) {
  return {
    lat: AGIRA.lat + northM / 111320,
    lng: AGIRA.lng + eastM / (111320 * Math.cos((AGIRA.lat * Math.PI) / 180)),
  };
}

function movingAuto(): DriverRecord {
  return {
    id: "moving",
    name: "Auto",
    location: { lat: AGIRA.lat, lng: AGIRA.lng },
    capacity: 4,
    passengerCount: 3,
    status: "assigned",
    completedRides: 2,
    version: 1,
    route: [{ ...LIBRARY, rideId: "onboard", kind: "drop", label: "Library" }],
  };
}

function ask(id: string, name: string, pickup: { lat: number; lng: number }, at: number): RideRequest {
  return {
    id,
    studentId: id,
    studentName: name,
    pickup,
    pickupLabel: name,
    drop: { lat: AUDI.lat, lng: AUDI.lng },
    dropLabel: "Auditorium",
    seats: 1,
    createdAt: at,
    idempotencyKey: id,
  };
}

export function PoolReveal({ kabirWait, projectWait }: { kabirWait: string; projectWait: string }) {
  const [open, setOpen] = useState(false);
  const [play, setPlay] = useState<Play>("group");
  const story = useMemo(() => buildStory(play), [play]);

  return (
    <section className="mt-8">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-2xl bg-[#1c1917] px-6 py-4 text-left text-white"
      >
        <span>
          <span className="block text-xs font-medium uppercase tracking-[0.14em] text-white/60">This project</span>
          <span className="mt-1 block text-lg font-semibold">Show the assignment on the map</span>
        </span>
        <span className="text-sm text-white/70">{open ? "Hide" : "Open"}</span>
      </button>
      {open && (
        <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 px-2 pb-4">
            <PlayChip active={play === "group"} onClick={() => setPlay("group")}>Group by destination</PlayChip>
            <PlayChip active={play === "seat"} onClick={() => setPlay("seat")}>One seat left</PlayChip>
            <PlayChip active={play === "tie"} onClick={() => setPlay("tie")}>Equal distance</PlayChip>
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_320px]">
            <div className="relative overflow-hidden rounded-2xl">
              <FleetMap drivers={story.drivers} students={story.students} links={story.links} fitKey={play} />
              <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex gap-2 text-[11px]">
                <span className="rounded-full bg-white/95 px-2 py-1 shadow">Solid line · chosen</span>
                <span className="rounded-full bg-white/95 px-2 py-1 shadow">Dashed · not chosen</span>
              </div>
            </div>
            <aside className="space-y-3 px-2 py-1">
              {story.facts.map((fact) => (
                <p key={fact} className="text-sm leading-6 text-gray-700">{fact}</p>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <TimeCard label="Kabir, earlier" value={kabirWait} hint="Still waiting for 4" />
                <TimeCard label="Kabir, this project" value={projectWait} hint="Leaves with Sara" />
              </div>
            </aside>
          </div>
          <AlgoDrawer title={story.drawerTitle} rows={story.rows} />
        </div>
      )}
    </section>
  );
}

export function AlgoDrawer({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-gray-500">{open ? "Hide" : "Open"}</span>
      </button>
      {open && (
        <dl className="grid gap-5 border-t border-gray-100 px-5 py-5 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{row.label}</dt>
              <dd className="mt-2 text-sm leading-6 text-gray-800">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function PlayChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-[#7B0000] text-white" : "bg-[#f3f0ea] text-gray-700"}`}
    >
      {children}
    </button>
  );
}

function TimeCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-[#f6f3ef] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function buildStory(play: Play): {
  drivers: MapPerson[];
  students: MapPerson[];
  links: MapLink[];
  facts: string[];
  drawerTitle: string;
  rows: { label: string; value: string }[];
} {
  if (play === "group") return groupStory();
  if (play === "seat") return seatStory();
  return tieStory();
}

function groupStory() {
  const students: MapPerson[] = [
    { id: "agira", name: "Agira", lat: AGIRA.lat, lng: AGIRA.lng, badge: "Riya · Arjun · Sara", color: "#1d4ed8", dy: -18, detail: "Agira Hall" },
    { id: "kabir", name: "Kabir", lat: PRITHVI.lat, lng: PRITHVI.lng, badge: "Kabir", color: "#1d4ed8", dy: 28, detail: "Prithvi Hall, Auditorium" },
    { id: "lib", name: "Library", lat: LIBRARY.lat, lng: LIBRARY.lng, badge: "Library", color: "#157a3a", dy: -18 },
    { id: "audi", name: "Auditorium", lat: AUDI.lat, lng: AUDI.lng, badge: "Auditorium", color: "#9a3412", dy: 28 },
  ];
  const links: MapLink[] = [
    { id: "lib-ride", from: [AGIRA.lat, AGIRA.lng], to: [LIBRARY.lat, LIBRARY.lng], color: "#157a3a", label: "Riya and Arjun go straight to the Library", strong: true },
    { id: "audi-pickup", from: [AGIRA.lat, AGIRA.lng], to: [PRITHVI.lat, PRITHVI.lng], color: "#9a3412", label: "Sara’s auto collects Kabir at Prithvi", strong: true },
    { id: "audi-drop", from: [PRITHVI.lat, PRITHVI.lng], to: [AUDI.lat, AUDI.lng], color: "#9a3412", label: "Then the Auditorium", strong: true },
  ];
  return {
    drivers: [],
    students,
    links,
    facts: [
      "Riya and Arjun share the Library ride and leave. They do not sit until a fourth person appears.",
      "Sara and Kabir both want the Auditorium, so one auto collects Kabir on the way instead of leaving him alone.",
      "The old autos are still on the cards above, waiting for empty seats.",
    ],
    drawerTitle: "Why this assignment",
    rows: [
      { label: "Algorithm", value: "Cheapest insertion. People who share a destination are put on one auto. A stop is added only where it adds the least extra road." },
      { label: "What happened", value: "Two rides, not two hostel queues. Library: Riya and Arjun, Agira straight to the Library, about 1.3 min. Auditorium: Sara, then Kabir at Prithvi, then the Auditorium, about 4.2 min." },
      { label: "Why not the old way", value: "The earlier rule filled an auto by who was standing in the same hostel, then waited for 4. Sara was stuck on a Library detour, and Kabir waited alone." },
      { label: "Waiting time", value: "This project matches in about 2 seconds and leaves. The earlier clock keeps running until you add the missing people." },
      { label: "How the score works", value: "Pickup time, extra kilometres, passenger detour, how full the auto is, and how many rides that auto has already done. The lowest score is offered." },
    ],
  };
}

function seatStory() {
  const toward = shift(180, 120);
  const away = shift(-180, -120);
  const driver = movingAuto();
  const towardReq = ask("toward", "On the way", toward, 1);
  const awayReq = ask("away", "Off the route", away, 1);
  const towardScore = scoreDriver(driver, towardReq, { pool: true, maxDetourKm: 1.5 });
  const awayScore = scoreDriver(driver, awayReq, { pool: true, maxDetourKm: 1.5 });
  const winner = towardScore.cost <= awayScore.cost ? towardScore : awayScore;
  const students: MapPerson[] = [
    { id: "toward", name: "On the way", lat: toward.lat, lng: toward.lng, badge: "On the way", color: "#157a3a", dy: -18, dx: 28, detail: `Extra ${towardScore.extraKm.toFixed(2)} km` },
    { id: "away", name: "Off the route", lat: away.lat, lng: away.lng, badge: "Off route", color: "#9a3412", dy: 30, dx: -28, detail: `Extra ${awayScore.extraKm.toFixed(2)} km` },
    { id: "lib", name: "Library", lat: LIBRARY.lat, lng: LIBRARY.lng, badge: "Library", color: "#6b7280", dy: -18 },
  ];
  const links: MapLink[] = [
    { id: "heading", from: [AGIRA.lat, AGIRA.lng], to: [LIBRARY.lat, LIBRARY.lng], color: "#111827", label: "Already going to the Library with 3 students", strong: true },
    { id: "take", from: [AGIRA.lat, AGIRA.lng], to: [toward.lat, toward.lng], color: "#157a3a", label: "Collected. Smaller extra route.", strong: true },
    { id: "skip", from: [AGIRA.lat, AGIRA.lng], to: [away.lat, away.lng], color: "#9a3412", label: "Same distance, larger detour. Not collected.", dash: "6 6" },
  ];
  return {
    drivers: [{ id: "moving", name: "Auto", lat: AGIRA.lat, lng: AGIRA.lng, badge: "Auto 3/4", color: "#111827", dy: 26, detail: "One seat left, already moving" }] as MapPerson[],
    students,
    links,
    facts: [
      "The auto already has 3 students and is driving to the Library. One seat is free.",
      `Both new students are ${towardScore.pickupKm.toFixed(2)} km away. Distance alone cannot choose.`,
      `Cheapest insertion picks “On the way”. It adds ${towardScore.extraKm.toFixed(2)} km, not ${awayScore.extraKm.toFixed(2)} km.`,
    ],
    drawerTitle: "Why this person is collected",
    rows: [
      { label: "Algorithm", value: "Cheapest insertion on an auto that is already moving. Every place the new pickup and drop could sit in the existing route is tried. The smallest extra kilometres wins, if the detour stays under 1.5 km." },
      { label: "What happened", value: `Score for the student on the way: ${towardScore.cost.toFixed(2)}. Score for the student off the route: ${awayScore.cost.toFixed(2)}. ${winner.driverId ? "The lower score is offered the last seat." : ""}` },
      { label: "Why distance was not enough", value: `Pickup is ${towardScore.pickupKm.toFixed(2)} km for both, so the ETA is the same. The route already ends at the Library, so the student in that direction bends the trip less.` },
      { label: "Waiting time", value: "The 3 students aboard are already moving. The chosen student is picked up on that trip. The other student is not inserted, so a different auto has to take them." },
      { label: "How", value: "Score = pickup minutes + 0.8 × extra km + 1.2 × detour + a small penalty for a full auto and for an auto that has already done more rides." },
    ],
  };
}

function tieStory() {
  const point = shift(0, 220);
  const driver = movingAuto();
  const earlier = ask("earlier", "Asked first", point, 1);
  const later = ask("later", "Asked second", point, 5);
  const matches = greedyMatches([later, earlier], [driver], { pool: true, maxDetourKm: 1.5 });
  const taken = matches[0];
  const students: MapPerson[] = [
    { id: "earlier", name: "Asked first", lat: point.lat, lng: point.lng, badge: "Asked first", color: "#157a3a", dx: -46, dy: -8, detail: "Same place, earlier request" },
    { id: "later", name: "Asked second", lat: point.lat, lng: point.lng, badge: "Asked second", color: "#9a3412", dx: 52, dy: 24, detail: "Same place, later request" },
  ];
  const links: MapLink[] = [
    { id: "go", from: [AGIRA.lat, AGIRA.lng], to: [LIBRARY.lat, LIBRARY.lng], color: "#111827", label: "Auto is already going to the Library", strong: true },
    { id: "take", from: [AGIRA.lat, AGIRA.lng], to: [point.lat, point.lng], color: "#157a3a", label: `${taken?.request.studentName ?? "Asked first"} gets the last seat`, strong: true },
  ];
  return {
    drivers: [
      { id: "moving", name: "Auto", lat: AGIRA.lat, lng: AGIRA.lng, badge: "Auto 3/4", color: "#111827", dy: 26 },
      { id: "lib", name: "Library", lat: LIBRARY.lat, lng: LIBRARY.lng, badge: "Library", color: "#6b7280", dy: -18 },
    ] as MapPerson[],
    students,
    links,
    facts: [
      "Both students stand at the same point, the same distance from an auto that has one seat.",
      "Their routes cost the same, so the score does not separate them.",
      `${taken?.request.studentName ?? "Asked first"} is collected because greedy matching walks the requests in arrival order. The other student finds the auto full.`,
    ],
    drawerTitle: "Why the tie breaks this way",
    rows: [
      { label: "Algorithm", value: "Greedy matching after the insertion cost. Requests are sorted by the time they were made. The first feasible request takes the seat." },
      { label: "What happened", value: `Both pickups are ${haversineKm(AGIRA, point).toFixed(2)} km away and the extra route is ${taken ? taken.score.extraKm.toFixed(2) : "the same"} km. One seat remains, so only one student fits.` },
      { label: "Why this student", value: "The costs match, so a lower score cannot choose. Arrival order does. Asked first was created earlier, even though both are on screen together." },
      { label: "What the other student sees", value: "After the seat is claimed, passenger count is 4. The second insertion is rejected because the auto has no remaining seat." },
      { label: "How a real tie would differ", value: "If the costs differ by even a little, the lower score wins and arrival order is not used. Fairness only changes the score when one auto has already completed more rides than another." },
    ],
  };
}
