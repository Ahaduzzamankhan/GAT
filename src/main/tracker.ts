import { exec } from 'child_process'
import { promisify } from 'util'
import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import { queries } from './database'
import { AUTHORIZED_BY_EXE, detectAuthorizedGame } from './games/registry'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

// ─── Config ───────────────────────────────────────────────────────────────────

const GPU_SAMPLE_MS   = 4000
const GPU_SUSTAIN_SEC = 12
const GPU_THRESHOLD   = 15
const TRACK_INTERVAL  = 6000

// Exes that are used by multiple programs — need path/title verification
const AMBIGUOUS_EXES = new Set(['javaw.exe', 'java.exe', 'wine.exe', 'wine64.exe'])

// ─── Blocklists ───────────────────────────────────────────────────────────────

const SYSTEM_BLOCKLIST = new Set([
  'explorer.exe','svchost.exe','lsass.exe','csrss.exe','winlogon.exe','services.exe',
  'smss.exe','system','registry','dwm.exe','taskhostw.exe','conhost.exe','fontdrvhost.exe',
  'spoolsv.exe','searchhost.exe','searchindexer.exe','ctfmon.exe','sihost.exe',
  'runtimebroker.exe','applicationframehost.exe','wuauclt.exe','taskmgr.exe',
  'regedit.exe','dllhost.exe','audiodg.exe','wmiprvse.exe','nissrv.exe',
  'wsl.exe','wslhost.exe','wslservice.exe','vmmemwsl','vmmem',
  'msmpeng.exe','securityhealthsystray.exe','securityhealthservice.exe',
  'smartscreen.exe','startmenuexperiencehost.exe','shellexperiencehost.exe',
  'lockapp.exe','textinputhost.exe','inputmethod.exe','tabletinputservice.exe',
  'usoclient.exe','musnotification.exe','musnotificationux.exe',
  'srtasks.exe','compattelrunner.exe','wsqmcons.exe','wermgr.exe','werhost.exe',
  'msiexec.exe','setup.exe','install.exe','uninstall.exe','uninst.exe',
  'perfmon.exe','mmc.exe','msconfig.exe','msinfo32.exe','eventvwr.exe',
  'systemsettings.exe','settingssynchost.exe',
  'dxdiag.exe','winver.exe','osk.exe','magnify.exe','narrator.exe',
  'cmd.exe','powershell.exe','powershell_ise.exe','wt.exe','windowsterminal.exe',
  'chrome.exe','firefox.exe','msedge.exe','opera.exe','brave.exe','vivaldi.exe',
  'node.exe','electron.exe','code.exe','devenv.exe','rider64.exe','idea64.exe',
  'git.exe','github desktop.exe','githubdesktop.exe',
  'python.exe','python3.exe','pythonw.exe','javaws.exe',
  'discord.exe','slack.exe','teams.exe','zoom.exe','skype.exe','telegram.exe',
  'spotify.exe','vlc.exe','wmplayer.exe','mpv.exe',
  'gimp-2.10.exe','inkscape.exe','krita.exe','figma.exe',
  'photoshop.exe','illustrator.exe','premiere.exe','aftereffects.exe',
  'davinciresolve.exe','obs64.exe','obs32.exe','obs.exe',
  'steam.exe','steamwebhelper.exe','steamservice.exe','steamtriage.exe',
  'epicgameslauncher.exe','easyanticheat_launcher.exe','eacservice.exe',
  'easyanticheat.exe','easyanticheateos.exe',
  'origin.exe','eadesktop.exe','eabackgroundservice.exe',
  'upc.exe','ubisoftconnect.exe',
  'gog galaxy.exe','goggalaxy.exe','galaxyclient.exe',
  'battlenet.exe','battle.net.exe',
  'xboxapp.exe','xboxpcapp.exe','gamingservices.exe','gamingservicesnet.exe',
  'gamebar.exe','gamebarft.exe','gamebarftserver.exe',
  'playnite.exe','playnite.fullscreenapp.exe','heroic.exe','itchio.exe','itch.exe',
  'vortex.exe','nexusmods.exe',
  'fraps.exe','msiafterburner.exe','rivatuner.exe','rtss.exe',
  'nvcplui.exe','nvcontainer.exe','nvdisplay.container.exe',
  'battleye.exe','becllient.exe','vgc.exe','vanguard.exe','faceitclient.exe',
  'notepad.exe','notepad++.exe','wordpad.exe','calc.exe','mspaint.exe',
  'onedrive.exe','dropbox.exe','googledrivesync.exe',
  'winrar.exe','7z.exe','7zfm.exe','winzip64.exe',
  'acrobat.exe','acrord32.exe',
  'lghub.exe','ghub.exe','synapse3.exe','razersynapse.exe','icue.exe',
  'mbam.exe','malwarebytes.exe','avast.exe','avgui.exe',
  'procexp.exe','procexp64.exe','procmon.exe','autoruns.exe',
  'gat.exe','everything.exe','yourphone.exe','phonelinkprocess.exe',
  'microsoftedgeupdate.exe','googleupdate.exe','blender.exe',
])

