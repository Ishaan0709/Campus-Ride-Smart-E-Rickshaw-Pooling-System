import { etaMinutes, haversineKm, pathLengthKm } from "../distance";
import { cheapestInsertion } from "../pooling/insertion";
import {
  DEFAULT_WEIGHTS,
  type DriverRecord,
  type MatchScore,
  type RideRequest,
  type ScoreWeights,
} from "../types";

export interface ScoreOptions {
  speedKmh?: number;
  maxDetourKm?: number;
  weights?: ScoreWeights;
  pool?: boolean;
  /** Optional road-network distance. Falls back to Haversine when omitted. */
  roadKm?: (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => number;
}

function infeasible(driverId: string, reason: string): MatchScore {
  return {
    driverId,
    cost: Number.POSITIVE_INFINITY,
    pickupKm: Number.POSITIVE_INFINITY,
    etaMin: Number.POSITIVE_INFINITY,
    extraKm: Number.POSITIVE_INFINITY,
    detourKm: Number.POSITIVE_INFINITY,
    feasible: false,
    reasons: [reason],
    route: [],
  };
}

export function scoreDriver(
  driver: DriverRecord,
  request: RideRequest,
  options: ScoreOptions = {},
): MatchScore {
  if (driver.status === "offline") return infeasible(driver.id, `${driver.name} is offline`);
  if (driver.passengerCount + request.seats > driver.capacity) {
    return infeasible(driver.id, `${driver.name} has no remaining seat`);
  }

  const measure = options.roadKm ?? haversineKm;
  const speed = options.speedKmh ?? 18;
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const pickupKm = measure(driver.location, request.pickup);
  let extraKm = pickupKm;
  let detourKm = 0;
  let route = driver.route;

  if (options.pool) {
    const insertion = cheapestInsertion(driver, request, options.maxDetourKm ?? 1.5);
    if (!insertion) {
      return infeasible(driver.id, `${driver.name} would detour existing passengers too far`);
    }
    extraKm = insertion.extraKm;
    detourKm = insertion.maxPassengerDetourKm;
    route = insertion.route;
  } else if (driver.passengerCount > 0) {
    return infeasible(driver.id, `${driver.name} is already carrying passengers`);
  } else {
    route = [
      { ...request.pickup, rideId: request.id, kind: "pickup", label: request.pickupLabel },
      { ...request.drop, rideId: request.id, kind: "drop", label: request.dropLabel },
    ];
    extraKm = pathLengthKm(driver.location, [request.pickup, request.drop]);
  }

  const etaMin = etaMinutes(pickupKm, speed);
  const utilization = driver.capacity === 0 ? 1 : driver.passengerCount / driver.capacity;
  const cost =
    weights.eta * etaMin +
    weights.extraDistance * extraKm +
    weights.detour * detourKm +
    weights.utilization * utilization * 10 +
    weights.fairness * driver.completedRides;

  const reasons = [
    `Pickup ${pickupKm.toFixed(2)} km, about ${etaMin.toFixed(1)} min at ${speed} km/h`,
    `Added route ${extraKm.toFixed(2)} km`,
    detourKm > 0
      ? `Largest passenger detour ${detourKm.toFixed(2)} km`
      : "No extra detour for riders already aboard",
    `${driver.passengerCount} of ${driver.capacity} seats taken`,
    `${driver.completedRides} completed rides, used for fairness`,
  ];

  return {
    driverId: driver.id,
    cost,
    pickupKm,
    etaMin,
    extraKm,
    detourKm,
    feasible: true,
    reasons,
    route,
  };
}
