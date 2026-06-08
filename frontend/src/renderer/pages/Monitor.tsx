import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api'
import { useCurrentlyPlaying } from '../hooks'

interface StatPoint {
  t: string
  cpu: number
  ram: number
  gpu: number
}

interface SystemStats {
  cpu: number
  ram: number
  ramUsedMB: number
  ramTotalMB: number
  gpu: number
  gpuName: string
}

const MAX_POINTS = 60

function GaugeRing({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f1f2e" strokeWidth={7} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dasharray 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: `drop-shadow(0 0 4px ${color}aa)`
        }}
      />
    </svg>
  )
}

function StatGauge({ label, value, unit, color, sub }: { label: string; value: number; unit: string; color: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative">
        <GaugeRing value={value} color={color} size={88} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-text-primary font-bold text-base leading-none font-mono"
            style={{ textShadow: `0 0 8px ${color}33` }}
          >
            {value}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-text-primary text-xs font-bold uppercase tracking-wider">{label}</div>
        {sub && <div className="text-text-muted text-[10px] font-mono mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

const chartTooltipStyle = { background: '#111', border: '1px solid #222', borderRadius: 8, color: '#fff', fontSize: 11 }

function MiniChart({ data, dataKey, color, label }: { data: StatPoint[]; dataKey: keyof StatPoint; color: string; label: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</span>
        <span className="text-text-primary text-sm font-bold" style={{ color }}>
          {data.length > 0 ? `${data[data.length - 1][dataKey]}%` : '—'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
          <XAxis dataKey="t" tick={false} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v: any) => [`${v}%`, label]}
            labelFormatter={() => ''}
          />
          <Area
            type="monotone" dataKey={dataKey as string}
            stroke={color} strokeWidth={1.5}
            fill={`url(#grad-${dataKey})`}
            dot={false} isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function MonitorPage() {
  const [history, setHistory] = useState<StatPoint[]>([])
  const [current, setCurrent] = useState<SystemStats | null>(null)
  const [active, setActive] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const playing = useCurrentlyPlaying()

  const tick = useCallback(async () => {
    const stats = await api.system.getStats()
    if (!stats) return
    const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setCurrent(stats)
    setHistory(prev => {
      const next = [...prev, { t, cpu: stats.cpu, ram: stats.ram, gpu: stats.gpu }]
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next
    })
  }, [])

  useEffect(() => {
    if (!active) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    // Small initial delay so the persistent sampler has had time to collect a real reading
    const init = setTimeout(() => {
      tick()
      intervalRef.current = setInterval(tick, 2500)
    }, 600)
    return () => {
      clearTimeout(init)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active, tick])

  const avg = (key: keyof StatPoint) =>
    history.length === 0 ? 0 : Math.round(history.reduce((s, p) => s + (p[key] as number), 0) / history.length)

  const peak = (key: keyof StatPoint) =>
    history.length === 0 ? 0 : Math.max(...history.map(p => p[key] as number))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="p-6 overflow-y-auto h-full space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary font-bold text-lg">System Monitor</h1>
          <p className="text-text-muted text-xs mt-0.5">
            {playing.length > 0
              ? `Monitoring: ${playing.join(', ')}`
              : 'No game running — showing system usage'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${active ? 'text-green-400' : 'text-text-muted'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400 animate-pulse' : 'bg-text-muted'}`} />
            {active ? 'Live' : 'Paused'}
          </div>
          <button
            onClick={() => setActive(v => !v)}
            className="px-3 py-1.5 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:border-border-active text-xs font-medium transition-colors"
          >
            {active ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Gauges */}
      <div className="rounded-2xl border border-border-default/60 bg-bg-card/75 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <div className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-5">Current Usage</div>
        <div className="flex items-center justify-around">
          <StatGauge label="CPU" value={current?.cpu ?? 0} unit="%" color="#60a5fa" />
          <StatGauge label="RAM" value={current?.ram ?? 0} unit="%" color="#a78bfa"
            sub={current ? `${current.ramUsedMB} / ${current.ramTotalMB} MB` : ''} />
          <StatGauge label={current?.gpuName?.split(' ').slice(0, 2).join(' ') || 'GPU'} value={current?.gpu ?? 0} unit="%" color="#34d399" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4">
        <MiniChart data={history} dataKey="cpu" color="#60a5fa" label="CPU Usage" />
        <MiniChart data={history} dataKey="ram" color="#a78bfa" label="RAM Usage" />
        <MiniChart data={history} dataKey="gpu" color="#34d399" label="GPU Usage" />
      </div>

      {/* Stats summary */}
      {history.length > 5 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'CPU Avg', value: `${avg('cpu')}%`, sub: `Peak ${peak('cpu')}%`, color: '#60a5fa' },
            { label: 'RAM Avg', value: `${avg('ram')}%`, sub: `Peak ${peak('ram')}%`, color: '#a78bfa' },
            { label: 'GPU Avg', value: `${avg('gpu')}%`, sub: `Peak ${peak('gpu')}%`, color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border-default bg-bg-card p-3">
              <div className="text-text-muted text-[10px] uppercase tracking-wider mb-1">{s.label}</div>
              <div className="font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
              <div className="text-text-muted text-xs mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