const SYSTEM_PATTERNS = [
  /^gamebar/i, /^gameinput/i, /gaming(service|overlay)/i, /^xbox(app|pcapp|gaming)/i,
  /anticheat/i, /battleye/i, /crash(handler|reporter|pad|dump)/i,
  /^steam(web|service|crash|triage|update|repair)/i,
  /^ea(crash|update|background|launch)/i,
  /^nvidia\s?(share|geforce)/i, /^nvcontainer/i, /^nvdisplay/i,
  /^amd(dvr|ow|rsserv)/i,
  /update(r|service|daemon)?$/i, /^updater/i,
  /(install|setup|uninstall|uninst)(er|ation)?$/i,
  /^(vc_redist|directx|dxsetup|dotnet)/i,
  /tray(app)?$/i, /systray$/i, /background(task|service|process)?$/i,
]

const SYSTEM_PATHS = [
  '\\windows\\system32\\', '\\windows\\syswow64\\',
  '\\windows\\systemapps\\', '\\windowsapps\\microsoft.',
]

const GAME_DIRS = [
  'steamapps\\common\\', 'steamapps/common/',
  'epic games\\', 'epicgames\\',
  'gog games\\', 'goggames\\',
  'ubisoft game launcher\\games\\', 'ubisoftconnect\\games\\',
  'ea games\\', 'origin games\\',
  'battle.net\\', 'battlenet\\',
  'itch.io\\', 'itch\\games\\',
  'xbox games\\', 'xboxgames\\',
  'program files\\games\\', 'program files (x86)\\games\\',
]

const GFX_DLLS = ['d3d11.dll', 'd3d12.dll', 'vulkan-1.dll', 'opengl32.dll', 'dxgi.dll', 'lwjgl.dll', 'lwjgl_opengl.dll']

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessInfo {
  pid: number
  name: string    // lowercase .exe
  exeName: string // original casing
  path: string
  windowTitle: string
}

interface ActiveSession {
  sessionId: number
  gameId: number
  startTime: string
  executable: string
}
interface ActiveSessionInfo extends ActiveSession {
  name: string
  icon: string | null
  coverImage: string | null
}
// ─── State ────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
// key = `${lowerExeName}:${pid}` to support multi-instance (e.g. multiple javaw)
const activeSessions = new Map<string, ActiveSession>()
let trackingInterval: NodeJS.Timeout | null = null

const gpuHighSince = new Map<number, number>()
const gpuAvg       = new Map<number, number>()
let gpuTimer: NodeJS.Timeout | null = null

// pid → has GFX dll (cached for lifetime of process)
const dllChecked = new Map<number, boolean>()

let gpuScriptPath = ''
let dllScriptPath = ''

// ─── PS1 Scripts ─────────────────────────────────────────────────────────────

