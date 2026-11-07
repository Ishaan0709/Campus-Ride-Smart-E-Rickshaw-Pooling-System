import { claimSeat, countDoubleBookings } from "./concurrency/claim";
import { greedyMatches } from "./matching/greedy";
import { hungarianMatches, totalCost, totalPickupKm } from "./matching/hungarianMatcher";
import { scoreDriver, type ScoreOptions } from "./matching/score";
import type { ClaimPort } from "./ports";
import type {
  AllocationResult,
  DriverRecord,
  MatchStrategy,
  RideRequest,
  SafetyMode,
} from "./types";
import type { ProposedMatch } from "./matching/greedy";

export interface DispatchOptions extends ScoreOptions {
  strategy: MatchStrategy;
  safety: SafetyMode;
  claimDelayMs?: number;
}

function pending(request: RideRequest, attempts: AllocationResult["attempts"] = []): AllocationResult {
  return {
    requestId: request.id,
    status: "REQUESTED",
    reasons: attempts.length ? ["Every driver claim failed"] : ["No feasible driver"],
    route: [],
    attempts,
  };
}

function rank(request: RideRequest, drivers: DriverRecord[], options: ScoreOptions) {
  return drivers
    .map((driver) => scoreDriver(driver, request, options))
    .filter((score) => score.feasible)
    .sort((a, b) => a.cost - b.cost);
}

async function claimInOrder(
  request: RideRequest,
  drivers: DriverRecord[],
  port: ClaimPort,
  options: DispatchOptions,
  preferredId?: string,
): Promise<AllocationResult> {
  const scoreOptions: ScoreOptions = { ...options, pool: options.strategy === "pool" };
  const ranked = rank(request, drivers, scoreOptions);
  if (preferredId) {
    ranked.sort((a, b) => {
      if (a.driverId === preferredId) return -1;
      if (b.driverId === preferredId) return 1;
      return a.cost - b.cost;
    });
  }

  const attempts: AllocationResult["attempts"] = [];
  for (const candidate of ranked) {
    const claim = await claimSeat(
      port,
      candidate.driverId,
      request.seats,
      options.safety,
      options.claimDelayMs ?? 0,
      candidate.route,
    );
    attempts.push({ ...claim, cost: candidate.cost, reasons: candidate.reasons, pickupKm: candidate.pickupKm, etaMin: candidate.etaMin });
    if (!claim.ok) continue;
    return {
      requestId: request.id,
      status: "OFFERED",
      driverId: candidate.driverId,
      score: candidate.cost,
      pickupKm: candidate.pickupKm,
      etaMin: candidate.etaMin,
      reasons: candidate.reasons,
      route: candidate.route,
      attempts,
    };
  }
  return pending(request, attempts);
}

export async function dispatchRequests(
  requests: RideRequest[],
  port: ClaimPort,
  driverIds: string[],
  options: DispatchOptions,
): Promise<{ allocations: AllocationResult[]; doubleBookings: number }> {
  const load = async () => {
    const rows = await Promise.all(driverIds.map((id) => port.read(id)));
    return rows.filter((driver): driver is DriverRecord => driver !== null);
  };

  if (options.safety === "unsafe") {
    const initial = await load();
    const allocations = await Promise.all(
      requests.map((request) => claimInOrder(request, initial, port, options)),
    );
    const claims = allocations.flatMap((allocation) => allocation.attempts);
    return { allocations, doubleBookings: countDoubleBookings(claims) };
  }

  const allocations: AllocationResult[] = [];
  const snapshot = await load();
  const scoreOptions: ScoreOptions = { ...options, pool: options.strategy === "pool" };
  const proposals: ProposedMatch[] =
    options.strategy === "hungarian"
      ? hungarianMatches(requests, snapshot, scoreOptions)
      : greedyMatches(requests, snapshot, scoreOptions);
  const preferred = new Map(proposals.map((proposal) => [proposal.request.id, proposal.driver.id]));

  for (const request of [...requests].sort((a, b) => a.createdAt - b.createdAt)) {
    const fresh = await load();
    allocations.push(
      await claimInOrder(request, fresh, port, options, preferred.get(request.id)),
    );
  }

  return { allocations, doubleBookings: 0 };
}

export function previewStrategies(
  requests: RideRequest[],
  drivers: DriverRecord[],
  options: ScoreOptions = {},
) {
  const greedy = greedyMatches(requests, drivers, { ...options, pool: false });
  const optimal = hungarianMatches(requests, drivers, { ...options, pool: false });
  return {
    greedy: { matches: greedy, cost: totalCost(greedy), pickupKm: totalPickupKm(greedy) },
    hungarian: { matches: optimal, cost: totalCost(optimal), pickupKm: totalPickupKm(optimal) },
  };
}
