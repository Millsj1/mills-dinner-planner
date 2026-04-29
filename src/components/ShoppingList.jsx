import { useState } from 'react'
import './ShoppingList.css'

const PANTRY_STAPLES = [
  'Olive oil', 'Garlic (fresh + powder)', 'Kosher salt + black pepper',
  'Paprika', 'Cumin', 'Oregano', 'Red pepper flakes',
  'Soy sauce', 'Worcestershire sauce', 'Dried pasta (spaghetti + penne)',
  'Canned crushed tomatoes', 'Jarred marinara', 'Flour + corn tortillas',
  'Rice', 'Canned black beans', 'Chicken broth', 'Sesame oil'
]

const WEEK_SHOPPING = {
  1: {
    budget: '$80–100',
    items: [
      'Chicken thighs (3 lb)',
      'Ground beef (2 lb)',
      'Rotisserie chicken (Friday backup)',
      'Tri-tip roast (2–3 lb)',
      'Pizza dough (store-bought, 2 balls)',
      'Fresh mozzarella (8 oz)',
      'Yukon gold potatoes (2 lb)',
      'Roma tomatoes (4)',
      'Avocados (2)',
      'Limes (4)',
      'Romaine lettuce',
      'Parmesan (wedge)',
      'Shredded Mexican blend cheese',
      'Sour cream',
      'Fresh basil',
      'Italian sausage (for pizza)',
    ]
  },
  2: {
    budget: '$90–110',
    items: [
      'Chicken breast (2 lb)',
      'Skirt or flank steak (1.5 lb)',
      'Ground turkey or beef (1.5 lb)',
      'Rotisserie chicken',
      'Baby back ribs (2 racks)',
      'Ground beef (2 lb, for lasagna)',
      'Ricotta (15 oz)',
      'Mozzarella block (16 oz)',
      'Bell peppers (3)',
      'Snap peas (1 bag)',
      'Corn on the cob (4)',
      'Coleslaw mix (1 bag)',
      'Lasagna noodles',
      'Breadcrumbs',
      'Fresh ginger',
      'BBQ sauce',
    ]
  }
}

export default function ShoppingList({ plan, activeWeek }) {
  const [checkedItems, setCheckedItems] = useState({})
  const [activeTab, setActiveTab] = useState('week')

  function toggle(key) {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function clearChecked() {
    setCheckedItems({})
  }

  const weekShop = WEEK_SHOPPING[activeWeek]
  const checkedCount = Object.values(checkedItems).filter(Boolean).length

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
            <span className="shop-budget">{weekShop.budget}</span>
          </div>
          <div className="shop-actions">
            <span className="shop-progress">{checkedCount} of {weekShop.items.length} checked</span>
            {checkedCount > 0 && (
              <button className="clear-btn" onClick={clearChecked}>Clear all</button>
            )}
          </div>
          <ul className="shop-list">
            {weekShop.items.map((item, i) => {
              const key = `week${activeWeek}-${i}`
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

          <div className="shop-note">
            <strong>Tip:</strong> Both weeks share many pantry items — check the Pantry Staples tab to make sure you're stocked. Total for both weeks should land around $160–210.
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
