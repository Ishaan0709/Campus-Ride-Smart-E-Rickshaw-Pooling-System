import { haversineKm } from "@/engine/distance";
import { dijkstra, type GraphEdge } from "@/engine/graph";
import type { GeoPoint } from "@/engine/types";

export interface CampusPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const CAMPUS_PLACES: CampusPlace[] = [
  { id: "agira-hall", name: "Agira Hall", lat: 30.351606, lng: 76.364327 },
  { id: "prithvi-hall", name: "Prithvi Hall", lat: 30.351227, lng: 76.360978 },
  { id: "neeram-hall", name: "Neeram Hall", lat: 30.351148, lng: 76.359893 },
  { id: "e-block", name: "E Block", lat: 30.353463, lng: 76.372207 },
  { id: "auditorium", name: "Auditorium", lat: 30.351968, lng: 76.370679 },
  { id: "tan", name: "TAN Block", lat: 30.353546, lng: 76.368576 },
  { id: "amritam-hall", name: "Amritam Hall", lat: 30.3545, lng: 76.364 },
  { id: "vyom-hall", name: "Vyom Hall", lat: 30.356, lng: 76.365 },
  { id: "c-block", name: "C Block", lat: 30.3555, lng: 76.3665 },
  { id: "venture-lab", name: "Venture Lab", lat: 30.3565, lng: 76.367 },
  { id: "pg-hostel", name: "PG Hostel", lat: 30.3553, lng: 76.3719 },
  { id: "library", name: "Central Library", lat: 30.3541, lng: 76.3674 },
  { id: "main-gate", name: "Main Gate", lat: 30.3522, lng: 76.3734 },
];

export function placeById(id: string): CampusPlace {
  return CAMPUS_PLACES.find((place) => place.id === id) ?? CAMPUS_PLACES[0];
}

function nearestPlace(point: GeoPoint): CampusPlace {
  return [...CAMPUS_PLACES].sort(
    (a, b) => haversineKm(point, a) - haversineKm(point, b),
  )[0];
}

export function campusGraph(): Record<string, GraphEdge[]> {
  const graph: Record<string, GraphEdge[]> = {};
  for (const place of CAMPUS_PLACES) {
    const nearest = CAMPUS_PLACES
      .filter((other) => other.id !== place.id)
      .map((other) => ({ to: other.id, km: haversineKm(place, other) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 3);
    graph[place.id] = nearest;
  }
  return graph;
}

/** Road distance through the campus graph, plus the walk to the nearest nodes. */
export function roadDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const start = nearestPlace(from);
  const end = nearestPlace(to);
  const path = dijkstra(campusGraph(), start.id, end.id);
  const along = path?.km ?? haversineKm(start, end);
  return haversineKm(from, start) + along + haversineKm(end, to);
}
