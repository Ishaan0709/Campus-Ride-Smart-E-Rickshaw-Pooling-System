import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FleetMap from "@/components/FleetMap";
import { CAMPUS_PLACES } from "@/lib/campus";
import { CAMPUS_LOOKUP_RADIUS_M, benchmarkSpatialLookup, demandHexes } from "@/engine/spatial/spatialIndex";
import type { DriverRecord, MatchStrategy, Ride, SafetyMode } from "@/engine/types";
import {
  autoColor,
  autoPhrase,
  finishedRides,
  ridePhrase,
  ridesOnAuto,
  spreadPoint,
  waitingRides,
} from "@/simulation/explain";
import {
  advanceSim,
  compareCurrent,
  createSimState,
  formatSimTime,
  loadSimConfig,
  presetConfigs,
  saveSimConfig,
  savedConfigNames,
  simMetrics,
  type SimConfig,
  type SimState,
  type SimStudent,
} from "@/simulation/simulator";

const SPEEDS = [1, 2, 5, 10];
const CAMPUS_CENTER = { lat: 30.3532, lng: 76.3665 };

const SCENARIO_HELP: Record<string, string> = {
  "Two students, one auto": "Aarav and Mehak both ask. One auto holds 4 students. Watch who is offered a seat and who is still waiting.",
  "Two students, two autos": "Two named students and two named autos. Each student should be matched to a different auto.",
  "Rush hour: 20 students, 5 autos": "Twenty students ask and five autos are free. This scenario gives each auto one student, so fifteen students stay waiting. An auto holds 4 only when the strategy is pooling.",
  "Multiple simultaneous requests": "Four students ask at the same moment. The matching looks at all of them together.",
  "Driver goes offline": "Auto 1 is switched off, so the student has to be offered to Auto 2.",
  "Driver rejects ride": "Auto 1 refuses the student. The lab then looks for Auto 2.",
  "Offer timeout": "Auto 1 does not answer. After 8 seconds the student is offered to Auto 2.",
  "Ride pooling": "Three students can share Auto 1 when the extra distance stays short. The seat count should climb 1, then 2, then 3.",
  "Unsafe vs safe allocation": "Both students are written onto the same seat. The card will say double booked. Safe mode would keep one seat for one student.",
  "Greedy vs Hungarian": "Greedy gives the first student the closer auto. Hungarian may swap the two so the combined pickup drive is shorter.",
};

