import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useStats, useGames, useRecentSessions, useWeeklyActivity, useCurrentlyPlaying, useActiveSessions } from '../hooks'
import { formatPlaytime, formatDate, formatTime } from '../utils/format'
import StatCard from '../components/StatCard'
import GameImage from '../components/GameImage'
import { api } from '../api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
}
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export default function Dashboard() {
  const { stats } = useStats()
  const { games } = useGames()
  const { sessions } = useRecentSessions(5)
  const { activity } = useWeeklyActivity()
  const { sessions: activeSessions } = useActiveSessions()
  const playing = activeSessions.map(s => s.name)

  const livePlaytimeLabel = activeSessions.map(s => {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(s.startTime).getTime()) / 1000))
    return `${s.name} · ${formatPlaytime(elapsed)}`
  }).join(', ')

  const activeInfo = playing.length > 0 ? livePlaytimeLabel : ''

  const topGame = games[0] || null
  const chartData = activity.map(a => ({
    date: new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' }),
    hours: Math.round(a.totalTime / 3600 * 10) / 10,
    sessions: a.sessions
  }))

  useEffect(() => {
    games.forEach(g => {
      if (!g.icon && g.name) {
        api.metadata.fetch(g.id, g.name, g.executable)
      }
    })
  }, [games.length])

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-6 overflow-y-auto h-full">
      {playing.length > 0 && (
        <motion.div variants={item} className="rounded-2xl bg-white p-4 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-black animate-pulse-soft" />
          <div>
            <div className="text-black text-sm font-semibold">Currently Playing</div>
            <div className="text-black/70 text-xs">{activeInfo || playing.join(', ')}</div>
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        <StatCard icon="fa-solid fa-gamepad" label="Games Tracked" value={stats.totalGames.toString()} highlight />
        <StatCard icon="fa-solid fa-clock" label="Total Playtime" value={formatPlaytime(stats.totalPlaytime)} />
        <StatCard icon="fa-solid fa-calendar-day" label="Today" value={formatPlaytime(stats.todayPlaytime)} />
        <StatCard icon="fa-solid fa-layer-group" label="Sessions" value={stats.sessionCount.toString()} />
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div variants={item} className="col-span-2">
          {topGame && (
            <div className="rounded-2xl border border-border-default bg-bg-card p-5 h-full">
              <div className="text-text-muted text-xs font-medium uppercase tracking-wider mb-4">Most Played</div>
              <div className="flex gap-4 items-start">
                <GameImage imagePath={topGame.coverImage} name={topGame.name} size="xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-text-primary font-bold text-lg truncate">{topGame.name}</h2>
                    {topGame.favorite === 1 && <i className="fa-solid fa-star text-yellow-400 text-sm" />}
                  </div>
                  <div className="text-text-muted text-xs mb-3">{topGame.executable}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-bg-tertiary rounded-xl p-3">
                      <div className="text-text-muted text-xs mb-1">Total playtime</div>
                      <div className="text-text-primary font-semibold">{formatPlaytime(topGame.totalPlaytime)}</div>
                    </div>
                    <div className="bg-bg-tertiary rounded-xl p-3">
                      <div className="text-text-muted text-xs mb-1">Last played</div>
                      <div className="text-text-primary font-semibold">{formatDate(topGame.lastPlayed)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={item} className="rounded-2xl border border-border-default bg-bg-card p-5">
          <div className="text-text-muted text-xs font-medium uppercase tracking-wider mb-4">Weekly Activity</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, color: '#fff' }}
                  formatter={(v: any) => [`${v}h`, 'Hours']}
                />
                <Bar dataKey="hours" fill="#ffffff" radius={[4, 4, 0, 0]} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-text-muted text-sm">No data yet</div>
          )}
        </motion.div>
      </div>

      <motion.div variants={item} className="rounded-2xl border border-border-default bg-bg-card p-5">
        <div className="text-text-muted text-xs font-medium uppercase tracking-wider mb-4">Recent Sessions</div>
        {sessions.length === 0 ? (
          <div className="text-text-muted text-sm text-center py-8">No sessions recorded yet</div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-4 py-2.5 px-3 rounded-xl hover:bg-bg-tertiary transition-colors">
                <GameImage imagePath={s.icon || null} name={s.name || ''} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary text-sm font-medium truncate">{s.name}</div>
                  <div className="text-text-muted text-xs">{formatDate(s.startTime)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-text-secondary text-sm font-medium">{formatPlaytime(s.duration)}</div>
                  <div className="text-text-muted text-xs">{formatTime(s.startTime)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
