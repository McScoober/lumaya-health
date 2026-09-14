# Maisie Health

A period companion web app for teens and young adults. Users complete a one-time
symptom check-in when they sign up, then get daily cycle tracking, phase-based
self-care tips, and a gentle heads-up when a symptom pattern is worth talking to
someone about. An optional parent or support-contact dashboard shows result levels
only, never individual answers.

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
  consent and a parent email, 18+ just acknowledges the privacy policy), a few
  personalization questions, then an 18-question symptom check-in.
- **Scoring**: a rule-based engine in `src/engine/scoring.js` turns answers into
  one of four result levels (Clear, Mild, Moderate, Urgent). Some flags count
  from a single answer, like very heavy bleeding. Pattern-based flags, like
  endo or PCOS signals, start as a soft note and only escalate if the same
  pattern shows up again on a later cycle from real tracking data. Condition
  names are never shown to the user.
- **Daily loop**: `src/engine/cyclePredictor.js` figures out cycle phase and
  predicts the next period. `src/engine/tipEngine.js` picks one self-care tip a
  day matched to phase plus profile (student, athlete, sleep schedule, sport).
  Message cadence is daily during the predicted period window and roughly
  weekly otherwise.
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
