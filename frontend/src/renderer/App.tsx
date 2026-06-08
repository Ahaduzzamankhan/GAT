import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import GamesPage from './pages/Games'
import AuthorizedGamesPage from './pages/AuthorizedGames'
import RecentPage from './pages/Recent'
import HistoryPage from './pages/History'
import MonitorPage from './pages/Monitor'
import SettingsPage from './pages/Settings'
import { useCurrentlyPlaying } from './hooks'
import type { Page } from './types'

const pageVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.15 } }
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const playing = useCurrentlyPlaying()
  const [updateBadge, setUpdateBadge] = useState<string | null>(null)

  // Silently check for updates 5s after launch
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const go = (window as any).go?.main?.App
        if (!go) return
        const result = await go.CheckForUpdate()
        if (result?.available) setUpdateBadge(result.latestVersion)
      } catch {}
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <Dashboard />
      case 'games':      return <GamesPage />
      case 'authorized': return <AuthorizedGamesPage />
      case 'recent':     return <RecentPage />
      case 'history':    return <HistoryPage />
      case 'monitor':    return <MonitorPage />
      case 'settings':   return <SettingsPage />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={page} onChange={setPage} playingCount={playing.length} updateBadge={updateBadge} />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
