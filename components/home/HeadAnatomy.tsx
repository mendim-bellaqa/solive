'use client'

/**
 * The auditory pathway, drawn front-on.
 *
 * The previous version was an ellipse with two comma-shaped strokes for ears
 * and a blurred circle for a brain. It carried the labels but none of the
 * anatomy, so the section's entire claim — that the beat is assembled at a
 * specific place inside the head — had nothing to point at.
 *
 * A coronal (face-on) view is the right one here: both ears sit at the sides
 * where the two sources are, the brainstem descends through the middle where
 * the two sides converge, and the cortex sits above where the finished beat
 * ascends to. Every element in the composition is where the anatomy puts it.
 *
 * Drawn as SVG rather than a third WebGL context — the homepage already runs
 * two, and a diagram wants crisp vector edges more than it wants shading.
 */

const L_COLOR = '#7db4ff'
const R_COLOR = '#b98cff'
const MIX     = '#c99a63'

/**
 * The cochlea, as the spiral it actually is — two and a half turns, winding
 * inward. Generated rather than hand-drawn: an approximated spiral in path
 * commands always ends up lopsided.
 */
function cochleaPath(cx: number, cy: number, dir: 1 | -1, turns = 2.4, rOuter = 15, rInner = 2.2) {
  const steps = 96
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a = t * turns * Math.PI * 2 * dir - Math.PI / 2
    const r = rOuter - (rOuter - rInner) * t
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r * 0.92
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d
}

interface Props {
  /** Speakers mode: the tones sum in the room, so nothing reaches the olive. */
  speakers: boolean
  /** Accent for the live pathway, supplied by the parent's mode copy. */
  tone: string
  carrier: number
  beat: number
}

