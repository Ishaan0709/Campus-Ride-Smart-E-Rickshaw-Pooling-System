import type { GeoPoint } from "./types";

const EARTH_KM = 6371;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function etaMinutes(distanceKm: number, speedKmh = 18): number {
  if (speedKmh <= 0) return Number.POSITIVE_INFINITY;
  return (distanceKm / speedKmh) * 60;
}

export function pathLengthKm(start: GeoPoint, points: GeoPoint[]): number {
  let total = 0;
  let previous = start;
  for (const point of points) {
    total += haversineKm(previous, point);
    previous = point;
  }
  return total;
}
