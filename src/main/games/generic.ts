import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface GenericSessionData {
  windowTitle: string | null
  mode: string | null
  tag: string | null
}

async function getWindowTitle(processName: string): Promise<string> {
  const name = processName.replace('.exe', '')
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "Get-Process ${name} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowTitle"`,
      { timeout: 5000 }
    )
    return stdout.trim()
  } catch {
    return ''
  }
}

// ---- Fortnite ----
export const GAME_ID_FORTNITE = 'fortnite'

export interface FortniteSessionData extends GenericSessionData {
  mode: 'battle-royale' | 'zero-build' | 'creative' | 'save-the-world' | 'unknown'
}

export async function getFortniteSessionData(executable: string): Promise<FortniteSessionData> {
  const title = await getWindowTitle(executable)
  const mode = /zero.?build/i.test(title) ? 'zero-build'
    : /creative/i.test(title) ? 'creative'
    : /save.?the.?world/i.test(title) ? 'save-the-world'
    : /fortnite/i.test(title) ? 'battle-royale'
    : 'unknown'
  return { windowTitle: title || null, mode, tag: null }
}

export function formatFortniteSummary(d: FortniteSessionData): string {
  const labels: Record<string, string> = { 'battle-royale': 'Battle Royale', 'zero-build': 'Zero Build', 'creative': 'Creative', 'save-the-world': 'Save the World', unknown: 'Fortnite' }
  return labels[d.mode]
}

// ---- Valorant ----
export const GAME_ID_VALORANT = 'valorant'

export interface ValorantSessionData extends GenericSessionData {
  agentHint: string | null
}

export async function getValorantSessionData(executable: string): Promise<ValorantSessionData> {
  const title = await getWindowTitle(executable)
  const agentMatch = title.match(/playing\s+([A-Za-z]+)/i)
  return { windowTitle: title || null, mode: 'match', tag: null, agentHint: agentMatch ? agentMatch[1] : null }
}

export function formatValorantSummary(d: ValorantSessionData): string {
  return d.agentHint ? `Valorant · ${d.agentHint}` : 'Valorant'
}

// ---- League of Legends ----
export const GAME_ID_LOL = 'leagueoflegends'

export interface LolSessionData extends GenericSessionData {
  inLobby: boolean
  inGame: boolean
}

export async function getLolSessionData(executable: string): Promise<LolSessionData> {
  const title = await getWindowTitle(executable)
  const inLobby = /league client/i.test(title) && !/in.?game|playing/i.test(title)
  const inGame = /in.?game|playing/i.test(title)
  return { windowTitle: title || null, mode: inGame ? 'in-game' : 'lobby', tag: null, inLobby, inGame }
}

export function formatLolSummary(d: LolSessionData): string {
  return d.inGame ? 'League of Legends · In Game' : d.inLobby ? 'League of Legends · Lobby' : 'League of Legends'
}

// ---- Cyberpunk 2077 ----
export const GAME_ID_CYBERPUNK = 'cyberpunk2077'

export interface CyberpunkSessionData extends GenericSessionData {
  dlcActive: boolean
  modsDetected: boolean
}

async function checkCyberpunkMods(): Promise<boolean> {
  try {
    await execAsync('if exist "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Cyberpunk 2077\\red4ext" echo found', { timeout: 2000 })
    return true
  } catch { return false }
}

export async function getCyberpunkSessionData(executable: string): Promise<CyberpunkSessionData> {
  const [title, modsDetected] = await Promise.all([getWindowTitle(executable), checkCyberpunkMods()])
  const dlcActive = /phantom liberty|dogtown/i.test(title)
  return { windowTitle: title || null, mode: null, tag: null, dlcActive, modsDetected }
}

export function formatCyberpunkSummary(d: CyberpunkSessionData): string {
  const parts = ['Cyberpunk 2077']
  if (d.dlcActive) parts.push('Phantom Liberty')
  if (d.modsDetected) parts.push('⚠ Mods')
  return parts.join(' · ')
}

// ---- Elden Ring ----
export const GAME_ID_ELDENRING = 'eldenring'

export interface EldenRingSessionData extends GenericSessionData {
  dlcActive: boolean
}

export async function getEldenRingSessionData(executable: string): Promise<EldenRingSessionData> {
  const title = await getWindowTitle(executable)
  const dlcActive = /shadow.*erdtree|dlc/i.test(title)
  return { windowTitle: title || null, mode: null, tag: null, dlcActive }
}

export function formatEldenRingSummary(d: EldenRingSessionData): string {
  return d.dlcActive ? 'Elden Ring · Shadow of the Erdtree' : 'Elden Ring'
}

// ---- CS2 / CS:GO ----
export const GAME_ID_CSGO = 'csgo'

export interface Cs2SessionData extends GenericSessionData {
  map: string | null
  mode: 'competitive' | 'casual' | 'workshop' | 'unknown'
}

export async function getCs2SessionData(executable: string): Promise<Cs2SessionData> {
  const title = await getWindowTitle(executable)
  const mapMatch = title.match(/(?:on|map)\s+([a-z_]+)/i)
  const mode = /competitive/i.test(title) ? 'competitive'
    : /casual/i.test(title) ? 'casual'
    : /workshop/i.test(title) ? 'workshop'
    : 'unknown'
  return { windowTitle: title || null, mode, tag: null, map: mapMatch ? mapMatch[1] : null }
}

export function formatCs2Summary(d: Cs2SessionData): string {
  const parts = ['CS2']
  if (d.mode !== 'unknown') parts.push(d.mode.charAt(0).toUpperCase() + d.mode.slice(1))
  if (d.map) parts.push(d.map)
  return parts.join(' · ')
}

// ---- Apex Legends ----
export const GAME_ID_APEX = 'apexlegends'

export interface ApexSessionData extends GenericSessionData {
  legendHint: string | null
}

export async function getApexSessionData(executable: string): Promise<ApexSessionData> {
  const title = await getWindowTitle(executable)
  const legendMatch = title.match(/playing\s+([A-Za-z]+)/i)
  return { windowTitle: title || null, mode: null, tag: null, legendHint: legendMatch ? legendMatch[1] : null }
}

export function formatApexSummary(d: ApexSessionData): string {
  return d.legendHint ? `Apex Legends · ${d.legendHint}` : 'Apex Legends'
}

// ---- Warframe ----
export const GAME_ID_WARFRAME = 'warframe'

export interface WarframeSessionData extends GenericSessionData {
  isLauncher: boolean
}

export async function getWarframeSessionData(executable: string): Promise<WarframeSessionData> {
  const title = await getWindowTitle(executable)
  const isLauncher = /launcher/i.test(executable) || /update/i.test(title)
  return { windowTitle: title || null, mode: isLauncher ? 'launcher' : 'game', tag: null, isLauncher }
}

export function formatWarframeSummary(d: WarframeSessionData): string {
  return d.isLauncher ? 'Warframe · Updating' : 'Warframe'
}
