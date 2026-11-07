import { claimSeat, releaseSeat } from "@/engine/concurrency/claim";
import { dispatchRequests, previewStrategies } from "@/engine/dispatchEngine";
import { transitionRide } from "@/engine/rideStateMachine";
import { MemoryClaimStore } from "@/engine/ports";
import type {
  DriverRecord,
  MatchStrategy,
  Ride,
  RideRequest,
  SafetyMode,
} from "@/engine/types";
import { CAMPUS_PLACES, placeById, roadDistanceKm } from "@/lib/campus";

export interface SimStudent {
  id: string;
  name: string;
  pickupLabel: string;
  dropLabel: string;
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
}

export interface SimEvent {
  id: string;
  at: number;
  kind: string;
  message: string;
}

export interface SimConfig {
  name: string;
  students: SimStudent[];
  drivers: DriverRecord[];
  behavior: Record<string, "accept" | "reject" | "timeout">;
  schedule: { at: number; studentId: string }[];
  strategy: MatchStrategy;
  safety: SafetyMode;
  useRoads: boolean;
  maxDetourKm: number;
  offerTimeoutMs: number;
}

export interface SimState {
  config: SimConfig;
  now: number;
  rides: Ride[];
  drivers: DriverRecord[];
  events: SimEvent[];
  fired: Record<string, boolean>;
  doubleBookings: number;
  lockConflicts: number;
}

const STORAGE_KEY = "campus-ride.sim-configs";

function point(id: string) {
  const place = placeById(id);
  return { lat: place.lat, lng: place.lng };
}

function makeDriver(
  id: string,
  name: string,
  placeId: string,
  extra: Partial<DriverRecord> = {},
): DriverRecord {
  return {
    id,
    name,
    location: point(placeId),
    capacity: 4,
    passengerCount: 0,
    status: "available",
    completedRides: 0,
    route: [],
    version: 0,
    plate: `PB11-${id.toUpperCase()}`,
    ...extra,
  };
}

function makeStudent(id: string, name: string, pickupId: string, dropId: string): SimStudent {
  const pickup = placeById(pickupId);
  const drop = placeById(dropId);
  return {
    id,
    name,
    pickupLabel: pickup.name,
    dropLabel: drop.name,
    pickup: { lat: pickup.lat, lng: pickup.lng },
    drop: { lat: drop.lat, lng: drop.lng },
  };
}

