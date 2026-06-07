import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { api } from '../api'
import type { Game, Session, Stats, WeeklyActivity, Settings, Filter, ActiveSession } from '../types'

export function useGames() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await api.db.getAllGames()
    setGames(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const unsub1 = api.on('game-started', refresh)
    const unsub2 = api.on('game-stopped', refresh)
    return () => { unsub1?.(); unsub2?.() }
  }, [refresh])

  return { games, loading, refresh }
}

export function useStats() {
  const [baseStats, setBaseStats] = useState<Stats>({ totalGames: 0, totalPlaytime: 0, todayPlaytime: 0, sessionCount: 0 })
  const [loading, setLoading] = useState(true)
  const { sessions: activeSessions, tick } = useActiveSessions()

  const refresh = useCallback(async () => {
    const data = await api.db.getStats()
    setBaseStats(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const unsub1 = api.on('game-stopped', refresh)
    return () => { unsub1?.() }
  }, [refresh])

  const stats = useMemo(() => {
    const now = Date.now()
    const extraPlaytime = activeSessions.reduce((sum, session) => {
      const elapsed = Math.floor((now - new Date(session.startTime).getTime()) / 1000)
      return sum + Math.max(elapsed, 0)
    }, 0)
    const extraToday = activeSessions.reduce((sum, session) => {
      const start = new Date(session.startTime)
      if (start.toDateString() !== new Date().toDateString()) return sum
      const elapsed = Math.floor((now - start.getTime()) / 1000)
      return sum + Math.max(elapsed, 0)
    }, 0)
    return {
      ...baseStats,
      totalPlaytime: baseStats.totalPlaytime + extraPlaytime,
      todayPlaytime: baseStats.todayPlaytime + extraToday
    }
  }, [baseStats, activeSessions, tick])

  return { stats, loading, refresh }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Game[]>([])

  const refresh = useCallback(async () => {
    setFavorites(await api.db.getFavorites())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { favorites, refresh }
}

export function useRecentSessions(limit = 20) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await api.db.getRecentSessions(limit)
    setSessions(data)
    setLoading(false)
  }, [limit])

  useEffect(() => {
    refresh()
    const unsub = api.on('game-stopped', refresh)
    return () => { unsub?.() }
  }, [refresh])

  return { sessions, loading, refresh }
}

export function useFilteredSessions(filter: Filter) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.db.getSessionsFiltered(filter).then(data => {
      setSessions(data)
      setLoading(false)
    })
  }, [filter])

  return { sessions, loading }
}

export function useWeeklyActivity() {
  const [activity, setActivity] = useState<WeeklyActivity[]>([])

  useEffect(() => {
    api.db.getWeeklyActivity().then(setActivity)
  }, [])

  return { activity }
}

export function useCurrentlyPlaying() {
  const [playing, setPlaying] = useState<string[]>([])

  useEffect(() => {
    api.db.getCurrentlyPlaying().then(setPlaying)
    const unsub1 = api.on('game-started', () => api.db.getCurrentlyPlaying().then(setPlaying))
    const unsub2 = api.on('game-stopped', () => api.db.getCurrentlyPlaying().then(setPlaying))
    return () => { unsub1?.(); unsub2?.() }
  }, [])

  return playing
}

export function useActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    api.db.getActiveSessions().then(setSessions)
    const unsub = api.on('active-sessions', ({ sessions: active }) => setSessions(active || []))
    return () => { unsub?.() }
  }, [])

  useEffect(() => {
    if (!sessions.length) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [sessions.length])

  return { sessions, tick }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)

  const refresh = useCallback(async () => {
    setSettings(await api.settings.getAll())
  }, [])

  const setSetting = useCallback(async (key: string, value: string) => {
    await api.settings.set(key, value)
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { settings, setSetting, refresh }
}

export function useGameImage(imagePath: string | null) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!imagePath) return
    api.metadata.getImage(imagePath).then(setSrc)
  }, [imagePath])

  return src
}