function writePsScripts() {
  const tmp = app.getPath('temp')

  gpuScriptPath = path.join(tmp, 'gat-gpu.ps1')
  fs.writeFileSync(gpuScriptPath, `
$counters = Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction SilentlyContinue
if (-not $counters) { exit }
$result = @{}
foreach ($s in $counters.CounterSamples) {
  if ($s.CookedValue -lt 0.5) { continue }
  if ($s.Path -notmatch 'pid_(\\d+)') { continue }
  $pid = [int]$Matches[1]
  if ($s.Path -notmatch 'engtype_3D') { continue }
  if ($result.ContainsKey($pid)) { $result[$pid] += $s.CookedValue }
  else { $result[$pid] = $s.CookedValue }
}
foreach ($kv in $result.GetEnumerator()) {
  Write-Output "$($kv.Key)=$([math]::Round($kv.Value,1))"
}
`.trim(), 'utf8')

  dllScriptPath = path.join(tmp, 'gat-dll.ps1')
  fs.writeFileSync(dllScriptPath, `
param([string]$Pids, [string]$Dlls)
$pidList = $Pids -split ',' | ForEach-Object { [int]$_ }
$dllList = $Dlls -split ','
$out = @()
foreach ($pid in $pidList) {
  try {
    $proc = Get-Process -Id $pid -ErrorAction Stop
    $mods = $proc.Modules | Select-Object -ExpandProperty ModuleName -ErrorAction SilentlyContinue
    foreach ($dll in $dllList) {
      if ($mods -contains $dll) { $out += $pid; break }
    }
  } catch {}
}
Write-Output ($out -join ',')
`.trim(), 'utf8')
}

// ─── GPU Sampler ──────────────────────────────────────────────────────────────

function startGpuSampler() {
  if (gpuTimer) return
  gpuTimer = setInterval(sampleGpu, GPU_SAMPLE_MS)
}

function stopGpuSampler() {
  if (gpuTimer) { clearInterval(gpuTimer); gpuTimer = null }
}

async function sampleGpu() {
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -File "${gpuScriptPath}"`,
      { timeout: 5000 }
    )
    const now = Date.now()
    const seenPids = new Set<number>()

    for (const line of stdout.trim().split(/\r?\n/)) {
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const pid = parseInt(line.slice(0, eq))
      const val = parseFloat(line.slice(eq + 1))
      if (isNaN(pid) || isNaN(val)) continue
      seenPids.add(pid)
      gpuAvg.set(pid, val)
      if (val >= GPU_THRESHOLD) {
        if (!gpuHighSince.has(pid)) gpuHighSince.set(pid, now)
      } else {
        gpuHighSince.delete(pid)
      }
    }

    for (const [pid] of gpuAvg) {
      if (!seenPids.has(pid)) {
        gpuAvg.delete(pid)
        gpuHighSince.delete(pid)
      }
    }
  } catch {}
}

function gpuSustained(pid: number): boolean {
  const since = gpuHighSince.get(pid)
  if (!since) return false
  return (Date.now() - since) >= GPU_SUSTAIN_SEC * 1000
}

// ─── Process List ─────────────────────────────────────────────────────────────
// Returns ALL instances — no dedup by name (handles multiple javaw.exe etc.)

async function getProcesses(): Promise<ProcessInfo[]> {
  try {
    // wmic gives us PID + path in one shot, no need for separate calls
    const { stdout } = await execAsync(
      'wmic process get Name,ProcessId,ExecutablePath /FORMAT:CSV',
      { timeout: 8000 }
    )
    const results: ProcessInfo[] = []
    // CSV: Node,ExecutablePath,Name,ProcessId
    for (const line of stdout.split(/\r?\n/).slice(2)) {
      const cols = line.trim().split(',')
      if (cols.length < 4) continue
      // wmic CSV columns: Node, ExecutablePath, Name, ProcessId
      const exePath = (cols[1] || '').trim()
      const exeName = (cols[2] || '').trim()
      const pid = parseInt(cols[3] || '0')
      if (!exeName || !exeName.toLowerCase().endsWith('.exe') || !pid) continue
      results.push({ pid, name: exeName.toLowerCase(), exeName, path: exePath, windowTitle: '' })
    }
    return results
  } catch {
    // Fallback: tasklist (no paths, no per-pid dedup issue since we don't dedup)
    try {
      const { stdout } = await execAsync('tasklist /FO CSV /NH', { timeout: 5000 })
      return stdout.split(/\r?\n/).flatMap(line => {
        const cols = line.trim().replace(/^"|"$/g, '').split('","')
        const exeName = cols[0]?.trim()
        const pid = parseInt(cols[1] || '0')
        if (!exeName?.toLowerCase().endsWith('.exe') || !pid) return []
        return [{ pid, name: exeName.toLowerCase(), exeName, path: '', windowTitle: '' }]
      })
    } catch { return [] }
  }
}

// ─── Window Titles ────────────────────────────────────────────────────────────
// Batch fetch window titles for a list of PIDs in one PowerShell call

async function getWindowTitles(pids: number[]): Promise<Map<number, string>> {
  if (!pids.length) return new Map()
  const pidSet = pids.join(',')
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `$pids = @(${pidSet});` +
      `Get-Process | Where-Object { $pids -contains $_.Id -and $_.MainWindowTitle } | ` +
      `ForEach-Object { Write-Output \"$($_.Id)|$($_.MainWindowTitle)\" }"`,
      { timeout: 4000 }
    )
    const map = new Map<number, string>()
    for (const line of stdout.trim().split(/\r?\n/)) {
      const idx = line.indexOf('|')
      if (idx < 0) continue
      const pid = parseInt(line.slice(0, idx))
      const title = line.slice(idx + 1).trim()
      if (!isNaN(pid) && title) map.set(pid, title)
    }
    return map
  } catch { return new Map() }
}

// ─── DLL Check ────────────────────────────────────────────────────────────────

async function checkDlls(pids: number[]): Promise<Set<number>> {
  if (!pids.length) return new Set()
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -File "${dllScriptPath}" -Pids "${pids.join(',')}" -Dlls "${GFX_DLLS.join(',')}"`,
      { timeout: 8000 }
    )
    return new Set(stdout.trim().split(',').map(Number).filter(n => n > 0))
  } catch { return new Set() }
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function isBlocked(name: string, exePath: string): boolean {
  // Ambiguous exes are never blocked — they need individual verification
  if (AMBIGUOUS_EXES.has(name)) return false
  if (SYSTEM_BLOCKLIST.has(name)) return true
  if (SYSTEM_PATTERNS.some(p => p.test(name))) return true
  if (!exePath) return false
  const lp = exePath.toLowerCase()
  return SYSTEM_PATHS.some(sp => lp.includes(sp))
}

