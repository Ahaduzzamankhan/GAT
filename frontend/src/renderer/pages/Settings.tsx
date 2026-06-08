import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings } from '../hooks'
import { api } from '../api'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border-subtle last:border-0">
      <div>
        <div className="text-text-primary text-sm font-medium">{label}</div>
        {description && <div className="text-text-muted text-xs mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-all duration-200 relative ${checked ? 'bg-white' : 'bg-bg-tertiary'}`}
      >
        <div className={`w-4 h-4 rounded-full absolute top-1 transition-all duration-200 ${checked ? 'left-6 bg-black' : 'left-1 bg-text-muted'}`} />
      </button>
    </div>
  )
}

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'upToDate'; version: string }
  | { phase: 'available'; current: string; latest: string; notes: string; url: string; assetName: string; assetSize: number }
  | { phase: 'downloading'; progress: number }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

export default function SettingsPage() {
  const { settings, setSetting } = useSettings()
  const [updateState, setUpdateState] = useState<UpdateState>({ phase: 'idle' })
  const [appVersion, setAppVersion] = useState('1.0.0')

  useEffect(() => {
    const go = (window as any).go?.main?.App
    if (go) go.GetAppVersion().then((v: string) => setAppVersion(v)).catch(() => {})
  }, [])

  // Listen for download progress events from Go
  useEffect(() => {
    const runtime = (window as any).runtime
    if (!runtime) return
    const unsub = runtime.EventsOn('update:progress', (pct: number) => {
      setUpdateState({ phase: 'downloading', progress: pct })
    })
    return () => unsub?.()
  }, [])

  const handleCheckUpdate = async () => {
    setUpdateState({ phase: 'checking' })
    try {
      const go = (window as any).go?.main?.App
      const result = await go.CheckForUpdate()
      if (result.error) {
        setUpdateState({ phase: 'error', message: result.error })
        return
      }
      if (!result.available) {
        setUpdateState({ phase: 'upToDate', version: result.currentVersion })
        return
      }
      setUpdateState({
        phase: 'available',
        current: result.currentVersion,
        latest: result.latestVersion,
        notes: result.releaseNotes,
        url: result.downloadURL,
        assetName: result.assetName,
        assetSize: result.assetSize,
      })
    } catch (e: any) {
      setUpdateState({ phase: 'error', message: e?.message ?? 'Unknown error' })
    }
  }

  const handleApplyUpdate = async () => {
    if (updateState.phase !== 'available') return
    setUpdateState({ phase: 'downloading', progress: 0 })
    try {
      const go = (window as any).go?.main?.App
      const result = await go.DownloadAndApplyUpdate(
        updateState.url,
        updateState.latest,
        updateState.assetName,
        updateState.assetSize
      )
      if (!result.success) {
        setUpdateState({ phase: 'error', message: result.error ?? 'Update failed' })
        return
      }
      setUpdateState({ phase: 'done' })
    } catch (e: any) {
      setUpdateState({ phase: 'error', message: e?.message ?? 'Unknown error' })
    }
  }

  const handleCleanCache = async () => {
    const days = parseInt(s.cacheDuration || '30')
    const count = await api.cache.clean(days)
    alert(`Cleaned ${count} old cache entries older than ${days} days`)
  }

  const s = settings ?? {
    startWithWindows: 'false',
    minimizeToTray: 'true',
    notifications: 'true',
    theme: 'dark',
    trackingEnabled: 'true',
    scanInterval: '5000',
    cacheDuration: '30'
  }

  const formatBytes = (b: number) => {
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
    if (b > 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${b} B`
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <motion.div className="max-w-2xl space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        {/* Application */}
        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">Application</h2>
          <p className="text-text-muted text-xs mb-4">General application settings</p>
          <Toggle
            checked={s.startWithWindows === 'true'}
            onChange={v => setSetting('startWithWindows', v ? 'true' : 'false')}
            label="Start with Windows"
            description="Launch GAT automatically when you log in"
          />
          <Toggle
            checked={s.minimizeToTray === 'true'}
            onChange={v => setSetting('minimizeToTray', v ? 'true' : 'false')}
            label="Minimize to tray"
            description="Keep GAT running in the background when closed"
          />
          <Toggle
            checked={s.notifications === 'true'}
            onChange={v => setSetting('notifications', v ? 'true' : 'false')}
            label="Notifications"
            description="Show notifications when tracking starts or stops"
          />
          <Toggle
            checked={s.trackingEnabled === 'true'}
            onChange={v => setSetting('trackingEnabled', v ? 'true' : 'false')}
            label="Game tracking"
            description="Automatically detect and track running games"
          />
        </section>

        {/* Tracking */}
        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">Tracking</h2>
          <p className="text-text-muted text-xs mb-4">Process scan interval</p>
          <div className="flex items-center justify-between py-4">
            <div>
              <div className="text-text-primary text-sm font-medium">Scan interval</div>
              <div className="text-text-muted text-xs mt-0.5">How often GAT checks for running games</div>
            </div>
            <select
              value={s.scanInterval}
              onChange={e => setSetting('scanInterval', e.target.value)}
              className="bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-active"
            >
              <option value="3000">3 seconds</option>
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
              <option value="30000">30 seconds</option>
            </select>
          </div>
        </section>

        {/* Cache */}
        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">Cache</h2>
          <p className="text-text-muted text-xs mb-4">Artwork and metadata cache</p>
          <div className="flex items-center justify-between py-4 border-b border-border-subtle">
            <div>
              <div className="text-text-primary text-sm font-medium">Cache duration</div>
              <div className="text-text-muted text-xs mt-0.5">Delete unused cache after this many days</div>
            </div>
            <select
              value={s.cacheDuration}
              onChange={e => setSetting('cacheDuration', e.target.value)}
              className="bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-active"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          <div className="pt-4">
            <button
              onClick={handleCleanCache}
              className="px-4 py-2 rounded-xl border border-border-default text-text-secondary hover:text-text-primary hover:border-border-active text-sm font-medium transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-broom" /> Clean old cache
            </button>
          </div>
        </section>

        {/* Updates */}
        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">Updates</h2>
          <p className="text-text-muted text-xs mb-4">
            Auto-updates from{' '}
            <a
              href="#"
              onClick={e => { e.preventDefault(); api.shell.openExternal('https://github.com/Ahaduzzamankhan/GAT') }}
              className="text-text-secondary hover:text-text-primary underline"
            >
              github.com/Ahaduzzamankhan/GAT
            </a>
          </p>

          <AnimatePresence mode="wait">
            {updateState.phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  onClick={handleCheckUpdate}
                  className="px-4 py-2 rounded-xl bg-bg-tertiary border border-border-default hover:border-border-active text-text-primary text-sm font-medium transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-rotate" /> Check for updates
                </button>
              </motion.div>
            )}

            {updateState.phase === 'checking' && (
              <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-text-secondary text-sm">
                <i className="fa-solid fa-circle-notch fa-spin" />
                Checking GitHub releases…
              </motion.div>
            )}

            {updateState.phase === 'upToDate' && (
              <motion.div key="upToDate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <i className="fa-solid fa-circle-check" />
                  You're on the latest version ({updateState.version})
                </div>
                <button onClick={() => setUpdateState({ phase: 'idle' })}
                  className="text-text-muted hover:text-text-secondary text-xs underline">
                  Check again
                </button>
              </motion.div>
            )}

            {updateState.phase === 'available' && (
              <motion.div key="available" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-text-primary text-sm font-medium">
                    Update available: <span className="text-yellow-400">v{updateState.latest}</span>
                    <span className="text-text-muted ml-2">current: v{updateState.current}</span>
                  </span>
                </div>

                {updateState.notes && (
                  <div className="bg-bg-tertiary rounded-xl p-3 text-xs text-text-secondary max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                    {updateState.notes}
                  </div>
                )}

                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <i className="fa-solid fa-file" />
                  {updateState.assetName}
                  {updateState.assetSize > 0 && <span>({formatBytes(updateState.assetSize)})</span>}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApplyUpdate}
                    className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-all flex items-center gap-2"
                  >
                    <i className="fa-solid fa-download" /> Download & Install
                  </button>
                  <button onClick={() => setUpdateState({ phase: 'idle' })}
                    className="text-text-muted hover:text-text-secondary text-sm">
                    Later
                  </button>
                </div>
              </motion.div>
            )}

            {updateState.phase === 'downloading' && (
              <motion.div key="downloading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-2">
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    {updateState.progress < 95 ? 'Downloading update…' : 'Installing…'}
                  </span>
                  <span className="text-text-primary font-mono">{updateState.progress}%</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    animate={{ width: `${updateState.progress}%` }}
                    transition={{ type: 'tween', duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}

            {updateState.phase === 'done' && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-green-400 text-sm">
                <i className="fa-solid fa-circle-check" />
                Update installed — app will relaunch shortly
              </motion.div>
            )}

            {updateState.phase === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                  <span>{updateState.message}</span>
                </div>
                <button onClick={() => setUpdateState({ phase: 'idle' })}
                  className="text-text-muted hover:text-text-secondary text-xs underline">
                  Try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* About */}
        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">About</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Version</span>
              <span className="text-text-primary font-mono">v{appVersion}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Built by</span>
              <span className="text-text-primary">Fluxenite</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Source</span>
              <a href="#"
                onClick={e => { e.preventDefault(); api.shell.openExternal('https://github.com/Ahaduzzamankhan/GAT') }}
                className="text-text-primary hover:underline flex items-center gap-1">
                GitHub <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
              </a>
            </div>
          </div>
        </section>

      </motion.div>
    </div>
  )
}
