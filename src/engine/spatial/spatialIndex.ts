import { cellToBoundary, cellToLatLng, getHexagonEdgeLengthAvg, gridDisk, latLngToCell } from "h3-js";
import { haversineKm } from "../distance";
import type { SpatialIndex } from "../ports";
import type { DriverRecord, GeoPoint } from "../types";

/** About 174 m across. Large enough to see campus demand, small enough to separate hostels. */
export const H3_RESOLUTION = 9;

/** Campus lookup radius. The hex grid only decides who is "nearby". */
export const CAMPUS_LOOKUP_RADIUS_M = 800;

export interface HexCell {
  id: string;
  boundary: [number, number][];
  center: [number, number];
  count: number;
}

export class LinearScanIndex implements SpatialIndex {
  inspected = 0;

  constructor(private readonly drivers: DriverRecord[]) {}

  candidatesNear(point: GeoPoint, radiusMeters: number): DriverRecord[] {
    this.inspected = this.drivers.length;
    const radiusKm = radiusMeters / 1000;
    return this.drivers.filter((driver) => haversineKm(point, driver.location) <= radiusKm);
  }
}

export class H3Index implements SpatialIndex {
  inspected = 0;
  private readonly buckets = new Map<string, DriverRecord[]>();

  constructor(
    drivers: DriverRecord[],
    private readonly resolution = H3_RESOLUTION,
  ) {
    for (const driver of drivers) {
      const cell = latLngToCell(driver.location.lat, driver.location.lng, resolution);
      const list = this.buckets.get(cell) ?? [];
      list.push(driver);
      this.buckets.set(cell, list);
    }
  }

  candidatesNear(point: GeoPoint, radiusMeters: number): DriverRecord[] {
    const origin = latLngToCell(point.lat, point.lng, this.resolution);
    const edgeM = getHexagonEdgeLengthAvg(this.resolution, "m");
    const rings = Math.max(0, Math.ceil(radiusMeters / edgeM) + 1);
    const radiusKm = radiusMeters / 1000;
    const seen = new Set<string>();
    const matches: DriverRecord[] = [];
    let inspected = 0;
    for (const cell of gridDisk(origin, rings)) {
      for (const driver of this.buckets.get(cell) ?? []) {
        if (seen.has(driver.id)) continue;
        seen.add(driver.id);
        inspected += 1;
        if (haversineKm(point, driver.location) <= radiusKm) matches.push(driver);
      }
    }
    this.inspected = inspected;
    return matches;
  }
}

export function nearestDriver(index: SpatialIndex, point: GeoPoint, radiusMeters: number): DriverRecord | null {
  const matches = index.candidatesNear(point, radiusMeters);
  if (matches.length === 0) return null;
  return [...matches].sort(
    (a, b) => haversineKm(point, a.location) - haversineKm(point, b.location),
  )[0];
}

export interface LookupBenchmark {
  drivers: number;
  queries: number;
  linearMs: number;
  h3Ms: number;
  linearCandidates: number;
  h3Candidates: number;
  linearInspected: number;
  h3Inspected: number;
}

function spreadDrivers(count: number, spreadDegrees: number): DriverRecord[] {
  const drivers: DriverRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index * 2.399) % (Math.PI * 2);
    const radius = ((index * 17) % 1000) / 1000 * spreadDegrees;
    drivers.push({
      id: `bench-${index}`,
      name: `Auto ${index + 1}`,
      location: {
        lat: 30.3532 + Math.sin(angle) * radius,
        lng: 76.3665 + Math.cos(angle) * radius,
      },
      capacity: 4,
      passengerCount: 0,
      status: "available",
      completedRides: 0,
      route: [],
      version: 0,
    });
  }
  return drivers;
}

/** Times repeated nearby lookups. The index is built once, outside the timer. */
export function benchmarkSpatialLookup(driverCount: number, queries = 200, spreadDegrees = 0.02): LookupBenchmark {
  const drivers = spreadDrivers(driverCount, spreadDegrees);
  const linear = new LinearScanIndex(drivers);
  const hex = new H3Index(drivers);
  const sample = (index: LinearScanIndex | H3Index) => {
    let candidates = 0;
    let inspected = 0;
    const started = performance.now();
    for (let query = 0; query < queries; query += 1) {
      candidates += index.candidatesNear(
        {
          lat: 30.3532 + ((query % 50) - 25) * 0.00025,
          lng: 76.3665 + ((query % 40) - 20) * 0.00025,
        },
        CAMPUS_LOOKUP_RADIUS_M,
      ).length;
      inspected += index.inspected;
    }
    return {
      ms: performance.now() - started,
      candidates: candidates / queries,
      inspected: inspected / queries,
    };
  };
  sample(linear);
  sample(hex);
  const linearResult = sample(linear);
  const hexResult = sample(hex);
  return {
    drivers: driverCount,
    queries,
    linearMs: linearResult.ms,
    h3Ms: hexResult.ms,
    linearCandidates: linearResult.candidates,
    h3Candidates: hexResult.candidates,
    linearInspected: linearResult.inspected,
    h3Inspected: hexResult.inspected,
  };
}

/** Hexes covering a campus center, shaded by how many points fall in each cell. */
export function demandHexes(points: GeoPoint[], center: GeoPoint, rings = 5): HexCell[] {
  const origin = latLngToCell(center.lat, center.lng, H3_RESOLUTION);
  const counts = new Map<string, number>();
  for (const point of points) {
    const cell = latLngToCell(point.lat, point.lng, H3_RESOLUTION);
    counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  const cells = new Set<string>(gridDisk(origin, rings));
  for (const cell of counts.keys()) cells.add(cell);
  return [...cells].map((cell) => ({
    id: cell,
    boundary: cellToBoundary(cell) as [number, number][],
    center: cellToLatLng(cell) as [number, number],
    count: counts.get(cell) ?? 0,
  }));
}