function isInGameDir(exePath: string): boolean {
  if (!exePath) return false
  const lp = exePath.toLowerCase()
  return GAME_DIRS.some(d => lp.includes(d))
}

function sessionKey(name: string, pid: number): string {
  return `${name}:${pid}`
}

function formatName(exeName: string, windowTitle?: string): string {
  if (windowTitle && windowTitle.length > 2) return windowTitle
  return exeName
    .replace(/\.exe$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function beginSession(info: ProcessInfo, name: string) {
  const key = sessionKey(info.name, info.pid)
  if (activeSessions.has(key)) return
  const startTime = new Date().toISOString()
  const gameId = queries.upsertGame(info.exeName, name)
  const sessionId = queries.startSession(gameId, startTime)
  activeSessions.set(key, { sessionId, gameId, startTime, executable: info.exeName })
  mainWindow?.webContents.send('game-started', { executable: info.exeName, name, gameId })
}

function endSession(key: string, session: ActiveSession) {
  const endTime = new Date().toISOString()
  const duration = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
  queries.endSession(session.sessionId, endTime, duration)
  activeSessions.delete(key)
  mainWindow?.webContents.send('game-stopped', { executable: session.executable, gameId: session.gameId, duration })
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function setMainWindow(win: BrowserWindow) { mainWindow = win }
export function getCurrentlyPlaying(): string[] {
  return [...new Set([...activeSessions.values()].map(s => s.executable))]
}

export function getActiveSessions(): ActiveSessionInfo[] {
  return [...activeSessions.values()].map(session => {
    const game = queries.getGameById(session.gameId) as any
    return {
      ...session,
      name: game?.name || session.executable,
      icon: game?.icon || null,
      coverImage: game?.coverImage || null
    }
  })
}

export function startTracking(intervalMs = TRACK_INTERVAL) {
  if (trackingInterval) return
  writePsScripts()
  startGpuSampler()
  trackingInterval = setInterval(tick, intervalMs)
}

// ─── Main Tick ────────────────────────────────────────────────────────────────

async function tick() {
  try {
    const processes = await getProcesses()
    const runningKeys = new Set(processes.map(p => sessionKey(p.name, p.pid)))

    // 1. End sessions for dead processes
    for (const [key, session] of activeSessions) {
      if (!runningKeys.has(key)) endSession(key, session)
    }

    // 2. Manually tracked games
    const manualExes = new Set<string>(
      (queries.getAllGames() as any[])
        .filter((g: any) => g.manuallyAdded === 1)
        .map((g: any) => (g.executable as string).toLowerCase())
    )

    // 3. Filter candidates: skip blocked, skip already tracked
    const candidates = processes.filter(p =>
      !activeSessions.has(sessionKey(p.name, p.pid)) && !isBlocked(p.name, p.path)
    )
    if (!candidates.length) {
      broadcastActive()
      return
    }

    // 4. Batch-fetch window titles for all candidates at once
    const titlesMap = await getWindowTitles(candidates.map(p => p.pid))
    for (const p of candidates) {
      p.windowTitle = titlesMap.get(p.pid) || ''
    }

    // 5. Fast-track: manually added / authorized known game / game dir
    const needGfxCheck: ProcessInfo[] = []
    for (const p of candidates) {
      if (manualExes.has(p.name)) {
        beginSession(p, formatName(p.exeName, p.windowTitle))
        continue
      }

      // For ambiguous exes (javaw), use detectAuthorizedGame with path+title
      if (AMBIGUOUS_EXES.has(p.name)) {
        const combined = `${p.path} ${p.windowTitle}`
        const game = detectAuthorizedGame(p.exeName, combined)
        if (game) {
          beginSession(p, game.name)
        } else {
          // Unknown javaw — still check GPU/DLL (e.g. modded launcher)
          needGfxCheck.push(p)
        }
        continue
      }

      // Non-ambiguous known game
      if (AUTHORIZED_BY_EXE.has(p.name)) {
        beginSession(p, AUTHORIZED_BY_EXE.get(p.name)!.name)
        continue
      }

      // Known game dir
      if (isInGameDir(p.path)) {
        beginSession(p, formatName(p.exeName, p.windowTitle))
        continue
      }

      needGfxCheck.push(p)
    }

    if (!needGfxCheck.length) {
      broadcastActive()
      return
    }

    // 6. D3D gate — only for newly seen PIDs
    const unchecked = needGfxCheck.filter(p => !dllChecked.has(p.pid))
    if (unchecked.length) {
      const hasDll = await checkDlls(unchecked.map(p => p.pid))
      for (const p of unchecked) dllChecked.set(p.pid, hasDll.has(p.pid))
    }

    // 7. GPU sustain gate — processes that have a GFX dll
    for (const p of needGfxCheck) {
      if (dllChecked.get(p.pid) !== true) continue
      if (!gpuSustained(p.pid)) continue
      beginSession(p, formatName(p.exeName, p.windowTitle))
    }

    broadcastActive()

    // 8. Purge DLL cache for dead PIDs
    const runningPids = new Set(processes.map(p => p.pid))
    for (const [pid] of dllChecked) {
      if (!runningPids.has(pid)) dllChecked.delete(pid)
    }
  } catch (err) {
    console.error('[tracker] tick error:', err)
  }
}

function broadcastActive() {
  if (activeSessions.size > 0)
    mainWindow?.webContents.send('active-sessions', { sessions: [...activeSessions.values()] })
}

export function stopTracking() {
  if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null }
  stopGpuSampler()
  const now = new Date().toISOString()
  for (const [, session] of activeSessions) {
    const duration = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
    queries.endSession(session.sessionId, now, duration)
  }
  activeSessions.clear()
  gpuAvg.clear()
  gpuHighSince.clear()
  dllChecked.clear()
}
