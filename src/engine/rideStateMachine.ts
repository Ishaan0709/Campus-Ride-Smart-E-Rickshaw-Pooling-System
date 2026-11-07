import type { Ride, RideStatus } from "./types";

const ALLOWED: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ["OFFERED", "CANCELLED", "PENDING_REASSIGNMENT"],
  OFFERED: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
  ACCEPTED: ["OTP_VERIFIED", "CANCELLED", "PENDING_REASSIGNMENT"],
  OTP_VERIFIED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  PENDING_REASSIGNMENT: ["OFFERED", "CANCELLED", "REQUESTED"],
  REJECTED: ["PENDING_REASSIGNMENT"],
  EXPIRED: ["PENDING_REASSIGNMENT"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: RideStatus, to: RideStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function transitionRide(ride: Ride, to: RideStatus, at: number): Ride {
  if (!canTransition(ride.status, to)) {
    throw new Error(`Invalid ride transition ${ride.status} -> ${to}`);
  }
  const next: Ride = { ...ride, status: to };
  if (to === "OFFERED") next.offeredAt = at;
  if (to === "ACCEPTED") next.acceptedAt = at;
  if (to === "REJECTED" || to === "EXPIRED" || to === "PENDING_REASSIGNMENT") {
    next.driverId = to === "PENDING_REASSIGNMENT" ? undefined : ride.driverId;
  }
  return next;
}

export function expireOfferedRides(rides: Ride[], now: number, timeoutMs: number): Ride[] {
  return rides.map((ride) => {
    if (ride.status !== "OFFERED" || ride.offeredAt === undefined) return ride;
    if (now - ride.offeredAt < timeoutMs) return ride;
    return transitionRide(ride, "EXPIRED", now);
  });
}

export function findActiveIdempotentRide(rides: Ride[], key: string): Ride | undefined {
  const terminal: RideStatus[] = ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"];
  return rides.find((ride) => ride.idempotencyKey === key && !terminal.includes(ride.status));
}
