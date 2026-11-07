import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FleetMap from "@/components/FleetMap";
import { AlgoDrawer, PoolReveal } from "@/components/LabReveal";
import { etaMinutes, haversineKm } from "@/engine/distance";
import { scoreDriver } from "@/engine/matching/score";
import type { DriverRecord, RideRequest } from "@/engine/types";
import { placeById } from "@/lib/campus";

type Stage = "pool" | "same";
type Phase = "idle" | "live";
type RideStatus = "idle" | "waiting" | "riding";

interface Person {
  id: string;
  name: string;
  to: string;
}

interface RideAuto {
  id: string;
  side: "old" | "now";
  title: string;
  route: string[];
  seats: Person[];
  capacity: number;
  rideMin: number;
  status: RideStatus;
  departedAt: number | null;
}

const LIBRARY = placeById("library");
const AUDI = placeById("auditorium");
const AGIRA = placeById("agira-hall");
const PRITHVI = placeById("prithvi-hall");
const NEERAM = placeById("neeram-hall");
const EBLOCK = placeById("e-block");

const LIBRARY_MIN = etaMinutes(haversineKm(AGIRA, LIBRARY));
const AUDI_MIN = etaMinutes(haversineKm(AGIRA, PRITHVI) + haversineKm(PRITHVI, AUDI));
const OLD_AGIRA_MIN = etaMinutes(haversineKm(AGIRA, LIBRARY) + haversineKm(LIBRARY, AUDI));
const OLD_PRITHVI_MIN = etaMinutes(haversineKm(PRITHVI, AUDI));

function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function minutesLabel(minutes: number) {
  return `${minutes.toFixed(1)} min`;
}

function freshAutos(): RideAuto[] {
  return [
    {
      id: "old-agira",
      side: "old",
      title: "Auto at Agira",
      route: ["Agira Hall", "Library", "Auditorium"],
      seats: [
        { id: "riya", name: "Riya", to: "Library" },
        { id: "arjun", name: "Arjun", to: "Library" },
        { id: "sara", name: "Sara", to: "Auditorium" },
      ],
      capacity: 4,
      rideMin: OLD_AGIRA_MIN,
      status: "idle",
      departedAt: null,
    },
    {
      id: "old-prithvi",
      side: "old",
      title: "Auto at Prithvi",
      route: ["Prithvi Hall", "Auditorium"],
      seats: [{ id: "kabir", name: "Kabir", to: "Auditorium" }],
      capacity: 4,
      rideMin: OLD_PRITHVI_MIN,
      status: "idle",
      departedAt: null,
    },
    {
      id: "now-library",
      side: "now",
      title: "Library ride",
      route: ["Agira Hall", "Library"],
      seats: [
        { id: "riya2", name: "Riya", to: "Library" },
        { id: "arjun2", name: "Arjun", to: "Library" },
      ],
      capacity: 4,
      rideMin: LIBRARY_MIN,
      status: "idle",
      departedAt: null,
    },
    {
      id: "now-audi",
      side: "now",
      title: "Auditorium ride",
      route: ["Agira Hall", "Prithvi Hall", "Auditorium"],
      seats: [
        { id: "sara2", name: "Sara", to: "Auditorium" },
        { id: "kabir2", name: "Kabir", to: "Auditorium" },
      ],
      capacity: 4,
      rideMin: AUDI_MIN,
      status: "idle",
      departedAt: null,
    },
  ];
}

function waitedSeconds(auto: RideAuto, startedAt: number | null) {
  if (!startedAt || auto.status === "idle") return 0;
  const end = auto.departedAt ?? Date.now();
  return Math.max(0, (end - startedAt) / 1000);
}

