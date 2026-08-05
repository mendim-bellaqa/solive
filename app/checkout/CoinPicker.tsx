'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** A payable coin as /api/crypto/currencies describes it. */
export interface Coin {
  code: string
  name: string
  network: string
  logo: string | null
  popular: boolean
  priority: number
}

/** Coins whose logo never loads still deserve a mark, so colour one from the
 *  ticker — same coin, same hue, every visit. */
function hue(code: string) {
  let h = 0
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % 360
  return h
}

function CoinMark({ coin }: { coin: Coin }) {
  const [broken, setBroken] = useState(false)
  const showLogo = coin.logo && !broken

  return (
    <span className="coin-mark" aria-hidden>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coin.logo!} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : (
        <span
          className="coin-mark-fallback"
          style={{
            background: `linear-gradient(150deg, hsl(${hue(coin.code)} 62% 42%), hsl(${(hue(coin.code) + 40) % 360} 58% 26%))`,
          }}
        >
          {coin.code.slice(0, 3).toUpperCase()}
        </span>
      )}
    </span>
  )
}

function Chevron() {
  return (
    <svg className="coin-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CoinPicker({ coins, creating, onPick }: {
  coins: Coin[]
  creating: string | null
  onPick: (code: string) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!q) return coins
    // Ignore spaces so "usd coin" also finds "USDCoin"-style names.
    const flat = q.replace(/\s+/g, '')
    return coins.filter(c =>
      `${c.code} ${c.name} ${c.network}`.toLowerCase().includes(q) ||
      `${c.code}${c.name}${c.network}`.toLowerCase().replace(/\s+/g, '').includes(flat),
    )
  }, [coins, q])

  // Fade only the edges that have more list behind them, so a row is never
  // half-faded when there is nothing more to scroll to.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState<'none' | 'top' | 'bottom' | 'both'>('none')

  const updateFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const more = { top: el.scrollTop > 6, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 6 }
    setFade(more.top && more.bottom ? 'both' : more.top ? 'top' : more.bottom ? 'bottom' : 'none')
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0 // a new search starts at its best match
    updateFade()
  }, [q, matches.length, updateFade])

  // Sections only help when the list is whole — a search result is its own group.
  const groups = q
    ? [{ label: null, items: matches }]
    : [
        { label: 'POPULAR', items: matches.filter(c => c.popular) },
        { label: 'ALL COINS', items: matches.filter(c => !c.popular) },
      ].filter(g => g.items.length > 0)

  return (
    <div>
      <div className="coin-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search the crypto"
          aria-label="Search cryptocurrencies"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="coin-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <p className="coin-count">
        {q
          ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`
          : `${coins.length} coins accepted`}
      </p>

      {matches.length === 0 ? (
        <div className="coin-empty">
          <p>No coin matches “{query.trim()}”.</p>
          <button type="button" onClick={() => setQuery('')} className="btn-ghost text-sm">Clear search</button>
        </div>
      ) : (
        <div className="coin-scroll" ref={scrollRef} onScroll={updateFade} data-fade={fade}>
          {groups.map(group => (
            <div key={group.label ?? 'results'}>
              {group.label && <p className="coin-group">{group.label}</p>}
              {group.items.map(coin => {
                const busy = creating === coin.code
                // "BTC · Bitcoin" and "TON · TON" say the same thing twice — a
                // coin on its own chain only needs its ticker.
                const chain = [coin.name.toLowerCase(), coin.code.toLowerCase()].includes(coin.network.toLowerCase())
                  ? ''
                  : coin.network
                return (
                  <button
                    key={coin.code}
                    type="button"
                    onClick={() => onPick(coin.code)}
                    disabled={creating !== null}
                    className="coin-row"
                    data-busy={busy || undefined}
                    data-dimmed={creating !== null && !busy ? true : undefined}
                  >
                    <CoinMark coin={coin} />
                    <span className="coin-text">
                      <span className="coin-name">{coin.name}</span>
                      <span className="coin-sub">
                        {coin.code.toUpperCase()}
                        {chain && <> · {chain}</>}
                      </span>
                    </span>
                    {busy ? (
                      <span className="coin-busy">
                        <span className="coin-spinner" aria-hidden />
                        Preparing…
                      </span>
                    ) : (
                      <Chevron />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
