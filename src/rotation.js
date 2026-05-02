// Rotation engine: builds a 2-week plan from a recipe library.
// Picks are weighted by historical rating, with recency penalties so the
// same meals don't repeat back-to-back, and a per-week cuisine cap to keep
// each week varied.
//
// The library is passed as an argument so the engine can run against either
// the local seed library (data.js) or a Supabase-backed library.

import { RECIPE_LIBRARY as DEFAULT_LIBRARY, WEEKDAYS, WEEKEND_DAYS } from './data.js'

const RATING_WEIGHTS = {
  0: 3.0,   // unrated → fair shot at being tried
  1: 0.1,   // poor → almost never
  2: 0.5,
  3: 2.0,
  4: 4.0,
  5: 6.0,   // amazing → strongly favored
}

const RECENCY_PENALTY_DAYS = 21
const RECENCY_PENALTY_FACTOR = 0.15
const MAX_PER_CUISINE_PER_WEEK = 2

function recipeAvgRating(recipeId, history) {
  const ratings = history
    .filter(h => h.recipeId === recipeId && typeof h.rating === 'number' && h.rating > 0)
    .map(h => h.rating)
  if (!ratings.length) return 0
  return ratings.reduce((a, b) => a + b, 0) / ratings.length
}

function lastCookedAt(recipeId, history) {
  const cooked = history
    .filter(h => h.recipeId === recipeId && h.cookedDate)
    .map(h => new Date(h.cookedDate).getTime())
  if (!cooked.length) return null
  return Math.max(...cooked)
}

function daysSince(timestamp, now) {
  if (!timestamp) return Infinity
  return (now - timestamp) / (1000 * 60 * 60 * 24)
}

function weightFor(recipe, history, now) {
  const avg = recipeAvgRating(recipe.id, history)
  const bucket = Math.round(avg)
  let weight = RATING_WEIGHTS[bucket] ?? RATING_WEIGHTS[0]

  const lastCooked = lastCookedAt(recipe.id, history)
  if (daysSince(lastCooked, now) < RECENCY_PENALTY_DAYS) {
    weight *= RECENCY_PENALTY_FACTOR
  }
  return weight
}

function weightedPick(candidates, history, now) {
  const weighted = candidates.map(r => ({ recipe: r, weight: weightFor(r, history, now) }))
  const total = weighted.reduce((sum, w) => sum + w.weight, 0)
  if (total <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }
  let roll = Math.random() * total
  for (const { recipe, weight } of weighted) {
    roll -= weight
    if (roll <= 0) return recipe
  }
  return weighted[weighted.length - 1].recipe
}

function pickMealsForSlots({ library, slotCount, type, history, now, alreadyPicked, perWeekCuisineCount }) {
  const picks = []
  for (let i = 0; i < slotCount; i++) {
    let pool = library.filter(r =>
      r.type === type &&
      !alreadyPicked.has(r.id) &&
      (perWeekCuisineCount[r.cuisine] || 0) < MAX_PER_CUISINE_PER_WEEK
    )
    if (pool.length === 0) {
      pool = library.filter(r => r.type === type && !alreadyPicked.has(r.id))
    }
    if (pool.length === 0) {
      pool = library.filter(r => r.type === type)
    }
    const pick = weightedPick(pool, history, now)
    picks.push(pick)
    alreadyPicked.add(pick.id)
    perWeekCuisineCount[pick.cuisine] = (perWeekCuisineCount[pick.cuisine] || 0) + 1
  }
  return picks
}

function buildWeek({ library, weekNumber, history, now, alreadyPicked }) {
  const cuisineCount = {}
  const weeknights = pickMealsForSlots({
    library,
    slotCount: WEEKDAYS.length,
    type: 'weeknight',
    history,
    now,
    alreadyPicked,
    perWeekCuisineCount: cuisineCount,
  })
  const weekend = pickMealsForSlots({
    library,
    slotCount: WEEKEND_DAYS.length,
    type: 'weekend',
    history,
    now,
    alreadyPicked,
    perWeekCuisineCount: cuisineCount,
  })

  const days = [
    ...WEEKDAYS.map((day, i) => ({ day, recipe: weeknights[i] })),
    ...WEEKEND_DAYS.map((day, i) => ({ day, recipe: weekend[i] })),
  ]

  return days.map(({ day, recipe }) => ({
    id: `w${weekNumber}-${day.toLowerCase().slice(0, 3)}-${recipe.id}`,
    recipeId: recipe.id,
    day,
    week: weekNumber,
    type: recipe.type,
    title: recipe.title,
    time: recipe.time,
    tags: recipe.tags,
    cuisine: recipe.cuisine,
    notes: recipe.notes,
    ingredients: recipe.ingredients,
    cooked: false,
    rating: 0,
    shannonsNotes: '',
    jimsNotes: '',
  }))
}

// Generate a fresh 2-week plan from the supplied library, weighted by history.
export function generatePlan(history = [], now = Date.now(), library = DEFAULT_LIBRARY) {
  const alreadyPicked = new Set()
  const week1 = buildWeek({ library, weekNumber: 1, history, now, alreadyPicked })
  const week2 = buildWeek({ library, weekNumber: 2, history, now, alreadyPicked })
  return {
    week1,
    week2,
    generatedAt: new Date(now).toISOString(),
  }
}

// Convert a finished plan's meals into history entries for the next rotation.
export function planToHistory(plan) {
  const all = [...(plan.week1 || []), ...(plan.week2 || [])]
  return all
    .filter(m => m.cooked || m.rating > 0 || m.shannonsNotes || m.jimsNotes)
    .map(m => ({
      recipeId: m.recipeId || m.id,
      rating: m.rating || 0,
      cookedDate: m.cooked ? plan.generatedAt || new Date().toISOString() : null,
      shannonsNotes: m.shannonsNotes || '',
      jimsNotes: m.jimsNotes || '',
    }))
}

// Decide whether the current plan has aged out (>= 14 days old).
export function planIsExpired(plan, now = Date.now()) {
  if (!plan?.generatedAt) return false
  const ageMs = now - new Date(plan.generatedAt).getTime()
  return ageMs >= 14 * 24 * 60 * 60 * 1000
}
