import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFilteredSessions } from '../hooks'
import { formatPlaytime, formatDate, formatTime, downloadFile } from '../utils/format'
import GameImage from '../components/GameImage'
import { api } from '../api'
import type { Filter } from '../types'

const filters: { id: Filter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' }
]

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const { sessions, loading } = useFilteredSessions(filter)

  const filtered = sessions.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = async (type: 'json' | 'csv') => {
    const data = type === 'json' ? await api.export.json(filter) : await api.export.csv(filter)
    const mime = type === 'json' ? 'application/json' : 'text/csv'
    downloadFile(data, `gat-history-${filter}.${type}`, mime)
  }

  const totalDuration = filtered.reduce((t, s) => t + s.duration, 0)

  return (
    <div className="p-6 overflow-y-auto h-full space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-bg-secondary border border-border-default rounded-xl p-1 gap-1">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.id ? 'bg-white text-black' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by game..."
            className="w-full bg-bg-secondary border border-border-default rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-2 rounded-xl border border-border-default bg-bg-secondary text-text-secondary hover:text-text-primary hover:border-border-active text-xs font-medium transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-file-code" /> JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-2 rounded-xl border border-border-default bg-bg-secondary text-text-secondary hover:text-text-primary hover:border-border-active text-xs font-medium transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-file-csv" /> CSV
          </button>
        </div>
      </div>

      {!loading && (
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>{filtered.length} sessions</span>
          <span>•</span>
          <span>{formatPlaytime(totalDuration)} total</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted">
          <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <i className="fa-solid fa-list text-4xl mb-4 block opacity-10" />
          <div>No sessions found</div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium">Game</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium">Date</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium">Start</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium">End</th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-border-subtle last:border-0 hover:bg-bg-tertiary transition-colors ${i % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-card'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <GameImage imagePath={s.icon || null} name={s.name || ''} size="sm" />
                      <span className="text-text-primary font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(s.startTime)}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatTime(s.startTime)}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                    {s.endTime ? formatTime(s.endTime) : <span className="text-white text-xs">Live</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary font-semibold">
                    {formatPlaytime(s.duration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
