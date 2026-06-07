import type { Game, Session, Stats, WeeklyActivity, Settings, Filter, ActiveSession } from './types'

const API_BASE_URL = 'http://localhost:29029'

async function apiCall(endpoint: string, body?: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  
  if (!response.ok) throw new Error(`API error: ${response.statusText}`)
  return response.json()
}

const windowApi = {
  minimize: () => new Promise(() => {}),
  maximize: () => new Promise(() => {}),
  close: () => new Promise(() => {})
}

export const api = {
  window: windowApi,
  app: {
    getIcon: (): Promise<string | null> => apiCall('/app/getIcon').then((r: any) => r.icon || null)
  },
  system: {
    getStats: (): Promise<{ cpu: number; ram: number; ramUsedMB: number; ramTotalMB: number; gpu: number; gpuName: string }> =>
      apiCall('/system/getStats')
  },
  db: {
    getAllGames: (): Promise<Game[]> => apiCall('/db/getAllGames'),
    getStats: (): Promise<Stats> => apiCall('/db/getStats'),
    getFavorites: (): Promise<Game[]> => apiCall('/db/getFavorites'),
    getRecentSessions: (limit?: number): Promise<Session[]> => apiCall('/db/getRecentSessions', { limit }),
    getSessionsFiltered: (filter: Filter): Promise<Session[]> => apiCall('/db/getSessionsFiltered', { filter }),
    getWeeklyActivity: (): Promise<WeeklyActivity[]> => apiCall('/db/getWeeklyActivity'),
    toggleFavorite: (id: number): Promise<boolean> => apiCall('/db/toggleFavorite', { id }).then(() => true),
    updateGame: (id: number, data: Partial<Game>): Promise<boolean> => apiCall('/db/updateGame', { id, data }).then(() => true),
    addGameManually: (executable: string, name: string): Promise<number> => apiCall('/db/addGameManually', { executable, name }).then((r: any) => r.id),
    deleteGame: (id: number): Promise<boolean> => apiCall('/db/deleteGame', { id }).then(() => true),
    getCurrentlyPlaying: (): Promise<string[]> => apiCall('/db/getCurrentlyPlaying'),
    getActiveSessions: (): Promise<ActiveSession[]> => apiCall('/db/getActiveSessions')
  },
  settings: {
    getAll: (): Promise<Settings> => apiCall('/settings/getAll'),
    set: (key: string, value: string): Promise<boolean> => apiCall('/settings/set', { key, value }).then(() => true)
  },
  metadata: {
    fetch: (gameId: number, gameName: string, executable: string) =>
      apiCall('/metadata/fetch', { gameId, gameName, executable }),
    getImage: (imagePath: string): Promise<string | null> =>
      apiCall('/metadata/getImage', { imagePath }).then((r: any) => r.base64 || null)
  },
  cache: {
    clean: (days: number) => apiCall('/cache/clean', { days })
  },
  export: {
    json: (filter: Filter): Promise<string> => apiCall('/export/json', { filter }).then((r: any) => r.data),
    csv: (filter: Filter): Promise<string> => apiCall('/export/csv', { filter }).then((r: any) => r.data)
  },
  on: (channel: string, cb: (...args: any[]) => void) => {},
  off: (channel: string) => {}
}
