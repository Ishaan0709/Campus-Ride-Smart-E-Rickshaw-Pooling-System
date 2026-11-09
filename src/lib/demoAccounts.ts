import { canTransition } from "@/engine/rideStateMachine";
import { etaMinutes, haversineKm } from "@/engine/distance";
import { CAMPUS_PLACES, placeById } from "@/lib/campus";
import type { StoredRide } from "@/adapters/production/rides";
import type { RideStatus } from "@/engine/types";

const STATE_KEY = "campus-ride-demo-ride";
const ROLE_KEY = "campus-ride-demo-role";
const EVENT = "campus-ride-demo";

export const DEMO_STUDENT = {
  id: "demo-ananya",
  name: "Ananya Mehta",
  roll: "102203418",
  hostel: "Agira Hall",
  email: "ananya.mehta@thapar.edu",
};

export const DEMO_DRIVER = {
  id: "demo-harpreet",
  name: "Harpreet Singh",
  plate: "PB11 ER 4821",
  placeId: "neeram-hall",
};

export interface DemoDriver {
  placeId: string;
  lat: number;
  lng: number;
  status: "available" | "assigned" | "offline";
  passengerCount: number;
}

export interface DemoRide extends StoredRide {
  startedAt?: number;
  boardedAt?: number;
  origin?: { lat: number; lng: number };
}

export interface DemoScene {
  driver: { lat: number; lng: number };
  student: { lat: number; lng: number };
  aboard: boolean;
  title: string;
  detail: string;
  trailFrom: { lat: number; lng: number };
  headingTo: { lat: number; lng: number };
}

interface DemoState {
  rides: DemoRide[];
  driver: DemoDriver;
}

function freshDriver(): DemoDriver {
  const place = placeById(DEMO_DRIVER.placeId);
  return {
    placeId: place.id,
    lat: place.lat,
    lng: place.lng,
    status: "available",
    passengerCount: 0,
  };
}

function freshState(): DemoState {
  return { rides: [], driver: freshDriver() };
}

export function enterDemo(role: "student" | "driver") {
  sessionStorage.setItem(ROLE_KEY, role);
}

export function demoRole(): "student" | "driver" | null {
  const role = sessionStorage.getItem(ROLE_KEY);
  return role === "student" || role === "driver" ? role : null;
}

export function leaveDemo() {
  sessionStorage.removeItem(ROLE_KEY);
}

export function readDemo(): DemoState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed.driver || !Array.isArray(parsed.rides)) return freshState();
    return parsed;
  } catch {
    return freshState();
  }
}

