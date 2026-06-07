import React from 'react'
import { motion } from 'framer-motion'
import type { Page } from '../types'
import { cn } from '../utils/format'

interface SidebarProps {
  current: Page
  onChange: (page: Page) => void
  playingCount: number
}

const navItems: { id: Page; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'fa-solid fa-chart-pie', label: 'Dashboard' },
  { id: 'games', icon: 'fa-solid fa-gamepad', label: 'Games' },
  { id: 'authorized', icon: 'fa-solid fa-shield-halved', label: 'Authorized' },
  { id: 'recent', icon: 'fa-solid fa-clock-rotate-left', label: 'Recent' },
  { id: 'history', icon: 'fa-solid fa-list', label: 'History' },
  { id: 'monitor', icon: 'fa-solid fa-microchip', label: 'Monitor' },
  { id: 'settings', icon: 'fa-solid fa-gear', label: 'Settings' }
]

export default function Sidebar({ current, onChange, playingCount }: SidebarProps) {
  return (
    <aside className="w-56 bg-bg-secondary border-r border-border-subtle flex flex-col py-4 gap-1 px-2 shrink-0">
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative',
            current === item.id
              ? 'bg-white text-black'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
        >
          <i className={cn(item.icon, 'w-4 text-center')} />
          <span>{item.label}</span>
          {item.id === 'dashboard' && playingCount > 0 && (
            <span className={cn(
              'ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold',
              current === item.id ? 'bg-black text-white' : 'bg-white text-black'
            )}>
              {playingCount}
            </span>
          )}
          {item.id === 'monitor' && playingCount > 0 && (
            <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
        </button>
      ))}

      <div className="mt-auto px-3 py-2 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse-soft" />
          <span>Tracking active</span>
        </div>
      </div>
    </aside>
  )
}