export function presetConfigs(): SimConfig[] {
  const twoStudents = [
    makeStudent("s1", "Aarav", "agira-hall", "e-block"),
    makeStudent("s2", "Mehak", "prithvi-hall", "auditorium"),
  ];
  const comparisonStudents: SimStudent[] = [
    {
      id: "s1",
      name: "Aarav",
      pickupLabel: "Between halls",
      dropLabel: "E Block",
      pickup: { lat: 30.3517, lng: 76.366 },
      drop: point("e-block"),
    },
    {
      id: "s2",
      name: "Mehak",
      pickupLabel: "Agira Hall",
      dropLabel: "E Block",
      pickup: { lat: 30.351606, lng: 76.3645 },
      drop: point("e-block"),
    },
  ];

  const rushStudents = Array.from({ length: 20 }, (_, index) =>
    makeStudent(
      `s${index + 1}`,
      `Student ${index + 1}`,
      CAMPUS_PLACES[index % CAMPUS_PLACES.length].id,
      CAMPUS_PLACES[(index + 4) % CAMPUS_PLACES.length].id,
    ),
  );

  return [
    {
      name: "Two students, one auto",
      students: twoStudents,
      drivers: [makeDriver("d1", "Auto 1", "neeram-hall")],
      behavior: { d1: "accept" },
      schedule: [
        { at: 1000, studentId: "s1" },
        { at: 1000, studentId: "s2" },
      ],
      strategy: "greedy",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 15000,
    },
    {
      name: "Two students, two autos",
      students: twoStudents,
      drivers: [makeDriver("d1", "Auto 1", "neeram-hall"), makeDriver("d2", "Auto 2", "tan")],
      behavior: { d1: "accept", d2: "accept" },
      schedule: [
        { at: 1000, studentId: "s1" },
        { at: 2500, studentId: "s2" },
      ],
      strategy: "greedy",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 15000,
    },
    {
      name: "Rush hour: 20 students, 5 autos",
      students: rushStudents,
      drivers: [0, 1, 2, 3, 4].map((index) =>
        makeDriver(`d${index + 1}`, `Auto ${index + 1}`, CAMPUS_PLACES[index].id, {
          completedRides: index,
        }),
      ),
      behavior: {},
      schedule: rushStudents.map((student, index) => ({ at: 500 + index * 800, studentId: student.id })),
      strategy: "greedy",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 15000,
    },
    {
      name: "Multiple simultaneous requests",
      students: [
        ...twoStudents,
        makeStudent("s3", "Kabir", "library", "main-gate"),
        makeStudent("s4", "Ananya", "c-block", "tan"),
      ],
      drivers: [makeDriver("d1", "Auto 1", "agira-hall"), makeDriver("d2", "Auto 2", "auditorium")],
      behavior: { d1: "accept", d2: "accept" },
      schedule: [
        { at: 1000, studentId: "s1" },
        { at: 1000, studentId: "s2" },
        { at: 1000, studentId: "s3" },
        { at: 1000, studentId: "s4" },
      ],
      strategy: "hungarian",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 15000,
    },
    {
      name: "Driver goes offline",
      students: twoStudents,
      drivers: [
        makeDriver("d1", "Auto 1", "agira-hall", { status: "offline" }),
        makeDriver("d2", "Auto 2", "auditorium"),
      ],
      behavior: { d2: "accept" },
      schedule: [{ at: 1000, studentId: "s1" }],
      strategy: "greedy",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 15000,
    },
    {
      name: "Driver rejects ride",
      students: twoStudents,
      drivers: [makeDriver("d1", "Auto 1", "agira-hall"), makeDriver("d2", "Auto 2", "e-block")],
      behavior: { d1: "reject", d2: "accept" },
      schedule: [{ at: 1000, studentId: "s1" }],
      strategy: "greedy",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 15000,
    },
    {
      name: "Offer timeout",
      students: twoStudents,
      drivers: [makeDriver("d1", "Auto 1", "agira-hall"), makeDriver("d2", "Auto 2", "tan")],
      behavior: { d1: "timeout", d2: "accept" },
      schedule: [{ at: 1000, studentId: "s1" }],
      strategy: "greedy",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 8000,
    },
    {
      name: "Ride pooling",
      students: [
        makeStudent("s1", "Aarav", "agira-hall", "tan"),
        makeStudent("s2", "Mehak", "prithvi-hall", "auditorium"),
        makeStudent("s3", "Kabir", "neeram-hall", "library"),
      ],
      drivers: [makeDriver("d1", "Auto 1", "neeram-hall", { capacity: 4 })],
      behavior: { d1: "accept" },
      schedule: [
        { at: 1000, studentId: "s1" },
        { at: 4000, studentId: "s2" },
        { at: 7000, studentId: "s3" },
      ],
      strategy: "pool",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.5,
      offerTimeoutMs: 15000,
    },
    {
      name: "Unsafe vs safe allocation",
      students: twoStudents,
      drivers: [makeDriver("d1", "Auto 1", "agira-hall")],
      behavior: { d1: "accept" },
      schedule: [
        { at: 1000, studentId: "s1" },
        { at: 1000, studentId: "s2" },
      ],
      strategy: "greedy",
      safety: "unsafe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 15000,
    },
    {
      name: "Greedy vs Hungarian",
      students: comparisonStudents,
      drivers: [
        makeDriver("d1", "Auto 1", "agira-hall"),
        makeDriver("d2", "Auto 2", "auditorium"),
      ],
      behavior: { d1: "accept", d2: "accept" },
      schedule: [
        { at: 1000, studentId: "s1" },
        { at: 1000, studentId: "s2" },
      ],
      strategy: "greedy",
      safety: "safe",
      useRoads: false,
      maxDetourKm: 1.2,
      offerTimeoutMs: 15000,
    },
  ];
}

