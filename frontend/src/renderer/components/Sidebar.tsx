import React from 'react'
import { motion } from 'framer-motion'
import type { Page } from '../types'
import { cn } from '../utils/format'

interface SidebarProps {
  current: Page
  onChange: (page: Page) => void
  playingCount: number
  updateBadge?: string | null
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

export default function Sidebar({ current, onChange, playingCount, updateBadge }: SidebarProps) {
  return (
    <aside className="w-56 bg-bg-secondary border-r border-border-subtle flex flex-col py-4 gap-1 px-2 shrink-0">
      <div className="space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative border-l-2',
              current === item.id
                ? 'bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent border-indigo-500 text-white font-semibold shadow-[inset_1px_0_0_rgba(99,102,241,0.2)]'
                : 'text-text-secondary border-l-2 border-transparent hover:text-text-primary hover:bg-bg-tertiary/40'
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
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {item.id === 'settings' && updateBadge && (
              <span className="ml-auto w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title={`Update v${updateBadge} available`} />
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto mx-1 p-3 rounded-xl bg-bg-tertiary/20 border border-border-default/40 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Activity Tracker</span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Active</span>
          </div>
        </div>
        <div className="text-[10px] text-text-muted leading-tight font-medium">
          Automatically scanning for running game processes.
        </div>
      </div>
    </aside>
  )
}
