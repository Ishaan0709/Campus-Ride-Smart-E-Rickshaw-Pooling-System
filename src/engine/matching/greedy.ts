import { scoreDriver, type ScoreOptions } from "./score";
import type { DriverRecord, RideRequest } from "../types";

export interface ProposedMatch {
  request: RideRequest;
  driver: DriverRecord;
  score: ReturnType<typeof scoreDriver>;
}

/** Assigns each request, in arrival order, to the lowest-cost feasible driver. */
export function greedyMatches(
  requests: RideRequest[],
  drivers: DriverRecord[],
  options: ScoreOptions = {},
): ProposedMatch[] {
  const pool = drivers.map((driver) => structuredClone(driver));
  const ordered = [...requests].sort((a, b) => a.createdAt - b.createdAt);
  const matches: ProposedMatch[] = [];

  for (const request of ordered) {
    let best: { index: number; score: ReturnType<typeof scoreDriver> } | null = null;
    pool.forEach((driver, index) => {
      const score = scoreDriver(driver, request, options);
      if (!score.feasible) return;
      if (!best || score.cost < best.score.cost) best = { index, score };
    });
    if (!best) continue;
    const chosen = pool[best.index];
    matches.push({ request, driver: structuredClone(chosen), score: best.score });
    pool[best.index] = {
      ...chosen,
      passengerCount: chosen.passengerCount + request.seats,
      route: best.score.route,
      status: chosen.passengerCount + request.seats >= chosen.capacity ? "occupied" : "assigned",
    };
  }

  return matches;
}
