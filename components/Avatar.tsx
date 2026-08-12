'use client'

import { avatarById, type Avatar as AvatarDef } from '@/lib/avatars'

interface Props {
  /** Chosen avatar id. Falls back to the initial when absent or unknown. */
  id?: string | null
  /** Shown when there is no avatar to draw. */
  fallback?: string
  size?: number
  /** Skip the ring and tint — for dense lists. */
  bare?: boolean
}

/**
 * A profile mark. Renders the chosen figure, or the first letter of a name
 * when nobody has picked one — an account that has never opened settings
 * should still look deliberate rather than broken.
 */
export default function Avatar({ id, fallback = '?', size = 44, bare = false }: Props) {
  const def: AvatarDef | null = avatarById(id)
  const stroke = Math.max(1.4, size * 0.055)

  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: bare ? 'transparent' : def ? `${def.color}18` : 'var(--glass-2)',
        border: bare ? 'none' : `1px solid ${def ? `${def.color}55` : 'var(--border-mid)'}`,
        color: def ? def.color : 'var(--t1)',
        fontWeight: 800,
        fontSize: size * 0.4,
        lineHeight: 1,
        overflow: 'hidden',
      }}
    >
      {def ? (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none"
             stroke={def.color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          {def.paths.map((d, i) => <path key={i} d={d} />)}
          {def.dots?.map(([cx, cy, r], i) => (
            <circle key={`d${i}`} cx={cx} cy={cy} r={r} fill={def.color} stroke="none" />
          ))}
        </svg>
      ) : (
        fallback.charAt(0).toUpperCase()
      )}
    </span>
  )
}
