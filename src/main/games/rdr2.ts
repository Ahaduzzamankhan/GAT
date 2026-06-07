import { exec } from 'child_process'
import { promisify } from 'util'

export const GAME_ID = 'rdr2'

export interface Rdr2SessionData {
  mode: 'online' | 'story' | 'unknown'
  estimatedChapter: number | null
  avgFps: number | null
}

const execAsync = promisify(exec)

async function getWindowTitle(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-Process rdr2 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowTitle"',
      { timeout: 5000 }
    )
    return stdout.trim()
  } catch {
    return ''
  }
}

// Rough chapter milestone estimation based on cumulative playtime (minutes)
const CHAPTER_MILESTONES = [0, 120, 360, 660, 960, 1320, 1800, 2400]

function estimateChapter(totalPlaytimeSeconds: number): number | null {
  const mins = totalPlaytimeSeconds / 60
  for (let i = CHAPTER_MILESTONES.length - 1; i >= 0; i--) {
    if (mins >= CHAPTER_MILESTONES[i]) return i + 1
  }
  return 1
}

export async function getSessionData(totalPlaytimeSeconds?: number): Promise<Rdr2SessionData> {
  const title = await getWindowTitle()
  const mode = /online/i.test(title) ? 'online' : /story/i.test(title) ? 'story' : 'unknown'
  return {
    mode,
    estimatedChapter: totalPlaytimeSeconds ? estimateChapter(totalPlaytimeSeconds) : null,
    avgFps: null,
  }
}

export function formatFeatureSummary(data: Rdr2SessionData): string {
  const parts: string[] = []
  if (data.mode !== 'unknown') parts.push(data.mode === 'online' ? 'Red Dead Online' : 'Story Mode')
  if (data.estimatedChapter) parts.push(`~Chapter ${data.estimatedChapter}`)
  return parts.join(' · ') || 'RDR2'
}
