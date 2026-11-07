import type { DriverRecord, Ride, RideStatus } from "@/engine/types";

export const AUTO_COLORS = ["#111827", "#9a3412", "#1d4ed8", "#047857", "#6d28d9", "#b45309", "#be123c", "#0f766e"];

const ABOARD = new Set(["OFFERED", "ACCEPTED", "OTP_VERIFIED", "IN_PROGRESS"]);

export function autoColor(index: number): string {
  return AUTO_COLORS[index % AUTO_COLORS.length];
}

export function ridePhrase(status: RideStatus): string {
  switch (status) {
    case "OFFERED":
      return "offer sent, not boarded yet";
    case "ACCEPTED":
      return "auto accepted, checking OTP";
    case "OTP_VERIFIED":
      return "OTP matched";
    case "IN_PROGRESS":
      return "riding now";
    case "COMPLETED":
      return "dropped off";
    case "REQUESTED":
      return "waiting for an auto";
    case "PENDING_REASSIGNMENT":
      return "looking for a different auto";
    case "REJECTED":
      return "auto refused";
    case "EXPIRED":
      return "auto did not answer";
    case "CANCELLED":
      return "cancelled";
    default:
      return status;
  }
}

export function autoPhrase(driver: DriverRecord, listedStudents: number): string {
  if (driver.status === "offline") return "Offline. This auto is not taking students.";
  if (listedStudents > driver.passengerCount) {
    return `Double booked. ${listedStudents} students were assigned, but the seat counter only shows ${driver.passengerCount} of ${driver.capacity}.`;
  }
  if (driver.passengerCount <= 0) return `Empty. 0 of ${driver.capacity} seats filled. Waiting for a student.`;
  if (driver.passengerCount >= driver.capacity) return `Full. ${driver.passengerCount} of ${driver.capacity} seats filled.`;
  return `Carrying students. ${driver.passengerCount} of ${driver.capacity} seats filled.`;
}

export function ridesOnAuto(rides: Ride[], driverId: string): Ride[] {
  return rides.filter((ride) => ride.driverId === driverId && ABOARD.has(ride.status));
}

export function waitingRides(rides: Ride[]): Ride[] {
  return rides.filter((ride) => ride.status === "REQUESTED" || ride.status === "PENDING_REASSIGNMENT");
}

export function finishedRides(rides: Ride[]): Ride[] {
  return rides.filter((ride) => ride.status === "COMPLETED");
}

/** Spreads markers that share a campus point so the label stays readable. */
export function spreadPoint(id: string, lat: number, lng: number): { lat: number; lng: number } {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  const angle = (hash / 1000) * Math.PI * 2;
  const meters = 22;
  return {
    lat: lat + (meters / 111320) * Math.cos(angle),
    lng: lng + (meters / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle),
  };
}
