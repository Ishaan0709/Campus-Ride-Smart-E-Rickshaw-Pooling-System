import { HUNGARIAN_INFEASIBLE, hungarian } from "./hungarian";
import { scoreDriver, type ScoreOptions } from "./score";
import type { ProposedMatch } from "./greedy";
import type { DriverRecord, RideRequest } from "../types";

/** One request per driver. Globally minimum cost, not first-come lowest cost. */
export function hungarianMatches(
  requests: RideRequest[],
  drivers: DriverRecord[],
  options: ScoreOptions = {},
): ProposedMatch[] {
  if (requests.length === 0 || drivers.length === 0) return [];
  const ordered = [...requests].sort((a, b) => a.createdAt - b.createdAt);
  const solo = { ...options, pool: false };

  const cost = ordered.map((request) =>
    drivers.map((driver) => {
      const score = scoreDriver(driver, request, solo);
      return score.feasible ? score.cost : HUNGARIAN_INFEASIBLE;
    }),
  );

  const assignment = hungarian(cost);
  const matches: ProposedMatch[] = [];
  assignment.forEach((column, row) => {
    if (column < 0) return;
    const request = ordered[row];
    const driver = drivers[column];
    const score = scoreDriver(driver, request, solo);
    if (!score.feasible) return;
    matches.push({ request, driver: structuredClone(driver), score });
  });
  return matches;
}

export function totalCost(matches: ProposedMatch[]): number {
  return matches.reduce((sum, match) => sum + match.score.cost, 0);
}

export function totalPickupKm(matches: ProposedMatch[]): number {
  return matches.reduce((sum, match) => sum + match.score.pickupKm, 0);
}
