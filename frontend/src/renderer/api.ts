import type { Game, Session, Stats, WeeklyActivity, Settings, Filter, ActiveSession } from './types'

// Wails injects Go bindings at window.go.main.App.<MethodName>
const go = (window as any).go?.main?.App

async function call<T>(method: string, ...args: any[]): Promise<T> {
  try {
    if (!go) {
      // Dev hot-reload fallback against HTTP backend
      const path = '/api/' + method
      const res = await fetch(`http://localhost:29029${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.length === 1 ? args[0] : args)
      })
      if (!res.ok) return undefined as any
      return res.json()
    }
    return await go[method](...args)
  } catch {
    return undefined as any
  }
}

export const api = {
  window: {
    minimize: () => { go?.WindowMinimize() },
    maximize: () => { go?.WindowMaximize() },
    close:    () => { go?.WindowClose() },
    quit:     () => { go?.WindowQuit() },
  },

  app: {
    getIcon: (): Promise<string | null> => Promise.resolve(null),
  },

  system: {
    getStats: (): Promise<{ cpu: number; ram: number; ramUsedMB: number; ramTotalMB: number; gpu: number; gpuName: string } | null> =>
      call<any>('GetSystemStats').then((r: any) => r ?? null),
  },

  db: {
    getAllGames: (): Promise<Game[]> =>
      call<Game[]>('GetAllGames').then((r: any) => r ?? []),
    getStats: (): Promise<Stats> =>
      call<Stats>('GetStats').then((r: any) => r ?? { totalGames: 0, totalPlaytime: 0, todayPlaytime: 0, sessionCount: 0 }),
    getFavorites: (): Promise<Game[]> =>
      call<Game[]>('GetFavorites').then((r: any) => r ?? []),
    getRecentSessions: (limit = 20): Promise<Session[]> =>
      call<Session[]>('GetRecentSessions', limit).then((r: any) => r ?? []),
    getSessionsFiltered: (filter: Filter): Promise<Session[]> =>
      call<Session[]>('GetSessionsFiltered', filter).then((r: any) => r ?? []),
    getWeeklyActivity: (): Promise<WeeklyActivity[]> =>
      call<WeeklyActivity[]>('GetWeeklyActivity').then((r: any) => r ?? []),
    toggleFavorite: (id: number): Promise<boolean> =>
      call<boolean>('ToggleFavorite', id).then((r: any) => r ?? false),
    updateGame: (id: number, data: Partial<Game>): Promise<boolean> =>
      call<boolean>('UpdateGame', id, data).then((r: any) => r ?? false),
    addGameManually: (executable: string, name: string): Promise<number> =>
      call<number>('AddGameManually', executable, name).then((r: any) => r ?? 0),
    deleteGame: (id: number): Promise<boolean> =>
      call<boolean>('DeleteGame', id).then((r: any) => r ?? false),
    getCurrentlyPlaying: (): Promise<string[]> =>
      call<string[]>('GetCurrentlyPlaying').then((r: any) => r ?? []),
    getActiveSessions: (): Promise<ActiveSession[]> =>
      call<ActiveSession[]>('GetActiveSessions').then((r: any) => r ?? []),
  },

  settings: {
    getAll: (): Promise<Settings> =>
      call<Settings>('GetAllSettings').then((r: any) => r ?? {
        startWithWindows: 'false', minimizeToTray: 'true', notifications: 'true',
        theme: 'dark', trackingEnabled: 'true', scanInterval: '5000', cacheDuration: '30',
      }),
    set: (key: string, value: string): Promise<boolean> =>
      call<boolean>('SetSetting', key, value).then((r: any) => r ?? false),
  },

  metadata: {
    fetch: (gameId: number, gameName: string, executable: string): Promise<boolean> =>
      call<boolean>('FetchMetadata', gameId, gameName, executable),
    getImage: (imagePath: string): Promise<string | null> =>
      call<string>('GetImage', imagePath).then((r: any) => r || null),
  },

  cache: {
    clean: (days: number): Promise<number> =>
      call<number>('CleanCache', days).then((r: any) => r ?? 0),
  },

  export: {
    json: (filter: Filter): Promise<string> =>
      call<string>('ExportJSON', filter).then((r: any) => r ?? '[]'),
    csv: (filter: Filter): Promise<string> =>
      call<string>('ExportCSV', filter).then((r: any) => r ?? ''),
  },

  shell: {
    openExternal: (url: string) => { go?.OpenExternal(url) },
  },

  on:  (_channel: string, _cb: (...args: any[]) => void): (() => void) => () => {},
  off: (_channel: string) => {},
}
