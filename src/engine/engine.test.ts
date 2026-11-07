import { describe, expect, it } from "vitest";
import { claimSeat, countDoubleBookings, releaseSeat } from "./concurrency/claim";
import { haversineKm } from "./distance";
import { dispatchRequests, previewStrategies } from "./dispatchEngine";
import { dijkstra } from "./graph";
import { greedyMatches } from "./matching/greedy";
import { hungarian } from "./matching/hungarian";
import { cheapestInsertion } from "./pooling/insertion";
import { MemoryClaimStore } from "./ports";
import { canTransition, findActiveIdempotentRide, transitionRide } from "./rideStateMachine";
import type { DriverRecord, Ride, RideRequest } from "./types";

function driver(partial: Partial<DriverRecord> & Pick<DriverRecord, "id" | "location">): DriverRecord {
  return {
    name: partial.id,
    capacity: 4,
    passengerCount: 0,
    status: "available",
    completedRides: 0,
    route: [],
    version: 0,
    ...partial,
  };
}

function request(partial: Partial<RideRequest> & Pick<RideRequest, "id" | "pickup" | "drop">): RideRequest {
  return {
    studentId: partial.id,
    studentName: partial.id,
    pickupLabel: "Pickup",
    dropLabel: "Drop",
    seats: 1,
    createdAt: 0,
    idempotencyKey: partial.id,
    ...partial,
  };
}

function rideFrom(req: RideRequest, status: Ride["status"] = "REQUESTED"): Ride {
  return { ...req, status, reasons: [] };
}

describe("distance and roads", () => {
  it("measures a known short campus hop", () => {
    const km = haversineKm(
      { lat: 30.351606, lng: 76.364327 },
      { lat: 30.351606, lng: 76.365327 },
    );
    expect(km).toBeGreaterThan(0.09);
    expect(km).toBeLessThan(0.12);
  });

  it("follows the shorter path through the graph", () => {
    const graph = {
      a: [{ to: "b", km: 5 }, { to: "c", km: 1 }],
      b: [{ to: "a", km: 5 }, { to: "c", km: 1 }],
      c: [{ to: "a", km: 1 }, { to: "b", km: 1 }],
    };
    expect(dijkstra(graph, "a", "b")).toEqual({ path: ["a", "c", "b"], km: 2 });
  });
});

describe("matching", () => {
  const drivers = [
    driver({ id: "d1", location: { lat: 30.351606, lng: 76.364327 } }),
    driver({ id: "d2", location: { lat: 30.351968, lng: 76.370679 } }),
  ];
  const requests = [
    request({
      id: "r1",
      createdAt: 1,
      pickup: { lat: 30.3517, lng: 76.366 },
      drop: { lat: 30.353463, lng: 76.372207 },
    }),
    request({
      id: "r2",
      createdAt: 2,
      pickup: { lat: 30.351606, lng: 76.3645 },
      drop: { lat: 30.353463, lng: 76.372207 },
    }),
  ];

  it("lets Hungarian beat first-come greedy on total pickup distance", () => {
    const preview = previewStrategies(requests, drivers);
    expect(preview.hungarian.pickupKm).toBeLessThan(preview.greedy.pickupKm);
    expect(greedyMatches(requests, drivers)[0].driver.id).toBe("d1");
  });

  it("solves a 2x2 assignment matrix", () => {
    expect(hungarian([
      [4, 1],
      [2, 3],
    ])).toEqual([1, 0]);
  });
});