export default function HeadAnatomy({ speakers, tone, carrier, beat }: Props) {
  const lStroke = speakers ? MIX : L_COLOR
  const rStroke = speakers ? MIX : R_COLOR
  const ease = { transition: 'stroke 0.45s, fill 0.45s, opacity 0.45s' }

  return (
    <svg viewBox="0 0 760 476" style={{ width: '100%', display: 'block' }} role="img"
         aria-label={speakers
           ? 'Diagram: both speakers reach both ears, so the tones sum in the air before arriving'
           : 'Diagram: each ear receives one tone; they converge at the superior olivary complex in the brainstem'}>
      <defs>
        <radialGradient id="ha-cortex">
          <stop offset="0%"   stopColor={tone} stopOpacity="0.42" />
          <stop offset="60%"  stopColor={tone} stopOpacity="0.10" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ha-air">
          <stop offset="0%"   stopColor={MIX} stopOpacity="0.40" />
          <stop offset="100%" stopColor={MIX} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ha-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.055" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.015" />
        </linearGradient>
        {/* One ear, drawn once and mirrored — the two must match exactly. */}
        <g id="ha-ear">
          {/* Sized and placed to meet the skull edge. Drawn any larger, or any
              further out, and it stops reading as an ear and starts reading as
              an over-ear headphone cup — which is the opposite of the point. */}
          <path d="M 290 192 C 275 188, 265 199, 264 214 C 263 229, 269 242, 279 248
                   C 285 251, 291 248, 291 242"
                fill="rgba(255,255,255,0.035)" stroke="var(--t3)" strokeWidth="1.6" strokeLinecap="round" />
          {/* Antihelix — the inner fold. Without it an ear reads as a comma. */}
          <path d="M 287 202 C 278 203, 273 211, 274 221 C 275 229, 279 235, 284 237"
                fill="none" stroke="var(--t4)" strokeWidth="1.2" strokeLinecap="round" />
          {/* Concha, the bowl that funnels into the canal. */}
          <ellipse cx="285" cy="217" rx="5" ry="7.5" fill="rgba(255,255,255,0.055)" />
        </g>
      </defs>

      {/* ── Sources ─────────────────────────────────────────────────────── */}
      {[{ x: 62, c: L_COLOR, hz: carrier, label: 'LEFT' },
        { x: 698, c: R_COLOR, hz: carrier + beat, label: 'RIGHT' }].map(s => (
        <g key={s.label}>
          <rect x={s.x - 25} y={194} width={50} height={58} rx={speakers ? 7 : 21}
                fill="rgba(255,255,255,0.045)" stroke={s.c} strokeOpacity="0.5" strokeWidth="1.5"
                style={{ transition: 'all 0.45s' }} />
          <circle cx={s.x} cy={223} r={speakers ? 12 : 8} fill={s.c} fillOpacity="0.26"
                  style={{ transition: 'all 0.45s' }} />
          <circle cx={s.x} cy={223} r={speakers ? 4.5 : 3.5} fill={s.c} />
          <text x={s.x} y={274} textAnchor="middle" fill="var(--t4)" fontSize="10.5"
                fontWeight="700" letterSpacing="1.3">{s.label}</text>
          <text x={s.x} y={291} textAnchor="middle" fill={s.c} fontSize="12.5" fontWeight="800">
            {s.hz} Hz
          </text>
        </g>
      ))}

      {/* ── Head ────────────────────────────────────────────────────────── */}
      <path d="M 380 82 C 436 82, 474 118, 479 176 C 482 200, 481 214, 478 228
               C 474 262, 461 296, 432 320 C 415 334, 398 342, 380 342
               C 362 342, 345 334, 328 320 C 299 296, 286 262, 282 228
               C 279 214, 278 200, 281 176 C 286 118, 324 82, 380 82 Z"
            fill="url(#ha-skin)" stroke="var(--border-mid)" strokeWidth="1.5" />

      {/* Ears, mirrored about the midline. */}
      <use href="#ha-ear" />
      <g transform="translate(760,0) scale(-1,1)"><use href="#ha-ear" /></g>

      {/* Cortex — lit only when a neural beat is actually assembled. */}
      <circle cx="380" cy="158" r="86" fill="url(#ha-cortex)"
              opacity={speakers ? 0 : 1} style={{ transition: 'opacity 0.55s' }} />
      {/* Cortex: a longitudinal fissure with gyri running off it either side,
          following the curve of the skull. Two facing arcs read as a bird. */}
      <g style={ease} stroke={speakers ? 'var(--t-decor)' : tone} fill="none" strokeLinecap="round">
        <path d="M 380 108 L 380 214" strokeWidth="1.5" strokeOpacity="0.5" />
        {[0, 1, 2, 3].map(i => {
          const y = 126 + i * 26
          const w = 46 - Math.abs(i - 1.2) * 7
          return (
            <g key={i}>
              <path d={`M 376 ${y} C ${376 - w * 0.5} ${y - 9}, ${376 - w} ${y - 4}, ${376 - w - 8} ${y + 7}`}
                    strokeWidth="1.25" strokeOpacity={0.46 - i * 0.06} />
              <path d={`M 384 ${y} C ${384 + w * 0.5} ${y - 9}, ${384 + w} ${y - 4}, ${384 + w + 8} ${y + 7}`}
                    strokeWidth="1.25" strokeOpacity={0.46 - i * 0.06} />
            </g>
          )
        })}
      </g>

      {/* ── Air path: only speakers reach the far ear ────────────────────── */}
      <g opacity={speakers ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
        <path d="M 90 198 Q 380 44 670 198" fill="none" stroke={MIX} strokeWidth="1.7"
              strokeOpacity="0.55" strokeDasharray="4 9" />
        <circle cx="380" cy="52" r="38" fill="url(#ha-air)" />
        <text x="380" y="44" textAnchor="middle" fill={MIX} fontSize="11" fontWeight="800"
              letterSpacing="0.5">SUMMED IN AIR</text>
        <text x="380" y="61" textAnchor="middle" fill="var(--t4)" fontSize="10">
          both tones reach both ears
        </text>
      </g>

      {/* ── Source → ear ────────────────────────────────────────────────── */}
      <path d="M 88 223 L 250 223" fill="none" stroke={lStroke} strokeWidth="2.4"
            className="flow-line" style={ease} />
      <path d="M 672 223 L 510 223" fill="none" stroke={rStroke} strokeWidth="2.4"
            className="flow-line flow-rev" style={ease} />

      {/* ── Cochlea ─────────────────────────────────────────────────────── */}
      <g style={ease}>
        <path d={cochleaPath(318, 225, 1)} fill="none" stroke={lStroke}
              strokeWidth="1.7" strokeOpacity="0.95" strokeLinecap="round" />
        <path d={cochleaPath(442, 225, -1)} fill="none" stroke={rStroke}
              strokeWidth="1.7" strokeOpacity="0.95" strokeLinecap="round" />
        {/* Canal: concha through to the cochlear base. */}
        <path d="M 289 223 L 305 225" stroke={lStroke} strokeWidth="1.6" strokeOpacity="0.7" />
        <path d="M 471 223 L 455 225" stroke={rStroke} strokeWidth="1.6" strokeOpacity="0.7" />
      </g>

      {/* ── Auditory nerve → brainstem ──────────────────────────────────── */}
      <path d="M 318 240 C 324 292, 346 326, 368 346" fill="none" stroke={lStroke}
            strokeWidth="2" strokeOpacity="0.85" className="flow-line" style={ease} />
      <path d="M 442 240 C 436 292, 414 326, 392 346" fill="none" stroke={rStroke}
            strokeWidth="2" strokeOpacity="0.85" className="flow-line" style={ease} />

      {/* ── Brainstem ───────────────────────────────────────────────────── */}
      <path d="M 367 300 C 368 340, 367 378, 365 410 Q 380 421, 395 410
               C 393 378, 392 340, 393 300 Z"
            fill="rgba(255,255,255,0.030)" stroke="var(--border-mid)" strokeWidth="1.1"
            strokeOpacity="0.75" />

      {/* ── Superior olivary complex ────────────────────────────────────── */}
      <g>
        {!speakers && [0, 1, 2].map(i => (
          <circle key={i} cx="380" cy="366" r="18" fill="none" stroke={tone}
                  strokeWidth="1.4" className="soc-ring" style={{ animationDelay: `${i * 0.55}s` }} />
        ))}
        <circle cx="380" cy="366" r="17"
                fill={speakers ? 'rgba(255,255,255,0.05)' : `color-mix(in srgb, ${tone} 26%, transparent)`}
                stroke={speakers ? 'var(--border-mid)' : tone} strokeWidth="2" style={ease} />
        <circle cx="380" cy="366" r="5.5" fill={speakers ? 'var(--t-decor)' : tone} style={ease} />
      </g>

      {/* ── The finished beat ascending to cortex ───────────────────────── */}
      <g opacity={speakers ? 0 : 1} style={{ transition: 'opacity 0.55s' }}>
        <path d="M 380 346 L 380 238" fill="none" stroke={tone} strokeWidth="2.4"
              className="flow-line flow-rev" />
        <path d="M 372 248 L 380 234 L 388 248" fill="none" stroke={tone}
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <text x="396" y="276" fill={tone} fontSize="10" fontWeight="700" letterSpacing="0.4"
              opacity="0.9">{beat} Hz beat</text>
      </g>

      <text x="380" y="450" textAnchor="middle" fill="var(--t3)" fontSize="11.5" fontWeight="700">
        Superior olivary complex
      </text>
      <text x="380" y="467" textAnchor="middle" fill="var(--t4)" fontSize="10">
        {speakers ? 'nothing left to compare — ears are identical' : 'compares the two ears · resolves ~10 µs'}
      </text>
    </svg>
  )
}
