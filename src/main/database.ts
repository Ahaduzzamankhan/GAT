import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let db: any = null
let SQL: any = null

export async function initDatabase(): Promise<void> {
  const initSqlJs = require('sql.js')
  const wasmPath = app.isPackaged
    ? path.join(process.resourcesPath, 'sql-wasm.wasm')
    : path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')

  SQL = await initSqlJs({ locateFile: () => wasmPath })

  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'gat.db')

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`PRAGMA foreign_keys = ON;`)

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      executable TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      icon TEXT,
      coverImage TEXT,
      totalPlaytime INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      lastPlayed TEXT,
      firstSeen TEXT DEFAULT (datetime('now')),
      hidden INTEGER DEFAULT 0,
      manuallyAdded INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gameId INTEGER NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT,
      duration INTEGER DEFAULT 0,
      FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      imageUrl TEXT,
      localPath TEXT,
      metadata TEXT,
      lastAccessed TEXT DEFAULT (datetime('now')),
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_gameId ON sessions(gameId);
    CREATE INDEX IF NOT EXISTS idx_sessions_startTime ON sessions(startTime);
    CREATE INDEX IF NOT EXISTS idx_games_lastPlayed ON games(lastPlayed);
  `)

  // Migration: add manuallyAdded column if missing (existing DBs)
  try {
    db.run('ALTER TABLE games ADD COLUMN manuallyAdded INTEGER DEFAULT 0')
  } catch {}

  const defaults = [
    ['startWithWindows', 'false'],
    ['minimizeToTray', 'true'],
    ['notifications', 'true'],
    ['theme', 'dark'],
    ['trackingEnabled', 'true'],
    ['scanInterval', '5000'],
    ['cacheDuration', '30']
  ]
  for (const [k, v] of defaults) {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [k, v])
  }

  // Purge known system/overlay junk that may have been tracked by old versions
  const junkPatterns = [
    '%gamebar%', '%gameinput%', '%gaming service%', '%xboxpcapp%',
    '%xboxgamingoverlay%', '%smartscreen%', '%startmenuexperience%',
    '%shellexperience%', '%searchhost%', '%runtimebroker%',
    '%applicationframehost%', '%gameinputsvc%', '%gamebarft%',
    '%phonelinkprocess%', '%yourphone%', '%lockapp%', '%textinputhost%',
    '%sihost%', '%taskhostw%',
  ]
  for (const p of junkPatterns) {
    db.run('DELETE FROM sessions WHERE gameId IN (SELECT id FROM games WHERE lower(executable) LIKE ?)', [p])
    db.run('DELETE FROM games WHERE lower(executable) LIKE ? AND manuallyAdded = 0', [p])
  }

  saveDb()
}

function saveDb() {
  if (!db) return
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'gat.db')
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

function runAll(sql: string, params: any[] = []): void {
  db.run(sql, params)
  saveDb()
}

function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params)
  return rows[0] || null
}

function runInsert(sql: string, params: any[] = []): number {
  db.run(sql, params)
  const row = queryOne('SELECT last_insert_rowid() as id')
  saveDb()
  return row?.id || 0
}

export const queries = {
  getAllGames: () => queryAll('SELECT * FROM games WHERE hidden = 0 ORDER BY totalPlaytime DESC'),

  getGameByExecutable: (executable: string) =>
    queryOne('SELECT * FROM games WHERE executable = ?', [executable]),

  getGameById: (id: number) =>
    queryOne('SELECT * FROM games WHERE id = ?', [id]),

  upsertGame: (executable: string, name: string): number => {
    const existing = queryOne('SELECT id FROM games WHERE executable = ?', [executable])
    if (existing) return existing.id
    return runInsert("INSERT INTO games (executable, name, firstSeen) VALUES (?, ?, datetime('now'))", [executable, name])
  },

  addGameManually: (executable: string, name: string): number => {
    const existing = queryOne('SELECT id FROM games WHERE executable = ?', [executable])
    if (existing) {
      db.run('UPDATE games SET manuallyAdded = 1 WHERE id = ?', [existing.id])
      saveDb()
      return existing.id
    }
    return runInsert("INSERT INTO games (executable, name, firstSeen, manuallyAdded) VALUES (?, ?, datetime('now'), 1)", [executable, name])
  },

  updateGame: (id: number, data: Record<string, any>) => {
    const keys = Object.keys(data)
    const setClause = keys.map(k => `${k} = ?`).join(', ')
    runAll(`UPDATE games SET ${setClause} WHERE id = ?`, [...Object.values(data), id])
  },

  deleteGame: (id: number) => {
    runAll('DELETE FROM sessions WHERE gameId = ?', [id])
    runAll('DELETE FROM games WHERE id = ?', [id])
  },

  startSession: (gameId: number, startTime: string): number =>
    runInsert('INSERT INTO sessions (gameId, startTime) VALUES (?, ?)', [gameId, startTime]),

  endSession: (sessionId: number, endTime: string, duration: number) => {
    db.run('UPDATE sessions SET endTime = ?, duration = ? WHERE id = ?', [endTime, duration, sessionId])
    const session = queryOne('SELECT gameId FROM sessions WHERE id = ?', [sessionId])
    if (session) {
      db.run('UPDATE games SET totalPlaytime = totalPlaytime + ?, lastPlayed = ? WHERE id = ?', [duration, endTime, session.gameId])
    }
    saveDb()
  },

  getRecentSessions: (limit = 20) => queryAll(`
    SELECT s.id, s.gameId, s.startTime, s.endTime, s.duration, g.name, g.executable, g.icon, g.coverImage
    FROM sessions s JOIN games g ON s.gameId = g.id
    WHERE s.endTime IS NOT NULL
    ORDER BY s.startTime DESC LIMIT ?
  `, [limit]),

  getSessionsFiltered: (filter: string) => {
    let where = ''
    if (filter === 'today') where = "WHERE date(s.startTime) = date('now')"
    else if (filter === 'week') where = "WHERE s.startTime >= datetime('now', '-7 days')"
    else if (filter === 'month') where = "WHERE s.startTime >= datetime('now', '-30 days')"
    return queryAll(`
      SELECT s.id, s.gameId, s.startTime, s.endTime, s.duration, g.name, g.executable, g.icon, g.coverImage
      FROM sessions s JOIN games g ON s.gameId = g.id
      ${where}
      ORDER BY s.startTime DESC
    `)
  },

  getFavorites: () => queryAll('SELECT * FROM games WHERE favorite = 1 AND hidden = 0 ORDER BY totalPlaytime DESC'),

  toggleFavorite: (id: number) => {
    runAll('UPDATE games SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END WHERE id = ?', [id])
  },

  getStats: () => {
    const totalGames = queryOne('SELECT COUNT(*) as c FROM games WHERE hidden = 0')?.c || 0
    const totalPlaytime = queryOne('SELECT COALESCE(SUM(duration), 0) as t FROM sessions WHERE endTime IS NOT NULL')?.t || 0
    const todayPlaytime = queryOne("SELECT COALESCE(SUM(duration), 0) as t FROM sessions WHERE date(startTime) = date('now') AND endTime IS NOT NULL")?.t || 0
    const sessionCount = queryOne('SELECT COUNT(*) as c FROM sessions WHERE endTime IS NOT NULL')?.c || 0
    return { totalGames, totalPlaytime, todayPlaytime, sessionCount }
  },

  getWeeklyActivity: () => queryAll(`
    SELECT date(startTime) as date, COALESCE(SUM(duration), 0) as totalTime, COUNT(*) as sessions
    FROM sessions WHERE startTime >= datetime('now', '-7 days') AND endTime IS NOT NULL
    GROUP BY date(startTime) ORDER BY date ASC
  `),

  getCacheEntry: (key: string) => {
    const entry = queryOne('SELECT * FROM cache WHERE key = ?', [key])
    if (entry) db.run("UPDATE cache SET lastAccessed = datetime('now') WHERE key = ?", [key])
    return entry
  },

  setCacheEntry: (key: string, imageUrl: string, localPath: string, metadata?: string) => {
    runAll('INSERT OR REPLACE INTO cache (key, imageUrl, localPath, metadata) VALUES (?, ?, ?, ?)', [key, imageUrl, localPath, metadata || null])
  },

  cleanCache: (days: number) => {
    db.run(`DELETE FROM cache WHERE lastAccessed < datetime('now', '-${days} days')`)
    const changes = db.getRowsModified()
    saveDb()
    return changes
  },

  getSetting: (key: string) => queryOne('SELECT value FROM settings WHERE key = ?', [key])?.value,

  setSetting: (key: string, value: string) => {
    runAll('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
  },

  getAllSettings: () => {
    const rows = queryAll('SELECT key, value FROM settings')
    return Object.fromEntries(rows.map((r: any) => [r.key, r.value]))
  }
}
