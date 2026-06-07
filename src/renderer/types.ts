export interface Game {
  id: number
  executable: string
  name: string
  icon: string | null
  coverImage: string | null
  totalPlaytime: number
  favorite: number
  lastPlayed: string | null
  firstSeen: string
  hidden: number
}

export interface Session {
  id: number
  gameId: number
  startTime: string
  endTime: string | null
  duration: number
  name?: string
  executable?: string
  icon?: string | null
  coverImage?: string | null
}

export interface Stats {
  totalGames: number
  totalPlaytime: number
  todayPlaytime: number
  sessionCount: number
}

export interface WeeklyActivity {
  date: string
  totalTime: number
  sessions: number
}

export interface ActiveSession {
  sessionId: number
  gameId: number
  startTime: string
  executable: string
  name: string
  icon: string | null
  coverImage: string | null
}

export interface Settings {
  startWithWindows: string
  minimizeToTray: string
  notifications: string
  theme: string
  trackingEnabled: string
  scanInterval: string
  cacheDuration: string
}

export type Page = 'dashboard' | 'games' | 'authorized' | 'recent' | 'history' | 'monitor' | 'settings'
export type Filter = 'all' | 'today' | 'week' | 'month'
