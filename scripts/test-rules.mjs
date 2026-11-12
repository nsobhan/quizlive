// Security-rules test against the local Firebase emulators.
//   Terminal 1: npm run emulators
//   Terminal 2: npm run test:rules
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import { setLogLevel } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator, ref, set, get, update, push, serverTimestamp, remove } from 'firebase/database';

setLogLevel('silent');
const NS = 'demo-quizlive-default-rtdb';
const DB_URL = `http://127.0.0.1:9000?ns=${NS}`;
let n = 0;
async function client(kind, email) {
  const app = initializeApp({ apiKey: 'demo', projectId: 'demo-quizlive', databaseURL: DB_URL }, `c${n++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getDatabase(app);
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
  const cred = kind === 'anon' ? await signInAnonymously(auth) : await createUserWithEmailAndPassword(auth, email, 'password123');
  return { db, uid: cred.user.uid };
}
const admin = (path, body) =>
  fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(body) });

let pass = 0, fail = 0;
async function expect(label, shouldSucceed, fn) {
  let ok;
  try { await fn(); ok = true; } catch { ok = false; }
  if (ok === shouldSucceed) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} (expected ${shouldSucceed ? 'allowed' : 'denied'})`); }
}

await admin('', null); // wipe
const host = await client('email', `host${Date.now()}@test.dev`);
const notAdmin = await client('email', `nope${Date.now()}@test.dev`);
const a = await client('anon');
const b = await client('anon');
const c = await client('anon');
await admin(`admins/${host.uid}`, true);

console.log('Quizzes');
await expect('admin creates quiz', true, () => set(ref(host.db, 'quizzes/qz1'), { title: 'T', ownerUid: host.uid, createdAt: 1, questions: [{ text: 'x', options: ['a', 'b'], correct: [1] }] }));
await expect('non-admin email user cannot write quiz', false, () => set(ref(notAdmin.db, 'quizzes/qz2'), { title: 'T', ownerUid: notAdmin.uid, createdAt: 1 }));
await expect('anonymous player cannot read quizzes (answer keys)', false, () => get(ref(a.db, 'quizzes')));

console.log('Games');
const code = '123456';
const game = {
  quizId: 'qz1', quizTitle: 'T', hostUid: host.uid, createdAt: serverTimestamp(), status: 'lobby', totalQuestions: 2, currentQuestionIndex: -1,
  config: { mode: 'team', teamAssignment: 'choose', teamAnswerRule: 'all', discussionSeconds: 0, speedBonus: true, streakBonus: true, showLeaderboardEachQuestion: true, chatEnabled: true },
  teams: { t1: { name: 'A', color: '#f00', score: 0, streak: 0 }, t2: { name: 'B', color: '#00f', score: 0, streak: 0 } },
};
await expect('non-admin cannot create game', false, () => set(ref(notAdmin.db, 'games/654321'), { ...game, hostUid: notAdmin.uid }));
await expect('admin creates game', true, () => set(ref(host.db, `games/${code}`), game));
await expect('admin cannot overwrite an existing code as someone else', false, () => set(ref(notAdmin.db, `games/${code}`), { ...game, hostUid: notAdmin.uid }));
await expect('host writes answer key', true, () => set(ref(host.db, `gameKeys/${code}`), { questions: [{ correct: [1] }] }));
await expect('player cannot read answer key', false, () => get(ref(a.db, `gameKeys/${code}`)));

const join = (cl, name, teamId) => update(ref(cl.db), {
  [`games/${code}/names/${name.toLowerCase()}`]: cl.uid,
  [`games/${code}/players/${cl.uid}`]: { name, teamId, score: 0, streak: 0, joinedAt: serverTimestamp() },
});
await expect('player A joins team 1', true, () => join(a, 'Alice', 't1'));
await expect('player B cannot take duplicate name (case-insensitive)', false, () => join(b, 'alice', 't1'));
await expect('player B joins team 2', true, () => join(b, 'Bob', 't2'));
await expect('player C cannot join with score 9999', false, () => update(ref(c.db), {
  [`games/${code}/names/carl`]: c.uid, [`games/${code}/players/${c.uid}`]: { name: 'Carl', teamId: 't1', score: 9999, streak: 0, joinedAt: serverTimestamp() } }));
