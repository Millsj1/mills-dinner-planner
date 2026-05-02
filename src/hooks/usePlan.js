import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { generatePlan, planToHistory, planIsExpired } from '../rotation'

// DB row → frontend recipe shape (matches RECIPE_LIBRARY entries).
function recipeFromRow(r) {
  return {
    id: r.id,
    title: r.title,
    type: r.meal_type,
    time: r.time_estimate,
    cuisine: r.cuisine,
    tags: r.tags || [],
    notes: r.notes || '',
    ingredients: r.ingredients || [],
  }
}

// DB plan_item row → frontend meal shape.
function mealFromRow(item, recipeMap) {
  const recipe = recipeMap.get(item.recipe_id) || {}
  return {
    id: item.id,
    recipeId: item.recipe_id,
    day: item.day,
    week: item.week,
    type: recipe.type || item.meal_type,
    title: recipe.title || item.title_snapshot,
    time: recipe.time || '',
    cuisine: recipe.cuisine || '',
    tags: recipe.tags || [],
    notes: recipe.notes || '',
    ingredients: recipe.ingredients || [],
    cooked: item.cooked,
    rating: item.rating || 0,
    shannonsNotes: item.shannons_notes || '',
    jimsNotes: item.jims_notes || '',
  }
}

function historyFromRow(r) {
  return {
    recipeId: r.recipe_id,
    rating: r.rating,
    cookedDate: r.cooked_date,
    shannonsNotes: r.shannons_notes,
    jimsNotes: r.jims_notes,
  }
}

export function usePlan() {
  const { household, session } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [history, setHistory] = useState([])
  const [plan, setPlan]       = useState(null)  // { id, generatedAt, week1: [...], week2: [...] }
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!household) return
    setLoading(true); setError(null)
    try {
      const recipesP = supabase.from('recipes').select('*').eq('is_archived', false)
      const historyP = supabase.from('meal_history').select('*').eq('household_id', household.id)
      // Active plan = most recently created plan for the household
      const planP = supabase
        .from('meal_plans')
        .select('*, items:meal_plan_items(*)')
        .eq('household_id', household.id)
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const [recipesRes, historyRes, planRes] = await Promise.all([recipesP, historyP, planP])
      if (recipesRes.error) throw recipesRes.error
      if (historyRes.error) throw historyRes.error
      if (planRes.error) throw planRes.error

      const lib = (recipesRes.data || []).map(recipeFromRow)
      const recipeMap = new Map(lib.map(r => [r.id, r]))
      const hist = (historyRes.data || []).map(historyFromRow)

      setRecipes(lib)
      setHistory(hist)

      let active = planRes.data
      if (active) {
        const items = active.items || []
        const week1 = items.filter(i => i.week === 1).map(i => mealFromRow(i, recipeMap))
        const week2 = items.filter(i => i.week === 2).map(i => mealFromRow(i, recipeMap))
        // Order by canonical day order
        const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        const byDay = (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
        week1.sort(byDay); week2.sort(byDay)
        setPlan({
          id: active.id,
          generatedAt: active.generated_at,
          week1,
          week2,
        })

        // Auto-rotate if expired
        if (planIsExpired({ generatedAt: active.generated_at })) {
          await rotate({ silent: true, currentPlan: { week1, week2, generatedAt: active.generated_at, id: active.id }, library: lib, prevHistory: hist })
        }
      } else {
        // No plan exists yet — generate one
        await rotate({ silent: true, currentPlan: null, library: lib, prevHistory: hist })
      }
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household])

  useEffect(() => { load() }, [load])

  // ── Mutations ─────────────────────────────────────────────────────────
  async function updateMeal(meal) {
    const updates = {
      cooked: meal.cooked,
      rating: meal.rating || 0,
      shannons_notes: meal.shannonsNotes || '',
      jims_notes: meal.jimsNotes || '',
    }
    const { error } = await supabase.from('meal_plan_items').update(updates).eq('id', meal.id)
    if (error) throw error
    setPlan(prev => {
      if (!prev) return prev
      const key = `week${meal.week}`
      return {
        ...prev,
        [key]: prev[key].map(m => m.id === meal.id ? { ...m, ...meal } : m),
      }
    })
  }

  async function toggleCooked(mealId, week) {
    setPlan(prev => {
      if (!prev) return prev
      const key = `week${week}`
      const next = prev[key].map(m => m.id === mealId ? { ...m, cooked: !m.cooked } : m)
      const flipped = next.find(m => m.id === mealId)
      // Fire and forget DB update
      supabase.from('meal_plan_items').update({ cooked: flipped.cooked }).eq('id', mealId)
        .then(({ error }) => { if (error) console.error(error) })
      return { ...prev, [key]: next }
    })
  }

  // Generate a new plan, archive the old one, append its meals to history.
  async function rotate({ silent = false, currentPlan = plan, library = recipes, prevHistory = history } = {}) {
    if (!household) return
    const userId = session?.user?.id

    // 1. Convert current plan → history rows (if any).
    const historyEntries = currentPlan ? planToHistory(currentPlan) : []
    if (historyEntries.length > 0) {
      const rows = historyEntries.map(h => ({
        household_id: household.id,
        recipe_id: h.recipeId,
        rating: h.rating || null,
        cooked_date: h.cookedDate,
        shannons_notes: h.shannonsNotes,
        jims_notes: h.jimsNotes,
        created_by: userId,
      }))
      await supabase.from('meal_history').insert(rows)
    }

    // 2. Mark old plan inactive
    if (currentPlan?.id) {
      await supabase.from('meal_plans')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', currentPlan.id)
    }

    // 3. Generate new plan from library + history
    const mergedHistory = [...prevHistory, ...historyEntries]
    const fresh = generatePlan(mergedHistory, Date.now(), library)

    // 4. Insert new plan + items
    const { data: newPlan, error: planErr } = await supabase
      .from('meal_plans')
      .insert({
        household_id: household.id,
        generated_at: fresh.generatedAt,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single()
    if (planErr) throw planErr

    const allMeals = [...fresh.week1, ...fresh.week2]
    const itemRows = allMeals.map(m => ({
      meal_plan_id: newPlan.id,
      household_id: household.id,
      recipe_id: m.recipeId,
      week: m.week,
      day: m.day,
      meal_type: m.type,
      title_snapshot: m.title,
      cooked: false,
      rating: 0,
      shannons_notes: '',
      jims_notes: '',
    }))
    const { data: insertedItems, error: itemErr } = await supabase
      .from('meal_plan_items').insert(itemRows).select()
    if (itemErr) throw itemErr

    // Re-shape inserted rows into UI plan
    const recipeMap = new Map(library.map(r => [r.id, r]))
    const week1 = insertedItems.filter(i => i.week === 1).map(i => mealFromRow(i, recipeMap))
    const week2 = insertedItems.filter(i => i.week === 2).map(i => mealFromRow(i, recipeMap))
    const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    const byDay = (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
    week1.sort(byDay); week2.sort(byDay)

    setPlan({
      id: newPlan.id,
      generatedAt: newPlan.generated_at,
      week1, week2,
    })
    setHistory(mergedHistory)
    return { silent }
  }

  async function clearHistory() {
    if (!household) return
    await supabase.from('meal_history').delete().eq('household_id', household.id)
    setHistory([])
    await rotate({ silent: true, currentPlan: plan, library: recipes, prevHistory: [] })
  }

  return {
    plan,
    recipes,
    history,
    loading,
    error,
    updateMeal,
    toggleCooked,
    rotate: () => rotate({ silent: false }),
    clearHistory,
    reload: load,
  }
}
