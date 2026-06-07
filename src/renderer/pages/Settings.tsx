import React from 'react'
import { motion } from 'framer-motion'
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

export default function SettingsPage() {
  const { settings, setSetting } = useSettings()

  const handleCleanCache = async () => {
    const days = parseInt(s.cacheDuration || '30')
    const count = await api.cache.clean(days)
    alert(`Cleaned ${count} old cache entries`)
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

  return (
    <div className="p-6 overflow-y-auto h-full">
      <motion.div
        className="max-w-2xl space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">Application</h2>
          <p className="text-text-muted text-xs mb-4">General application settings</p>
          <Toggle
            checked={s.startWithWindows === 'true'}
            onChange={v => setSetting('startWithWindows', String(v))}
            label="Start with Windows"
            description="Launch GAT automatically when Windows starts"
          />
          <Toggle
            checked={s.minimizeToTray === 'true'}
            onChange={v => setSetting('minimizeToTray', String(v))}
            label="Minimize to system tray"
            description="Keep GAT running in the background when closed"
          />
          <Toggle
            checked={s.notifications === 'true'}
            onChange={v => setSetting('notifications', String(v))}
            label="Desktop notifications"
            description="Show notifications when a game starts or stops"
          />
        </section>

        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">Tracking</h2>
          <p className="text-text-muted text-xs mb-4">Game detection settings</p>
          <Toggle
            checked={s.trackingEnabled === 'true'}
            onChange={v => setSetting('trackingEnabled', String(v))}
            label="Enable game tracking"
            description="Automatically detect and track running games"
          />
          <div className="py-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-text-primary text-sm font-medium">Scan interval</div>
                <div className="text-text-muted text-xs mt-0.5">How often to check for running games</div>
              </div>
              <select
                value={s.scanInterval}
                onChange={e => setSetting('scanInterval', e.target.value)}
                className="bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-active"
              >
                <option value="2000">2 seconds</option>
                <option value="5000">5 seconds</option>
                <option value="10000">10 seconds</option>
                <option value="30000">30 seconds</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">Cache & Storage</h2>
          <p className="text-text-muted text-xs mb-4">Manage locally cached images and metadata</p>
          <div className="py-4 border-b border-border-subtle flex items-center justify-between">
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

        <section className="bg-bg-card border border-border-default rounded-2xl p-5">
          <h2 className="text-text-primary font-semibold mb-1">About</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Version</span><span className="text-text-primary font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Built by</span><span className="text-text-primary">Fluxenite</span>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  )
}