export function createSimState(config: SimConfig): SimState {
  return {
    config: structuredClone(config),
    now: 0,
    rides: [],
    drivers: structuredClone(config.drivers),
    events: [],
    fired: {},
    doubleBookings: 0,
    lockConflicts: 0,
  };
}

function log(state: SimState, kind: string, message: string): SimEvent {
  return {
    id: `${state.now}-${state.events.length}-${kind}`,
    at: state.now,
    kind,
    message,
  };
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatSimTime(ms: number): string {
  return formatClock(ms);
}

function requestFrom(student: SimStudent, at: number): RideRequest {
  return {
    id: `ride-${student.id}-${at}`,
    studentId: student.id,
    studentName: student.name,
    pickup: student.pickup,
    pickupLabel: student.pickupLabel,
    drop: student.drop,
    dropLabel: student.dropLabel,
    seats: 1,
    createdAt: at,
    idempotencyKey: `${student.id}-${at}`,
  };
}

function rideFromAllocation(
  request: RideRequest,
  allocation: Awaited<ReturnType<typeof dispatchRequests>>["allocations"][number],
): Ride {
  return {
    ...request,
    status: allocation.status === "OFFERED" ? "OFFERED" : "REQUESTED",
    driverId: allocation.driverId,
    offeredAt: allocation.status === "OFFERED" ? request.createdAt : undefined,
    score: allocation.score,
    pickupKm: allocation.pickupKm,
    etaMin: allocation.etaMin,
    reasons: allocation.reasons,
    otp: allocation.status === "OFFERED" ? otpFor(request.id) : undefined,
  };
}

function otpFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) % 9000;
  return String(1000 + hash);
}

export async function advanceSim(state: SimState, deltaMs: number): Promise<SimState> {
  const next: SimState = {
    ...state,
    now: state.now + deltaMs,
    rides: state.rides.map((ride) => ({ ...ride })),
    drivers: state.drivers.map((driver) => ({ ...driver, route: [...driver.route] })),
    events: [...state.events],
    fired: { ...state.fired },
  };

  const due = next.config.schedule.filter((item) => item.at <= next.now && !next.fired[`${item.at}:${item.studentId}`]);
  if (due.length > 0) {
    const students = due
      .map((item) => next.config.students.find((student) => student.id === item.studentId))
      .filter((student): student is SimStudent => Boolean(student));
    for (const item of due) next.fired[`${item.at}:${item.studentId}`] = true;
    for (const student of students) {
      next.events.push(log(next, "request", `${formatClock(next.now)} — ${student.name} requested a ride from ${student.pickupLabel} to ${student.dropLabel}.`));
    }
    await allocateStudents(next, students);
  }

  await progressOffers(next);
  moveDrivers(next, deltaMs);
  return next;
}

