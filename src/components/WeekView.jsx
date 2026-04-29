import { TAG_COLORS, CUISINE_ICONS } from '../data.js'
import './WeekView.css'

function StarRating({ rating }) {
  return (
    <div className="stars-display">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= rating ? 'star filled' : 'star'}>★</span>
      ))}
    </div>
  )
}

export default function WeekView({ meals, week, onSelect, onToggleCooked }) {
  const weekdays = meals.filter(m => m.type === 'weeknight')
  const weekend = meals.filter(m => m.type === 'weekend')

  return (
    <div className="week-view">
      <section className="meal-section">
        <div className="section-header">
          <h2 className="section-title">Weeknights</h2>
          <span className="section-badge">Mon – Fri · fast</span>
        </div>
        <div className="meal-list">
          {weekdays.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              onSelect={onSelect}
              onToggleCooked={onToggleCooked}
            />
          ))}
        </div>
      </section>

      <section className="meal-section">
        <div className="section-header">
          <h2 className="section-title">Weekend</h2>
          <span className="section-badge weekend">Sat & Sun · cook together</span>
        </div>
        <div className="meal-list">
          {weekend.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              onSelect={onSelect}
              onToggleCooked={onToggleCooked}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function MealCard({ meal, onSelect, onToggleCooked }) {
  return (
    <div className={`meal-card ${meal.cooked ? 'cooked' : ''}`}>
      <button
        className="cooked-check"
        onClick={() => onToggleCooked(meal.id, meal.week)}
        title={meal.cooked ? 'Mark uncooked' : 'Mark as cooked'}
      >
        {meal.cooked ? '✓' : ''}
      </button>

      <div className="meal-card-body" onClick={() => onSelect(meal)}>
        <div className="meal-card-top">
          <div className="meal-day-row">
            <span className="meal-day">{meal.day}</span>
            <span className="meal-cuisine">{CUISINE_ICONS[meal.cuisine] || '🍽'} {meal.cuisine}</span>
          </div>
          <h3 className="meal-title">{meal.title}</h3>
          <p className="meal-notes-preview">{meal.notes}</p>

          <div className="meal-footer">
            <div className="meal-tags">
              {meal.tags.map(tag => (
                <span
                  key={tag}
                  className="meal-tag"
                  style={{ background: TAG_COLORS[tag]?.bg, color: TAG_COLORS[tag]?.color }}
                >{tag}</span>
              ))}
              <span className="meal-time">⏱ {meal.time}</span>
            </div>
            {meal.rating > 0 && <StarRating rating={meal.rating} />}
          </div>

          {(meal.shannonsNotes || meal.jimsNotes) && (
            <div className="meal-has-notes">💬 Has notes</div>
          )}
        </div>
      </div>
    </div>
  )
}
