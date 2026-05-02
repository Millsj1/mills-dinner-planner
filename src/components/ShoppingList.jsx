import { useState, useMemo } from 'react'
import './ShoppingList.css'

const PANTRY_STAPLES = [
  'Olive oil', 'Garlic (fresh + powder)', 'Kosher salt + black pepper',
  'Paprika', 'Cumin', 'Oregano', 'Red pepper flakes',
  'Soy sauce', 'Worcestershire sauce', 'Dried pasta (spaghetti + penne)',
  'Canned crushed tomatoes', 'Jarred marinara', 'Flour + corn tortillas',
  'Rice', 'Canned black beans', 'Chicken broth', 'Sesame oil'
]

// Combine duplicate ingredients across meals so the list reads cleanly.
function consolidateIngredients(meals) {
  const seen = new Map()
  for (const meal of meals) {
    for (const ing of meal.ingredients) {
      const key = ing.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.set(key, { label: ing, mealTitles: [meal.title] })
      } else {
        seen.get(key).mealTitles.push(meal.title)
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export default function ShoppingList({ plan, activeWeek }) {
  const [checkedItems, setCheckedItems] = useState({})
  const [activeTab, setActiveTab] = useState('week')

  const meals = plan[`week${activeWeek}`] || []
  const items = useMemo(() => consolidateIngredients(meals), [meals])

  function toggle(key) {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function clearChecked() {
    setCheckedItems({})
  }

  const checkedCount = items.reduce(
    (n, item, i) => n + (checkedItems[`week${activeWeek}-${i}`] ? 1 : 0),
    0
  )

  return (
    <div className="shopping">
      <div className="shopping-header">
        <h2 className="shopping-title">Shopping Guide</h2>
        <div className="shopping-tabs">
          <button
            className={`shop-tab ${activeTab === 'week' ? 'active' : ''}`}
            onClick={() => setActiveTab('week')}
          >Week {activeWeek} fresh</button>
          <button
            className={`shop-tab ${activeTab === 'pantry' ? 'active' : ''}`}
            onClick={() => setActiveTab('pantry')}
          >Pantry staples</button>
        </div>
      </div>

      {activeTab === 'week' && (
        <div className="shop-section">
          <div className="shop-section-head">
            <span>Week {activeWeek} fresh ingredients</span>
            <span className="shop-budget">{items.length} items</span>
          </div>
          <div className="shop-actions">
            <span className="shop-progress">{checkedCount} of {items.length} checked</span>
            {checkedCount > 0 && (
              <button className="clear-btn" onClick={clearChecked}>Clear all</button>
            )}
          </div>
          <ul className="shop-list">
            {items.map((item, i) => {
              const key = `week${activeWeek}-${i}`
              return (
                <li
                  key={key}
                  className={`shop-item ${checkedItems[key] ? 'checked' : ''}`}
                  onClick={() => toggle(key)}
                  title={item.mealTitles.join(' · ')}
                >
                  <span className="shop-check">{checkedItems[key] ? '✓' : ''}</span>
                  <span className="shop-item-text">{item.label}</span>
                  {item.mealTitles.length > 1 && (
                    <span className="shop-item-count">×{item.mealTitles.length}</span>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="shop-note">
            <strong>Tip:</strong> List is generated from this week's meals — pantry staples are on the next tab. Items used in multiple meals are flagged with a count.
          </div>
        </div>
      )}

      {activeTab === 'pantry' && (
        <div className="shop-section">
          <div className="shop-section-head">
            <span>Pantry staples — stock once</span>
            <span className="shop-budget">keep on hand</span>
          </div>
          <ul className="shop-list">
            {PANTRY_STAPLES.map((item, i) => {
              const key = `pantry-${i}`
              return (
                <li
                  key={key}
                  className={`shop-item ${checkedItems[key] ? 'checked' : ''}`}
                  onClick={() => toggle(key)}
                >
                  <span className="shop-check">{checkedItems[key] ? '✓' : ''}</span>
                  <span className="shop-item-text">{item}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
