export interface GraphEdge {
  to: string;
  km: number;
}

/** Dijkstra shortest path. Returns null when the destination is unreachable. */
export function dijkstra(
  graph: Record<string, GraphEdge[]>,
  start: string,
  end: string,
): { path: string[]; km: number } | null {
  if (!graph[start] || !graph[end]) return null;

  const distance = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, string | null>([[start, null]]);
  const remaining = new Set(Object.keys(graph));

  while (remaining.size > 0) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const node of remaining) {
      const value = distance.get(node) ?? Number.POSITIVE_INFINITY;
      if (value < best) {
        best = value;
        current = node;
      }
    }
    if (current === null || best === Number.POSITIVE_INFINITY) break;
    remaining.delete(current);
    if (current === end) break;

    for (const edge of graph[current] ?? []) {
      const next = best + edge.km;
      if (next < (distance.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distance.set(edge.to, next);
        previous.set(edge.to, current);
      }
    }
  }

  if (!previous.has(end) && start !== end) return null;
  if ((distance.get(end) ?? Number.POSITIVE_INFINITY) === Number.POSITIVE_INFINITY) {
    return null;
  }

  const path: string[] = [];
  let cursor: string | null = end;
  while (cursor) {
    path.push(cursor);
    cursor = previous.get(cursor) ?? null;
  }
  path.reverse();
  return { path, km: distance.get(end) ?? 0 };
}
