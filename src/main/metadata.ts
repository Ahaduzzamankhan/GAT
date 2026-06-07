import fetch from 'node-fetch'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { queries } from './database'

const cacheDir = () => path.join(app.getPath('userData'), 'cache', 'images')

function ensureCacheDir() {
  const dir = cacheDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function downloadImage(url: string, filename: string): Promise<string | null> {
  try {
    ensureCacheDir()
    const localPath = path.join(cacheDir(), filename)
    if (fs.existsSync(localPath)) return localPath
    const response = await (fetch as any)(url, { timeout: 10000 })
    if (!response.ok) return null
    const buffer = await response.buffer()
    fs.writeFileSync(localPath, buffer)
    return localPath
  } catch { return null }
}

async function fetchSteamAppId(gameName: string): Promise<number | null> {
  try {
    const cacheKey = `steam_appid_${gameName.toLowerCase().replace(/\s+/g, '_')}`
    const cached = queries.getCacheEntry(cacheKey) as any
    if (cached?.metadata) {
      try { return JSON.parse(cached.metadata).appId || null } catch { return null }
    }
    const response = await (fetch as any)('https://api.steampowered.com/ISteamApps/GetAppList/v2/', { timeout: 15000 })
    if (!response.ok) return null
    const data: any = await response.json()
    const apps: any[] = data?.applist?.apps || []
    const normalized = gameName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const match = apps.find((a: any) => {
      const n = (a.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      return n === normalized || n.includes(normalized) || normalized.includes(n)
    })
    if (match) {
      queries.setCacheEntry(cacheKey, '', '', JSON.stringify({ appId: match.appid }))
      return match.appid
    }
    return null
  } catch { return null }
}

export async function fetchGameMetadata(gameId: number, gameName: string, executable: string): Promise<void> {
  try {
    const cacheKey = `metadata_${executable.toLowerCase().replace('.exe', '')}`
    if (queries.getCacheEntry(cacheKey)) return

    const appId = await fetchSteamAppId(gameName)
    if (!appId) {
      queries.setCacheEntry(cacheKey, '', '', JSON.stringify({ noData: true }))
      return
    }

    const [iconPath, coverPath] = await Promise.all([
      downloadImage(`https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`, `icon_${appId}.jpg`),
      downloadImage(`https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`, `cover_${appId}.jpg`)
    ])

    if (iconPath) queries.updateGame(gameId, { icon: iconPath })
    if (coverPath) queries.updateGame(gameId, { coverImage: coverPath })

    queries.setCacheEntry(cacheKey, '', iconPath || '', JSON.stringify({ appId }))
  } catch { }
}

export async function cleanOldCache(days: number): Promise<number> {
  return queries.cleanCache(days)
}

export function getImageAsBase64(imagePath: string): string | null {
  try {
    if (!imagePath || !fs.existsSync(imagePath)) return null
    const buffer = fs.readFileSync(imagePath)
    const ext = path.extname(imagePath).slice(1).replace('jpg', 'jpeg')
    return `data:image/${ext};base64,${buffer.toString('base64')}`
  } catch { return null }
}
