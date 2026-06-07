import { exec } from 'child_process'
import { promisify } from 'util'

export const GAME_ID = 'gtav'

export interface GtaVSessionData {
  mode: 'online' | 'story' | 'unknown'
  modsDetected: boolean
  avgFps: number | null
}

const execAsync = promisify(exec)

async function getWindowTitle(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-Process gta5 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowTitle"',
      { timeout: 5000 }
    )
    return stdout.trim()
  } catch {
    return ''
  }
}

async function checkModFiles(): Promise<boolean> {
  const modIndicators = [
    'C:\\Program Files\\Rockstar Games\\Grand Theft Auto V\\scripts',
    'C:\\Program Files\\Rockstar Games\\Grand Theft Auto V\\mods',
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Grand Theft Auto V\\scripts',
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Grand Theft Auto V\\mods',
  ]
  for (const dir of modIndicators) {
    try {
      await execAsync(`if exist "${dir}" echo found`, { timeout: 2000 })
      return true
    } catch {}
  }
  return false
}

export async function getSessionData(): Promise<GtaVSessionData> {
  const [title, modsDetected] = await Promise.all([getWindowTitle(), checkModFiles()])
  const mode = /online/i.test(title) ? 'online' : /story/i.test(title) ? 'story' : 'unknown'
  return { mode, modsDetected, avgFps: null }
}

export function formatFeatureSummary(data: GtaVSessionData): string {
  const parts: string[] = []
  if (data.mode !== 'unknown') parts.push(data.mode === 'online' ? 'GTA Online' : 'Story Mode')
  if (data.modsDetected) parts.push('⚠ Mods')
  return parts.join(' · ') || 'GTA V'
}