function commit(next: DemoState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeDemo(onData: (state: DemoState) => void) {
  const emit = () => onData(readDemo());
  window.addEventListener("storage", emit);
  window.addEventListener(EVENT, emit);
  emit();
  return () => {
    window.removeEventListener("storage", emit);
    window.removeEventListener(EVENT, emit);
  };
}

export function demoBook(input: {
  pickup: { lat: number; lng: number; label: string };
  drop: { lat: number; lng: number; label: string };
  pooled: boolean;
}): { saved: true; ride: DemoRide } | { saved: false; message: string } {
  const state = readDemo();
  const active = state.rides.find((ride) => !["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED", "PENDING_REASSIGNMENT"].includes(ride.status));
  if (active) return { saved: false, message: "Ananya already has a ride in progress." };
  if (state.driver.status === "offline") {
    return { saved: false, message: "Harpreet Singh is offline. Open the driver demo and mark him available." };
  }
  const pickupKm = haversineKm(state.driver, input.pickup);
  const ride: DemoRide = {
    id: `demo-ride-${Date.now()}`,
    studentId: DEMO_STUDENT.id,
    studentName: DEMO_STUDENT.name,
    pickup: input.pickup,
    pickupLabel: input.pickup.label,
    drop: input.drop,
    dropLabel: input.drop.label,
    seats: 1,
    createdAt: Date.now(),
    idempotencyKey: `demo-${Date.now()}`,
    status: "OFFERED",
    fare: input.pooled ? 10 : 40,
    driverId: DEMO_DRIVER.id,
    offeredAt: Date.now(),
    pickupKm,
    etaMin: etaMinutes(pickupKm),
    otp: String(1000 + Math.floor(Math.random() * 9000)),
    reasons: [`${DEMO_DRIVER.name} is ${pickupKm.toFixed(2)} km from ${input.pickup.label}, about ${etaMinutes(pickupKm).toFixed(1)} min away.`],
    origin: { lat: state.driver.lat, lng: state.driver.lng },
  };
  commit({
    ...state,
    rides: [ride, ...state.rides],
    driver: { ...state.driver, status: "assigned", passengerCount: 0 },
  });
  return { saved: true, ride };
}

export function demoSetStatus(ride: DemoRide, status: RideStatus) {
  if (!canTransition(ride.status, status)) {
    throw new Error(`Invalid ride transition ${ride.status} -> ${status}`);
  }
  const state = readDemo();
  const nextStatus: RideStatus = status === "REJECTED" || status === "EXPIRED" ? "PENDING_REASSIGNMENT" : status;
  const release = ["REJECTED", "EXPIRED", "CANCELLED", "COMPLETED"].includes(status);
  const aboard = status === "OTP_VERIFIED" || status === "IN_PROGRESS";
  const parked = status === "COMPLETED" ? placeMatching(ride.drop) : null;
  commit({
    ...state,
    rides: state.rides.map((item) => {
      if (item.id !== ride.id) return item;
      const next: DemoRide = { ...item, status: nextStatus };
      if (status === "ACCEPTED") next.acceptedAt = Date.now();
      if (status === "OTP_VERIFIED") next.boardedAt = Date.now();
      if (status === "IN_PROGRESS") next.startedAt = Date.now();
      if (release) next.driverId = status === "COMPLETED" ? item.driverId : undefined;
      return next;
    }),
    driver: release
      ? {
          ...state.driver,
          status: "available",
          passengerCount: 0,
          ...(parked ? { lat: parked.lat, lng: parked.lng, placeId: parked.id } : {}),
        }
      : { ...state.driver, status: "assigned", passengerCount: aboard ? 1 : 0 },
  });
}

export function demoPublish(placeId: string, online: boolean) {
  const place = placeById(placeId);
  const state = readDemo();
  const busy = state.driver.passengerCount > 0;
  commit({
    ...state,
    driver: {
      ...state.driver,
      placeId: place.id,
      lat: place.lat,
      lng: place.lng,
      status: online ? (busy ? "assigned" : "available") : "offline",
    },
  });
}

function placeMatching(point: { lat: number; lng: number }) {
  return CAMPUS_PLACES.find((place) => Math.abs(place.lat - point.lat) < 0.0002 && Math.abs(place.lng - point.lng) < 0.0002) ?? null;
}

function lerp(from: { lat: number; lng: number }, to: { lat: number; lng: number }, t: number) {
  const eased = t * t * (3 - 2 * t);
  return {
    lat: from.lat + (to.lat - from.lat) * eased,
    lng: from.lng + (to.lng - from.lng) * eased,
  };
}

function beside(point: { lat: number; lng: number }) {
  return {
    lat: point.lat + 78 / 111_000,
    lng: point.lng - 36 / (111_000 * Math.cos((point.lat * Math.PI) / 180)),
  };
}

const APPROACH_MS = 9000;
const TRIP_MS = 14000;

export function demoScene(ride: DemoRide, driver: DemoDriver): DemoScene {
  const origin = ride.origin ?? { lat: driver.lat, lng: driver.lng };
  const first = ride.studentName.split(" ")[0];
  const driverName = DEMO_DRIVER.name.split(" ")[0];
  if (ride.status === "REQUESTED" || ride.status === "OFFERED") {
    return {
      driver: origin,
      student: ride.pickup,
      aboard: false,
      title: `${driverName} has not accepted yet`,
      detail: `${first} called from ${ride.pickupLabel}. ${driverName} stays where he is until he accepts.`,
      trailFrom: origin,
      headingTo: ride.pickup,
    };
  }
  if (ride.status === "ACCEPTED") {
    const start = ride.acceptedAt ?? Date.now();
    const t = Math.min(1, (Date.now() - start) / APPROACH_MS);
    const at = lerp(origin, ride.pickup, t);
    return {
      driver: at,
      student: ride.pickup,
      aboard: false,
      title: t >= 1 ? `${driverName} is at ${ride.pickupLabel}` : `${driverName} accepted and is driving to ${ride.pickupLabel}`,
      detail: t >= 1
        ? `${ride.studentName} is waiting outside. The OTP is how she gets into the auto.`
        : `${first} is still at the pickup. He only started after accepting.`,
      trailFrom: origin,
      headingTo: ride.pickup,
    };
  }
  if (ride.status === "OTP_VERIFIED") {
    return {
      driver: ride.pickup,
      student: ride.pickup,
      aboard: true,
      title: `${first} is in the auto`,
      detail: `The OTP matched, so she is seated with ${DEMO_DRIVER.name.split(" ")[0]} at ${ride.pickupLabel}. They leave together for ${ride.dropLabel}.`,
      trailFrom: ride.pickup,
      headingTo: ride.drop,
    };
  }
  if (ride.status === "IN_PROGRESS") {
    const start = ride.startedAt ?? Date.now();
    const t = Math.min(1, (Date.now() - start) / TRIP_MS);
    const at = lerp(ride.pickup, ride.drop, t);
    return {
      driver: at,
      student: at,
      aboard: true,
      title: t >= 1 ? `At ${ride.dropLabel} with ${first}` : `${DEMO_DRIVER.name.split(" ")[0]} and ${first} are riding to ${ride.dropLabel}`,
      detail: t >= 1
        ? `${first} is still seated. Finishing the ride is when she steps out.`
        : `She is in the auto, not left at ${ride.pickupLabel}. 1 of 4 seats is taken.`,
      trailFrom: ride.pickup,
      headingTo: ride.drop,
    };
  }
  if (ride.status === "COMPLETED") {
    return {
      driver: ride.drop,
      student: beside(ride.drop),
      aboard: false,
      title: `Ride finished at ${ride.dropLabel}`,
      detail: `${ride.studentName} has stepped out. ${DEMO_DRIVER.name.split(" ")[0]} is free for the next ride.`,
      trailFrom: ride.pickup,
      headingTo: ride.drop,
    };
  }
  return {
    driver: { lat: driver.lat, lng: driver.lng },
    student: ride.pickup,
    aboard: false,
    title: ride.pickupLabel,
    detail: "",
    trailFrom: origin,
    headingTo: ride.pickup,
  };
}

export function ridePosition(ride: DemoRide, driver: DemoDriver) {
  return demoScene(ride, driver).driver;
}
