import { exec } from 'child_process'
import { promisify } from 'util'
import type { AuthorizedGame } from './registry'

const execAsync = promisify(exec)

export const GAME_ID = 'minecraft'

export interface MinecraftSessionData {
  version: string | null
  modpack: string | null
  isForge: boolean
  isFabric: boolean
  isNeoForge: boolean
  isVanilla: boolean
  jvmArgs: string | null
  serverAddress: string | null
}

async function getJavawArgs(pid?: string): Promise<string> {
  try {
    const cmd = pid
      ? `wmic process where "ProcessId=${pid}" get commandline /format:csv`
      : 'wmic process where "name=\'javaw.exe\'" get commandline /format:csv'
    const { stdout } = await execAsync(cmd, { timeout: 5000 })
    return stdout
  } catch {
    return ''
  }
}

function parseMinecraftVersion(cmdLine: string): string | null {
  const match = cmdLine.match(/--version\s+([^\s]+)/) || cmdLine.match(/minecraft(?:forge)?-([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i)
  return match ? match[1] : null
}

function detectLoader(cmdLine: string): { isForge: boolean; isFabric: boolean; isNeoForge: boolean; isVanilla: boolean } {
  const isForge = /forge/i.test(cmdLine)
  const isFabric = /fabric/i.test(cmdLine)
  const isNeoForge = /neoforge/i.test(cmdLine)
  return { isForge, isFabric, isNeoForge, isVanilla: !isForge && !isFabric && !isNeoForge }
}

function detectModpack(cmdLine: string): string | null {
  const patterns = [
    /--tweakClass\s+\S+modrinth\S*/i,
    /"modpack"\s*:\s*"([^"]+)"/i,
    /--gameDir\s+"?([^"]+(?:modpack|pack|instance)[^"]*)"?/i,
  ]
  for (const p of patterns) {
    const m = cmdLine.match(p)
    if (m) return m[1] || 'Unknown Modpack'
  }
  return null
}

export async function getSessionData(): Promise<MinecraftSessionData> {
  const cmdLine = await getJavawArgs()
  const isMinecraft = /minecraft/i.test(cmdLine) || /net\.minecraft/i.test(cmdLine)

  if (!isMinecraft) {
    return { version: null, modpack: null, isForge: false, isFabric: false, isNeoForge: false, isVanilla: true, jvmArgs: null, serverAddress: null }
  }

  const loaders = detectLoader(cmdLine)
  const serverMatch = cmdLine.match(/--server\s+([^\s]+)/)

  return {
    version: parseMinecraftVersion(cmdLine),
    modpack: detectModpack(cmdLine),
    jvmArgs: cmdLine.length > 2000 ? cmdLine.slice(0, 2000) + '…' : cmdLine,
    serverAddress: serverMatch ? serverMatch[1] : null,
    ...loaders,
  }
}

export function formatFeatureSummary(data: MinecraftSessionData): string {
  const parts: string[] = []
  if (data.version) parts.push(`v${data.version}`)
  if (data.modpack) parts.push(data.modpack)
  else if (data.isNeoForge) parts.push('NeoForge')
  else if (data.isForge) parts.push('Forge')
  else if (data.isFabric) parts.push('Fabric')
  else if (data.isVanilla) parts.push('Vanilla')
  if (data.serverAddress) parts.push(`@ ${data.serverAddress}`)
  return parts.join(' · ')
}
