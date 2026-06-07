import { detectAuthorizedGame } from './registry'
import { getSessionData as getMinecraftData, formatFeatureSummary as fmtMinecraft } from './minecraft'
import { getSessionData as getRobloxData, formatFeatureSummary as fmtRoblox } from './roblox'
import { getSessionData as getGtaData, formatFeatureSummary as fmtGta } from './gtav'
import { getSessionData as getRdrData, formatFeatureSummary as fmtRdr } from './rdr2'
import {
  getFortniteSessionData, formatFortniteSummary,
  getValorantSessionData, formatValorantSummary,
  getLolSessionData, formatLolSummary,
  getCyberpunkSessionData, formatCyberpunkSummary,
  getEldenRingSessionData, formatEldenRingSummary,
  getCs2SessionData, formatCs2Summary,
  getApexSessionData, formatApexSummary,
  getWarframeSessionData, formatWarframeSummary,
} from './generic'

export interface GameSessionExtras {
  gameId: string
  summary: string
  raw: Record<string, unknown>
}

export async function getGameExtras(executable: string, totalPlaytimeSeconds?: number): Promise<GameSessionExtras | null> {
  const game = detectAuthorizedGame(executable)
  if (!game) return null

  try {
    switch (game.id) {
      case 'minecraft': {
        const d = await getMinecraftData()
        return { gameId: game.id, summary: fmtMinecraft(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'roblox': {
        const d = await getRobloxData()
        return { gameId: game.id, summary: fmtRoblox(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'gtav': {
        const d = await getGtaData()
        return { gameId: game.id, summary: fmtGta(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'rdr2': {
        const d = await getRdrData(totalPlaytimeSeconds)
        return { gameId: game.id, summary: fmtRdr(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'fortnite': {
        const d = await getFortniteSessionData(executable)
        return { gameId: game.id, summary: formatFortniteSummary(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'valorant': {
        const d = await getValorantSessionData(executable)
        return { gameId: game.id, summary: formatValorantSummary(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'leagueoflegends': {
        const d = await getLolSessionData(executable)
        return { gameId: game.id, summary: formatLolSummary(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'cyberpunk2077': {
        const d = await getCyberpunkSessionData(executable)
        return { gameId: game.id, summary: formatCyberpunkSummary(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'eldenring': {
        const d = await getEldenRingSessionData(executable)
        return { gameId: game.id, summary: formatEldenRingSummary(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'csgo': {
        const d = await getCs2SessionData(executable)
        return { gameId: game.id, summary: formatCs2Summary(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'apexlegends': {
        const d = await getApexSessionData(executable)
        return { gameId: game.id, summary: formatApexSummary(d), raw: d as unknown as Record<string, unknown> }
      }
      case 'warframe': {
        const d = await getWarframeSessionData(executable)
        return { gameId: game.id, summary: formatWarframeSummary(d), raw: d as unknown as Record<string, unknown> }
      }
      default:
        return null
    }
  } catch {
    return { gameId: game.id, summary: game.name, raw: {} }
  }
}
