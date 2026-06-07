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
    <div className={`rounded-2xl p-5 border transition-all duration-200 hover:border-border-active ${highlight ? 'bg-white text-black border-white' : 'bg-bg-card border-border-default'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${highlight ? 'bg-black/10' : 'bg-bg-tertiary'}`}>
          <i className={`${icon} text-sm ${highlight ? 'text-black' : 'text-text-secondary'}`} />
        </div>
      </div>
      <div className={`text-2xl font-bold mb-1 ${highlight ? 'text-black' : 'text-text-primary'}`}>{value}</div>
      <div className={`text-xs font-medium ${highlight ? 'text-black/70' : 'text-text-muted'}`}>{label}</div>
      {sub && <div className={`text-xs mt-1 ${highlight ? 'text-black/50' : 'text-text-muted'}`}>{sub}</div>}
    </div>
  )
}
