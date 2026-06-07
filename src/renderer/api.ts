import type { Game, Session, Stats, WeeklyActivity, Settings, Filter, ActiveSession } from './types'

const API_BASE_URL = 'http://localhost:29029'

async function apiCall(endpoint: string, body?: any): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {})
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

const windowApi = {
  minimize: () => new Promise(() => {}),
  maximize: () => new Promise(() => {}),
  close: () => new Promise(() => {})
}

export const api = {
  window: windowApi,
  app: {
    getIcon: (): Promise<string | null> => apiCall('/app/getIcon').then((r: any) => r?.icon || null)
  },
  system: {
    getStats: (): Promise<{ cpu: number; ram: number; ramUsedMB: number; ramTotalMB: number; gpu: number; gpuName: string }> =>
      apiCall('/system/getStats').then((r: any) => r ?? { cpu: 0, ram: 0, ramUsedMB: 0, ramTotalMB: 0, gpu: 0, gpuName: 'GPU' })
  },
  db: {
    getAllGames: (): Promise<Game[]> => apiCall('/db/getAllGames').then((r: any) => r ?? []),
    getStats: (): Promise<Stats> => apiCall('/db/getStats').then((r: any) => r ?? { totalGames: 0, totalPlaytime: 0, todayPlaytime: 0, sessionCount: 0 }),
    getFavorites: (): Promise<Game[]> => apiCall('/db/getFavorites').then((r: any) => r ?? []),
    getRecentSessions: (limit?: number): Promise<Session[]> => apiCall('/db/getRecentSessions', { limit }).then((r: any) => r ?? []),
    getSessionsFiltered: (filter: Filter): Promise<Session[]> => apiCall('/db/getSessionsFiltered', { filter }).then((r: any) => r ?? []),
    getWeeklyActivity: (): Promise<WeeklyActivity[]> => apiCall('/db/getWeeklyActivity').then((r: any) => r ?? []),
    toggleFavorite: (id: number): Promise<boolean> => apiCall('/db/toggleFavorite', { id }).then(() => true),
    updateGame: (id: number, data: Partial<Game>): Promise<boolean> => apiCall('/db/updateGame', { id, data }).then(() => true),
    addGameManually: (executable: string, name: string): Promise<number> => apiCall('/db/addGameManually', { executable, name }).then((r: any) => r?.id ?? 0),
    deleteGame: (id: number): Promise<boolean> => apiCall('/db/deleteGame', { id }).then(() => true),
    getCurrentlyPlaying: (): Promise<string[]> => apiCall('/db/getCurrentlyPlaying').then((r: any) => r ?? []),
    getActiveSessions: (): Promise<ActiveSession[]> => apiCall('/db/getActiveSessions').then((r: any) => r ?? [])
  },
  settings: {
    getAll: (): Promise<Settings> => apiCall('/settings/getAll').then((r: any) => r ?? {
      startWithWindows: 'false',
      minimizeToTray: 'true',
      notifications: 'true',
      theme: 'dark',
      trackingEnabled: 'true',
      scanInterval: '5000',
      cacheDuration: '30'
    }),
    set: (key: string, value: string): Promise<boolean> => apiCall('/settings/set', { key, value }).then(() => true)
  },
  metadata: {
    fetch: (gameId: number, gameName: string, executable: string) =>
      apiCall('/metadata/fetch', { gameId, gameName, executable }),
    getImage: (imagePath: string): Promise<string | null> =>
      apiCall('/metadata/getImage', { imagePath }).then((r: any) => r?.base64 || null)
  },
  cache: {
    clean: (days: number) => apiCall('/cache/clean', { days })
  },
  export: {
    json: (filter: Filter): Promise<string> => apiCall('/export/json', { filter }).then((r: any) => r?.data ?? '[]'),
    csv: (filter: Filter): Promise<string> => apiCall('/export/csv', { filter }).then((r: any) => r?.data ?? '')
  },
  on: (channel: string, cb: (...args: any[]) => void): (() => void) => {
    return () => {}
  },
  off: (channel: string) => {}
}
