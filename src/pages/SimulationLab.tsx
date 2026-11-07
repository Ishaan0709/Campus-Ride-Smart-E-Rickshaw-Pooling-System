import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FleetMap from "@/components/FleetMap";
import { AlgoDrawer, PoolReveal } from "@/components/LabReveal";
import { claimSeat } from "@/engine/concurrency/claim";
import { etaMinutes, haversineKm } from "@/engine/distance";
import { hungarianMatches } from "@/engine/matching/hungarianMatcher";
import { scoreDriver } from "@/engine/matching/score";
import { MemoryClaimStore } from "@/engine/ports";
import type { DriverRecord, RideRequest } from "@/engine/types";
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
const NEERAM = placeById("neeram-hall");
const EBLOCK = placeById("e-block");

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
  const [stage, setStage] = useState<Stage>("pool");
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
            <StageTab active={stage === "same"} onClick={() => choose("same")}>2 · Dispatch</StageTab>
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
        <Dispatch started={sameStarted} />
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

const TAN = placeById("tan");

function shift(place: { lat: number; lng: number }, northM: number, eastM: number) {
  return { lat: place.lat + northM / 111_000, lng: place.lng + eastM / (111_000 * Math.cos(place.lat * Math.PI / 180)) };
}

interface CastMember {
  id: string;
  name: string;
  from: string;
  to: string;
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  request: RideRequest;
}

function castMember(
  id: string,
  name: string,
  from: string,
  pickup: { lat: number; lng: number },
  to: string,
  drop: { lat: number; lng: number },
): CastMember {
  return {
    id,
    name,
    from,
    to,
    pickup,
    drop,
    request: {
      id,
      studentId: id,
      studentName: name,
      pickup,
      pickupLabel: from,
      drop,
      dropLabel: to,
      seats: 1,
      createdAt: 0,
      idempotencyKey: id,
    },
  };
}

