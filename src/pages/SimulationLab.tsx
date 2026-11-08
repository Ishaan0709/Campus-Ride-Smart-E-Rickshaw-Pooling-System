import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FleetMap from "@/components/FleetMap";
import { AlgoDrawer, PoolReveal } from "@/components/LabReveal";
import RideTheater from "@/components/RideTheater";
import { claimSeat } from "@/engine/concurrency/claim";
import { etaMinutes, haversineKm } from "@/engine/distance";
import { MemoryClaimStore } from "@/engine/ports";
import type { DriverRecord } from "@/engine/types";
import { placeById } from "@/lib/campus";

type Stage = "pool" | "same" | "lock";
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
const PICKUP_MIN = etaMinutes(haversineKm(AGIRA, PRITHVI) + haversineKm(PRITHVI, LIBRARY));
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
      id: "now-agira",
      side: "now",
      title: "Auto at Agira",
      route: ["Agira Hall", "Prithvi Hall", "Library"],
      seats: [
        { id: "riya2", name: "Riya", to: "Library" },
        { id: "arjun2", name: "Arjun", to: "Library" },
        { id: "sara2", name: "Sara", to: "Auditorium" },
      ],
      capacity: 4,
      rideMin: PICKUP_MIN,
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
  const [stage, setStage] = useState<Stage>("same");
  const [phase, setPhase] = useState<Phase>("idle");
  const [autos, setAutos] = useState<RideAuto[]>(freshAutos);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [sameStarted, setSameStarted] = useState(false);
  const [lockStarted, setLockStarted] = useState(false);
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
    setLockStarted(false);
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
        auto.id === "now-agira" && auto.status === "waiting"
          ? {
            ...auto,
            status: "riding",
            departedAt: departed,
            seats: [...auto.seats, { id: "kabir-now", name: "Kabir", to: "Library" }],
          }
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
          <div className="mx-auto flex shrink-0 rounded-full bg-white p-1 shadow-sm">
            <StageTab active={stage === "pool"} onClick={() => choose("pool")}>1 · The wait</StageTab>
            <StageTab active={stage === "same"} onClick={() => choose("same")}>2 · The ride</StageTab>
            <StageTab active={stage === "lock"} onClick={() => choose("lock")}>3 · Last seat</StageTab>
          </div>
          {stage === "pool" ? (
            phase === "idle" ? (
              <button className="rounded-full bg-[#7B0000] px-7 py-3 text-base font-semibold text-white" onClick={startPool}>Start</button>
            ) : (
              <button className="rounded-full border border-gray-300 bg-white px-6 py-3 text-base font-semibold" onClick={resetAll}>Run again</button>
            )
          ) : stage === "same" ? (
            <button
              className="rounded-full bg-[#7B0000] px-7 py-3 text-base font-semibold text-white"
              onClick={() => setSameStarted((value) => !value)}
            >
              {sameStarted ? "Reset" : "Start"}
            </button>
          ) : (
            <button
              className="rounded-full bg-[#7B0000] px-7 py-3 text-base font-semibold text-white"
              onClick={() => setLockStarted((value) => !value)}
            >
              {lockStarted ? "Reset" : "Start"}
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
      ) : stage === "same" ? (
        <RideTheater started={sameStarted} />
      ) : (
        <LastSeat started={lockStarted} />
      )}
    </div>
  );
}

function StageTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold ${active ? "bg-[#1c1917] text-white" : "text-gray-600"}`}
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
          Three students are already seated at Agira Hall. Kabir is at Prithvi Hall, the next hostel. Before this website, the autos sit until four people have boarded. This one drives to Kabir, fills the last seat, then goes to the Library, because that drop is closer.
        </p>
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <Column
            kicker="Earlier"
            title="They wait until someone comes and sits"
            tone="old"
            autos={oldAutos}
            startedAt={startedAt}
          />
          <Column
            kicker="This project"
            title="Pick up the nearby student, then the closer stop"
            tone="now"
            autos={nowAutos}
            startedAt={startedAt}
          />
        </div>
        <PoolReveal
          kabirWait={clock(waitedSeconds(oldAutos.find((auto) => auto.id === "old-prithvi") ?? oldAutos[0], startedAt))}
          projectWait={clock(waitedSeconds(nowAutos[0], startedAt))}
          projectLeft={nowAutos[0]?.status === "riding"}
        />
      </main>
      <div className="sticky bottom-0 border-t border-black/5 bg-[#f3f0ea]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <p className="text-sm text-gray-500">The earlier autos do not move until you seat a fourth person. That is the wait.</p>
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
      ? (auto.side === "now" ? "Picking up" : "Waiting")
      : "Left";

  return (
    <article className="rounded-2xl bg-[#faf8f6] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{auto.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{auto.seats.length} of {auto.capacity} seats</p>
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
        {empties > 0 && (auto.side === "now" ? (
          <span className={`min-w-[108px] rounded-2xl border border-dashed border-[#7B0000]/40 px-3 py-3 text-sm ${auto.status === "waiting" ? "seat-wait" : ""}`}>
            <span className="block font-semibold text-[#7B0000]">Kabir</span>
            <span className="block text-xs text-gray-500">Next door</span>
          </span>
        ) : (
          Array.from({ length: empties }, (_, index) => (
            <span
              key={`${auto.id}-empty-${index}`}
              className={`grid min-w-[108px] place-items-center rounded-2xl border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-400 ${auto.status === "waiting" ? "seat-wait" : ""}`}
            >
              Empty
            </span>
          ))
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
            ? "Stays here until 4 people have sat down"
            : auto.status === "waiting"
              ? "Driving to Prithvi to pick Kabir"
              : "Will pick Kabir, then go to the Library"}
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