export default function SimulationLab() {
  const [stage, setStage] = useState<Stage>("pool");
  const [phase, setPhase] = useState<Phase>("idle");
  const [autos, setAutos] = useState<RideAuto[]>(freshAutos);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [sameStarted, setSameStarted] = useState(false);
  const guests = useRef(0);
  const timers = useRef<number[]>([]);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function resetAll() {
    clearTimers();
    guests.current = 0;
    setPhase("idle");
    setAutos(freshAutos());
    setStartedAt(null);
    setSameStarted(false);
    setTick(0);
  }

  function choose(next: Stage) {
    resetAll();
    setStage(next);
  }

  function startPool() {
    clearTimers();
    guests.current = 0;
    const now = Date.now();
    setStartedAt(now);
    setPhase("live");
    setAutos(freshAutos().map((auto) => ({ ...auto, status: "waiting" })));
    const leave = window.setTimeout(() => {
      const departed = Date.now();
      setAutos((current) => current.map((auto) => (
        auto.side === "now" && auto.status === "waiting"
          ? { ...auto, status: "riding", departedAt: departed }
          : auto
      )));
    }, 2000);
    timers.current.push(leave);
  }

  function addPeople(count: number) {
    if (phase !== "live") return;
    const next = autos.map((auto) => ({ ...auto, seats: [...auto.seats] }));
    let left = count;
    const waiting = next
      .filter((auto) => auto.side === "old" && auto.status === "waiting")
      .sort((a, b) => (a.capacity - a.seats.length) - (b.capacity - b.seats.length));
    for (const auto of waiting) {
      while (left > 0 && auto.seats.length < auto.capacity) {
        guests.current += 1;
        const to = auto.id === "old-agira" ? "Library" : "Auditorium";
        auto.seats.push({ id: `guest-${guests.current}`, name: `Guest ${guests.current}`, to });
        left -= 1;
      }
      if (auto.seats.length >= auto.capacity) {
        auto.status = "riding";
        auto.departedAt = Date.now();
      }
    }
    setAutos(next);
  }

  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => () => clearTimers(), []);

  const oldAutos = autos.filter((auto) => auto.side === "old");
  const nowAutos = autos.filter((auto) => auto.side === "now");
  const oldStillWaiting = oldAutos.some((auto) => auto.status === "waiting");

  return (
    <div className="min-h-screen bg-[#f3f0ea] text-gray-950">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f3f0ea]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link to="/" className="text-sm font-medium text-gray-500">Campus Ride</Link>
          <div className="mx-auto flex rounded-full bg-white p-1 shadow-sm">
            <StageTab active={stage === "pool"} onClick={() => choose("pool")}>1 · Waiting for 4</StageTab>
            <StageTab active={stage === "same"} onClick={() => choose("same")}>2 · Same second</StageTab>
          </div>
          {stage === "pool" ? (
            phase === "idle" ? (
              <button className="rounded-full bg-[#7B0000] px-7 py-3 text-base font-semibold text-white" onClick={startPool}>Start</button>
            ) : (
              <button className="rounded-full border border-gray-300 bg-white px-6 py-3 text-base font-semibold" onClick={resetAll}>Run again</button>
            )
          ) : (
              <button
              className="rounded-full bg-[#7B0000] px-7 py-3 text-base font-semibold text-white"
              onClick={() => setSameStarted((value) => !value)}
            >
              {sameStarted ? "Reset" : "Start"}
            </button>
          )}
        </div>
      </header>

      {stage === "pool" ? (
        <PoolStage
          oldAutos={oldAutos}
          nowAutos={nowAutos}
          startedAt={startedAt}
          canAdd={phase === "live" && oldStillWaiting}
          onAdd={addPeople}
        />
      ) : (
        <SameSecond started={sameStarted} />
      )}
    </div>
  );
}

function StageTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-semibold ${active ? "bg-[#1c1917] text-white" : "text-gray-600"}`}
    >
      {children}
    </button>
  );
}

function PoolStage({
  oldAutos,
  nowAutos,
  startedAt,
  canAdd,
  onAdd,
}: {
  oldAutos: RideAuto[];
  nowAutos: RideAuto[];
  startedAt: number | null;
  canAdd: boolean;
  onAdd: (count: number) => void;
}) {
  return (
    <>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="max-w-3xl text-lg text-gray-600">
          Riya, Arjun and Sara are at Agira Hall. Kabir is at Prithvi Hall, next door. Two of them are going to the Library. Two are going to the Auditorium.
        </p>
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <Column
            kicker="Earlier"
            title="Each auto waits for 4 people"
            tone="old"
            autos={oldAutos}
            startedAt={startedAt}
          />
          <Column
            kicker="This project"
            title="People going to the same place leave together"
            tone="now"
            autos={nowAutos}
            startedAt={startedAt}
          />
        </div>
        <PoolReveal
          kabirWait={clock(waitedSeconds(oldAutos.find((auto) => auto.id === "old-prithvi") ?? oldAutos[0], startedAt))}
          projectWait={clock(waitedSeconds(nowAutos.find((auto) => auto.id === "now-audi") ?? nowAutos[0], startedAt))}
        />
      </main>
      <div className="sticky bottom-0 border-t border-black/5 bg-[#f3f0ea]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <p className="text-sm text-gray-500">Add people to the earlier autos. An auto leaves the moment it has 4.</p>
          <div className="flex gap-3">
            <AddButton disabled={!canAdd} onClick={() => onAdd(1)}>+ 1 person</AddButton>
            <AddButton disabled={!canAdd} onClick={() => onAdd(2)}>+ 2 people</AddButton>
            <AddButton disabled={!canAdd} onClick={() => onAdd(8)}>Fill the seats</AddButton>
          </div>
        </div>
      </div>
    </>
  );
}

function Column({
  kicker,
  title,
  tone,
  autos,
  startedAt,
}: {
  kicker: string;
  title: string;
  tone: "old" | "now";
  autos: RideAuto[];
  startedAt: number | null;
}) {
  return (
    <section className={`rounded-3xl p-5 ${tone === "now" ? "bg-white shadow-sm ring-1 ring-[#7B0000]/15" : "bg-white/60"}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone === "now" ? "text-[#7B0000]" : "text-gray-400"}`}>{kicker}</p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight">{title}</h2>
      <div className="mt-5 space-y-4">
        {autos.map((auto) => (
          <AutoCard key={auto.id} auto={auto} seconds={waitedSeconds(auto, startedAt)} />
        ))}
      </div>
    </section>
  );
}

function AutoCard({ auto, seconds }: { auto: RideAuto; seconds: number }) {
  const empties = Math.max(0, auto.capacity - auto.seats.length);
  const statusLine = auto.status === "idle"
    ? "Not started"
    : auto.status === "waiting"
      ? "Waiting"
      : "Left";

  return (
    <article className="rounded-2xl bg-[#faf8f6] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{auto.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {auto.side === "old"
              ? `${auto.seats.length} of ${auto.capacity} seats`
              : `${auto.seats.length} students, same destination`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold tabular-nums leading-none">{clock(seconds)}</p>
          <p className="mt-1 text-sm text-gray-500">{statusLine}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {auto.seats.map((person) => (
          <span key={person.id} className="min-w-[108px] rounded-2xl bg-white px-3 py-3 shadow-sm">
            <span className="block text-sm font-semibold">{person.name}</span>
            <span className="block text-xs text-gray-500">{person.to}</span>
          </span>
        ))}
        {auto.side === "old" && Array.from({ length: empties }, (_, index) => (
          <span
            key={`${auto.id}-empty-${index}`}
            className={`grid min-w-[108px] place-items-center rounded-2xl border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-400 ${auto.status === "waiting" ? "seat-wait" : ""}`}
          >
            Empty
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
        {auto.route.map((stop, index) => (
          <span key={`${auto.id}-${stop}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span className="text-gray-300">→</span>}
            {stop}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500">
        {auto.status === "riding"
          ? `Waited ${clock(seconds)} · ride ${minutesLabel(auto.rideMin)}`
          : auto.side === "old"
            ? "Stays here until 4 seats are full"
            : "Leaves with this group. It does not wait for 4."}
      </p>
    </article>
  );
}

function AddButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-[#1c1917] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      {children}
    </button>
  );
}

function driverAt(id: string, name: string, place: { lat: number; lng: number }): DriverRecord {
  return {
    id,
    name,
    location: { lat: place.lat, lng: place.lng },
    capacity: 4,
    passengerCount: 0,
    status: "available",
    completedRides: 0,
    route: [],
    version: 0,
  };
}

function requestAt(
  id: string,
  name: string,
  pickup: { lat: number; lng: number },
  pickupLabel: string,
  drop: { lat: number; lng: number },
): RideRequest {
  return {
    id,
    studentId: id,
    studentName: name,
    pickup,
    pickupLabel,
    drop,
    dropLabel: "Central Library",
    seats: 1,
    createdAt: 0,
    idempotencyKey: id,
  };
}

