/** One line of a comparison: unchanged, only in the old text, or only in the new. */
export interface DiffLine {
  kind: 'same' | 'removed' | 'added';
  text: string;
}

/** Texts above this many lines (either side) are compared as whole blocks, which keeps the table below a bounded size. */
const MAX_LINES = 1200;

/**
 * A line-by-line comparison of two texts (longest common subsequence). Email HTML is short, and the answer only has to be readable, so
 * this is the plain algorithm rather than a library.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  if (a.length > MAX_LINES || b.length > MAX_LINES) {
    return oldText === newText ? a.map((text) => ({ kind: 'same' as const, text })) : [...a.map((text) => ({ kind: 'removed' as const, text })), ...b.map((text) => ({ kind: 'added' as const, text }))];
  }

  // lengths[i][j] = length of the longest common subsequence of a[i..] and b[j..]
  const lengths: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i]![j] = a[i] === b[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]! });
      i += 1;
      j += 1;
    } else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) {
      out.push({ kind: 'removed', text: a[i]! });
      i += 1;
    } else {
      out.push({ kind: 'added', text: b[j]! });
      j += 1;
    }
  }
  for (; i < a.length; i += 1) out.push({ kind: 'removed', text: a[i]! });
  for (; j < b.length; j += 1) out.push({ kind: 'added', text: b[j]! });
  return out;
}

export const hasChanges = (lines: DiffLine[]): boolean => lines.some((line) => line.kind !== 'same');
