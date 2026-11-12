// Matching for "Type answer" questions.

/** Lowercase, strip accents/punctuation/extra spaces and a leading article. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/(\d)\.(\d)/g, '$1\u0000$2') // keep decimal points…
    .replace(/\./g, '') // …but drop other dots: "U.S.A." → "usa"
    .replace(/\u0000/g, '.')
    .replace(/[^\p{L}\p{N}.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Typos allowed for an accepted answer of this length (short answers must be exact). */
export const typoAllowance = (len: number) => (len <= 3 ? 0 : len <= 7 ? 1 : 2);

const asNumber = (s: string) => (/^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null);

export function isTextMatch(input: string, accepted: string[] = [], fuzzy = false): boolean {
  const a = normalizeAnswer(input);
  if (!a) return false;
  return accepted.some((raw) => {
    const b = normalizeAnswer(raw);
    if (!b) return false;
    if (a === b) return true;
    const na = asNumber(a);
    const nb = asNumber(b);
    if (na !== null || nb !== null) return na !== null && na === nb; // numbers: exact value only
    return fuzzy && levenshtein(a, b) <= typoAllowance(b.length);
  });
}
