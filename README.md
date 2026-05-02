# Mills Dinner Planner

A shared 2-week dinner rotation app for the Mills family. Picks meals from a recipe library, tracks ratings + notes, and rolls a fresh plan every two weeks weighted by what you actually liked.

**Stack:** React + Vite · Supabase (auth + Postgres) · Vercel

## How rotation works

- **Library:** ~33 meals across American, Mexican, Italian, Asian, Mediterranean, BBQ.
- **Plan:** 7 meals per week × 2 weeks = 14 picks (5 weeknight + 2 weekend per week).
- **Weighting:**
  - 5★ → strongly favored
  - 4★ → likely
  - 3★ → fair shot
  - 0★ (unrated) → solid chance — gives unfamiliar meals exposure
  - 2★ → rare · 1★ → almost never
- **Recency penalty:** if a meal was cooked in the last 21 days, its weight drops to 15%.
- **Variety:** no more than 2 meals from the same cuisine per week.
- **Auto-rotate:** when the current plan is 14+ days old the app generates a new one on next load. ↺ button regenerates manually; ⌫ wipes history.

When a plan is replaced, ratings + notes are appended to `meal_history`, which feeds the weighting for all future plans.

## Multi-user

The app uses Supabase auth + Postgres so Jim, Shannon, and others all see the same plan. Members invite new users from the **Members** tab — owner enters name + email + role, gets a shareable invite URL, recipient signs in with the matching email and is added automatically.

Roles:
- **Owner** — full access + manage members
- **Member** — full access (edit plan, rate, take notes)
- **Viewer** — read-only

## Setup

See `DEPLOYMENT.md` for the step-by-step provision-and-deploy guide.

## Local development

```bash
cp .env.example .env.local   # fill with your Supabase keys
npm install
npm run dev   # http://localhost:5173
```

## Project structure

```
src/
├── App.jsx                 # Routes auth → planner; gates on membership
├── LoginPage.jsx           # Magic link + Google OAuth
├── data.js                 # RECIPE_LIBRARY seed (also used as fallback)
├── rotation.js             # Weighted-rotation engine
├── lib/supabase.js         # Supabase client init
├── hooks/
│   ├── useAuth.jsx         # Session + household membership context
│   ├── usePlan.js          # Loads/mutates plan, history, recipes from DB
│   └── useAcceptInvite.js  # Claims a ?invite=TOKEN on first sign-in
├── pages/Members.jsx       # Members + invitations management
└── components/
    ├── Header.jsx          # Nav, regenerate, sign out
    ├── WeekView.jsx        # Per-week meal cards
    ├── MealModal.jsx       # Edit rating + notes
    └── ShoppingList.jsx    # Auto-derived from current plan

supabase/migrations/
├── 001_initial_schema.sql  # Tables, RLS, accept_invitation() RPC
└── 002_seed_recipes.sql    # ~33 recipes (global, household_id NULL)
```

## Deploying changes

```bash
git add .
git commit -m "Description"
git push           # Vercel auto-deploys from main
```

If you add a SQL migration, run it manually in Supabase SQL Editor before pushing.