await expect('player C cannot join a non-existent team', false, () => join(c, 'Carl', 't9'));
await expect('player C cannot use a bad name', false, () => join(c, '<script>', 't1'));
await expect('player C joins team 1', true, () => join(c, 'Carl', 't1'));
await expect('player cannot edit own score', false, () => set(ref(a.db, `games/${code}/players/${a.uid}/score`), 5000));
await expect('player cannot edit another player', false, () => set(ref(a.db, `games/${code}/players/${b.uid}/teamId`), 't1'));
await expect('player can set own online flag', true, () => set(ref(a.db, `games/${code}/players/${a.uid}/online`), true));
await expect('player cannot change game status', false, () => set(ref(a.db, `games/${code}/status`), 'ended'));
await expect('player can read game state', true, () => get(ref(a.db, `games/${code}`)));

console.log('Answers');
await expect('answer rejected while in lobby', false, () => set(ref(a.db, `answers/${code}/0/${a.uid}`), { option: 1, answeredAt: serverTimestamp(), by: a.uid }));
const now = Date.now();
await update(ref(host.db, `games/${code}`), { status: 'question', currentQuestionIndex: 0, question: { index: 0, text: 'x', options: ['a', 'b'], timeLimit: 20, points: 1000 }, timer: { startedAt: now, endsAt: now + 20000 } });
await expect('answer for wrong question index rejected', false, () => set(ref(a.db, `answers/${code}/1/${a.uid}`), { option: 1, answeredAt: serverTimestamp(), by: a.uid }));
await expect('answer with invalid option rejected', false, () => set(ref(a.db, `answers/${code}/0/${a.uid}`), { option: 3, answeredAt: serverTimestamp(), by: a.uid }));
await expect('answer with forged timestamp rejected', false, () => set(ref(a.db, `answers/${code}/0/${a.uid}`), { option: 1, answeredAt: now, by: a.uid }));
await expect('player cannot answer for someone else', false, () => set(ref(a.db, `answers/${code}/0/${b.uid}`), { option: 1, answeredAt: serverTimestamp(), by: a.uid }));
await expect('player A answers', true, () => set(ref(a.db, `answers/${code}/0/${a.uid}`), { option: 1, answeredAt: serverTimestamp(), by: a.uid }));
await expect('player A cannot change answer', false, () => set(ref(a.db, `answers/${code}/0/${a.uid}`), { option: 0, answeredAt: serverTimestamp(), by: a.uid }));
await expect('player B cannot read A\'s answer', false, () => get(ref(b.db, `answers/${code}/0/${a.uid}`)));
await expect('player cannot list all answers', false, () => get(ref(b.db, `answers/${code}/0`)));
await expect('host reads all answers', true, () => get(ref(host.db, `answers/${code}/0`)));
await update(ref(host.db, `games/${code}`), { 'timer/pausedAt': Date.now() });
await expect('answer rejected while paused', false, () => set(ref(b.db, `answers/${code}/0/${b.uid}`), { option: 1, answeredAt: serverTimestamp(), by: b.uid }));
await update(ref(host.db, `games/${code}`), { 'timer/pausedAt': null, 'timer/endsAt': Date.now() - 5000 });
await expect('answer rejected after timer ended', false, () => set(ref(b.db, `answers/${code}/0/${b.uid}`), { option: 1, answeredAt: serverTimestamp(), by: b.uid }));