export default function SimulationLab() {
  const presets = useMemo(() => presetConfigs(), []);
  const [state, setState] = useState<SimState>(() => createSimState(presets[1]));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [saved, setSaved] = useState<string[]>(() => savedConfigNames());
  const [showHexes, setShowHexes] = useState(true);
  const [selectedAuto, setSelectedAuto] = useState<string | null>(null);
  const [bench, setBench] = useState("Measuring how fast a nearby search is…");
  const [draft, setDraft] = useState({ name: "", kind: "student" as "student" | "driver", place: CAMPUS_PLACES[0].id });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      void advanceSim(stateRef.current, 250 * speed).then(setState);
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  useEffect(() => {
    const campus = benchmarkSpatialLookup(50, 200, 0.015);
    const city = benchmarkSpatialLookup(5000, 200, 0.45);
    setBench(
      `Measured in this browser, 200 searches. Fifty autos on a campus: checking every auto took ${campus.linearMs.toFixed(1)} ms and opened ${campus.linearInspected.toFixed(0)} autos; hex cells took ${campus.h3Ms.toFixed(1)} ms and opened ${campus.h3Inspected.toFixed(0)}. Five thousand autos spread across a city: checking every auto took ${city.linearMs.toFixed(1)} ms and opened ${city.linearInspected.toFixed(0)}; hex cells took ${city.h3Ms.toFixed(1)} ms and opened ${city.h3Inspected.toFixed(0)}. Both ways kept the same nearby autos. Hexes help when the fleet is spread across a city. On one campus they mostly show where students are asking.`,
    );
  }, []);

  const metrics = simMetrics(state);
  const comparison = compareCurrent(state);
  const hexes = showHexes ? demandHexes(state.rides.map((ride) => ride.pickup), CAMPUS_CENTER, 5) : [];

  const mapDrivers = state.drivers.map((driver, index) => {
    const aboard = ridesOnAuto(state.rides, driver.id);
    const spot = spreadPoint(driver.id, driver.location.lat, driver.location.lng);
    const color = autoColor(index);
    return {
      id: driver.id,
      name: driver.name,
      lat: spot.lat,
      lng: spot.lng,
      status: driver.status,
      color: selectedAuto && selectedAuto !== driver.id ? "#9ca3af" : color,
      badge: driver.name,
      detail: `${aboard.length}/${driver.capacity} students`,
    };
  });

  const mapStudents = state.config.students.map((student) => {
    const ride = latestRide(state.rides, student.id);
    const driverIndex = ride?.driverId ? state.drivers.findIndex((driver) => driver.id === ride.driverId) : -1;
    const color = driverIndex >= 0 ? autoColor(driverIndex) : "#1d4ed8";
    const spot = spreadPoint(student.id, student.pickup.lat, student.pickup.lng);
    return {
      id: student.id,
      name: student.name,
      lat: spot.lat,
      lng: spot.lng,
      color,
      badge: student.name,
      detail: ride
        ? `${student.name}: ${ridePhrase(ride.status)}. ${student.pickupLabel} to ${student.dropLabel}.`
        : `${student.name} has not asked yet. Pickup will be ${student.pickupLabel}.`,
    };
  });

  const links = state.rides
    .filter((ride) => ride.driverId && ["OFFERED", "ACCEPTED", "OTP_VERIFIED", "IN_PROGRESS"].includes(ride.status))
    .map((ride) => {
      const driver = state.drivers.find((item) => item.id === ride.driverId);
      const driverIndex = state.drivers.findIndex((item) => item.id === ride.driverId);
      if (!driver) return null;
      const from = spreadPoint(driver.id, driver.location.lat, driver.location.lng);
      const to = spreadPoint(ride.studentId, ride.pickup.lat, ride.pickup.lng);
      const aboard = ridesOnAuto(state.rides, driver.id);
      return {
        id: ride.id,
        from: [from.lat, from.lng] as [number, number],
        to: [to.lat, to.lng] as [number, number],
        color: autoColor(Math.max(driverIndex, 0)),
        label: `${ride.studentName} is assigned to ${driver.name}. That auto has ${aboard.length} of ${driver.capacity} students.`,
        strong: !selectedAuto || selectedAuto === driver.id,
      };
    })
    .filter((link): link is NonNullable<typeof link> => link !== null);

  function load(config: SimConfig) {
    setPlaying(false);
    setSelectedAuto(null);
    setState(createSimState(config));
  }

  function updateConfig(recipe: (config: SimConfig) => SimConfig) {
    setPlaying(false);
    setState(createSimState(recipe(state.config)));
  }

  function addPerson() {
    const place = CAMPUS_PLACES.find((item) => item.id === draft.place) ?? CAMPUS_PLACES[0];
    const drop = CAMPUS_PLACES[(CAMPUS_PLACES.indexOf(place) + 3) % CAMPUS_PLACES.length];
    updateConfig((config) => {
      if (draft.kind === "student") {
        const student: SimStudent = {
          id: `s-${Date.now()}`,
          name: draft.name || `Student ${config.students.length + 1}`,
          pickupLabel: place.name,
          dropLabel: drop.name,
          pickup: { lat: place.lat, lng: place.lng },
          drop: { lat: drop.lat, lng: drop.lng },
        };
        return {
          ...config,
          students: [...config.students, student],
          schedule: [...config.schedule, { at: 1000 + config.schedule.length * 1000, studentId: student.id }],
        };
      }
      const driver: DriverRecord = {
        id: `d-${Date.now()}`,
        name: draft.name || `Auto ${config.drivers.length + 1}`,
        location: { lat: place.lat, lng: place.lng },
        capacity: 4,
        passengerCount: 0,
        status: "available",
        completedRides: 0,
        route: [],
        version: 0,
      };
      return { ...config, drivers: [...config.drivers, driver] };
    });
    setDraft({ ...draft, name: "" });
  }

  const waiting = waitingRides(state.rides);
  const done = finishedRides(state.rides);
  const notYet = state.config.students.filter((student) => !state.rides.some((ride) => ride.studentId === student.id));
  const samePlan = Math.abs(comparison.greedy.pickupKm - comparison.hungarian.pickupKm) < 0.01;

  return (
    <div className="min-h-screen bg-[#f6f4f2] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#7B0000]">Practice dispatch · not the live campus</p>
            <h1 className="text-2xl font-semibold">Who is in which auto</h1>
          </div>
          <div className="flex gap-3 text-sm">
            <Link to="/admin" className="rounded-full border border-gray-300 px-4 py-2">Admin</Link>
            <Link to="/" className="rounded-full bg-[#7B0000] px-4 py-2 text-white">Home</Link>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-3 px-6 py-3 text-sm text-gray-700 md:grid-cols-3">
          <p><span className="font-semibold text-gray-900">Student.</span> A person asking to go from one campus place to another. Blue until an auto is assigned, then the same color as that auto.</p>
          <p><span className="font-semibold text-gray-900">Auto.</span> One e-rickshaw. It has 4 seats. The badge says how many students are on it right now, for example 2/4.</p>
          <p><span className="font-semibold text-gray-900">Line.</span> That student is assigned to that auto. A hex is a map cell: darker means more students asked for a ride there.</p>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1440px] gap-4 px-6 py-4 lg:grid-cols-[250px_minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="font-semibold">Scenarios</h2>
            <p className="mt-1 text-xs text-gray-500">Pick one, then press Start. The clock is fake and stays in this browser.</p>
            <div className="mt-3 space-y-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => load(preset)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${state.config.name === preset.name ? "border-[#7B0000] bg-[#7B0000]/5" : "border-gray-200"}`}
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="mt-1 block text-xs text-gray-500">{SCENARIO_HELP[preset.name]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">Clock</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg bg-[#7B0000] px-3 py-2 text-white" onClick={() => setPlaying(true)}>Start</button>
              <button className="rounded-lg border px-3 py-2" onClick={() => setPlaying(false)}>Pause</button>
              <button className="rounded-lg border px-3 py-2" onClick={() => void advanceSim(state, 1000).then(setState)}>Step 1s</button>
              <button className="rounded-lg border px-3 py-2" onClick={() => load(state.config)}>Reset</button>
            </div>
            <div className="mt-3 flex gap-2">
              {SPEEDS.map((value) => (
                <button key={value} onClick={() => setSpeed(value)} className={`rounded-lg border px-2 py-1 ${speed === value ? "border-[#7B0000]" : ""}`}>{value}x</button>
              ))}
            </div>
            <p className="mt-3 text-gray-600">Simulated time {formatSimTime(state.now)}</p>
            <label className="mt-3 block">How an auto is chosen
              <select className="mt-1 w-full rounded-lg border px-2 py-2" value={state.config.strategy} onChange={(event) => updateConfig((config) => ({ ...config, strategy: event.target.value as MatchStrategy }))}>
                <option value="greedy">Greedy: first student gets the closest auto</option>
                <option value="hungarian">Hungarian: all waiting students are matched together</option>
                <option value="pool">Pooling: one auto can carry several students</option>
              </select>
            </label>
            <label className="mt-3 block">If two students want the last seat
              <select className="mt-1 w-full rounded-lg border px-2 py-2" value={state.config.safety} onChange={(event) => updateConfig((config) => ({ ...config, safety: event.target.value as SafetyMode }))}>
                <option value="safe">Safe: only one student gets the seat</option>
                <option value="unsafe">Unsafe: both can be written onto the same seat</option>
              </select>
            </label>
            <label className="mt-3 block">Which autos are even considered
              <select className="mt-1 w-full rounded-lg border px-2 py-2" value={state.config.lookup ?? "all"} onChange={(event) => updateConfig((config) => ({ ...config, lookup: event.target.value as SimConfig["lookup"] }))}>
                <option value="all">Every auto, then road distance</option>
                <option value="linear">Only autos inside {CAMPUS_LOOKUP_RADIUS_M} m (straight line)</option>
                <option value="h3">Only autos in this hex and its neighbours</option>
              </select>
            </label>
            <label className="mt-3 flex items-center gap-2">
              <input type="checkbox" checked={state.config.useRoads} onChange={(event) => updateConfig((config) => ({ ...config, useRoads: event.target.checked }))} />
              Measure the trip on campus roads
            </label>
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={showHexes} onChange={(event) => setShowHexes(event.target.checked)} />
              Show demand hexes
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
            <FleetMap drivers={mapDrivers} students={mapStudents} rides={state.rides} hexes={hexes} links={links} />
            <div className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-xs rounded-lg bg-white/95 p-3 text-xs shadow">
              <p className="font-semibold">On the map</p>
              <p className="mt-1 text-gray-600">Colored badge = one auto, with students on board / 4 seats. White badge = a student. A line joins a student to their auto. A red hex has requests.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Students who asked" value={String(metrics.requests)} hint="Ride requests so far" />
            <Metric label="Matched to an auto" value={String(metrics.assigned)} hint="Offered, riding, or dropped off" />
            <Metric label="Still waiting" value={String(metrics.pending)} hint="No seat yet" />
            <Metric label="Autos busy" value={`${Math.round(metrics.utilization * 100)}%`} hint="Autos that have a student" />
            <Metric label="Average wait" value={`${metrics.avgWaitMin.toFixed(1)} min`} hint="From request to offer" />
            <Metric label="Average pickup" value={`${metrics.avgPickupKm.toFixed(2)} km`} hint="How far the auto drives to the student" />
            <Metric label="Seat fights" value={String(metrics.lockConflicts)} hint="A seat was taken before this student got it" />
            <Metric label="Double bookings" value={String(metrics.doubleBookings)} hint="Unsafe mode put two students on one seat" />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">Same students, two ways of choosing</h2>
            <p className="mt-2 text-gray-700">
              {samePlan
                ? `Both methods send the autos ${comparison.greedy.pickupKm.toFixed(2)} km in total to the pickups.`
                : `First-come matching sends the autos ${comparison.greedy.pickupKm.toFixed(2)} km to the pickups. Matching everyone together sends them ${comparison.hungarian.pickupKm.toFixed(2)} km.`}
            </p>
            <p className="mt-2 text-gray-500">These numbers are calculated from the students and autos on screen. They are not a saved score.</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            <h2 className="font-semibold text-gray-900">Why the hexes are not the distance</h2>
            <p className="mt-2">{bench}</p>
            <p className="mt-2">After the shortlist, the trip length still comes from the campus roads when that box is ticked, or from a straight line when it is not. A hex only means “look around here”.</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="font-semibold">Autos and their students</h2>
            <p className="mt-1 text-xs text-gray-500">Click an auto to highlight its lines. Capacity is 4 students unless a scenario says otherwise.</p>
            <div className="mt-3 space-y-3">
              {state.drivers.map((driver, index) => {
                const aboard = ridesOnAuto(state.rides, driver.id);
                return (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedAuto(selectedAuto === driver.id ? null : driver.id)}
                    className={`block w-full rounded-lg border p-3 text-left ${selectedAuto === driver.id ? "border-[#7B0000]" : "border-gray-200"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold" style={{ color: autoColor(index) }}>{driver.name}</p>
                      <p className="text-sm font-semibold">{aboard.length}/{driver.capacity}</p>
                    </div>
                    <p className="text-xs text-gray-500">{driver.plate ?? "Campus auto"} · {driver.status === "offline" ? "not in service" : "in service"}</p>
                    <p className="mt-2 text-sm text-gray-700">{autoPhrase(driver, aboard.length)}</p>
                    {aboard.length === 0 && driver.status !== "offline" && (
                      <p className="mt-2 text-sm text-gray-500">No student is assigned to this auto.</p>
                    )}
                    <ul className="mt-2 space-y-2">
                      {aboard.map((ride) => (
                        <li key={ride.id} className="rounded-md bg-gray-50 px-2 py-2 text-sm">
                          <span className="font-medium">{ride.studentName}</span>
                          <span className="block text-xs text-gray-600">{ride.pickupLabel} → {ride.dropLabel}</span>
                          <span className="block text-xs text-gray-500">{ridePhrase(ride.status)}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">Not on an auto</h2>
            {waiting.length === 0 && notYet.length === 0 && <p className="mt-2 text-gray-500">Everyone who has asked is matched, riding, or already dropped off.</p>}
            <ul className="mt-2 space-y-2">
              {waiting.map((ride) => (
                <li key={ride.id}>
                  <span className="font-medium">{ride.studentName}</span>
                  <span className="block text-xs text-gray-600">{ride.pickupLabel} → {ride.dropLabel}. {ridePhrase(ride.status)}. {ride.reasons[0] ?? ""}</span>
                </li>
              ))}
              {notYet.map((student) => (
                <li key={student.id}>
                  <span className="font-medium">{student.name}</span>
                  <span className="block text-xs text-gray-600">Has not asked yet. Will go from {student.pickupLabel} to {student.dropLabel}.</span>
                </li>
              ))}
            </ul>
            {done.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium">Dropped off</h3>
                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  {done.map((ride) => {
                    const auto = state.drivers.find((driver) => driver.id === ride.driverId);
                    return <li key={ride.id}>{ride.studentName} finished with {auto?.name ?? "an auto"} ({ride.pickupLabel} → {ride.dropLabel}).</li>;
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-6 pb-8 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold">What just happened</h2>
          <div className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
            {state.events.length === 0 && <p className="text-gray-500">Press Start. Students ask on the scenario’s schedule, then an auto is named and the seat count changes.</p>}
            {[...state.events].reverse().map((event) => (
              <p key={event.id} className="border-b border-gray-100 pb-2 text-gray-800">{event.message}</p>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">Add someone</h2>
          <input className="mt-3 w-full rounded-lg border px-2 py-2" placeholder="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <select className="mt-2 w-full rounded-lg border px-2 py-2" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as "student" | "driver" })}>
            <option value="student">Student</option>
            <option value="driver">Auto</option>
          </select>
          <select className="mt-2 w-full rounded-lg border px-2 py-2" value={draft.place} onChange={(event) => setDraft({ ...draft, place: event.target.value })}>
            {CAMPUS_PLACES.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
          <button className="mt-3 w-full rounded-lg border px-3 py-2" onClick={addPerson}>Add to this world</button>
          <button className="mt-2 w-full rounded-lg border px-3 py-2" onClick={() => { saveSimConfig(state.config); setSaved(savedConfigNames()); }}>Save this world in the browser</button>
          {saved.map((name) => (
            <button key={name} className="mt-2 block w-full text-left text-[#7B0000]" onClick={() => { const config = loadSimConfig(name); if (config) load(config); }}>{name}</button>
          ))}
        </div>
      </section>
    </div>
  );
}

function latestRide(rides: Ride[], studentId: string): Ride | undefined {
  return rides.find((ride) => ride.studentId === studentId);
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="text-xs text-gray-400">{hint}</p>
    </div>
  );
}