describe("pooling and availability", () => {
  it("rejects a fifth passenger and an excessive detour", () => {
    const full = driver({
      id: "full",
      location: { lat: 0, lng: 0 },
      passengerCount: 4,
      capacity: 4,
      status: "occupied",
    });
    expect(cheapestInsertion(full, request({
      id: "x",
      pickup: { lat: 0, lng: 0 },
      drop: { lat: 0.01, lng: 0 },
    }), 2)).toBeNull();

    const busy = driver({
      id: "busy",
      location: { lat: 30.35, lng: 76.36 },
      passengerCount: 1,
      route: [
        { lat: 30.351, lng: 76.361, rideId: "old", kind: "pickup", label: "A" },
        { lat: 30.352, lng: 76.362, rideId: "old", kind: "drop", label: "B" },
      ],
    });
    const far = cheapestInsertion(busy, request({
      id: "far",
      pickup: { lat: 30.4, lng: 76.4 },
      drop: { lat: 30.41, lng: 76.41 },
    }), 0.2);
    expect(far).toBeNull();

    const near = cheapestInsertion(busy, request({
      id: "near",
      pickup: { lat: 30.3512, lng: 76.3612 },
      drop: { lat: 30.3518, lng: 76.3618 },
    }), 1.5);
    expect(near).not.toBeNull();
  });

  it("skips an offline driver", () => {
    const matches = greedyMatches(
      [request({ id: "r", pickup: { lat: 1, lng: 1 }, drop: { lat: 1.01, lng: 1 } })],
      [driver({ id: "off", location: { lat: 1, lng: 1 }, status: "offline" })],
    );
    expect(matches).toHaveLength(0);
  });
});

describe("ride lifecycle", () => {
  const base = rideFrom(request({ id: "r", pickup: { lat: 0, lng: 0 }, drop: { lat: 1, lng: 1 } }));

  it("rejects an illegal jump to completed", () => {
    expect(canTransition("REQUESTED", "COMPLETED")).toBe(false);
    expect(() => transitionRide(base, "COMPLETED", 10)).toThrow(/Invalid ride transition/);
  });

  it("walks offer, rejection, and expiry back to reassignment", () => {
    const offered = transitionRide(base, "OFFERED", 5);
    const rejected = transitionRide(offered, "REJECTED", 6);
    expect(transitionRide(rejected, "PENDING_REASSIGNMENT", 7).status).toBe("PENDING_REASSIGNMENT");
    const expired = transitionRide(offered, "EXPIRED", 20);
    expect(canTransition(expired.status, "PENDING_REASSIGNMENT")).toBe(true);
  });

  it("returns the same active ride for a repeated idempotency key", () => {
    const existing = { ...base, idempotencyKey: "click-1" };
    expect(findActiveIdempotentRide([existing], "click-1")?.id).toBe("r");
    const done = transitionRide(transitionRide(existing, "OFFERED", 1), "CANCELLED", 2);
    expect(findActiveIdempotentRide([done], "click-1")).toBeUndefined();
  });
});

describe("concurrency", () => {
  it("double-books one driver in unsafe mode and never in safe mode", async () => {
    const initial = driver({ id: "only", location: { lat: 30.35, lng: 76.36 } });
    const requests = [
      request({ id: "a", createdAt: 1, pickup: { lat: 30.351, lng: 76.361 }, drop: { lat: 30.352, lng: 76.362 } }),
      request({ id: "b", createdAt: 1, pickup: { lat: 30.3512, lng: 76.3612 }, drop: { lat: 30.353, lng: 76.363 } }),
    ];

    const unsafeStore = new MemoryClaimStore([initial]);
    const unsafe = await dispatchRequests(requests, unsafeStore, ["only"], {
      strategy: "greedy",
      safety: "unsafe",
      claimDelayMs: 40,
    });
    expect(unsafe.allocations.filter((row) => row.driverId === "only" && row.status === "OFFERED")).toHaveLength(2);
    expect(unsafe.doubleBookings).toBe(1);

    const safeStore = new MemoryClaimStore([structuredClone(initial)]);
    const safe = await dispatchRequests(requests, safeStore, ["only"], {
      strategy: "greedy",
      safety: "safe",
      claimDelayMs: 40,
    });
    expect(safe.allocations.filter((row) => row.status === "OFFERED")).toHaveLength(1);
    expect(safe.doubleBookings).toBe(0);
    expect(countDoubleBookings(safe.allocations.flatMap((row) => row.attempts))).toBe(0);
    expect(safeStore.snapshot("only")?.passengerCount).toBe(1);
  });

  it("releases a seat and can offer the driver again", async () => {
    const store = new MemoryClaimStore([
      driver({ id: "d", location: { lat: 0, lng: 0 } }),
    ]);
    const first = await claimSeat(store, "d", 1, "safe");
    expect(first.ok).toBe(true);
    expect(await releaseSeat(store, "d", 1)).toBe(true);
    const second = await claimSeat(store, "d", 1, "safe");
    expect(second.ok).toBe(true);
    expect(store.snapshot("d")?.passengerCount).toBe(1);
  });
});
