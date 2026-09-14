# Maisie Health

A period companion web app for teens and young adults. Users complete a fast
start, then get daily cycle tracking, lightweight support tips, and a gentle
heads-up when logged signals suggest something outside the usual range, such as
very heavy bleeding, spotting, absent periods, or fatigue patterns worth
following up. Maisie flags signals; it does not diagnose conditions. An optional
parent or support-contact dashboard shows result levels only, never individual
answers.

Live deployment URL is managed by the hosting provider.

## Running it locally

```bash
npm install
npm run dev      # starts the dev server on http://localhost:5180
npm run build    # production build into dist/
```

No backend or API keys needed. The app runs fully in the browser and saves data
to localStorage until Supabase is connected (see below).

## How it works

- **Onboarding**: age gate with consent branching (13 to 17 requires parental
  consent and a parent email, 18+ just acknowledges the privacy policy), followed
  by a short fast start. Deeper questions are collected progressively instead of
  blocking entry into the app.
- **Scoring**: a rule-based engine in `src/engine/scoring.js` turns answers into
  one of four result levels (Clear, Mild, Moderate, Urgent). Month-one flags are
  limited to obvious abnormalities from a single answer, such as very heavy
  bleeding, periods that have not started by the expected age, or a long absent
  period gap. Tier 2 pattern flags are not evaluated until at least three full
  cycles of real period data exist. The engine tracks abnormality/signal
  categories, not named diagnoses.
- **Daily loop**: daily logs build the user's baseline and show short, contextual
  support after saving. Cycle timing predictions and timing-based pattern views
  stay locked until at least three full cycles of data exist.
- **Parent/support dashboard**: the user decides if anyone gets visibility, and
  how much (everything, flags only, or a monthly digest). Urgent results always
  notify regardless of mode. Individual answers stay private in every mode.

## Project layout

```
src/
  data/       question set and tip content
  engine/     scoring, cycle prediction, tip selection, notifications
  screens/    one file per screen
  state/      app state + persistence
  components/ shared UI bits
supabase/     database schema (see below)
```

## Connecting a database (optional)

By default everything stays in each user's browser. To store signups centrally:

1. Create a free project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run the contents of `supabase/schema.sql`
3. Enable anonymous sign-ins under Authentication > Providers
4. Copy `.env.example` to `.env` and fill in your project URL and anon key
5. Rebuild and redeploy

Identity data (names, emails) and health data (answers, scores) live in separate
tables joined only by an opaque user id, so health records are never readable
next to a name. Row-level security keeps each user's data isolated.

## Stack

React 18, Vite, React Router. Optional Supabase for auth and storage. SMS and
email delivery (Twilio / Resend) are stubbed for now; messages render in an
in-app inbox so the cadence can be tested without accounts.
