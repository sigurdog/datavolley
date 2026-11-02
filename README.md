# DataVolley

Point-based volleyball scouting that a beginner can keep up with at 1st division pace.

Instead of logging every touch like the original DataVolley, the scout logs **one event per rally**:
how the point ended (ace, attack, block or opponent error) and who was involved. Optionally the
reception of each serve is graded too. Score, serving team and rotation are tracked automatically.

Stack: Next.js 16 (App Router), TypeScript, Tailwind v4, Supabase (auth + Postgres).
Interface in Norwegian and English.

# Supabase database: fawBXlJZOpwDwK6W

## 1. Set up Supabase

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.
   This creates all tables, the row-level-security policies and a trigger that makes the user who
   creates a club its owner.
3. Go to **Project Settings → API** and copy the *Project URL* and the *anon / publishable* key.
4. Optional for local development: **Authentication → Providers → Email** and turn off
   *Confirm email* so you can log in right after signing up. If you keep it on, the confirmation
   link lands on `/auth/confirm`, which the app handles. Add `http://localhost:3000/auth/confirm`
   under **Authentication → URL Configuration → Redirect URLs**.

## 2. Run locally

```bash
cp .env.example .env.local   # then paste the URL and key
npm install
npm run dev
```

Open <http://localhost:3000>, create an account, create your club, add teams and players, create a
match and start scouting.

### Dev admin login (admin / admin)

Sign-up normally requires confirming an email. For local development you can seed an admin user
instead:

1. Copy the **service_role** key from Project Settings → API into `.env.local` as
   `SUPABASE_SERVICE_ROLE_KEY` (secret, server-side only).
2. Run `npm run seed:admin`. It creates `admin@datavolley.local` with the email pre-confirmed and
   writes `DEV_ADMIN_*` values to `.env.local`.
3. Restart `npm run dev` and log in with username `admin`, password `admin`.

The shortcut only exists when `NODE_ENV` is not production and `DEV_ADMIN_ENABLED=true`, so it is
inert in a deployed build.

Other scripts:

```bash
npm test          # engine unit tests (score, rotation, stats, roster parser)
npm run typecheck # tsc
npm run lint
npm run build
```

## 3. Push to GitHub

```bash
git add -A
git commit -m "Initial DataVolley app"
git push -u origin main
```

## How scouting works

Per rally the scout does at most two things, both at natural pauses:

1. **Reception** (optional, can be turned off per match): tap who received, then
   *Perfect / OK / Bad / Ace*. An ace ends the rally immediately and credits the server.
2. **Rally end**: tap *Point Home* or *Point Away*, then how it was won:
   *Attack*, *Block*, *Ace* or *Opponent error* (with error type), then the player. Serve errors and
   aces are credited to the current server automatically.

The app knows who serves and which six players are on court from the lineup you enter at the start
of each set, so the player buttons are shown in court positions. Undo is always one tap (or `Z`).

Keyboard shortcuts for laptop users: type a shirt number + Enter to pick a player, `←`/`→` for the
point, `K`/`B`/`A`/`E` for the outcome, `P`/`O`/`B`/`A` for reception grades, `Space` to skip
reception, `U` unknown player, `Esc` to cancel. Click the ⌨ button on the scoreboard for the list.

## Statistics and export

The stats page shows, per set or whole match: points, side-out %, break %, aces, kills, blocks,
errors by type, points won/lost per rotation and a per-player table including reception quality.
Export buttons give you the rally log as CSV, the stats as CSV, or everything as JSON.

## Roster import plugin (Min Volleyball)

NVBF's Min Volleyball has no public API and Profixio's API keys are issued manually, so rosters are
entered by hand or pasted (one player per line, e.g. `14 Ola Nordmann`).

The import is built as a plugin interface in [`src/lib/import/types.ts`](src/lib/import/types.ts).
[`src/lib/import/minvolleyball.ts`](src/lib/import/minvolleyball.ts) is a stub that reports itself
unavailable until `MINVOLLEYBALL_API_URL` and `MINVOLLEYBALL_API_KEY` are set in `.env.local`. When a
key is granted, implement `listTeams()` and `fetchRoster()` there; nothing else needs to change.

## Project layout

```
supabase/schema.sql          database tables, RLS policies, trigger
src/proxy.ts                 session refresh + auth redirects (Next 16 "proxy", formerly middleware)
src/lib/engine/              pure scouting logic: set state, rotation, stats, export (+ tests)
src/lib/i18n/                Norwegian / English dictionaries and provider
src/lib/import/              roster import plugins (paste parser, Min Volleyball stub)
src/lib/supabase/            browser / server / proxy Supabase clients
src/app/actions/             server actions (all writes go through these, RLS enforced)
src/app/(auth)/              login, signup
src/app/(app)/               dashboard, team roster, new match, match scouting, stats
src/components/scout/        ScoutBoard (live entry), LineupForm, MatchScout (orchestrator)
```

## Data model

- `clubs` / `club_members`: a user creates a club and becomes owner; members see everything in it.
- `teams` (own and opponent) → `players` (shirt number + name).
- `matches` → `match_players` (squad), `sets` (lineup + first server per set), `rallies`.
- Each `rallies` row stores the state at the start of the rally (serving team, rotations), the
  optional reception, how the rally ended, and the score after it. All stats derive from this table.
