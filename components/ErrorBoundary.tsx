'use client'

import React from 'react'

interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Solive Error]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
          style={{ background: 'var(--bg-void)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(224,80,80,0.12)', border: '1px solid rgba(224,80,80,0.3)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e05050" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold mb-2">Something went wrong</p>
            <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              {this.state.message}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload() }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