async function allocateStudents(state: SimState, students: SimStudent[], excluded: string[] = []) {
  const requests = students.map((student) => requestFrom(student, state.now));
  const store = new MemoryClaimStore(state.drivers.filter((driver) => !excluded.includes(driver.id)));
  const activeIds = store.all().map((driver) => driver.id);
  const result = await dispatchRequests(requests, store, activeIds, {
    strategy: state.config.strategy,
    safety: state.config.safety,
    claimDelayMs: state.config.safety === "unsafe" ? 40 : 0,
    pool: state.config.strategy === "pool",
    maxDetourKm: state.config.maxDetourKm,
    roadKm: state.config.useRoads ? roadDistanceKm : undefined,
  });

  const updated = new Map(store.all().map((driver) => [driver.id, driver]));
  state.drivers = state.drivers.map((driver) => updated.get(driver.id) ?? driver);

  for (const allocation of result.allocations) {
    const request = requests.find((item) => item.id === allocation.requestId);
    if (!request) continue;
    const ride = rideFromAllocation(request, allocation);
    state.rides = [ride, ...state.rides.filter((existing) => existing.id !== ride.id)];
    const driver = state.drivers.find((item) => item.id === allocation.driverId);
    if (allocation.status === "OFFERED" && driver) {
      state.events.push(log(state, "match", `${formatClock(state.now)} — ${driver.name} selected for ${request.studentName}. Score ${allocation.score?.toFixed(2)}. ${allocation.reasons[0] ?? ""}`));
      const success = allocation.attempts.find((attempt) => attempt.ok);
      if (success) {
        state.events.push(log(state, "lock", `${formatClock(state.now)} — Atomic lock ${state.config.safety === "safe" ? "acquired" : "skipped"} for ${driver.name}, observed version ${success.observedVersion}.`));
      }
    } else {
      state.events.push(log(state, "info", `${formatClock(state.now)} — ${request.studentName} remains pending. ${allocation.reasons[0] ?? ""}`));
    }
    for (const attempt of allocation.attempts.filter((item) => !item.ok)) {
      state.lockConflicts += 1;
      state.events.push(log(state, "lock-failure", `${formatClock(state.now)} — ${request.studentName}'s claim on ${attempt.driverId} failed at version ${attempt.observedVersion}.`));
    }
  }

  if (result.doubleBookings > 0) {
    state.doubleBookings += result.doubleBookings;
    state.events.push(log(state, "double-booking", `${formatClock(state.now)} — Double-booking detected. ${result.doubleBookings} extra claim succeeded against the same driver version.`));
  }
}

async function progressOffers(state: SimState) {
  for (const ride of [...state.rides]) {
    if (ride.status !== "OFFERED" || !ride.driverId || ride.offeredAt === undefined) continue;
    const behavior = state.config.behavior[ride.driverId] ?? "accept";
    const waited = state.now - ride.offeredAt;
    if (behavior === "reject" && waited >= 2000) {
      await failOffer(state, ride, "REJECTED");
    } else if ((behavior === "timeout" || waited >= state.config.offerTimeoutMs) && waited >= state.config.offerTimeoutMs) {
      await failOffer(state, ride, "EXPIRED");
    } else if (behavior === "accept" && waited >= 2000) {
      const accepted = transitionRide(ride, "ACCEPTED", state.now);
      const verified = transitionRide(accepted, "OTP_VERIFIED", state.now);
      const started = transitionRide(verified, "IN_PROGRESS", state.now);
      replaceRide(state, started);
      state.events.push(log(state, "info", `${formatClock(state.now)} — ${ride.studentName} verified OTP ${ride.otp} and the ride started.`));
    }
  }
}

async function failOffer(state: SimState, ride: Ride, status: "REJECTED" | "EXPIRED") {
  if (!ride.driverId) return;
  const store = new MemoryClaimStore(state.drivers);
  await releaseSeat(store, ride.driverId, ride.seats);
  state.drivers = store.all();
  const rejected = transitionRide(ride, status, state.now);
  const pending = transitionRide(rejected, "PENDING_REASSIGNMENT", state.now);
  replaceRide(state, pending);
  const driver = state.config.drivers.find((item) => item.id === ride.driverId);
  state.events.push(log(
    state,
    status === "REJECTED" ? "reject" : "timeout",
    `${formatClock(state.now)} — ${driver?.name ?? ride.driverId} ${status === "REJECTED" ? "rejected" : "did not answer"} ${ride.studentName}. Searching again.`,
  ));
  const student = state.config.students.find((item) => item.id === ride.studentId);
  if (!student) return;
  state.rides = state.rides.filter((item) => item.id !== ride.id);
  await allocateStudents(state, [student], [ride.driverId]);
}

