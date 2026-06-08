import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGames } from '../hooks'
import { formatPlaytime, formatDate } from '../utils/format'
import GameImage from '../components/GameImage'
import { api } from '../api'

function AddGameModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [exe, setExe] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleExeChange = (v: string) => {
    setExe(v)
    if (!name) {
      const guessed = v.replace(/\.exe$/i, '').replace(/[-_]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, c => c.toUpperCase()).trim()
      setName(guessed)
    }
  }

  const handleSubmit = async () => {
    const cleanExe = exe.trim()
    const cleanName = name.trim()
    if (!cleanExe || !cleanName) return
    setLoading(true)
    await api.db.addGameManually(cleanExe, cleanName)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-bg-secondary border border-border-default rounded-2xl p-6 w-[420px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-text-primary font-semibold text-base">Add Game Manually</h2>
            <p className="text-text-muted text-xs mt-0.5">GAT will track this exe automatically when it runs</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-text-muted text-xs font-medium block mb-1.5">Executable name</label>
            <input
              value={exe}
              onChange={e => handleExeChange(e.target.value)}
              placeholder="e.g. mygame.exe"
              autoFocus
              className="w-full bg-bg-tertiary border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors"
            />
            <p className="text-text-muted text-[10px] mt-1">Just the filename, not the full path</p>
          </div>
          <div>
            <label className="text-text-muted text-xs font-medium block mb-1.5">Display name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Game"
              className="w-full bg-bg-tertiary border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-default text-text-secondary text-sm font-medium hover:border-border-active transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!exe.trim() || !name.trim() || loading}
            className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Adding…' : 'Add Game'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function GamesPage() {
  const { games, refresh } = useGames()
  const [search, setSearch] = useState('')
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  type SortOption = 'playtime-desc' | 'playtime-asc' | 'name-asc' | 'last-played' | 'newest'
  const [sortBy, setSortBy] = useState<SortOption>('playtime-desc')

  const filtered = games.filter(g => {
    if (showFavOnly && g.favorite !== 1) return false
    return g.name.toLowerCase().includes(search.toLowerCase())
  })

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'playtime-desc':
        return b.totalPlaytime - a.totalPlaytime
      case 'playtime-asc':
        return a.totalPlaytime - b.totalPlaytime
      case 'name-asc':
        return a.name.localeCompare(b.name)
      case 'last-played':
        const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0
        const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0
        return dateB - dateA
      case 'newest':
        const firstSeenA = a.firstSeen ? new Date(a.firstSeen).getTime() : 0
        const firstSeenB = b.firstSeen ? new Date(b.firstSeen).getTime() : 0
        return firstSeenB - firstSeenA
      default:
        return 0
    }
  })

  const handleToggleFav = async (id: number) => {
    await api.db.toggleFavorite(id)
    refresh()
  }

  const handleDelete = async (id: number) => {
    await api.db.deleteGame(id)
    setConfirmDelete(null)
    refresh()
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search games..."
            className="w-full bg-bg-secondary border border-border-default rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFavOnly(!showFavOnly)}
          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFavOnly ? 'bg-white text-black border-white' : 'bg-bg-secondary border-border-default text-text-secondary hover:border-border-active'}`}
        >
          <i className="fa-solid fa-star mr-2" />
          Favorites
        </button>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="bg-bg-secondary border border-border-default rounded-xl px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary focus:outline-none focus:border-border-active transition-colors cursor-pointer"
        >
          <option value="playtime-desc">Sort: Most Played</option>
          <option value="playtime-asc">Sort: Least Played</option>
          <option value="name-asc">Sort: Name (A-Z)</option>
          <option value="last-played">Sort: Recently Played</option>
          <option value="newest">Sort: Newest Added</option>
        </select>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus text-xs" />
          Add Game
        </button>
      </div>

      {sortedAndFiltered.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <i className="fa-solid fa-gamepad text-4xl mb-4 block opacity-20" />
          <div>{search ? 'No games found' : 'No games tracked yet'}</div>
          <div className="text-xs mt-2">Play a game and GAT will detect it, or add one manually</div>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {sortedAndFiltered.map(game => (
            <motion.div
              key={game.id}
              layout
              className="bg-bg-card border border-border-default rounded-2xl p-4 hover:border-border-active transition-all group relative"
            >
              {/* Delete confirm overlay */}
              <AnimatePresence>
                {confirmDelete === game.id && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-bg-card/95 rounded-2xl z-10 flex flex-col items-center justify-center gap-3 p-4"
                  >
                    <div className="text-text-primary text-sm font-medium text-center">Remove "{game.name}"?</div>
                    <div className="text-text-muted text-xs text-center">All sessions will be deleted</div>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-1.5 rounded-lg border border-border-default text-text-secondary text-xs hover:border-border-active transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(game.id)}
                        className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4 items-start">
                <GameImage imagePath={game.coverImage || game.icon} name={game.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-text-primary font-semibold text-sm truncate">{game.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleFav(game.id)}
                        className={`transition-colors ${game.favorite === 1 ? 'text-yellow-400' : 'text-text-muted hover:text-text-secondary'}`}
                      >
                        <i className={`fa-${game.favorite === 1 ? 'solid' : 'regular'} fa-star text-sm`} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(game.id)}
                        className="text-text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-1"
                      >
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  </div>
                  <div className="text-text-muted text-xs truncate mt-0.5 mb-3 flex items-center gap-1">
                    <span>{game.executable}</span>
                    {(game as any).manuallyAdded === 1 && (
                      <span className="text-[9px] bg-bg-tertiary border border-border-subtle rounded px-1 py-0.5 uppercase tracking-wider shrink-0">manual</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-text-primary font-bold text-base">{formatPlaytime(game.totalPlaytime)}</div>
                      <div className="text-text-muted text-xs">Total playtime</div>
                    </div>
                    <div className="text-right">
                      <div className="text-text-secondary text-xs">{formatDate(game.lastPlayed)}</div>
                      <div className="text-text-muted text-xs">Last played</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <AddGameModal
            onClose={() => setShowAddModal(false)}
            onAdded={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