function shift(place: { lat: number; lng: number }, northM: number, eastM: number) {
  return { lat: place.lat + northM / 111_000, lng: place.lng + eastM / (111_000 * Math.cos(place.lat * Math.PI / 180)) };
}

const SAME_SPOT = shift(AGIRA, 0, 240);

function LastSeat({ started }: { started: boolean }) {
  const [outcome, setOutcome] = useState<{ winner: string; loser: string; version: number } | null>(null);

  useEffect(() => {
    if (!started) {
      setOutcome(null);
      return;
    }
    let cancelled = false;
    const driver = driverAt("last", "Auto", AGIRA);
    driver.passengerCount = 3;
    driver.version = 4;
    driver.status = "assigned";
    const store = new MemoryClaimStore([driver]);
    Promise.all([
      claimSeat(store, "last", 1, "safe", 40),
      claimSeat(store, "last", 1, "safe", 40),
    ]).then((results) => {
      if (cancelled) return;
      const names = ["Dev", "Aman"];
      const winnerIndex = results.findIndex((result) => result.ok);
      const winner = names[winnerIndex] ?? names[0];
      const loser = names[winnerIndex === 0 ? 1 : 0];
      setOutcome({ winner, loser, version: results[0].observedVersion });
    });
    return () => {
      cancelled = true;
    };
  }, [started]);

  const devWon = outcome?.winner === "Dev";
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="max-w-3xl text-lg text-gray-600">
        The auto already has 3 students. Dev and Aman are the same distance away and they ask at the same moment. There is one seat. The lock decides, not the distance.
      </p>
      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <FleetMap
          fitKey={outcome ? "lock-done" : "lock-wait"}
          drivers={[{ id: "last", name: "Auto", lat: AGIRA.lat, lng: AGIRA.lng, badge: "Auto", detail: outcome ? "4 of 4 · locked" : "3 of 4 · one seat", color: "#111827", dy: 28 }]}
          students={[
            { id: "dev", name: "Dev", lat: SAME_SPOT.lat, lng: SAME_SPOT.lng, badge: outcome ? (devWon ? "Dev · seat" : "Dev · no seat") : "Dev", detail: "Same distance", color: "#1d4ed8", dy: -16, dx: -48 },
            { id: "aman", name: "Aman", lat: SAME_SPOT.lat, lng: SAME_SPOT.lng, badge: outcome ? (!devWon ? "Aman · seat" : "Aman · no seat") : "Aman", detail: "Same time", color: "#1d4ed8", dy: 8, dx: 56 },
          ]}
          links={outcome ? [{
            id: "won",
            from: [AGIRA.lat, AGIRA.lng],
            to: [SAME_SPOT.lat, SAME_SPOT.lng],
            color: "#166534",
            label: `${outcome.winner} · the lock held`,
            strong: true,
          }] : []}
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {["Dev", "Aman"].map((name) => {
          const won = outcome?.winner === name;
          const lost = outcome?.loser === name;
          return (
            <article key={name} className={`rounded-3xl p-6 ${won ? "bg-[#1c1917] text-white" : "bg-white shadow-sm"}`}>
              <p className="text-sm opacity-70">Same place · same second</p>
              <h2 className="mt-1 text-3xl font-semibold">{name}</h2>
              <p className="mt-4 text-lg">
                {!outcome && "Waiting for the lock"}
                {won && "Got the seat. Version 4 became 5."}
                {lost && "Rejected. The version was no longer 4."}
              </p>
            </article>
          );
        })}
      </div>
      <AlgoDrawer
        title="Why only one student sits"
        rows={[
          { label: "Atomicity", value: "Taking the seat and advancing the version are one write. Both happen, or neither happens. The auto cannot end up with two students and one seat." },
          { label: "The lock", value: "The auto’s row has a version, here 4. A student may write the fourth passenger only if the version is still 4. That compare-and-set is the lock databases use so two transactions cannot commit the same row." },
          { label: "What happened", value: outcome ? `Both reads saw version ${outcome.version} and 3 passengers. ${outcome.winner}’s write committed and the version became 5. ${outcome.loser}’s write found version 5, so it was rejected. Distance was equal, so it decided nothing.` : "Press Start. Both claims read the row, then both try to write. Only one write matches the version." },
          { label: "Isolation", value: "The second student is not allowed to use a stale read. Once the first commit lands, the old picture of “one seat free” is no longer a legal basis for a write." },
          { label: "Without the lock", value: "If the write ignored the version, both students would be told yes and the auto would show two people in one seat. That is a double booking. This project does not do that." },
        ]}
      />
    </main>
  );
}
