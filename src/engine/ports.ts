import type { DriverRecord, GeoPoint } from "./types";

/**
 * Narrows which autos are worth scoring.
 * Road distance still decides the match after this list comes back.
 */
export interface SpatialIndex {
  candidatesNear(point: GeoPoint, radiusMeters: number): DriverRecord[];
}

/** Storage operations the dispatch engine needs. UI and Firebase stay outside. */
export interface ClaimPort {
  read(id: string): Promise<DriverRecord | null>;
  compareAndSet(
    id: string,
    expectedVersion: number,
    next: DriverRecord,
  ): Promise<boolean>;
  /** Writes the stale snapshot. Only the unsafe demonstration uses this. */
  overwrite(id: string, next: DriverRecord): Promise<void>;
}

export class MemoryClaimStore implements ClaimPort {
  private drivers = new Map<string, DriverRecord>();

  constructor(initial: DriverRecord[]) {
    for (const driver of initial) {
      this.drivers.set(driver.id, structuredClone(driver));
    }
  }

  async read(id: string): Promise<DriverRecord | null> {
    const driver = this.drivers.get(id);
    return driver ? structuredClone(driver) : null;
  }

  async compareAndSet(
    id: string,
    expectedVersion: number,
    next: DriverRecord,
  ): Promise<boolean> {
    const current = this.drivers.get(id);
    if (!current || current.version !== expectedVersion) return false;
    this.drivers.set(id, structuredClone(next));
    return true;
  }

  async overwrite(id: string, next: DriverRecord): Promise<void> {
    this.drivers.set(id, structuredClone(next));
  }

  snapshot(id: string): DriverRecord | undefined {
    const driver = this.drivers.get(id);
    return driver ? structuredClone(driver) : undefined;
  }

  all(): DriverRecord[] {
    return [...this.drivers.values()].map((driver) => structuredClone(driver));
  }
}
