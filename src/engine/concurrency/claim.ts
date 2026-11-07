import type { ClaimPort } from "../ports";
import type { ClaimResult, DriverRecord, RouteStop, SafetyMode } from "../types";

export function countDoubleBookings(results: ClaimResult[]): number {
  const groups = new Map<string, number>();
  for (const result of results) {
    if (!result.ok) continue;
    const key = `${result.driverId}:${result.observedVersion}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  let conflicts = 0;
  for (const count of groups.values()) {
    if (count > 1) conflicts += count - 1;
  }
  return conflicts;
}

export async function claimSeat(
  port: ClaimPort,
  driverId: string,
  seats: number,
  mode: SafetyMode,
  delayMs = 0,
  route?: RouteStop[],
): Promise<ClaimResult> {
  const current = await port.read(driverId);
  if (!current) return { ok: false, observedVersion: -1, driverId };
  const observedVersion = current.version;
  if (current.status === "offline" || current.passengerCount + seats > current.capacity) {
    return { ok: false, observedVersion, driverId };
  }

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const next: DriverRecord = {
    ...current,
    passengerCount: current.passengerCount + seats,
    status: current.passengerCount + seats >= current.capacity ? "occupied" : "assigned",
    route: route ?? current.route,
    version: mode === "safe" ? current.version + 1 : observedVersion,
  };

  if (mode === "unsafe") {
    await port.overwrite(driverId, next);
    return { ok: true, observedVersion, driverId };
  }

  const ok = await port.compareAndSet(driverId, observedVersion, {
    ...next,
    version: observedVersion + 1,
  });
  return { ok, observedVersion, driverId };
}

export async function releaseSeat(
  port: ClaimPort,
  driverId: string,
  seats: number,
): Promise<boolean> {
  const current = await port.read(driverId);
  if (!current) return false;
  const passengerCount = Math.max(0, current.passengerCount - seats);
  return port.compareAndSet(driverId, current.version, {
    ...current,
    passengerCount,
    status: passengerCount === 0 ? "available" : "assigned",
    version: current.version + 1,
  });
}
