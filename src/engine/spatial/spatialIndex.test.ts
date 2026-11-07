import { describe, expect, it } from "vitest";
import type { DriverRecord } from "../types";
import { H3Index, LinearScanIndex, benchmarkSpatialLookup, nearestDriver } from "./spatialIndex";

function driver(id: string, lat: number, lng: number): DriverRecord {
  return {
    id,
    name: id,
    location: { lat, lng },
    capacity: 4,
    passengerCount: 0,
    status: "available",
    completedRides: 0,
    route: [],
    version: 0,
  };
}

describe("spatial indexes", () => {
  const pickup = { lat: 30.3532, lng: 76.3665 };
  const drivers = [
    driver("near", 30.35335, 76.3667),
    driver("mid", 30.3552, 76.369),
    driver("far", 30.4, 76.45),
  ];

  it("returns the same nearest auto from a full scan and from hex cells", () => {
    const linear = new LinearScanIndex(drivers);
    const hex = new H3Index(drivers);
    const radius = 800;
    expect(nearestDriver(linear, pickup, radius)?.id).toBe("near");
    expect(nearestDriver(hex, pickup, radius)?.id).toBe("near");
    expect(linear.candidatesNear(pickup, radius).map((item) => item.id).sort()).toEqual(
      hex.candidatesNear(pickup, radius).map((item) => item.id).sort(),
    );
    expect(linear.candidatesNear(pickup, radius).some((item) => item.id === "far")).toBe(false);
  });

  it("can time campus-scale and city-scale lookups", () => {
    const campus = benchmarkSpatialLookup(50, 100, 0.015);
    const city = benchmarkSpatialLookup(5000, 100, 0.45);
    expect(campus.linearMs).toBeGreaterThan(0);
    expect(campus.h3Ms).toBeGreaterThan(0);
    expect(Math.abs(city.h3Candidates - city.linearCandidates)).toBeLessThan(1);
    expect(city.h3Inspected).toBeLessThan(city.linearInspected);
    console.log(
      `spatial benchmark: 50 campus autos, scan ${campus.linearMs.toFixed(2)} ms (opened ${campus.linearInspected.toFixed(0)}, kept ${campus.linearCandidates.toFixed(1)}) vs hex ${campus.h3Ms.toFixed(2)} ms (opened ${campus.h3Inspected.toFixed(0)}, kept ${campus.h3Candidates.toFixed(1)}); 5000 city autos, scan ${city.linearMs.toFixed(2)} ms (opened ${city.linearInspected.toFixed(0)}, kept ${city.linearCandidates.toFixed(1)}) vs hex ${city.h3Ms.toFixed(2)} ms (opened ${city.h3Inspected.toFixed(0)}, kept ${city.h3Candidates.toFixed(1)})`,
    );
  });
});
