import { exec } from 'child_process'
import { promisify } from 'util'

export const GAME_ID = 'roblox'

export interface RobloxSessionData {
  isStudio: boolean
  isPlayer: boolean
  placeId: string | null
  gameId: string | null
}

const execAsync = promisify(exec)

async function getWindowTitle(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowTitle -ne \'\' } | Select-Object -ExpandProperty MainWindowTitle"',
      { timeout: 5000 }
    )
    return stdout
  } catch {
    return ''
  }
}

export async function getSessionData(): Promise<RobloxSessionData> {
  const titles = await getWindowTitle()
  const isStudio = /roblox studio/i.test(titles)
  const isPlayer = /roblox/i.test(titles) && !isStudio

  // Roblox encodes placeId in the window title as "Roblox  — <GameName>"
  // The actual placeId comes from the log file if available
  const placeMatch = titles.match(/placeId=(\d+)/i)
  const gameMatch = titles.match(/gameId=([a-f0-9-]+)/i)

  return {
    isStudio,
    isPlayer,
    placeId: placeMatch ? placeMatch[1] : null,
    gameId: gameMatch ? gameMatch[1] : null,
  }
}

export function formatFeatureSummary(data: RobloxSessionData): string {
  if (data.isStudio) return 'Roblox Studio'
  if (data.placeId) return `Place ${data.placeId}`
  return 'Roblox Player'
}
