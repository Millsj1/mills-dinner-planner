import './Header.css'

function formatPlanAge(generatedAt) {
  if (!generatedAt) return ''
  const start = new Date(generatedAt)
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
  const fmt = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export default function Header({
  view, setView,
  activeWeek, setActiveWeek,
  cookedCount, total,
  onRegenerate, onClearHistory, onSignOut,
  planGeneratedAt,
  householdName,
}) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <span className="header-logo">🍽</span>
          <div>
            <h1 className="header-title">Mills Dinner Planner</h1>
            <p className="header-sub">
              {householdName || 'Mills Family'} · 2-week rotation
              {planGeneratedAt && <> · <span title="Plan window">{formatPlanAge(planGeneratedAt)}</span></>}
            </p>
          </div>
        </div>

        <div className="header-controls">
          <div className="progress-pill">
            <span className="progress-text">{cookedCount}/{total} made</span>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${(cookedCount / total) * 100}%` }} />
            </div>
          </div>

          <nav className="nav-tabs">
            <button
              className={`nav-tab ${view === 'planner' ? 'active' : ''}`}
              onClick={() => setView('planner')}
            >Planner</button>
            <button
              className={`nav-tab ${view === 'shopping' ? 'active' : ''}`}
              onClick={() => setView('shopping')}
            >Shopping</button>
            <button
              className={`nav-tab ${view === 'members' ? 'active' : ''}`}
              onClick={() => setView('members')}
            >Members</button>
          </nav>

          {view === 'planner' && (
            <div className="week-toggle">
              <button
                className={`week-btn ${activeWeek === 1 ? 'active' : ''}`}
                onClick={() => setActiveWeek(1)}
              >Week 1</button>
              <button
                className={`week-btn ${activeWeek === 2 ? 'active' : ''}`}
                onClick={() => setActiveWeek(2)}
              >Week 2</button>
            </div>
          )}

          <button
            className="reset-btn"
            onClick={onRegenerate}
            title="Generate fresh 2-week plan now"
          >↺</button>
          <button
            className="reset-btn"
            onClick={onClearHistory}
            title="Clear rating history (resets weighting)"
            style={{ fontSize: 13 }}
          >⌫</button>
          {onSignOut && (
            <button
              className="reset-btn"
              onClick={onSignOut}
              title="Sign out"
              style={{ fontSize: 13 }}
            >⏻</button>
          )}
        </div>
      </div>
    </header>
  )
}
