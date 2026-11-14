# QuizLive

A real-time multiplayer quiz game in the style of Kahoot. Players join from their phones with a 6-digit PIN, the host runs the game from a laptop or projector, and scores update live.

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Framer Motion
- **Realtime backend:** Firebase Realtime Database on the free Spark plan, plus Firebase Auth (anonymous sign-in for players, email/password for admins)
- **Hosting:** GitHub Pages, deployed by GitHub Actions. There is no custom server: all game logic runs in the browser and Firebase Security Rules enforce it.

## Features

- **Players:** join with a PIN, QR code or link. Pick a random fun name ("Brave Panda 42") or type your own; duplicate names are rejected. If you refresh or reconnect, you rejoin automatically.
- **Answer tiles:** Kahoot-style, with shape, color and label on each (red triangle, blue diamond, yellow circle, green square). Each player sees a countdown ring and a "Correct/Incorrect, +points" screen after every question.
- **Team mode:**
  - Players choose a team, are auto-balanced, or are assigned by the host (drag and drop).
  - Team answers can be "everyone answers" (team score is the sum), "first to submit", or "captain submits".
  - An optional discussion phase runs before answers open.
  - Each team has a private chat that stays open for the whole game, lobby included: a side panel on desktop, a slide-up drawer on mobile.
- **Host panel:**
  - Shows the PIN and a QR code, and a live player list with online status and a kick button.
  - Buttons: Start, Next, Pause/Resume, Stop & reveal, Skip, Show leaderboard, End.
  - Shows a live answer counter and an answer distribution chart after each question.
  - The host can adjust any score by +/- points with a reason (all adjustments are logged) and read every team chat.
- **Leaderboard (projector view):** live rankings with animated rank changes, a podium, a "live leader" banner, and a team member breakdown. At the end it shows confetti, the full results table and CSV export.
- **Quiz editor:** multiple-choice (2–4 answers, one or more correct), true/false and **type answer** questions, optional image URL, 10/20/30/60-second time limits, 500/1000/2000 or custom base points. Questions can be reordered by drag and drop, duplicated and deleted. Each question can have an optional title, and the title and question each get their own font and size; line breaks are kept. Quizzes can be imported from and exported to JSON (one quiz, or all of them in one file), and a 10-question sample quiz is included.
- **Sound and accessibility:** WebAudio sound effects with a mute toggle, keyboard navigation, visible focus rings, `prefers-reduced-motion` support for the confetti, and shapes so players never have to rely on color alone.

---

## Setup

### 1. Create the Firebase project

1. Go to <https://console.firebase.google.com>, click **Add project**, and give it a name, e.g. `quizlive`. You can turn Analytics off. The free **Spark** plan is enough.
2. **Build → Realtime Database → Create database.** Pick a location and start in **locked mode**. You'll replace the rules in step 3.
3. **Build → Authentication → Get started → Sign-in method.** Enable both:
   - **Anonymous**
   - **Email/Password**
