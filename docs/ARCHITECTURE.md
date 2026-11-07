# Campus Ride dispatch architecture

The browser app is the only runtime. Firebase Auth and Firestore store accounts and, after this upgrade, ride and driver-state documents. There is no application server and no phone GPS feed.

## One engine

`src/engine` is plain TypeScript. It does not import React or Firebase.

- Haversine distance, with an optional campus graph and Dijkstra through `roadDistanceKm`.
- Greedy matching assigns each request, in arrival order, to the lowest-cost feasible driver.
- Hungarian matching solves the one-request-per-driver cost matrix.
- Pooling uses cheapest insertion and rejects a plan that exceeds capacity or the maximum detour.
- Ride statuses move only through the allowed edges in `rideStateMachine.ts`.
- Safe claims use compare-and-set on a driver version. Unsafe claims write a stale snapshot so two overlapping requests can both succeed. That mode is for the lab.

A matching score adds pickup ETA, extra route length, passenger detour, how full the vehicle is, and how many rides the driver has already completed. The event log prints those reasons.

## Two adapters

The simulation keeps students, drivers, rides, and the clock in memory. Saved worlds go to `localStorage` under `campus-ride.sim-configs`. It never writes a Firestore collection.

Production booking reads `driverStates` and writes `rides`. The winning claim is a Firestore transaction that updates the driver only when the version still matches. If no driver has published a location, the ride stays `REQUESTED`.

## What is not live

Driver coordinates are campus points a driver selects. They are not a GPS stream. Offer expiry is enforced by the open driver page. A trusted backend is not deployed, so the transaction runs from the signed-in client.
