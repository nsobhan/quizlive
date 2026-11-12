// Central place for every database path the app touches.
export const P = {
  admin: (uid: string) => `admins/${uid}`,
  quizzes: () => 'quizzes',
  quiz: (id: string) => `quizzes/${id}`,
  game: (code: string) => `games/${code}`,
  players: (code: string) => `games/${code}/players`,
  player: (code: string, uid: string) => `games/${code}/players/${uid}`,
  teams: (code: string) => `games/${code}/teams`,
  team: (code: string, id: string) => `games/${code}/teams/${id}`,
  nameKey: (code: string, name: string) => `games/${code}/names/${name.toLowerCase()}`,
  gameKey: (code: string) => `gameKeys/${code}`,
  answers: (code: string, q: number) => `answers/${code}/${q}`,
  answer: (code: string, q: number, id: string) => `answers/${code}/${q}/${id}`,
  chat: (code: string, teamId: string) => `chats/${code}/${teamId}`,
  scoreLog: (code: string) => `scoreLog/${code}`,
};
