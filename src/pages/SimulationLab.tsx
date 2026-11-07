import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FleetMap from "@/components/FleetMap";
import { CAMPUS_PLACES } from "@/lib/campus";
import type { DriverRecord, MatchStrategy, SafetyMode } from "@/engine/types";
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

export default function SimulationLab() {
  const presets = useMemo(() => presetConfigs(), []);
  const [state, setState] = useState<SimState>(() => createSimState(presets[9]));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [saved, setSaved] = useState<string[]>(() => savedConfigNames());
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

  const metrics = simMetrics(state);
  const comparison = compareCurrent(state);
  const mapDrivers = state.drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    lat: driver.location.lat,
    lng: driver.location.lng,
    status: driver.status,
  }));
  const mapStudents = state.config.students.map((student) => ({
    id: student.id,
    name: student.name,
    lat: student.pickup.lat,
    lng: student.pickup.lng,
  }));

  function load(config: SimConfig) {
    setPlaying(false);
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

  return (
    <div className="min-h-screen bg-[#f6f4f2] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#7B0000]">Isolated from production</p>
            <h1 className="text-2xl font-semibold">Simulation Lab</h1>
          </div>
          <div className="flex gap-3 text-sm">
            <Link to="/admin" className="rounded-full border border-gray-300 px-4 py-2">Admin</Link>
            <Link to="/" className="rounded-full bg-[#7B0000] px-4 py-2 text-white">Home</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[280px_1fr_320px]">
        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="font-semibold">Scenarios</h2>
            <div className="mt-3 space-y-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => load(preset)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${state.config.name === preset.name ? "border-[#7B0000] bg-[#7B0000]/5" : "border-gray-200"}`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">Controls</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg bg-[#7B0000] px-3 py-2 text-white" onClick={() => setPlaying(true)}>Start</button>
              <button className="rounded-lg border px-3 py-2" onClick={() => setPlaying(false)}>Pause</button>
              <button className="rounded-lg border px-3 py-2" onClick={() => void advanceSim(state, 1000).then(setState)}>Step</button>
              <button className="rounded-lg border px-3 py-2" onClick={() => load(state.config)}>Reset</button>
            </div>
            <div className="mt-3 flex gap-2">
              {SPEEDS.map((value) => (
                <button key={value} onClick={() => setSpeed(value)} className={`rounded-lg border px-2 py-1 ${speed === value ? "border-[#7B0000]" : ""}`}>{value}x</button>
              ))}
            </div>
            <p className="mt-3 text-gray-500">Clock {formatSimTime(state.now)}</p>
            <label className="mt-3 block">Strategy
              <select className="mt-1 w-full rounded-lg border px-2 py-2" value={state.config.strategy} onChange={(event) => updateConfig((config) => ({ ...config, strategy: event.target.value as MatchStrategy }))}>
                <option value="greedy">Greedy</option>
                <option value="hungarian">Hungarian</option>
                <option value="pool">Pooling insertion</option>
              </select>
            </label>
            <label className="mt-3 block">Concurrency
              <select className="mt-1 w-full rounded-lg border px-2 py-2" value={state.config.safety} onChange={(event) => updateConfig((config) => ({ ...config, safety: event.target.value as SafetyMode }))}>
                <option value="safe">Safe compare-and-set</option>
                <option value="unsafe">Unsafe read-check-write</option>
              </select>
            </label>
            <label className="mt-3 flex items-center gap-2">
              <input type="checkbox" checked={state.config.useRoads} onChange={(event) => updateConfig((config) => ({ ...config, useRoads: event.target.checked }))} />
              Use campus road graph
            </label>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">World builder</h2>
            <input className="mt-3 w-full rounded-lg border px-2 py-2" placeholder="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <select className="mt-2 w-full rounded-lg border px-2 py-2" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as "student" | "driver" })}>
              <option value="student">Student</option>
              <option value="driver">Driver</option>
            </select>
            <select className="mt-2 w-full rounded-lg border px-2 py-2" value={draft.place} onChange={(event) => setDraft({ ...draft, place: event.target.value })}>
              {CAMPUS_PLACES.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
            </select>
            <button className="mt-3 w-full rounded-lg border px-3 py-2" onClick={addPerson}>Add</button>
            <button className="mt-2 w-full rounded-lg border px-3 py-2" onClick={() => { saveSimConfig(state.config); setSaved(savedConfigNames()); }}>Save configuration</button>
            {saved.map((name) => (
              <button key={name} className="mt-2 block w-full text-left text-[#7B0000]" onClick={() => { const config = loadSimConfig(name); if (config) load(config); }}>{name}</button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <FleetMap drivers={mapDrivers} students={mapStudents} rides={state.rides} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="Requests" value={String(metrics.requests)} />
            <Metric label="Assigned" value={String(metrics.assigned)} />
            <Metric label="Pending" value={String(metrics.pending)} />
            <Metric label="Avg wait" value={`${metrics.avgWaitMin.toFixed(1)} min`} />
            <Metric label="Avg pickup" value={`${metrics.avgPickupKm.toFixed(2)} km`} />
            <Metric label="Utilization" value={`${Math.round(metrics.utilization * 100)}%`} />
            <Metric label="Lock conflicts" value={String(metrics.lockConflicts)} />
            <Metric label="Double bookings" value={String(metrics.doubleBookings)} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">Greedy versus Hungarian on this world</h2>
            <p className="mt-2 text-gray-600">Greedy pickup {comparison.greedy.pickupKm.toFixed(2)} km, cost {comparison.greedy.cost.toFixed(2)}. Hungarian pickup {comparison.hungarian.pickupKm.toFixed(2)} km, cost {comparison.hungarian.cost.toFixed(2)}.</p>
            <p className="mt-2 text-gray-500">These totals are calculated from the current students and drivers. They are not stored numbers.</p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold">Event log</h2>
          <div className="mt-3 max-h-[720px] space-y-3 overflow-auto text-sm">
            {state.events.length === 0 && <p className="text-gray-500">Start the clock. Requests fire from the scenario schedule.</p>}
            {[...state.events].reverse().map((event) => (
              <p key={event.id} className="border-b border-gray-100 pb-2">{event.message}</p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