function Dispatch({ started }: { started: boolean }) {
  const [step, setStep] = useState(0);
  const plan = useMemo(() => {
    const drivers = [
      driverAt("auto-1", "Auto 1", NEERAM),
      driverAt("auto-2", "Auto 2", AUDI),
      driverAt("auto-3", "Auto 3", LIBRARY),
      { ...driverAt("auto-4", "Auto 4", AGIRA), passengerCount: 4, status: "occupied" as const },
    ];
    const students = [
      castMember("aarav", "Aarav", "Prithvi Hall", PRITHVI, "Library", LIBRARY),
      castMember("mehak", "Mehak", "E Block", EBLOCK, "Auditorium", AUDI),
      castMember("kabir", "Kabir", "TAN Block", TAN, "Library", LIBRARY),
      castMember("sara", "Sara", "Agira Hall", AGIRA, "Auditorium", AUDI),
    ];
    const free = drivers.filter((driver) => driver.passengerCount < driver.capacity);
    const nearest = students.map((student) => {
      const ranked = drivers
        .map((driver) => ({ driver, score: scoreDriver(driver, student.request) }))
        .sort((a, b) => a.score.pickupKm - b.score.pickupKm);
      const feasible = ranked.filter((item) => item.score.feasible);
      return { student, closest: ranked[0], bestFree: feasible[0], secondFree: feasible[1] };
    });
    const offers = hungarianMatches(students.map((student) => student.request), free);
    const offerByStudent = new Map(offers.map((match) => [match.request.id, match]));
    return { drivers, students, nearest, offerByStudent };
  }, []);

  useEffect(() => {
    setStep(0);
  }, [started]);

  const shown = started ? step : -1;
  const links = shown < 1 ? [] : plan.students.flatMap((student) => {
    const row = plan.nearest.find((item) => item.student.id === student.id);
    const offer = plan.offerByStudent.get(student.id);
    if (!row) return [];
    if (shown === 1 && student.id === "sara") {
      return [{
        id: "sara-full",
        from: [AGIRA.lat, AGIRA.lng] as [number, number],
        to: [AGIRA.lat, AGIRA.lng] as [number, number],
        color: "#9ca3af",
        label: "",
      }];
    }
    if (shown === 2 && row.bestFree) {
      return [{
        id: `${student.id}-near`,
        from: [row.bestFree.driver.location.lat, row.bestFree.driver.location.lng] as [number, number],
        to: [student.pickup.lat, student.pickup.lng] as [number, number],
        color: "#9ca3af",
        label: `${row.bestFree.score.pickupKm.toFixed(2)} km`,
        dash: "6 6",
      }];
    }
    if (shown === 3 && offer) {
      return [{
        id: `${student.id}-offer`,
        from: [offer.driver.location.lat, offer.driver.location.lng] as [number, number],
        to: [student.pickup.lat, student.pickup.lng] as [number, number],
        color: offer.driver.id === "auto-1" ? "#111827" : offer.driver.id === "auto-2" ? "#9a3412" : "#166534",
        label: `${offer.driver.name} · ${offer.score.pickupKm.toFixed(2)} km`,
        strong: true,
      }];
    }
    return [];
  }).filter((link) => link.to[0] !== link.from[0] || link.label);

  const steps = [
    {
      title: "Four students, one moment",
      body: "Aarav, Mehak, Kabir and Sara all ask at the same second. Three autos are empty. One auto at Agira is already full, and Sara is standing beside it.",
    },
    {
      title: "The full auto cannot take Sara",
      body: "Auto 4 has 4 of 4 seats. Distance does not matter: a full auto is not a candidate. Sara’s walk to it is zero, and she still cannot sit.",
    },
    {
      title: "Each student has a closest free auto",
      body: plan.nearest.map((row) => `${row.student.name}: ${row.bestFree.driver.name} at ${row.bestFree.score.pickupKm.toFixed(2)} km`).join(". ") + ". Kabir and Sara both want Auto 3. Aarav is much closer to Auto 1 than Sara is.",
    },
    {
      title: "Three offers. Sara waits.",
      body: `${[...plan.offerByStudent.values()].map((match) => `${match.request.studentName} gets ${match.driver.name}, ${match.score.pickupKm.toFixed(2)} km`).join(". ")}. Sara is not offered an auto. Giving Auto 3 to her would take it from Kabir, who is 0.13 km away instead of her 0.40 km. The assignment is the one with the smallest total pickup.`,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="max-w-3xl text-lg text-gray-600">
        Four students ask together. Three autos are free and one is full. Press Start, then step through what the assignment does.
      </p>
      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <FleetMap
          fitKey={started ? `dispatch-${step}` : "dispatch-wait"}
          drivers={[
            { id: "auto-1", name: "Auto 1", lat: NEERAM.lat, lng: NEERAM.lng, badge: "Auto 1", detail: "Neeram · empty", color: "#111827", dy: 28, dx: -28 },
            { id: "auto-2", name: "Auto 2", lat: AUDI.lat, lng: AUDI.lng, badge: "Auto 2", detail: "Auditorium · empty", color: "#9a3412", dy: 28, dx: 24 },
            { id: "auto-3", name: "Auto 3", lat: LIBRARY.lat, lng: LIBRARY.lng, badge: "Auto 3", detail: "Library · empty", color: "#166534", dy: 26, dx: 36 },
            { id: "auto-4", name: "Auto 4", lat: AGIRA.lat, lng: AGIRA.lng, badge: "Auto 4", detail: "Agira · 4 of 4", color: "#9ca3af", dy: 30, dx: -46 },
          ]}
          students={[
            { id: "aarav", name: "Aarav", lat: PRITHVI.lat, lng: PRITHVI.lng, badge: "Aarav", detail: "Prithvi → Library", color: "#1d4ed8", dy: -20, dx: 18 },
            { id: "mehak", name: "Mehak", lat: EBLOCK.lat, lng: EBLOCK.lng, badge: "Mehak", detail: "E Block → Auditorium", color: "#1d4ed8", dy: -20, dx: 10 },
            { id: "kabir", name: "Kabir", lat: TAN.lat, lng: TAN.lng, badge: "Kabir", detail: "TAN → Library", color: "#1d4ed8", dy: -22, dx: -20 },
            { id: "sara", name: "Sara", lat: AGIRA.lat, lng: AGIRA.lng, badge: "Sara", detail: "Agira → Auditorium", color: "#1d4ed8", dy: -22, dx: 36 },
          ]}
          links={links}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">{started ? `Step ${step + 1} of ${steps.length}` : "Start to walk the assignment."}</p>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            disabled={!started || step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            Back
          </button>
          <button
            className="rounded-full bg-[#1c1917] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            disabled={!started || step === steps.length - 1}
            onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
          >
            Next
          </button>
        </div>
      </div>
      {started && (
        <article className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">{steps[step].title}</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">{steps[step].body}</p>
        </article>
      )}
      {started && step === 3 && (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {plan.students.map((student) => {
            const offer = plan.offerByStudent.get(student.id);
            return (
              <div key={student.id} className={`rounded-2xl p-4 ${offer ? "bg-[#1c1917] text-white" : "bg-white text-gray-900 shadow-sm"}`}>
                <p className="text-sm opacity-70">{student.from}</p>
                <p className="mt-1 text-xl font-semibold">{student.name}</p>
                <p className="mt-3 text-sm">{offer ? `${offer.driver.name} · ${offer.score.pickupKm.toFixed(2)} km` : "No auto. All three were better for someone else."}</p>
              </div>
            );
          })}
        </div>
      )}
      <AlgoDrawer
        title="How the offers were chosen"
        rows={[
          { label: "Algorithm", value: "The Hungarian assignment. Every free auto is scored against every student, then one global matching is chosen so the sum of pickup costs is as small as possible. It is not first-come, first-served." },
          { label: "The complication", value: "Auto 4 is full, so Sara’s nearest vehicle is impossible. Auto 3 is the closest free auto for both Kabir (0.13 km) and Sara (0.40 km). Only one of them can have it." },
          { label: "The result", value: "Aarav gets Auto 1 (0.10 km), Mehak gets Auto 2 (0.22 km), Kabir gets Auto 3 (0.13 km). Sara has no offer. The three offers add up to 0.45 km of pickup." },
          { label: "Why not give Sara the auto", value: "If Sara took Auto 3, Kabir would need a farther auto and the total pickup would be worse. The matching keeps the seat for the student it saves more distance for." },
          { label: "Same timestamp", value: "All four requests share one timestamp, so arrival order never picks a winner. The costs do." },
        ]}
      />
    </main>
  );
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
