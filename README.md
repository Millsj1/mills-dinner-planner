# Mills Dinner Planner

A shared dinner rotation app for Jim & Shannon. 2-week meal plan with shopping lists, notes, ratings, and cook tracking.

## Deploy to Vercel via GitHub

### Step 1 — Push to GitHub

```bash
cd dinner-planner
git init
git add .
git commit -m "Initial dinner planner"
```

Go to https://github.com/new and create a new repo called `mills-dinner-planner` (private).

```bash
git remote add origin https://github.com/YOUR_USERNAME/mills-dinner-planner.git
git branch -M main
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select `mills-dinner-planner`
4. Framework: **Vite** (auto-detected)
5. Click **Deploy**

Done! Vercel gives you a URL like `mills-dinner-planner.vercel.app` — share it with Shannon.

### Step 3 — Share with Shannon

Send Shannon the Vercel URL. The app works on any device — phone, tablet, desktop.

Data is stored in each browser's localStorage, so Jim and Shannon each have their own local copy of notes and check-offs. (For shared sync across devices, a future upgrade could add a database.)

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173
