import { useState } from 'react'
import { useAuth } from './hooks/useAuth.jsx'
import { useAcceptInvite } from './hooks/useAcceptInvite'
import { usePlan } from './hooks/usePlan'
import LoginPage from './LoginPage.jsx'
import WeekView from './components/WeekView.jsx'
import MealModal from './components/MealModal.jsx'
import ShoppingList from './components/ShoppingList.jsx'
import Header from './components/Header.jsx'
import Members from './pages/Members.jsx'
import './App.css'

export default function App() {
  const { session, member, household, loading: authLoading, signOut } = useAuth()
  const inviteState = useAcceptInvite()

  if (authLoading) {
    return <div className="app-loading">Loading…</div>
  }

  if (!session) {
    return <LoginPage />
  }

  if (!member) {
    // Signed in but not a household member yet (no invite, or invite failed).
    return (
      <div className="app-loading" style={{ flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif" }}>You're signed in</h2>
        {inviteState.status === 'claiming' && <p>Joining household…</p>}
        {inviteState.status === 'error' && <p style={{ color: '#B91C1C' }}>{inviteState.message}</p>}
        {inviteState.status !== 'claiming' && (
          <p style={{ maxWidth: 360, color: '#6b6b6b' }}>
            Your account isn't part of a household yet. Ask Jim or Shannon to send you an invitation link.
          </p>
        )}
        <button
          onClick={signOut}
          style={{
            marginTop: 16, padding: '8px 16px', borderRadius: 8,
            border: '1px solid #d8d6d0', background: 'transparent', cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    )
  }

  return <DinnerPlanner household={household} signOut={signOut} />
}

function DinnerPlanner({ household, signOut }) {
  const { plan, loading, error, updateMeal, toggleCooked, rotate, clearHistory } = usePlan()
  const [activeWeek, setActiveWeek]     = useState(1)
  const [view, setView]                 = useState('planner') // 'planner' | 'shopping' | 'members'
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [toast, setToast]               = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleSave(updatedMeal) {
    try {
      await updateMeal(updatedMeal)
      setSelectedMeal(updatedMeal)
      showToast('Saved!')
    } catch (e) {
      showToast('Save failed: ' + e.message)
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('Generate a brand-new 2-week plan? Current ratings & notes are saved to history.')) return
    try {
      await rotate()
      showToast('New 2-week plan generated')
    } catch (e) {
      showToast('Failed: ' + e.message)
    }
  }

  async function handleClearHistory() {
    if (!window.confirm('Clear all rating history? Resets rotation weighting.')) return
    try {
      await clearHistory()
      showToast('History cleared')
    } catch (e) {
      showToast('Failed: ' + e.message)
    }
  }

  if (loading || !plan) {
    return <div className="app-loading">Loading plan…</div>
  }
  if (error) {
    return <div className="app-loading" style={{ color: '#B91C1C' }}>Error: {error}</div>
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
        onRegenerate={handleRegenerate}
        onClearHistory={handleClearHistory}
        onSignOut={signOut}
        planGeneratedAt={plan.generatedAt}
        householdName={household?.name}
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
        {view === 'members' && (
          <Members onClose={() => setView('planner')} />
        )}
      </main>

      {selectedMeal && (
        <MealModal
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onSave={handleSave}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
