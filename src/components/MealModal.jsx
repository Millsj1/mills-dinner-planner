import { useState, useEffect } from 'react'
import { TAG_COLORS, CUISINE_ICONS } from '../data.js'
import './MealModal.css'

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="star-picker">
      {[1,2,3,4,5].map(i => (
        <button
          key={i}
          className={`star-btn ${i <= (hovered || value) ? 'lit' : ''}`}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i === value ? 0 : i)}
        >★</button>
      ))}
      {value > 0 && <span className="star-label">{['','Poor','Fair','Good','Great','Amazing!'][value]}</span>}
    </div>
  )
}

export default function MealModal({ meal, onClose, onSave }) {
  const [form, setForm] = useState({ ...meal })

  useEffect(() => {
    setForm({ ...meal })
  }, [meal])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave() {
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-day">
              {CUISINE_ICONS[meal.cuisine] || '🍽'} {meal.day} · Week {meal.week}
            </div>
            <h2 className="modal-title">{meal.title}</h2>
            <div className="modal-meta">
              <span className="modal-time">⏱ {meal.time}</span>
              {meal.tags.map(tag => (
                <span
                  key={tag}
                  className="meal-tag"
                  style={{ background: TAG_COLORS[tag]?.bg, color: TAG_COLORS[tag]?.color }}
                >{tag}</span>
              ))}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h3 className="modal-section-title">About this meal</h3>
            <p className="modal-notes">{meal.notes}</p>
          </div>

          <div className="modal-section">
            <h3 className="modal-section-title">Ingredients</h3>
            <ul className="ingredients-list">
              {meal.ingredients.map((ing, i) => (
                <li key={i} className="ingredient">{ing}</li>
              ))}
            </ul>
          </div>

          <div className="modal-divider" />

          <div className="modal-section">
            <h3 className="modal-section-title">Our rating</h3>
            <StarPicker
              value={form.rating}
              onChange={v => setForm(f => ({ ...f, rating: v }))}
            />
          </div>

          <div className="modal-two-col">
            <div className="modal-section">
              <h3 className="modal-section-title">Shannon's notes</h3>
              <textarea
                className="modal-textarea"
                placeholder="What did Shannon think? Any tweaks?"
                value={form.shannonsNotes}
                onChange={e => setForm(f => ({ ...f, shannonsNotes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="modal-section">
              <h3 className="modal-section-title">Jim's notes</h3>
              <textarea
                className="modal-textarea"
                placeholder="Any modifications? Heat level?"
                value={form.jimsNotes}
                onChange={e => setForm(f => ({ ...f, jimsNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="modal-section">
            <label className="cooked-toggle">
              <input
                type="checkbox"
                checked={form.cooked}
                onChange={e => setForm(f => ({ ...f, cooked: e.target.checked }))}
              />
              <span>Mark as cooked</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save changes</button>
        </div>
      </div>
    </div>
  )
}
