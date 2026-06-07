export interface AuthorizedGameFeature {
  key: string
  label: string
  description: string
}

export interface AuthorizedGameAssets {
  icon: string
  banner: string
  logo?: string
  background?: string
}

export interface AuthorizedGame {
  id: string
  name: string
  executables: string[]
  processPatterns?: RegExp[]
  assets: AuthorizedGameAssets
  features: AuthorizedGameFeature[]
  genre: string
  developer: string
  publisher: string
  website: string
  color: string
  accentColor: string
}

// Registry of all authorized games — add new entries here to extend
export const AUTHORIZED_GAMES: AuthorizedGame[] = [
  {
    id: 'minecraft',
    name: 'Minecraft',
    executables: ['minecraft.exe', 'minecraftlauncher.exe', 'javaw.exe'],
    processPatterns: [/minecraft/i, /\.minecraft/i, /multimc/i, /prism.?launcher/i, /atlauncher/i, /curseforge/i, /modrinth/i, /technic/i, /ftb.?app/i],
    assets: {
      icon: 'https://www.minecraft.net/content/dam/games/minecraft/key-art/MC_The_Wild_Update-_Warden_Face_ArtBoard_1.jpg',
      banner: 'https://www.minecraft.net/content/dam/games/minecraft/key-art/MC-Marketing-Keyart-NewEra.jpg',
      logo: 'https://www.minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/img/minecraft-creeper-face.png',
      background: 'https://cdn2.steamgriddb.com/hero/01ba4719c80b6fe911b091a7c05124b6.png',
    },
    features: [
      { key: 'worldTracker', label: 'World Tracker', description: 'Track time per world/server' },
      { key: 'versionMonitor', label: 'Version Monitor', description: 'Detect active Minecraft version' },
      { key: 'modpackDetect', label: 'Modpack Detection', description: 'Identify active modpack from JVM args' },
    ],
    genre: 'Sandbox / Survival',
    developer: 'Mojang Studios',
    publisher: 'Microsoft',
    website: 'https://minecraft.net',
    color: '#5A7C3C',
    accentColor: '#62B300',
  },
  {
    id: 'roblox',
    name: 'Roblox',
    executables: ['robloxplayerbeta.exe', 'robloxstudio.exe', 'robloxplayer.exe'],
    processPatterns: [/roblox/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Roblox_Logo_2022.svg/512px-Roblox_Logo_2022.svg.png',
      banner: 'https://cdn2.steamgriddb.com/hero/9e3cfc48ca6b8f63bcdb03ad8e685651.png',
      background: 'https://images.rbxcdn.com/faa7c3baff4046f43e498c54cba7f9a2.jpg',
    },
    features: [
      { key: 'gameIdDetect', label: 'Game ID Detection', description: 'Detect which Roblox game is being played' },
      { key: 'studioMode', label: 'Studio Mode', description: 'Separate tracking for Roblox Studio sessions' },
      { key: 'avatarSnapshot', label: 'Avatar Snapshot', description: 'Log avatar skin at session start' },
    ],
    genre: 'Platform / Metaverse',
    developer: 'Roblox Corporation',
    publisher: 'Roblox Corporation',
    website: 'https://roblox.com',
    color: '#E2231A',
    accentColor: '#FF4136',
  },
  {
    id: 'gtav',
    name: 'Grand Theft Auto V',
    executables: ['gta5.exe', 'gtav.exe', 'grandtheftautov.exe'],
    processPatterns: [/gta.?5|gtav|grand.*theft.*auto.*v/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/a/a5/GTA_V.png',
      banner: 'https://cdn2.steamgriddb.com/hero/b6d767d2f8ed5d21a44b0e5886680cb9.png',
      background: 'https://www.rockstargames.com/newswire/uploads/c7b025-gtaonline.jpg',
    },
    features: [
      { key: 'onlineVsStory', label: 'Online vs Story', description: 'Detect GTA Online vs Story Mode sessions' },
      { key: 'modDetect', label: 'Mod Detection', description: 'Flag sessions where mods are active' },
      { key: 'fpsOverlay', label: 'FPS Overlay', description: 'Log average FPS per session' },
    ],
    genre: 'Open World / Action',
    developer: 'Rockstar North',
    publisher: 'Rockstar Games',
    website: 'https://www.rockstargames.com/gta-v',
    color: '#1A1A2E',
    accentColor: '#F7C900',
  },
  {
    id: 'rdr2',
    name: 'Red Dead Redemption 2',
    executables: ['rdr2.exe', 'reddeadredemption2.exe'],
    processPatterns: [/rdr2|red.*dead.*redemption/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/4/44/Red_Dead_Redemption_II.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/16a5c29f70c6f99e1e3c58f6fa7fe853.png',
      background: 'https://www.rockstargames.com/reddeadredemption2/img/global/rdr2-social.jpg',
    },
    features: [
      { key: 'onlineVsStory', label: 'Online vs Story', description: 'Detect RDO vs Story Mode sessions' },
      { key: 'chapterTracker', label: 'Chapter Tracker', description: 'Estimate story chapter from playtime milestones' },
      { key: 'fpsOverlay', label: 'FPS Overlay', description: 'Log average FPS per session' },
    ],
    genre: 'Open World / Western',
    developer: 'Rockstar Studios',
    publisher: 'Rockstar Games',
    website: 'https://www.rockstargames.com/reddeadredemption2',
    color: '#2D0A00',
    accentColor: '#C0392B',
  },
  {
    id: 'fortnite',
    name: 'Fortnite',
    executables: ['fortnite.exe', 'fortniteclient-win64-shipping.exe', 'fnaf.exe'],
    processPatterns: [/fortnite/i],
    assets: {
      icon: 'https://cdn2.steamgriddb.com/icon/4f2d0fc87ba7dafc8d8f1e6a6b63e8c5.png',
      banner: 'https://cdn2.steamgriddb.com/hero/d9d4f495e875a2e075a1a4a6e1b9770f.png',
      background: 'https://cdn2.steamgriddb.com/grid/00b5e3f8e4c09b1daacd8d7b3a13b3cb.jpg',
    },
    features: [
      { key: 'modeDetect', label: 'Mode Detection', description: 'Detect BR / Zero Build / Creative sessions' },
      { key: 'seasonTracker', label: 'Season Tracker', description: 'Log which season/chapter was active' },
      { key: 'peakConcurrent', label: 'Peak Hours', description: 'Track your most active playtime windows' },
    ],
    genre: 'Battle Royale',
    developer: 'Epic Games',
    publisher: 'Epic Games',
    website: 'https://fortnite.com',
    color: '#1A0533',
    accentColor: '#7B2FBE',
  },
  {
    id: 'valorant',
    name: 'Valorant',
    executables: ['valorant.exe', 'valorant-win64-shipping.exe'],
    processPatterns: [/valorant/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/b/b6/Valorant_logo_-_pink_color_version.svg',
      banner: 'https://cdn2.steamgriddb.com/hero/c6a01a57f9ca5def8c2d3451e76688f5.png',
      background: 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png',
    },
    features: [
      { key: 'agentLogger', label: 'Agent Logger', description: 'Log agent played per session (via window title)' },
      { key: 'rankTracker', label: 'Rank Tracker', description: 'Manual rank logging per session' },
      { key: 'antiCheatAlert', label: 'Vanguard Alert', description: 'Warn if Vanguard is running without game' },
    ],
    genre: 'Tactical Shooter',
    developer: 'Riot Games',
    publisher: 'Riot Games',
    website: 'https://playvalorant.com',
    color: '#0F1923',
    accentColor: '#FF4655',
  },
  {
    id: 'leagueoflegends',
    name: 'League of Legends',
    executables: ['league of legends.exe', 'leagueoflegends.exe', 'lol.exe', 'leagueclient.exe'],
    processPatterns: [/league.*legend|leagueclient|lol\.exe/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/9/9f/League_of_Legends_2019_vector.svg',
      banner: 'https://cdn2.steamgriddb.com/hero/3ef815416f775098fe977004015c6193.png',
      background: 'https://lolstatic-a.akamaihd.net/frontpage/apps/prod/clash-2018/en_US/a54cb97b45cfe9b5fb6e1e0dc5a16ac0/assets/static/img/social-image.jpg',
    },
    features: [
      { key: 'clientVsGame', label: 'Client vs Game', description: 'Separate lobby time from active match time' },
      { key: 'championLogger', label: 'Champion Logger', description: 'Log champion via window title or API' },
      { key: 'patchTracker', label: 'Patch Tracker', description: 'Tag sessions with active patch version' },
    ],
    genre: 'MOBA',
    developer: 'Riot Games',
    publisher: 'Riot Games',
    website: 'https://leagueoflegends.com',
    color: '#0A1628',
    accentColor: '#C6A84B',
  },
  {
    id: 'cyberpunk2077',
    name: 'Cyberpunk 2077',
    executables: ['cyberpunk2077.exe'],
    processPatterns: [/cyberpunk/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/0dda892de87d218abf9ac9e00f3fcf15.png',
      background: 'https://cdn.cdkeys.com/700x700/media/catalog/product/c/y/cyberpunk-2077-pc.jpg',
    },
    features: [
      { key: 'modDetect', label: 'Mod Detection', description: 'Flag sessions with active mods' },
      { key: 'dlcTracker', label: 'DLC Tracker', description: 'Detect Phantom Liberty DLC sessions' },
      { key: 'fpsOverlay', label: 'FPS Overlay', description: 'Log average FPS per session' },
    ],
    genre: 'Open World / RPG',
    developer: 'CD Projekt Red',
    publisher: 'CD Projekt',
    website: 'https://cyberpunk.net',
    color: '#0A0A0A',
    accentColor: '#FCEE09',
  },
  {
    id: 'eldenring',
    name: 'Elden Ring',
    executables: ['eldenring.exe', 'start_protected_game.exe'],
    processPatterns: [/elden.?ring/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/b56a2d7d71ece28db0f938d0cfb57c55.png',
      background: 'https://media.fromsoft.jp/images/er/er_screenshot_21.jpg',
    },
    features: [
      { key: 'deathCounter', label: 'Death Counter', description: 'Estimate deaths from session data patterns' },
      { key: 'dlcTracker', label: 'DLC Tracker', description: 'Detect Shadow of the Erdtree sessions' },
      { key: 'onlinePvp', label: 'Online Detection', description: 'Flag sessions with network activity' },
    ],
    genre: 'Action RPG / Soulslike',
    developer: 'FromSoftware',
    publisher: 'Bandai Namco',
    website: 'https://eldenring.bandainamcoent.com',
    color: '#1A1200',
    accentColor: '#D4AF37',
  },
  {
    id: 'csgo',
    name: 'Counter-Strike 2',
    executables: ['cs2.exe', 'csgo.exe'],
    processPatterns: [/cs2|csgo|counter.?strike/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/f/f2/CS2_key_art.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/1c9eb5df57e49cbc9a4d1a73d2e6ea0e.png',
      background: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
    },
    features: [
      { key: 'mapLogger', label: 'Map Logger', description: 'Log map via window title' },
      { key: 'modeDetect', label: 'Mode Detection', description: 'Detect Casual / Competitive / Wingman' },
      { key: 'workshopDetect', label: 'Workshop Detection', description: 'Tag workshop/offline sessions separately' },
    ],
    genre: 'Tactical Shooter',
    developer: 'Valve',
    publisher: 'Valve',
    website: 'https://store.steampowered.com/app/730',
    color: '#0D1B2A',
    accentColor: '#F5A623',
  },
  {
    id: 'apexlegends',
    name: 'Apex Legends',
    executables: ['r5apex.exe', 'apex legends.exe'],
    processPatterns: [/apex|r5apex/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/d/db/Apex_legends_cover.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/9b2b29bcbb3e04748c2e0f6d3eb2e0bd.png',
      background: 'https://media.contentapi.ea.com/content/dam/apex-legends/images/2019/01/apex-featured-image-16x9.jpg.adapt.crop191x100.1200w.jpg',
    },
    features: [
      { key: 'legendLogger', label: 'Legend Logger', description: 'Log legend via window title parsing' },
      { key: 'seasonTracker', label: 'Season Tracker', description: 'Tag sessions with active season' },
      { key: 'peakConcurrent', label: 'Peak Hours', description: 'Track most active playtime windows' },
    ],
    genre: 'Battle Royale',
    developer: 'Respawn Entertainment',
    publisher: 'EA',
    website: 'https://www.ea.com/games/apex-legends',
    color: '#8B0000',
    accentColor: '#CD7F32',
  },
  {
    id: 'warframe',
    name: 'Warframe',
    executables: ['warframe.exe', 'warframelauncher.exe', 'warframe.x64.exe'],
    processPatterns: [/warframe/i],
    assets: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/7/7f/Warframe_box_art.jpg',
      banner: 'https://cdn2.steamgriddb.com/hero/aedc5e0024f14e9e9f6d41cd7a9ea3f8.png',
      background: 'https://cdn.cloudflare.steamstatic.com/steam/apps/230410/header.jpg',
    },
    features: [
      { key: 'missionTracker', label: 'Mission Tracker', description: 'Estimate missions from session length' },
      { key: 'updateDetect', label: 'Update Detection', description: 'Flag launcher sessions as update sessions' },
      { key: 'clanActivity', label: 'Clan Activity', description: 'Log clan-dojo-hour vs mission-hour ratio' },
    ],
    genre: 'Action RPG / Looter',
    developer: 'Digital Extremes',
    publisher: 'Digital Extremes',
    website: 'https://warframe.com',
    color: '#002244',
    accentColor: '#4FC3F7',
  },
]

// Lookup maps built at module load — O(1) access
export const AUTHORIZED_BY_ID = new Map<string, AuthorizedGame>(
  AUTHORIZED_GAMES.map(g => [g.id, g])
)

export const AUTHORIZED_BY_EXE = new Map<string, AuthorizedGame>()
for (const game of AUTHORIZED_GAMES) {
  for (const exe of game.executables) {
    AUTHORIZED_BY_EXE.set(exe.toLowerCase(), game)
  }
}

export function detectAuthorizedGame(executable: string, windowTitle?: string): AuthorizedGame | null {
  const lower = executable.toLowerCase()
  const byExe = AUTHORIZED_BY_EXE.get(lower)
  if (byExe) return byExe

  for (const game of AUTHORIZED_GAMES) {
    if (game.processPatterns?.some(p => p.test(lower))) return game
    if (windowTitle && game.processPatterns?.some(p => p.test(windowTitle))) return game
  }
  return null
}
