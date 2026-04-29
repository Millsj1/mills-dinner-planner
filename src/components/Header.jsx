import './Header.css'

export default function Header({ view, setView, activeWeek, setActiveWeek, cookedCount, total, onReset }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <span className="header-logo">🍽</span>
          <div>
            <h1 className="header-title">Mills Dinner Planner</h1>
            <p className="header-sub">Jim & Shannon · 2-week rotation</p>
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

          <button className="reset-btn" onClick={onReset} title="Reset plan">↺</button>
        </div>
      </div>
    </header>
  )
}
