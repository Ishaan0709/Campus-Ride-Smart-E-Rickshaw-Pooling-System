export interface GeoPoint {
  lat: number;
  lng: number;
}

export type RideStatus =
  | "REQUESTED"
  | "OFFERED"
  | "ACCEPTED"
  | "OTP_VERIFIED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | "PENDING_REASSIGNMENT";

export type DriverStatus = "available" | "assigned" | "occupied" | "offline";

export interface RouteStop {
  lat: number;
  lng: number;
  rideId: string;
  kind: "pickup" | "drop";
  label: string;
}

export interface DriverRecord {
  id: string;
  name: string;
  plate?: string;
  location: GeoPoint;
  capacity: number;
  passengerCount: number;
  status: DriverStatus;
  completedRides: number;
  route: RouteStop[];
  version: number;
}

export interface RideRequest {
  id: string;
  studentId: string;
  studentName: string;
  pickup: GeoPoint;
  pickupLabel: string;
  drop: GeoPoint;
  dropLabel: string;
  seats: number;
  createdAt: number;
  idempotencyKey: string;
}

export interface Ride extends RideRequest {
  status: RideStatus;
  driverId?: string;
  offeredAt?: number;
  acceptedAt?: number;
  otp?: string;
  score?: number;
  pickupKm?: number;
  etaMin?: number;
  reasons: string[];
}

export interface ScoreWeights {
  eta: number;
  extraDistance: number;
  detour: number;
  utilization: number;
  fairness: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  eta: 1,
  extraDistance: 0.8,
  detour: 1.2,
  utilization: 0.35,
  fairness: 0.45,
};

export interface MatchScore {
  driverId: string;
  cost: number;
  pickupKm: number;
  etaMin: number;
  extraKm: number;
  detourKm: number;
  feasible: boolean;
  reasons: string[];
  route: RouteStop[];
}

export type SafetyMode = "safe" | "unsafe";
export type MatchStrategy = "greedy" | "hungarian" | "pool";

export interface ClaimResult {
  ok: boolean;
  observedVersion: number;
  driverId: string;
}

export interface AllocationAttempt extends ClaimResult {
  cost: number;
  reasons: string[];
  pickupKm: number;
  etaMin: number;
}

export interface AllocationResult {
  requestId: string;
  status: RideStatus;
  driverId?: string;
  score?: number;
  pickupKm?: number;
  etaMin?: number;
  reasons: string[];
  route: RouteStop[];
  attempts: AllocationAttempt[];
}
