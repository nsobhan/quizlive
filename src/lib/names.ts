const ADJ = ['Brave', 'Clever', 'Swift', 'Sneaky', 'Jolly', 'Mighty', 'Cosmic', 'Fuzzy', 'Zesty', 'Lucky', 'Witty', 'Bouncy', 'Sunny', 'Turbo', 'Epic', 'Chill', 'Daring', 'Gentle', 'Noble', 'Quirky'];
const ANIMALS = ['Panda', 'Otter', 'Falcon', 'Koala', 'Tiger', 'Llama', 'Narwhal', 'Fox', 'Penguin', 'Gecko', 'Dolphin', 'Badger', 'Moose', 'Owl', 'Lynx', 'Walrus', 'Yak', 'Bison', 'Hedgehog', 'Raccoon'];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function randomName(): string {
  return `${pick(ADJ)} ${pick(ANIMALS)} ${Math.floor(Math.random() * 90) + 10}`;
}

/** Must match the regex in database.rules.json */
export const NAME_RE = /^[A-Za-z0-9 _'-]{1,20}$/;

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function validateName(name: string): string | null {
  if (!name) return 'Please enter a name.';
  if (name.length > 20) return 'Max 20 characters.';
  if (!NAME_RE.test(name)) return "Use letters, numbers, spaces, - _ or ' only.";
  if (containsProfanity(name)) return 'Please choose a friendlier name.';
  return null;
}

// ---- Basic profanity filter (intentionally small; extend as needed) ----
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'dick', 'pussy', 'slut', 'whore', 'fag', 'nigger', 'retard'];
const BAD_RE = new RegExp(`(${BAD.join('|')})`, 'gi');

export function containsProfanity(s: string): boolean {
  BAD_RE.lastIndex = 0;
  return BAD_RE.test(s);
}

export function filterProfanity(s: string): string {
  return s.replace(BAD_RE, (m) => m[0] + '*'.repeat(m.length - 1));
}
