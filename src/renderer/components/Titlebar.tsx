import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function Titlebar() {
  const [iconSrc, setIconSrc] = useState<string | null>(null)

  useEffect(() => {
    api.app.getIcon().then(src => setIconSrc(src))
  }, [])

  return (
    <div
      className="h-10 bg-bg-primary border-b border-border-subtle flex items-center justify-between px-4 select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {iconSrc ? (
            <img src={iconSrc} alt="GAT" className="w-5 h-5 object-contain" />
          ) : (
            <i className="fa-solid fa-gamepad text-text-primary text-xs" />
          )}
        </div>
        <span className="text-text-primary font-semibold text-sm tracking-wide">GAT</span>
        <span className="text-text-muted text-xs">Game Activity Tracker</span>
      </div>
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={() => api.window.minimize()}
          className="w-8 h-8 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors flex items-center justify-center"
        >
          <i className="fa-solid fa-minus text-xs" />
        </button>
        <button
          onClick={() => api.window.maximize()}
          className="w-8 h-8 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors flex items-center justify-center"
        >
          <i className="fa-regular fa-square text-xs" />
        </button>
        <button
          onClick={() => api.window.close()}
          className="w-8 h-8 rounded-lg hover:bg-red-900/20 text-text-muted hover:text-red-400 transition-colors flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark text-xs" />
        </button>
      </div>
    </div>
  )
}