function replaceRide(state: SimState, ride: Ride) {
  state.rides = state.rides.map((item) => (item.id === ride.id ? ride : item));
}

function moveDrivers(state: SimState, deltaMs: number) {
  const speedKmh = 18;
  const stepKm = speedKmh * (deltaMs / 3_600_000);
  state.drivers = state.drivers.map((driver) => {
    const moving = state.rides.some(
      (ride) => ride.driverId === driver.id && ride.status === "IN_PROGRESS",
    );
    if (!moving || driver.route.length === 0 || stepKm <= 0) return driver;
    const target = driver.route[0];
    const distance = Math.hypot(target.lat - driver.location.lat, target.lng - driver.location.lng);
    const km = distance * 111;
    if (km <= stepKm) {
      const route = driver.route.slice(1);
      const completed = route.length === 0;
      if (completed) {
        state.rides = state.rides.map((ride) =>
          ride.driverId === driver.id && ride.status === "IN_PROGRESS"
            ? transitionRide(ride, "COMPLETED", state.now)
            : ride,
        );
      }
      return {
        ...driver,
        location: { lat: target.lat, lng: target.lng },
        route,
        passengerCount: completed ? 0 : driver.passengerCount,
        status: completed ? "available" : driver.status,
        completedRides: completed ? driver.completedRides + 1 : driver.completedRides,
      };
    }
    const ratio = stepKm / km;
    return {
      ...driver,
      location: {
        lat: driver.location.lat + (target.lat - driver.location.lat) * ratio,
        lng: driver.location.lng + (target.lng - driver.location.lng) * ratio,
      },
    };
  });
}

export function simMetrics(state: SimState) {
  const assigned = state.rides.filter((ride) =>
    ["OFFERED", "ACCEPTED", "OTP_VERIFIED", "IN_PROGRESS", "COMPLETED"].includes(ride.status),
  );
  const pending = state.rides.filter((ride) =>
    ride.status === "REQUESTED" || ride.status === "PENDING_REASSIGNMENT",
  );
  const waits = assigned
    .filter((ride) => ride.offeredAt !== undefined)
    .map((ride) => (ride.offeredAt ?? ride.createdAt) - ride.createdAt);
  const pickups = assigned.map((ride) => ride.pickupKm ?? 0).filter((km) => km > 0);
  const busy = state.drivers.filter((driver) => driver.status === "assigned" || driver.status === "occupied").length;
  const shared = state.rides.filter((ride) => ride.status !== "CANCELLED").length;
  const pooledDrivers = state.drivers.filter((driver) => driver.passengerCount > 1 || driver.route.filter((stop) => stop.kind === "pickup").length > 1).length;
  return {
    requests: state.rides.length,
    assigned: assigned.length,
    pending: pending.length,
    avgWaitMin: waits.length ? waits.reduce((sum, value) => sum + value, 0) / waits.length / 60000 : 0,
    avgPickupKm: pickups.length ? pickups.reduce((sum, value) => sum + value, 0) / pickups.length : 0,
    utilization: state.drivers.length ? busy / state.drivers.length : 0,
    pooling: shared ? pooledDrivers / Math.max(1, state.drivers.length) : 0,
    lockConflicts: state.lockConflicts,
    doubleBookings: state.doubleBookings,
  };
}

export function compareCurrent(state: SimState) {
  const requests = state.config.students.map((student) => requestFrom(student, 0));
  return previewStrategies(requests, state.config.drivers, {
    roadKm: state.config.useRoads ? roadDistanceKm : undefined,
  });
}

export function savedConfigNames(): string[] {
  try {
    return Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return [];
  }
}

export function saveSimConfig(config: SimConfig) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, SimConfig>;
  all[config.name] = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadSimConfig(name: string): SimConfig | null {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, SimConfig>;
    return all[name] ?? null;
  } catch {
    return null;
  }
}
