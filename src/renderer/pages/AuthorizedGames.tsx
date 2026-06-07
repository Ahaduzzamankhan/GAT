import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGames } from '../hooks'
import { formatPlaytime } from '../utils/format'

interface AuthorizedGameDef {
  id: string
  name: string
  executables: string[]
  assets: { icon: string; banner: string; logo?: string }
  features: { key: string; label: string; description: string }[]
  genre: string
  developer: string
  publisher: string
  website: string
  color: string
  accentColor: string
}

const AUTHORIZED_GAMES: AuthorizedGameDef[] = [
  {
    id: 'minecraft', name: 'Minecraft',
    executables: ['minecraft.exe', 'minecraftlauncher.exe', 'javaw.exe'],
    assets: {
      icon: 'https://www.minecraft.net/content/dam/games/minecraft/key-art/MC_The_Wild_Update-_Warden_Face_ArtBoard_1.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/01ba4719c80b6fe911b091a7c05124b6.png',
    },
    features: [
      { key: 'worldTracker', label: 'World Tracker', description: 'Track time per world/server' },
      { key: 'versionMonitor', label: 'Version Monitor', description: 'Detect active Minecraft version' },
      { key: 'modpackDetect', label: 'Modpack Detection', description: 'Identify active modpack from JVM args' },
    ],
    genre: 'Sandbox / Survival', developer: 'Mojang Studios', publisher: 'Microsoft',
    website: 'https://minecraft.net', color: '#1a2e0a', accentColor: '#62B300',
  },
  {
    id: 'roblox', name: 'Roblox',
    executables: ['robloxplayerbeta.exe', 'robloxstudio.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Roblox_Logo_2022.svg/512px-Roblox_Logo_2022.svg.png',
      banner: 'https://cdn2.steamgriddb.com/hero/9e3cfc48ca6b8f63bcdb03ad8e685651.png',
    },
    features: [
      { key: 'gameIdDetect', label: 'Game ID Detection', description: 'Detect which Roblox game is being played' },
      { key: 'studioMode', label: 'Studio Mode', description: 'Separate tracking for Roblox Studio sessions' },
    ],
    genre: 'Platform / Metaverse', developer: 'Roblox Corporation', publisher: 'Roblox Corporation',
    website: 'https://roblox.com', color: '#2e0808', accentColor: '#FF4136',
  },
  {
    id: 'gtav', name: 'Grand Theft Auto V',
    executables: ['gta5.exe', 'gtav.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/a/a5/GTA_V.png',
      banner: 'https://cdn2.steamgriddb.com/hero/b6d767d2f8ed5d21a44b0e5886680cb9.png',
    },
    features: [
      { key: 'onlineVsStory', label: 'Online vs Story', description: 'Detect GTA Online vs Story Mode' },
      { key: 'modDetect', label: 'Mod Detection', description: 'Flag sessions where mods are active' },
      { key: 'fpsOverlay', label: 'FPS Logging', description: 'Log average FPS per session' },
    ],
    genre: 'Open World / Action', developer: 'Rockstar North', publisher: 'Rockstar Games',
    website: 'https://www.rockstargames.com/gta-v', color: '#1a1a0d', accentColor: '#F7C900',
  },
  {
    id: 'rdr2', name: 'Red Dead Redemption 2',
    executables: ['rdr2.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/4/44/Red_Dead_Redemption_II.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/16a5c29f70c6f99e1e3c58f6fa7fe853.png',
    },
    features: [
      { key: 'onlineVsStory', label: 'Online vs Story', description: 'Detect RDO vs Story Mode sessions' },
      { key: 'chapterTracker', label: 'Chapter Tracker', description: 'Estimate story chapter from playtime' },
    ],
    genre: 'Open World / Western', developer: 'Rockstar Studios', publisher: 'Rockstar Games',
    website: 'https://www.rockstargames.com/reddeadredemption2', color: '#2d0a00', accentColor: '#C0392B',
  },
  {
    id: 'fortnite', name: 'Fortnite',
    executables: ['fortniteclient-win64-shipping.exe'],
    assets: {
      icon: 'https://cdn2.steamgriddb.com/icon/4f2d0fc87ba7dafc8d8f1e6a6b63e8c5.png',
      banner: 'https://cdn2.steamgriddb.com/hero/d9d4f495e875a2e075a1a4a6e1b9770f.png',
    },
    features: [
      { key: 'modeDetect', label: 'Mode Detection', description: 'Detect BR / Zero Build / Creative' },
      { key: 'seasonTracker', label: 'Season Tracker', description: 'Log which season was active' },
    ],
    genre: 'Battle Royale', developer: 'Epic Games', publisher: 'Epic Games',
    website: 'https://fortnite.com', color: '#1a0533', accentColor: '#7B2FBE',
  },
  {
    id: 'valorant', name: 'Valorant',
    executables: ['valorant-win64-shipping.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/b/b6/Valorant_logo_-_pink_color_version.svg',
      banner: 'https://cdn2.steamgriddb.com/hero/c6a01a57f9ca5def8c2d3451e76688f5.png',
    },
    features: [
      { key: 'agentLogger', label: 'Agent Logger', description: 'Log agent played per session' },
      { key: 'rankTracker', label: 'Rank Tracker', description: 'Manual rank logging per session' },
    ],
    genre: 'Tactical Shooter', developer: 'Riot Games', publisher: 'Riot Games',
    website: 'https://playvalorant.com', color: '#0f1923', accentColor: '#FF4655',
  },
  {
    id: 'leagueoflegends', name: 'League of Legends',
    executables: ['league of legends.exe', 'leagueclient.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/9/9f/League_of_Legends_2019_vector.svg',
      banner: 'https://cdn2.steamgriddb.com/hero/3ef815416f775098fe977004015c6193.png',
    },
    features: [
      { key: 'clientVsGame', label: 'Client vs Game', description: 'Separate lobby time from match time' },
      { key: 'championLogger', label: 'Champion Logger', description: 'Log champion via window title' },
    ],
    genre: 'MOBA', developer: 'Riot Games', publisher: 'Riot Games',
    website: 'https://leagueoflegends.com', color: '#0a1628', accentColor: '#C6A84B',
  },
  {
    id: 'cyberpunk2077', name: 'Cyberpunk 2077',
    executables: ['cyberpunk2077.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/0dda892de87d218abf9ac9e00f3fcf15.png',
    },
    features: [
      { key: 'modDetect', label: 'Mod Detection', description: 'Flag sessions with active mods' },
      { key: 'dlcTracker', label: 'DLC Tracker', description: 'Detect Phantom Liberty DLC sessions' },
    ],
    genre: 'Open World / RPG', developer: 'CD Projekt Red', publisher: 'CD Projekt',
    website: 'https://cyberpunk.net', color: '#0a0a0a', accentColor: '#FCEE09',
  },
  {
    id: 'eldenring', name: 'Elden Ring',
    executables: ['eldenring.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/b56a2d7d71ece28db0f938d0cfb57c55.png',
    },
    features: [
      { key: 'dlcTracker', label: 'DLC Tracker', description: 'Detect Shadow of the Erdtree sessions' },
      { key: 'onlinePvp', label: 'Online Detection', description: 'Flag sessions with network activity' },
    ],
    genre: 'Action RPG / Soulslike', developer: 'FromSoftware', publisher: 'Bandai Namco',
    website: 'https://eldenring.bandainamcoent.com', color: '#1a1200', accentColor: '#D4AF37',
  },
  {
    id: 'csgo', name: 'Counter-Strike 2',
    executables: ['cs2.exe', 'csgo.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/f/f2/CS2_key_art.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/1c9eb5df57e49cbc9a4d1a73d2e6ea0e.png',
    },
    features: [
      { key: 'mapLogger', label: 'Map Logger', description: 'Log map via window title' },
      { key: 'modeDetect', label: 'Mode Detection', description: 'Detect Casual / Competitive / Wingman' },
    ],
    genre: 'Tactical Shooter', developer: 'Valve', publisher: 'Valve',
    website: 'https://store.steampowered.com/app/730', color: '#0d1b2a', accentColor: '#F5A623',
  },
  {
    id: 'apexlegends', name: 'Apex Legends',
    executables: ['r5apex.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/d/db/Apex_legends_cover.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/9b2b29bcbb3e04748c2e0f6d3eb2e0bd.png',
    },
    features: [
      { key: 'legendLogger', label: 'Legend Logger', description: 'Log legend via window title' },
      { key: 'seasonTracker', label: 'Season Tracker', description: 'Tag sessions with active season' },
    ],
    genre: 'Battle Royale', developer: 'Respawn Entertainment', publisher: 'EA',
    website: 'https://www.ea.com/games/apex-legends', color: '#1a0000', accentColor: '#CD7F32',
  },
  {
    id: 'warframe', name: 'Warframe',
    executables: ['warframe.exe', 'warframe.x64.exe'],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/7/7f/Warframe_box_art.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/aedc5e0024f14e9e9f6d41cd7a9ea3f8.png',
    },
    features: [
      { key: 'missionTracker', label: 'Mission Tracker', description: 'Estimate missions from session length' },
      { key: 'updateDetect', label: 'Update Detection', description: 'Flag launcher sessions separately' },
    ],
    genre: 'Action RPG / Looter', developer: 'Digital Extremes', publisher: 'Digital Extremes',
    website: 'https://warframe.com', color: '#002244', accentColor: '#4FC3F7',
  },
]

