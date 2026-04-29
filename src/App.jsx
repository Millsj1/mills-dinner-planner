import { useState, useEffect } from 'react'
import { INITIAL_PLAN } from './data.js'
import WeekView from './components/WeekView.jsx'
import MealModal from './components/MealModal.jsx'
import ShoppingList from './components/ShoppingList.jsx'
import Header from './components/Header.jsx'
import './App.css'

const STORAGE_KEY = 'mills-dinner-plan-v1'

function loadPlan() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return { week1: [...INITIAL_PLAN.week1], week2: [...INITIAL_PLAN.week2] }
}

export default function App() {
  const [plan, setPlan] = useState(loadPlan)
  const [activeWeek, setActiveWeek] = useState(1)
  const [view, setView] = useState('planner') // 'planner' | 'shopping'
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)) } catch (e) {}
  }, [plan])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function updateMeal(updatedMeal) {
    setPlan(prev => {
      const key = `week${updatedMeal.week}`
      return {
        ...prev,
        [key]: prev[key].map(m => m.id === updatedMeal.id ? updatedMeal : m)
      }
    })
    setSelectedMeal(updatedMeal)
    showToast('Saved!')
  }

  function toggleCooked(mealId, week) {
    const key = `week${week}`
    setPlan(prev => ({
      ...prev,
      [key]: prev[key].map(m =>
        m.id === mealId ? { ...m, cooked: !m.cooked } : m
      )
    }))
  }

  function resetPlan() {
    if (window.confirm('Reset to original plan? All ratings and notes will be cleared.')) {
      setPlan({ week1: [...INITIAL_PLAN.week1], week2: [...INITIAL_PLAN.week2] })
      showToast('Plan reset!')
    }
  }

  const allMeals = [...plan.week1, ...plan.week2]
  const cookedCount = allMeals.filter(m => m.cooked).length

  return (
    <div className="app">
      <Header
        view={view}
        setView={setView}
        activeWeek={activeWeek}
        setActiveWeek={setActiveWeek}
        cookedCount={cookedCount}
        total={allMeals.length}
        onReset={resetPlan}
      />

      <main className="main">
        {view === 'planner' && (
          <WeekView
            meals={plan[`week${activeWeek}`]}
            week={activeWeek}
            onSelect={setSelectedMeal}
            onToggleCooked={toggleCooked}
          />
        )}
        {view === 'shopping' && (
          <ShoppingList plan={plan} activeWeek={activeWeek} />
        )}
      </main>

      {selectedMeal && (
        <MealModal
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onSave={updateMeal}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
