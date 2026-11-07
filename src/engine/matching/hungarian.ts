const INFEASIBLE = 1e9;

/**
 * Minimum-cost assignment. `assignment[row]` is the chosen column, or -1.
 * Infeasible cells should be >= 1e9 and are left unassigned.
 */
export function hungarian(cost: number[][]): number[] {
  const rowCount = cost.length;
  if (rowCount === 0) return [];
  const columnCount = cost[0]?.length ?? 0;
  if (columnCount === 0) return cost.map(() => -1);

  const size = Math.max(rowCount, columnCount);
  const matrix = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) =>
      row < rowCount && column < columnCount ? cost[row][column] : INFEASIBLE,
    ),
  );

  const potentialRow = new Array<number>(size + 1).fill(0);
  const potentialColumn = new Array<number>(size + 1).fill(0);
  const pairColumnToRow = new Array<number>(size + 1).fill(0);
  const way = new Array<number>(size + 1).fill(0);

  for (let row = 1; row <= size; row += 1) {
    pairColumnToRow[0] = row;
    let column0 = 0;
    const minimum = new Array<number>(size + 1).fill(Number.POSITIVE_INFINITY);
    const used = new Array<boolean>(size + 1).fill(false);

    do {
      used[column0] = true;
      const pairedRow = pairColumnToRow[column0];
      let delta = Number.POSITIVE_INFINITY;
      let nextColumn = 0;

      for (let column = 1; column <= size; column += 1) {
        if (used[column]) continue;
        const reduced =
          matrix[pairedRow - 1][column - 1] -
          potentialRow[pairedRow] -
          potentialColumn[column];
        if (reduced < minimum[column]) {
          minimum[column] = reduced;
          way[column] = column0;
        }
        if (minimum[column] < delta) {
          delta = minimum[column];
          nextColumn = column;
        }
      }

      for (let column = 0; column <= size; column += 1) {
        if (used[column]) {
          potentialRow[pairColumnToRow[column]] += delta;
          potentialColumn[column] -= delta;
        } else {
          minimum[column] -= delta;
        }
      }
      column0 = nextColumn;
    } while (pairColumnToRow[column0] !== 0);

    do {
      const previous = way[column0];
      pairColumnToRow[column0] = pairColumnToRow[previous];
      column0 = previous;
    } while (column0 !== 0);
  }

  const assignment = new Array<number>(rowCount).fill(-1);
  for (let column = 1; column <= size; column += 1) {
    const row = pairColumnToRow[column];
    if (
      row >= 1 &&
      row <= rowCount &&
      column <= columnCount &&
      matrix[row - 1][column - 1] < INFEASIBLE / 2
    ) {
      assignment[row - 1] = column - 1;
    }
  }
  return assignment;
}

export const HUNGARIAN_INFEASIBLE = INFEASIBLE;
