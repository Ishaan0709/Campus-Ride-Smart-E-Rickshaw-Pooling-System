import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import { dispatchRequests } from "@/engine/dispatchEngine";
import { canTransition } from "@/engine/rideStateMachine";
import { MemoryClaimStore } from "@/engine/ports";
import type { DriverRecord, Ride, RideStatus } from "@/engine/types";
import { db } from "@/lib/firebase";

const RIDES = "rides";
const DRIVERS = "driverStates";

export interface StoredRide extends Ride {
  fare: number;
}

function clean<T extends object>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function publishDriverState(driver: DriverRecord & { uid: string }): Promise<void> {
  const ref = doc(db, DRIVERS, driver.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as DriverRecord) : null;
    const goingOffline = driver.status === "offline";
    const passengers = goingOffline ? 0 : current?.passengerCount ?? 0;
    tx.set(ref, clean({
      id: driver.uid,
      name: driver.name,
      plate: driver.plate ?? "",
      location: driver.location,
      capacity: 4,
      passengerCount: passengers,
      status: goingOffline || passengers === 0 ? driver.status : current?.status ?? "available",
      completedRides: current?.completedRides ?? 0,
      route: goingOffline ? [] : current?.route ?? [],
      version: (current?.version ?? 0) + 1,
      updatedAt: Date.now(),
    }));
  });
}

export function watchDriverState(
  uid: string,
  onData: (driver: DriverRecord | null) => void,
): () => void {
  return onSnapshot(doc(db, DRIVERS, uid), (snap) => {
    onData(snap.exists() ? (snap.data() as DriverRecord) : null);
  });
}

export function watchRides(
  field: "studentId" | "driverId",
  uid: string,
  onData: (rides: StoredRide[]) => void,
): () => void {
  const ridesQuery = query(collection(db, RIDES), where(field, "==", uid));
  return onSnapshot(ridesQuery, (snap) => {
    const rides = snap.docs
      .map((item) => item.data() as StoredRide)
      .sort((a, b) => b.createdAt - a.createdAt);
    onData(rides);
  });
}

export async function bookProductionRide(input: {
  studentId: string;
  studentName: string;
  pickup: { lat: number; lng: number; label: string };
  drop: { lat: number; lng: number; label: string };
  pooled: boolean;
  idempotencyKey: string;
}): Promise<{ ride: StoredRide; saved: true } | { saved: false; message: string }> {
  const fare = input.pooled ? 10 : 40;
  const existing = await getDocs(query(collection(db, RIDES), where("studentId", "==", input.studentId)));
  const active = existing.docs
    .map((item) => item.data() as StoredRide)
    .find((ride) => ride.idempotencyKey === input.idempotencyKey && !["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"].includes(ride.status));
  if (active) return { ride: active, saved: true };

  const driverSnap = await getDocs(collection(db, DRIVERS));
  const drivers = driverSnap.docs
    .map((item) => item.data() as DriverRecord)
    .filter((driver) => driver.status !== "offline");
  const request: Ride = {
    id: `ride-${input.idempotencyKey}`,
    studentId: input.studentId,
    studentName: input.studentName,
    pickup: input.pickup,
    pickupLabel: input.pickup.label,
    drop: input.drop,
    dropLabel: input.drop.label,
    seats: 1,
    createdAt: Date.now(),
    idempotencyKey: input.idempotencyKey,
    status: "REQUESTED",
    reasons: [],
  };

  const port = new MemoryClaimStore(drivers);
  const decision = await dispatchRequests([request], port, drivers.map((driver) => driver.id), {
    strategy: input.pooled ? "pool" : "greedy",
    safety: "safe",
    pool: input.pooled,
    maxDetourKm: 1.5,
  });
  const allocation = decision.allocations[0];
  const chosen = allocation?.driverId
    ? drivers.find((driver) => driver.id === allocation.driverId)
    : undefined;

  let savedDriver = false;
  if (chosen && allocation?.status === "OFFERED") {
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, DRIVERS, chosen.id);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("Driver record disappeared");
        const current = snap.data() as DriverRecord;
        if (current.version !== chosen.version) throw new Error("version-conflict");
        if (current.passengerCount + 1 > current.capacity || current.status === "offline") {
          throw new Error("version-conflict");
        }
        tx.set(ref, clean({
          ...current,
          passengerCount: current.passengerCount + 1,
          status: current.passengerCount + 1 >= current.capacity ? "occupied" : "assigned",
          route: allocation.route,
          version: current.version + 1,
          updatedAt: Date.now(),
        }));
      });
      savedDriver = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not claim a driver";
      if (!message.includes("version-conflict")) {
        return { saved: false, message };
      }
    }
  }

  const ride: StoredRide = {
    ...request,
    fare,
    status: savedDriver ? "OFFERED" : "REQUESTED",
    driverId: savedDriver ? chosen?.id : undefined,
    offeredAt: savedDriver ? Date.now() : undefined,
    score: allocation?.score,
    pickupKm: allocation?.pickupKm,
    etaMin: allocation?.etaMin,
    reasons: allocation?.reasons ?? ["No published driver location is available"],
    otp: savedDriver ? String(1000 + Math.floor(Math.random() * 9000)) : undefined,
  };

  await setDoc(doc(db, RIDES, ride.id), clean(ride));
  return { ride, saved: true };
}

export async function setRideStatus(
  ride: StoredRide,
  status: RideStatus,
): Promise<void> {
  if (!canTransition(ride.status, status)) {
    throw new Error(`Invalid ride transition ${ride.status} -> ${status}`);
  }
  const next: StoredRide = { ...ride, status };
  if (status === "ACCEPTED") next.acceptedAt = Date.now();
  if ((status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED" || status === "COMPLETED") && ride.driverId) {
    await releaseDriver(ride.driverId);
  }
  if (status === "REJECTED" || status === "EXPIRED") {
    next.status = "PENDING_REASSIGNMENT";
    next.driverId = undefined;
  }
  await setDoc(doc(db, RIDES, ride.id), clean(next));
}

async function releaseDriver(driverId: string) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, DRIVERS, driverId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = snap.data() as DriverRecord;
    const passengerCount = Math.max(0, current.passengerCount - 1);
    tx.set(ref, clean({
      ...current,
      passengerCount,
      status: passengerCount === 0 ? "available" : "assigned",
      route: passengerCount === 0 ? [] : current.route,
      version: current.version + 1,
      updatedAt: Date.now(),
    }));
  });
}
