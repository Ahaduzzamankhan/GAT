import React from 'react'

interface StatCardProps {
  icon: string
  label: string
  value: string
  sub?: string
  highlight?: boolean
}

export default function StatCard({ icon, label, value, sub, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-300 hover:border-border-active/80 hover:-translate-y-0.5 ${
        highlight
          ? 'bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-bg-card/90 border-indigo-500/30 text-text-primary shadow-[0_4px_20px_rgba(99,102,241,0.08)]'
          : 'bg-bg-card/65 backdrop-blur-sm border-border-default/60 text-text-primary'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            highlight
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              : 'bg-bg-tertiary/80 border-border-default/40 text-text-secondary'
          }`}
        >
          <i className={`${icon} text-sm`} />
        </div>
      </div>
      <div className="text-2xl font-bold mb-1 tracking-tight font-sans text-text-primary">{value}</div>
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[11px] mt-1 text-text-muted font-medium">{sub}</div>}
    </div>
  )
}
