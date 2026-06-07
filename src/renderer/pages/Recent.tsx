import React from 'react'
import { motion } from 'framer-motion'
import { useRecentSessions } from '../hooks'
import { formatPlaytime, formatDate, formatTime, formatFullDate } from '../utils/format'
import GameImage from '../components/GameImage'

export default function RecentPage() {
  const { sessions, loading } = useRecentSessions(50)

  const grouped = sessions.reduce((acc, s) => {
    const date = formatFullDate(s.startTime)
    if (!acc[date]) acc[date] = []
    acc[date].push(s)
    return acc
  }, {} as Record<string, typeof sessions>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading...
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted gap-3">
        <i className="fa-solid fa-clock-rotate-left text-5xl opacity-10" />
        <div>No sessions recorded yet</div>
        <div className="text-xs">Play any game and it will appear here</div>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, daySessions]) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="text-text-muted text-xs font-medium uppercase tracking-wider">{date}</div>
              <div className="flex-1 h-px bg-border-subtle" />
              <div className="text-text-muted text-xs">
                {formatPlaytime(daySessions.reduce((t, s) => t + s.duration, 0))}
              </div>
            </div>
            <div className="space-y-2">
              {daySessions.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 bg-bg-card border border-border-default rounded-2xl p-4 hover:border-border-active transition-all"
                >
                  <GameImage imagePath={s.icon || null} name={s.name || ''} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary font-semibold text-sm">{s.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-text-muted text-xs">
                      <i className="fa-regular fa-clock" />
                      <span>{formatTime(s.startTime)}</span>
                      {s.endTime && (
                        <>
                          <span>→</span>
                          <span>{formatTime(s.endTime)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-sm font-bold ${s.endTime ? 'text-text-primary' : 'text-white'}`}>
                      {s.endTime ? formatPlaytime(s.duration) : 'Playing'}
                    </div>
                    {!s.endTime && (
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
                        <span className="text-xs text-white">Live</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
