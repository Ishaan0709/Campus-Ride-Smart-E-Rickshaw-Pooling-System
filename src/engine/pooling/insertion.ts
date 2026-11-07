import { haversineKm, pathLengthKm } from "../distance";
import type { DriverRecord, RideRequest, RouteStop } from "../types";

export interface InsertionPlan {
  route: RouteStop[];
  extraKm: number;
  maxPassengerDetourKm: number;
}

function stopsOf(route: RouteStop[]) {
  return route.map((stop) => ({ lat: stop.lat, lng: stop.lng }));
}

function passengerDetourKm(route: RouteStop[], rideId: string, directKm: number): number {
  const pickup = route.find((stop) => stop.rideId === rideId && stop.kind === "pickup");
  const drop = route.find((stop) => stop.rideId === rideId && stop.kind === "drop");
  if (!pickup || !drop) return 0;
  const start = route.indexOf(pickup);
  const end = route.indexOf(drop);
  if (end < start) return Number.POSITIVE_INFINITY;
  const along = pathLengthKm(pickup, stopsOf(route.slice(start + 1, end + 1)));
  return Math.max(0, along - directKm);
}

/** Cheapest feasible pickup/drop insertion. Existing stop order is preserved. */
export function cheapestInsertion(
  driver: DriverRecord,
  request: RideRequest,
  maxDetourKm: number,
): InsertionPlan | null {
  if (driver.passengerCount + request.seats > driver.capacity) return null;

  const pickup: RouteStop = {
    ...request.pickup,
    rideId: request.id,
    kind: "pickup",
    label: request.pickupLabel,
  };
  const drop: RouteStop = {
    ...request.drop,
    rideId: request.id,
    kind: "drop",
    label: request.dropLabel,
  };

  if (driver.route.length === 0) {
    const route = [pickup, drop];
    return {
      route,
      extraKm: pathLengthKm(driver.location, stopsOf(route)),
      maxPassengerDetourKm: 0,
    };
  }

  const originalKm = pathLengthKm(driver.location, stopsOf(driver.route));
  const existingIds = [...new Set(driver.route.map((stop) => stop.rideId))];
  let best: InsertionPlan | null = null;

  for (let pickupAt = 0; pickupAt <= driver.route.length; pickupAt += 1) {
    for (let dropAt = pickupAt; dropAt <= driver.route.length; dropAt += 1) {
      const route = [...driver.route];
      route.splice(pickupAt, 0, pickup);
      route.splice(dropAt + 1, 0, drop);

      const detours = existingIds.map((rideId) => {
        const direct = directKmFor(driver.route, rideId);
        return passengerDetourKm(route, rideId, direct);
      });
      const ownDirect = haversineKm(request.pickup, request.drop);
      detours.push(passengerDetourKm(route, request.id, ownDirect));
      const maxPassengerDetourKm = Math.max(0, ...detours);
      if (maxPassengerDetourKm > maxDetourKm) continue;

      const extraKm = pathLengthKm(driver.location, stopsOf(route)) - originalKm;
      if (extraKm > maxDetourKm) continue;
      if (!best || extraKm < best.extraKm) {
        best = { route, extraKm, maxPassengerDetourKm };
      }
    }
  }

  return best;
}

function directKmFor(route: RouteStop[], rideId: string): number {
  const pickup = route.find((stop) => stop.rideId === rideId && stop.kind === "pickup");
  const drop = route.find((stop) => stop.rideId === rideId && stop.kind === "drop");
  if (!pickup || !drop) return 0;
  return haversineKm(pickup, drop);
}