console.log('Team answers (first / captain)');
const q1 = Date.now();
await update(ref(host.db, `games/${code}`), { 'config/teamAnswerRule': 'first', currentQuestionIndex: 1, timer: { startedAt: q1, endsAt: q1 + 20000 } });
await expect('individual answer rejected in one-per-team mode', false, () => set(ref(a.db, `answers/${code}/1/${a.uid}`), { option: 0, answeredAt: serverTimestamp(), by: a.uid }));
await expect('player cannot answer for another team', false, () => set(ref(a.db, `answers/${code}/1/t2`), { option: 0, answeredAt: serverTimestamp(), by: a.uid }));
await expect('Alice answers for team 1 (first)', true, () => set(ref(a.db, `answers/${code}/1/t1`), { option: 0, answeredAt: serverTimestamp(), by: a.uid }));
await expect('Carl (team 1) cannot overwrite team answer', false, () => set(ref(c.db, `answers/${code}/1/t1`), { option: 1, answeredAt: serverTimestamp(), by: c.uid }));
await expect('Carl can read team 1 answer', true, () => get(ref(c.db, `answers/${code}/1/t1`)));
await expect('Bob cannot read team 1 answer', false, () => get(ref(b.db, `answers/${code}/1/t1`)));
await update(ref(host.db, `games/${code}`), { 'config/teamAnswerRule': 'captain', 'teams/t2/captainId': 'someone-else' });
await expect('non-captain cannot answer in captain mode', false, () => set(ref(b.db, `answers/${code}/1/t2`), { option: 0, answeredAt: serverTimestamp(), by: b.uid }));
await update(ref(host.db, `games/${code}`), { 'teams/t2/captainId': b.uid });
await expect('captain answers in captain mode', true, () => set(ref(b.db, `answers/${code}/1/t2`), { option: 0, answeredAt: serverTimestamp(), by: b.uid }));

console.log('Team chat');
const msg = (cl, name, text) => ({ playerId: cl.uid, name, text, sentAt: serverTimestamp() });
await expect('Alice posts in team 1 chat', true, () => push(ref(a.db, `chats/${code}/t1`), msg(a, 'Alice', 'hi team')));
await expect('Alice cannot post in team 2 chat', false, () => push(ref(a.db, `chats/${code}/t2`), msg(a, 'Alice', 'spy')));
await expect('Alice cannot impersonate Carl', false, () => push(ref(a.db, `chats/${code}/t1`), msg(a, 'Carl', 'fake')));
await expect('message over 300 chars rejected', false, () => push(ref(a.db, `chats/${code}/t1`), msg(a, 'Alice', 'x'.repeat(301))));
await expect('Carl reads team 1 chat', true, () => get(ref(c.db, `chats/${code}/t1`)));
await expect('Bob cannot read team 1 chat', false, () => get(ref(b.db, `chats/${code}/t1`)));
await expect('host reads team 1 chat', true, () => get(ref(host.db, `chats/${code}/t1`)));
await update(ref(host.db, `games/${code}`), { status: 'reveal' });
await expect('chat locked after the question ends', false, () => push(ref(a.db, `chats/${code}/t1`), msg(a, 'Alice', 'late')));

console.log('Host-only data');
await expect('player cannot read score log', false, () => get(ref(a.db, `scoreLog/${code}`)));
await expect('host writes score log', true, () => push(ref(host.db, `scoreLog/${code}`), { delta: 100, reason: 'bonus', at: serverTimestamp() }));
await expect('host can update scores', true, () => update(ref(host.db, `games/${code}/players/${a.uid}`), { score: 1500, streak: 1 }));

console.log('Kicks');
await expect('host kicks Carl', true, () => update(ref(host.db), { [`games/${code}/players/${c.uid}`]: null, [`games/${code}/names/carl`]: null, [`games/${code}/kicked/${c.uid}`]: true }));
await expect('kicked player cannot rejoin', false, () => join(c, 'Carl2', 't1'));
await expect('player can leave (delete own node)', true, () => remove(ref(b.db, `games/${code}/players/${b.uid}`)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