function GameBanner({ game, trackedGame }: { game: AuthorizedGameDef; trackedGame?: any }) {
  const [imgError, setImgError] = useState(false)
  const isTracked = !!trackedGame

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden border border-border-default hover:border-border-active transition-all group cursor-default"
      style={{ background: game.color }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
    >
      {/* Banner */}
      <div className="relative h-28 overflow-hidden">
        {!imgError ? (
          <img
            src={game.assets.banner}
            alt={game.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: game.color }}>
            <i className="fa-solid fa-gamepad text-3xl opacity-20 text-white" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

        {/* Status badge */}
        <div className="absolute top-2.5 right-2.5 flex gap-1.5">
          {isTracked && (
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/90 text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              Playing
            </span>
          )}
          <a
            href={game.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors flex items-center gap-1"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
            Online
          </a>
        </div>

        {/* Game icon bottom-left */}
        <div className="absolute bottom-2 left-3 flex items-end gap-2.5">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/20 shadow-lg shrink-0 bg-black/40">
            <img
              src={game.assets.icon}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="pb-0.5">
            <div className="text-white font-bold text-sm leading-tight drop-shadow">{game.name}</div>
            <div className="text-white/60 text-[10px]">{game.genre}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Playtime row */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-sm">
              {isTracked ? formatPlaytime(trackedGame.totalPlaytime) : '—'}
            </div>
            <div className="text-white/40 text-[10px]">Tracked playtime</div>
          </div>
          <div className="text-right">
            <div className="text-white/70 text-[10px]">{game.developer}</div>
            <div className="text-white/40 text-[10px]">{game.publisher}</div>
          </div>
        </div>

        {/* Executables */}
        <div className="flex flex-wrap gap-1">
          {game.executables.slice(0, 2).map(exe => (
            <span
              key={exe}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/10"
            >
              {exe}
            </span>
          ))}
          {game.executables.length > 2 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">
              +{game.executables.length - 2}
            </span>
          )}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-1">
          {game.features.map(f => (
            <div
              key={f.key}
              className="group/pill relative"
              title={f.description}
            >
              <span
                className="text-[9px] font-medium px-2 py-0.5 rounded-full border text-white/80 cursor-default"
                style={{ borderColor: game.accentColor + '60', background: game.accentColor + '18' }}
              >
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function AuthorizedGamesPage() {
  const { games } = useGames()
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')

  const genres = useMemo(() => {
    const g = new Set(AUTHORIZED_GAMES.map(g => g.genre.split(' / ')[0]))
    return ['all', ...Array.from(g)]
  }, [])

  const filtered = useMemo(() => {
    return AUTHORIZED_GAMES.filter(g => {
      const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.genre.toLowerCase().includes(search.toLowerCase())
      const matchGenre = selectedGenre === 'all' || g.genre.startsWith(selectedGenre)
      return matchSearch && matchGenre
    })
  }, [search, selectedGenre])

  const trackedMap = useMemo(() => {
    const m = new Map<string, typeof games[0]>()
    for (const game of games) {
      const lower = game.executable.toLowerCase()
      for (const ag of AUTHORIZED_GAMES) {
        if (ag.executables.some(e => e.toLowerCase() === lower)) {
          const existing = m.get(ag.id)
          if (!existing || game.totalPlaytime > existing.totalPlaytime) m.set(ag.id, game)
        }
      }
    }
    return m
  }, [games])

  const trackedCount = trackedMap.size
  const totalTrackedPlaytime = Array.from(trackedMap.values()).reduce((s, g) => s + g.totalPlaytime, 0)

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      {/* Header stats */}
      <div className="flex gap-3">
        <div className="flex-1 bg-bg-secondary border border-border-default rounded-xl px-4 py-3">
          <div className="text-text-muted text-xs mb-0.5">Authorized Games</div>
          <div className="text-text-primary font-bold text-xl">{AUTHORIZED_GAMES.length}</div>
        </div>
        <div className="flex-1 bg-bg-secondary border border-border-default rounded-xl px-4 py-3">
          <div className="text-text-muted text-xs mb-0.5">Tracked</div>
          <div className="text-text-primary font-bold text-xl">{trackedCount}</div>
        </div>
        <div className="flex-1 bg-bg-secondary border border-border-default rounded-xl px-4 py-3">
          <div className="text-text-muted text-xs mb-0.5">Combined Playtime</div>
          <div className="text-text-primary font-bold text-xl">{formatPlaytime(totalTrackedPlaytime)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search authorized games..."
            className="w-full bg-bg-secondary border border-border-default rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                selectedGenre === genre
                  ? 'bg-white text-black border-white'
                  : 'bg-bg-secondary border-border-default text-text-secondary hover:border-border-active'
              }`}
            >
              {genre === 'all' ? 'All' : genre}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filtered.map(game => (
            <GameBanner
              key={game.id}
              game={game}
              trackedGame={trackedMap.get(game.id)}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-text-muted">
          <i className="fa-solid fa-shield-halved text-4xl mb-4 block opacity-20" />
          <div>No authorized games match your filter</div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-center text-text-muted text-xs pb-2 opacity-50">
        {AUTHORIZED_GAMES.length} authorized games · Auto-detected when running · Extensible via registry.ts
      </div>
    </div>
  )
}