function SameSecond({ started }: { started: boolean }) {
  const decision = useMemo(() => {
    const drivers = [
      driverAt("near-west", "Auto 1", NEERAM),
      driverAt("near-east", "Auto 2", AUDI),
    ];
    const students = [
      { name: "Aarav", from: "Prithvi Hall", request: requestAt("aarav", "Aarav", PRITHVI, "Prithvi Hall", LIBRARY) },
      { name: "Mehak", from: "E Block", request: requestAt("mehak", "Mehak", EBLOCK, "E Block", LIBRARY) },
    ];
    const used = new Set<string>();
    const rankedStudents = [...students].sort((a, b) => {
      const aBest = Math.min(...drivers.map((driver) => scoreDriver(driver, a.request).pickupKm));
      const bBest = Math.min(...drivers.map((driver) => scoreDriver(driver, b.request).pickupKm));
      return aBest - bBest;
    });
    return rankedStudents.map((student) => {
      const ranked = drivers
        .map((driver) => ({ driver, score: scoreDriver(driver, student.request) }))
        .sort((a, b) => a.score.pickupKm - b.score.pickupKm);
      const chosen = ranked.find((item) => !used.has(item.driver.id)) ?? ranked[0];
      used.add(chosen.driver.id);
      const other = ranked.find((item) => item.driver.id !== chosen.driver.id) ?? ranked[1];
      return { ...student, chosen, other };
    });
  }, []);

  const links = started
    ? decision.flatMap((item) => [
      {
        id: `${item.request.id}-skip`,
        from: [item.other.driver.location.lat, item.other.driver.location.lng] as [number, number],
        to: [item.request.pickup.lat, item.request.pickup.lng] as [number, number],
        color: "#9ca3af",
        label: `${item.other.driver.name} is ${item.other.score.pickupKm.toFixed(2)} km away. Not offered.`,
        dash: "6 6",
      },
      {
        id: item.request.id,
        from: [item.chosen.driver.location.lat, item.chosen.driver.location.lng] as [number, number],
        to: [item.request.pickup.lat, item.request.pickup.lng] as [number, number],
        color: item.chosen.driver.id === "near-west" ? "#111827" : "#9a3412",
        label: `${item.chosen.driver.name} takes ${item.name}. ${item.chosen.score.pickupKm.toFixed(2)} km.`,
        strong: true,
      },
    ])
    : [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="max-w-3xl text-lg text-gray-600">
        Aarav at Prithvi Hall and Mehak at E Block both ask for the Library at the same moment. Two autos are free.
      </p>
      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <FleetMap
          fitKey={started ? "same-offered" : "same-waiting"}
          drivers={[
            { id: "near-west", name: "Auto 1", lat: NEERAM.lat, lng: NEERAM.lng, badge: "Auto 1", detail: "Neeram Hall", color: "#111827", dy: 30, dx: -36 },
            { id: "near-east", name: "Auto 2", lat: AUDI.lat, lng: AUDI.lng, badge: "Auto 2", detail: "Auditorium", color: "#9a3412", dy: 30, dx: 40 },
          ]}
          students={[
            { id: "aarav", name: "Aarav", lat: PRITHVI.lat, lng: PRITHVI.lng, badge: "Aarav", detail: "Prithvi Hall", color: "#1d4ed8", dy: -20, dx: 10 },
            { id: "mehak", name: "Mehak", lat: EBLOCK.lat, lng: EBLOCK.lng, badge: "Mehak", detail: "E Block", color: "#1d4ed8", dy: -20, dx: 8 },
          ]}
          links={links}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {decision.map((item) => (
          <article key={item.name} className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{item.from} → Library</p>
            <h2 className="mt-1 text-3xl font-semibold">{item.name}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[item.chosen, item.other].sort((a, b) => a.score.pickupKm - b.score.pickupKm).map((option) => {
                const won = started && option.driver.id === item.chosen.driver.id;
                const lost = started && option.driver.id !== item.chosen.driver.id;
                return (
                  <div key={option.driver.id} className={`rounded-2xl p-4 ${won ? "bg-[#1c1917] text-white" : "bg-[#f6f3ef] text-gray-900"} ${lost ? "opacity-50" : ""}`}>
                    <p className="text-sm">{option.driver.name}</p>
                    <p className="mt-2 text-4xl font-semibold tabular-nums">{option.score.pickupKm.toFixed(2)}</p>
                    <p className={`text-sm ${won ? "text-white/70" : "text-gray-500"}`}>km · {option.score.etaMin.toFixed(1)} min</p>
                    <p className={`mt-3 text-sm font-medium ${won ? "text-white" : "text-gray-400"}`}>{won ? "Offered" : lost ? "Not offered" : "Pickup"}</p>
                  </div>
                );
              })}
            </div>
            {started && (
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {item.chosen.driver.name} is {item.chosen.score.pickupKm.toFixed(2)} km away. {item.other.driver.name} is {item.other.score.pickupKm.toFixed(2)} km away, so that seat is not offered.
              </p>
            )}
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500">Solid line is the offer. The dashed line is the farther auto, which is not used.</p>
      <AlgoDrawer
        title="Why these autos were offered"
        rows={[
          { label: "Algorithm", value: "Each free auto is scored for each student. The lower score is offered. Students are considered from the closest pair outward, and an auto already offered is not offered again." },
          { label: "What happened", value: decision.map((item) => `${item.name} at ${item.from}: ${item.chosen.driver.name} at ${item.chosen.score.pickupKm.toFixed(2)} km (${item.chosen.score.etaMin.toFixed(1)} min), not ${item.other.driver.name} at ${item.other.score.pickupKm.toFixed(2)} km.`).join(" ") },
          { label: "Why", value: "Both requests share the same timestamp, so nobody is first in line. Both autos are empty, so fullness and past rides do not change the score. Pickup distance is the whole decision." },
          { label: "Markings", value: "After Start, the solid line is the offer. Auto 1 sits by Prithvi, so Aarav’s walk is 0.10 km. Auto 2 sits by E Block, so Mehak’s walk is 0.22 km. The other pairing is about a kilometre." },
          { label: "How the score is built", value: "Pickup minutes, plus 0.8 times extra kilometres, plus 1.2 times any detour for people already aboard, plus a small term for how full the auto is and how many rides it has finished." },
        ]}
      />
    </main>
  );
}