4. **Authentication → Settings → Authorized domains.** Add `<your-github-username>.github.io`. `localhost` is already listed.
5. **Project settings (gear icon) → General → Your apps → Web (`</>`).** Register an app (Firebase Hosting isn't needed) and copy the `firebaseConfig` values.

### 2. Create the first admin account

1. **Authentication → Users → Add user.** Enter your email and a password.
2. Copy that user's **User UID** from the users table.
3. **Realtime Database → Data.** Hover over the root, click **+**, and add:
   ```
   admins
     └─ <paste-the-UID>: true      ← must be the boolean true, not the string "true"
   ```
   You can also import this JSON from the ⋮ menu: `{ "admins": { "<UID>": true } }`.

Repeat these steps for each admin you want. Only accounts listed under `/admins` can create or edit quizzes and host games. The rules block anyone from writing to `/admins` through the app.

### 3. Publish the security rules

**Realtime Database → Rules.** Replace the contents with [`database.rules.json`](database.rules.json) and click **Publish**.
(Or use the CLI: `npx firebase-tools deploy --only database --project <your-project-id>`.)

### 4. Add the Firebase keys as GitHub secrets

In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value from `firebaseConfig` |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_DATABASE_URL` | `databaseURL` (e.g. `https://quizlive-xxxx-default-rtdb.firebaseio.com`, or the `…firebasedatabase.app` URL for non-US regions) |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

> Firebase web config values aren't secret: they ship to every browser. Your data is protected by the security rules, not by hiding these keys. Storing them as secrets just keeps them out of the repo.

### 5. Turn on GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). You can also run it by hand from the **Actions** tab. The site is published at:

```
https://<your-github-username>.github.io/quizlive/
```

> If you rename the repo, update `base` in [`vite.config.ts`](vite.config.ts) to `'/<new-repo-name>/'`.

### 6. Run locally

```bash
npm install
cp .env.example .env.local   # fill in the VITE_FIREBASE_* values
npm run dev                  # http://localhost:5173/quizlive/
```

**Running fully offline with the Firebase emulators** (needs Java 11+):

```bash
npm run emulators                         # terminal 1: auth :9099 + database :9000, loads database.rules.json
VITE_USE_EMULATOR=true npm run dev        # terminal 2
```

To create an admin in the emulator:

```bash
# 1. Create the user. Copy "localId" from the response: that's the UID.
curl -s -H 'content-type: application/json' \
  -d '{"email":"admin@test.dev","password":"password123","returnSecureToken":true}' \
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo"
# 2. Mark the user as an admin
curl -X PUT -H "Authorization: Bearer owner" -d true \
  "http://127.0.0.1:9000/admins/<UID>.json?ns=demo-quizlive-default-rtdb"
```

**Rules test suite** (61 checks against the emulator: answer-key secrecy, one answer per question, forged timestamps, chat privacy, kicks and more):

```bash
npm run emulators      # terminal 1
npm run test:rules     # terminal 2
```

---

## How to play

1. Sign in at **`#/admin/login`**. On the dashboard, click **✨ Add sample quiz**, or create or import your own.
2. Click **▶ Host** and pick the mode and options, then **Create game**. The host panel shows the PIN and a QR code.
3. Open **Projector leaderboard ↗** on the big screen if you want a separate display.
4. Players go to the site on their phones, enter the PIN, and pick a name (and a team, in team mode).
5. Click **Start game**. Each question ends when the timer runs out or everyone has answered. Then click **Leaderboard ▶ / Next question ▶** to continue.

Sample quiz: [`seed/sample-quiz.json`](seed/sample-quiz.json), 10 questions covering true/false, two type-answer questions, a question with an image, multiple correct answers, and different point values and time limits. You can import any file in this format with **⬆ Import JSON**. **⬇ Export** (on a quiz card or in the editor) downloads a quiz in the same format, and **⬇ Export all** downloads every quiz as `{ "quizzes": [...] }`, which Import JSON also accepts.

---

## Architecture

### The host's browser is the game engine

There is no server. The host's browser ([`useHostEngine`](src/hooks/useHostEngine.ts)):

- moves the game from discussion to question to reveal when a timer runs out or every expected answer is in
- reads the hidden answer key and scores every answer ([`finishQuestion`](src/lib/game.ts))
- writes results and scores in one atomic multi-path update.

Players only ever write their own player record, their answer, and chat messages. The [rules](database.rules.json) block everything else.

All timing uses **server timestamps**. Each answer's `answeredAt` must equal the server's `now`, so clients can't backdate answers. Countdowns use the connection's server clock offset, so phones with wrong clocks still show the correct timer.

### Type answer questions ([`src/lib/matching.ts`](src/lib/matching.ts))

Players type their answer (up to 100 characters) instead of tapping a tile. Each question has one or more **accepted answers**, e.g. `7` and `seven`. A typed answer is correct if it matches any of them:

- **Always ignored:** capital letters, accents (`Beyoncé` = `Beyonce`), punctuation and dots (`U.S.A.` = `USA`), extra spaces, a leading *the / a / an*, and `&` vs `and`.
- **Numbers** match by value (`7.0` = `7`), never approximately.
- **Close spellings** (on by default for each question) accept 1 typo on answers of 4–7 characters and 2 typos on answers of 8 or more (`Canbera` = `Canberra`). Answers of 3 characters or fewer must be exact.

At the reveal, the host screen shows the accepted answers and a chart of the most common things players typed, with correct ones marked ✓.

### Scoring ([`src/lib/scoring.ts`](src/lib/scoring.ts))

- **Correct answer:** `basePoints × (speedBonus ? 1 − (responseTime / timeLimit) / 2 : 1)`. Time spent paused doesn't count toward `responseTime`.
- **Streak bonus:** +100 for each consecutive correct answer after the first (2nd in a row +100, 3rd +200 …), capped at +500.
- **Wrong answer or no answer:** 0 points, and the streak resets.
- **Team score:** in "everyone answers" mode, the sum of the members' scores. In "first" and "captain" modes, the score of the team's single answer, which is also credited to the member who submitted it so the member breakdown shows who contributed.
- **Manual adjustments** are added on top and logged to `/scoreLog/{code}`.

### Data model

```
/admins/{uid}: true                                   console-only
/quizzes/{quizId}: { title, description, emoji, color, ownerUid, createdAt, updatedAt, questions[] }

/games/{code}                                         readable by any signed-in user
  quizId, quizTitle, hostUid, hostOnline, createdAt, totalQuestions
  status: lobby | discussion | question | reveal | leaderboard | ended
  config: { mode, teamAssignment, teamAnswerRule, discussionSeconds,
            speedBonus, streakBonus, showLeaderboardEachQuestion, chatEnabled }
  currentQuestionIndex
  question: { index, type, text, imageUrl, options[], timeLimit, points }   ← no answer key
  timer: { discussionEndsAt, startedAt, endsAt, pausedAt, pauses[] }        (server ms)
  reveal: { index, correct[], distribution[], answered, expected }          ← published after time is up
  players/{uid}: { name, teamId, score, streak, joinedAt, online }
  teams/{teamId}: { name, color, score, streak, captainId }
  results/{qIndex}/{uid|teamId}: { option, correct, points, streakBonus, by }
  names/{lowercased name}: uid                        unique-name index
  kicked/{uid}: true

/gameKeys/{code}: { questions[] }                     host-only answer key
/answers/{code}/{qIndex}/{uid|teamId}: { option | text, answeredAt, by }
/chats/{code}/{teamId}/{msgId}: { playerId, name, text, sentAt }
/scoreLog/{code}/{id}: { targetType, target, targetName, delta, reason, at }
```

**Why answers, chats, the score log and answer keys live outside `/games/{code}`:** in Realtime Database, read access cascades down the tree. If clients could listen to the whole `/games/{code}` node, they could also read everything under it. Keeping the private data in separate top-level trees lets every client subscribe to the public game state with a single listener, while the rules control access to the private data per path:

- each answer is readable only by the player or team that wrote it, and by the host
- each team chat is readable only by that team's members and the host
- the answer key and score log are readable only by the host.

The spec put `correct` and `points` inside each answer. Here they live in `games/{code}/results`, written by the host after the reveal, because players must not be able to write their own score.

### Edge cases handled

| Case | Behaviour |
| --- | --- |
| Player refreshes or closes the tab | The anonymous Firebase identity persists in the browser, so the player returns straight to the lobby or game. The landing page offers **Rejoin**. |
| Host disconnects | `hostOnline` is set to `false` through `onDisconnect`. Players see a "Host disconnected" banner. When the host reopens the panel, the game continues from where it stopped. |
| Late joiners | Can join at any point before the game ends and take part from the current question. |
| Duplicate names | Checked case-insensitively and enforced by the rules through the `names` index. |
| Invalid, ended or expired PINs | "Game not found", "Game ended" (with a link to the results) or "Game expired" (after 24 hours). |
| Kicked players | Removed, shown a "You were removed" screen, and blocked by the rules from rejoining. |
| Answer after the timer, double answers, answers while paused, forged timestamps | Rejected by the rules. |

## Project structure

```
src/
  components/      AnswerTile, CountdownRing, ChatPanel, Leaderboard, DistributionChart, ui, host/*
  hooks/           useAuth, useGame, useHostEngine, usePlayerSession, useTimer, usePresence, …
  lib/             firebase.ts, game.ts (all game actions), scoring.ts, paths.ts, names.ts, sound.ts, …
  pages/           Landing, Join, Lobby, Play, Leaderboard, admin/{AdminLogin, Dashboard, QuizEditor, HostSetup, HostPanel}
  types/           shared TypeScript types
database.rules.json
seed/sample-quiz.json
scripts/test-rules.mjs
.github/workflows/deploy.yml
```
