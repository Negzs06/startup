export type DiffRowType = "same" | "added" | "removed";

export interface DiffRow {
  type: DiffRowType;
  oldLine: number | null;
  newLine: number | null;
  oldText: string | null;
  newText: string | null;
}

/**
 * Diff de linhas baseado em LCS (longest common subsequence).
 * Suficiente para arquivos pequenos/médios de demonstração; não é
 * otimizado para arquivos grandes (O(n*m)).
 */
export function diffLines(oldCode: string, newCode: string): DiffRow[] {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");
  const n = oldLines.length;
  const m = newLines.length;

  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        oldLines[i] === newLines[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  let oldLineNo = 1;
  let newLineNo = 1;

  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      rows.push({
        type: "same",
        oldLine: oldLineNo++,
        newLine: newLineNo++,
        oldText: oldLines[i],
        newText: newLines[j],
      });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({
        type: "removed",
        oldLine: oldLineNo++,
        newLine: null,
        oldText: oldLines[i],
        newText: null,
      });
      i++;
    } else {
      rows.push({
        type: "added",
        oldLine: null,
        newLine: newLineNo++,
        oldText: null,
        newText: newLines[j],
      });
      j++;
    }
  }

  while (i < n) {
    rows.push({
      type: "removed",
      oldLine: oldLineNo++,
      newLine: null,
      oldText: oldLines[i],
      newText: null,
    });
    i++;
  }

  while (j < m) {
    rows.push({
      type: "added",
      oldLine: null,
      newLine: newLineNo++,
      oldText: null,
      newText: newLines[j],
    });
    j++;
  }

  return rows;
}
