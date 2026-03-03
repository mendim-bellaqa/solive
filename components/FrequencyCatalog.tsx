'use client'

import { useState } from 'react'
import { FREQUENCY_CATEGORIES, FrequencyPreset } from '@/lib/frequencies'

interface FrequencyCatalogProps {
  onSelect: (preset: FrequencyPreset) => void
  activeFrequency: number
  mobile?: boolean
}

export default function FrequencyCatalog({ onSelect, activeFrequency, mobile }: FrequencyCatalogProps) {
  const [activeCategory, setActiveCategory] = useState('solfeggio')

  const category = FREQUENCY_CATEGORIES.find((c) => c.id === activeCategory)!

  return (
    <div style={{
      width: mobile ? '100%' : 240,
      flexShrink: mobile ? undefined : 0,
      display: 'flex',
      flexDirection: 'column',
      background: mobile ? 'transparent' : 'rgba(255,255,255,0.02)',
      borderRight: mobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
      height: mobile ? '100%' : '100%',
      overflow: 'hidden',
    }}>
      {/* Category tabs */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 8 }}>
          FREQUENCY CATALOG
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {FREQUENCY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '3px 8px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                border: `1px solid ${activeCategory === cat.id ? cat.color : 'rgba(255,255,255,0.1)'}`,
                background: activeCategory === cat.id ? `${cat.color}20` : 'transparent',
                color: activeCategory === cat.id ? cat.color : 'var(--text-secondary)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Presets list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {category.presets.map((preset) => {
          const isActive = activeFrequency === preset.frequency
          return (
            <button
              key={preset.name}
              onClick={() => onSelect(preset)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                marginBottom: 4,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: isActive
                  ? `${category.color}15`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? category.color + '50' : 'rgba(255,255,255,0.05)'}`,
              }}
              onMouseOver={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseOut={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? category.color : 'var(--text-primary)' }}>
                  {preset.name}
                </span>
                {preset.binauralBeat && (
                  <span style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 10,
                    background: 'rgba(139,92,246,0.2)',
                    color: '#a78bfa',
                  }}>
                    Binaural
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {preset.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
