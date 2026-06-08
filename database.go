package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	_ "modernc.org/sqlite"
)

var db *sql.DB

func initDatabase(dbPath string) error {
	var err error
	db, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}

	if err = db.Ping(); err != nil {
		return err
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return err
	}

	// Create tables
	schema := `
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
	`

	if _, err := db.Exec(schema); err != nil {
		return err
	}

	// Try to add manuallyAdded column if missing (for migrations)
	db.Exec("ALTER TABLE games ADD COLUMN manuallyAdded INTEGER DEFAULT 0")

	// Insert default settings
	defaults := map[string]string{
		"startWithWindows": "false",
		"minimizeToTray":   "true",
		"notifications":    "true",
		"theme":            "dark",
		"trackingEnabled":  "true",
		"scanInterval":     "5000",
		"cacheDuration":    "30",
	}

	for k, v := range defaults {
		_, err := db.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", k, v)
		if err != nil {
			log.Printf("Error inserting default setting %s: %v", k, err)
		}
	}

	// Purge junk entries
	junkPatterns := []string{
		"%gamebar%", "%gameinput%", "%gaming service%", "%xboxpcapp%",
		"%xboxgamingoverlay%", "%smartscreen%", "%startmenuexperience%",
		"%shellexperience%", "%searchhost%", "%runtimebroker%",
		"%applicationframehost%", "%gameinputsvc%", "%gamebarft%",
		"%phonelinkprocess%", "%yourphone%", "%lockapp%", "%textinputhost%",
		"%sihost%", "%taskhostw%",
	}

	for _, pattern := range junkPatterns {
		_, _ = db.Exec("DELETE FROM sessions WHERE gameId IN (SELECT id FROM games WHERE lower(executable) LIKE ?)", pattern)
		_, _ = db.Exec("DELETE FROM games WHERE lower(executable) LIKE ? AND manuallyAdded = 0", pattern)
	}

	return nil
}

func closeDatabase() error {
	if db != nil {
		return db.Close()
	}
	return nil
}

// Game queries
func queryAllGames() []map[string]interface{} {
	rows, err := db.Query("SELECT id, executable, name, icon, coverImage, totalPlaytime, favorite, lastPlayed, firstSeen, hidden, manuallyAdded FROM games WHERE hidden = 0 ORDER BY totalPlaytime DESC")
	if err != nil {
		log.Printf("Error querying all games: %v", err)
		return nil
	}
	defer rows.Close()
	return scanRows(rows)
}

func queryGameByExecutable(executable string) map[string]interface{} {
	row := db.QueryRow("SELECT id, executable, name, icon, coverImage, totalPlaytime, favorite, lastPlayed, firstSeen, hidden, manuallyAdded FROM games WHERE executable = ?", executable)
	var id, totalPlaytime, favorite, hidden, manuallyAdded int
	var executableVal, name, icon, coverImage, lastPlayed, firstSeen sql.NullString

	err := row.Scan(&id, &executableVal, &name, &icon, &coverImage, &totalPlaytime, &favorite, &lastPlayed, &firstSeen, &hidden, &manuallyAdded)
	if err != nil {
		return nil
	}

	result := map[string]interface{}{
		"id":            id,
		"executable":    executableVal.String,
		"name":          name.String,
		"icon":          icon.String,
		"coverImage":    coverImage.String,
		"totalPlaytime": totalPlaytime,
		"favorite":      favorite,
		"lastPlayed":    lastPlayed.String,
		"firstSeen":     firstSeen.String,
		"hidden":        hidden,
		"manuallyAdded": manuallyAdded,
	}
	return result
}

func queryGameByID(id int) map[string]interface{} {
	row := db.QueryRow("SELECT id, executable, name, icon, coverImage, totalPlaytime, favorite, lastPlayed, firstSeen, hidden, manuallyAdded FROM games WHERE id = ?", id)
	var gameID, totalPlaytime, favorite, hidden, manuallyAdded int
	var executable, name, icon, coverImage, lastPlayed, firstSeen sql.NullString

	err := row.Scan(&gameID, &executable, &name, &icon, &coverImage, &totalPlaytime, &favorite, &lastPlayed, &firstSeen, &hidden, &manuallyAdded)
	if err != nil {
		return nil
	}

	result := map[string]interface{}{
		"id":            gameID,
		"executable":    executable.String,
		"name":          name.String,
		"icon":          icon.String,
		"coverImage":    coverImage.String,
		"totalPlaytime": totalPlaytime,
		"favorite":      favorite,
		"lastPlayed":    lastPlayed.String,
		"firstSeen":     firstSeen.String,
		"hidden":        hidden,
		"manuallyAdded": manuallyAdded,
	}
	return result
}

func upsertGame(executable, name string) int {
	exeLower := strings.ToLower(executable)
	// Case-insensitive lookup to avoid duplicate rows for same exe
	row := db.QueryRow("SELECT id FROM games WHERE lower(executable) = ?", exeLower)
	var id int
	if err := row.Scan(&id); err == nil {
		return id
	}

	result, err := db.Exec("INSERT OR IGNORE INTO games (executable, name, firstSeen) VALUES (?, ?, datetime('now'))", exeLower, name)
	if err != nil {
		log.Printf("Error upserting game: %v", err)
		return 0
	}

	lastID, _ := result.LastInsertId()
	if lastID == 0 {
		// Row already existed due to race — fetch it
		db.QueryRow("SELECT id FROM games WHERE lower(executable) = ?", exeLower).Scan(&lastID)
	}
	return int(lastID)
}

func addGameManually(executable, name string) int {
	// Check if exists
	row := db.QueryRow("SELECT id FROM games WHERE executable = ?", executable)
	var id int
	if err := row.Scan(&id); err == nil {
		db.Exec("UPDATE games SET manuallyAdded = 1 WHERE id = ?", id)
		return id
	}

	// Insert new game
	result, err := db.Exec("INSERT INTO games (executable, name, firstSeen, manuallyAdded) VALUES (?, ?, datetime('now'), 1)", executable, name)
	if err != nil {
		log.Printf("Error adding game manually: %v", err)
		return 0
	}

	lastID, _ := result.LastInsertId()
	return int(lastID)
}

func updateGame(id int, data map[string]interface{}) error {
	// Build dynamic UPDATE query
	query := "UPDATE games SET "
	args := []interface{}{}
	first := true

	for k, v := range data {
		if !first {
			query += ", "
		}
		query += k + " = ?"
		args = append(args, v)
		first = false
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := db.Exec(query, args...)
	return err
}

func deleteGame(id int) error {
	_, err := db.Exec("DELETE FROM sessions WHERE gameId = ?", id)
	if err != nil {
		return err
	}
	_, err = db.Exec("DELETE FROM games WHERE id = ?", id)
	return err
}

// Session queries
func startSession(gameId int, startTime string) int {
	result, err := db.Exec("INSERT INTO sessions (gameId, startTime) VALUES (?, ?)", gameId, startTime)
	if err != nil {
		log.Printf("Error starting session: %v", err)
		return 0
	}
	lastID, _ := result.LastInsertId()
	return int(lastID)
}

func endSession(sessionId int, endTime string, duration int) error {
	_, err := db.Exec("UPDATE sessions SET endTime = ?, duration = ? WHERE id = ?", endTime, duration, sessionId)
	if err != nil {
		return err
	}

	// Update game's total playtime and last played
	row := db.QueryRow("SELECT gameId FROM sessions WHERE id = ?", sessionId)
	var gameId int
	if err := row.Scan(&gameId); err == nil {
		db.Exec("UPDATE games SET totalPlaytime = totalPlaytime + ?, lastPlayed = ? WHERE id = ?", duration, endTime, gameId)
	}

	return nil
}

func queryRecentSessions(limit int) []map[string]interface{} {
	query := `
	SELECT s.id, s.gameId, s.startTime, s.endTime, s.duration, g.name, g.executable, g.icon, g.coverImage
	FROM sessions s JOIN games g ON s.gameId = g.id
	WHERE s.endTime IS NOT NULL
	ORDER BY s.startTime DESC LIMIT ?
	`
	rows, err := db.Query(query, limit)
	if err != nil {
		log.Printf("Error querying recent sessions: %v", err)
		return nil
	}
	defer rows.Close()

	var sessions []map[string]interface{}
	for rows.Next() {
		var id, gameId, duration int
		var startTime, endTime, name, executable string
		var icon, coverImage sql.NullString

		if err := rows.Scan(&id, &gameId, &startTime, &endTime, &duration, &name, &executable, &icon, &coverImage); err != nil {
			continue
		}

		session := map[string]interface{}{
			"id":         id,
			"gameId":     gameId,
			"startTime":  startTime,
			"endTime":    endTime,
			"duration":   duration,
			"name":       name,
			"executable": executable,
			"icon":       icon.String,
			"coverImage": coverImage.String,
		}
		sessions = append(sessions, session)
	}

	return sessions
}

func querySessionsFiltered(filter string) []map[string]interface{} {
	where := "WHERE s.endTime IS NOT NULL"
	switch filter {
	case "today":
		where = "WHERE s.endTime IS NOT NULL AND date(s.startTime) = date('now')"
	case "week":
		where = "WHERE s.endTime IS NOT NULL AND s.startTime >= datetime('now', '-7 days')"
	case "month":
		where = "WHERE s.endTime IS NOT NULL AND s.startTime >= datetime('now', '-30 days')"
	}

	query := fmt.Sprintf(`
	SELECT s.id, s.gameId, s.startTime, s.endTime, s.duration, g.name, g.executable, g.icon, g.coverImage
	FROM sessions s JOIN games g ON s.gameId = g.id
	%s
	ORDER BY s.startTime DESC
	`, where)

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Error querying filtered sessions: %v", err)
		return nil
	}
	defer rows.Close()

	var sessions []map[string]interface{}
	for rows.Next() {
		var id, gameId, duration int
		var startTime, endTime, name, executable string
		var icon, coverImage sql.NullString

		if err := rows.Scan(&id, &gameId, &startTime, &endTime, &duration, &name, &executable, &icon, &coverImage); err != nil {
			continue
		}

		session := map[string]interface{}{
			"id":         id,
			"gameId":     gameId,
			"startTime":  startTime,
			"endTime":    endTime,
			"duration":   duration,
			"name":       name,
			"executable": executable,
			"icon":       icon.String,
			"coverImage": coverImage.String,
		}
		sessions = append(sessions, session)
	}

	return sessions
}

func queryFavorites() []map[string]interface{} {
	rows, err := db.Query("SELECT id, executable, name, icon, coverImage, totalPlaytime, favorite, lastPlayed, firstSeen, hidden, manuallyAdded FROM games WHERE favorite = 1 AND hidden = 0 ORDER BY totalPlaytime DESC")
	if err != nil {
		log.Printf("Error querying favorites: %v", err)
		return nil
	}
	defer rows.Close()
	return scanRows(rows)
}

func toggleFavorite(id int) error {
	_, err := db.Exec("UPDATE games SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END WHERE id = ?", id)
	return err
}

func queryStats() map[string]interface{} {
	stats := make(map[string]interface{})

	// Total games
	row := db.QueryRow("SELECT COUNT(*) as c FROM games WHERE hidden = 0")
	var count int
	row.Scan(&count)
	stats["totalGames"] = count

	// Total playtime
	row = db.QueryRow("SELECT COALESCE(SUM(duration), 0) as t FROM sessions WHERE endTime IS NOT NULL")
	var totalPlaytime int
	row.Scan(&totalPlaytime)
	stats["totalPlaytime"] = totalPlaytime

	// Today's playtime
	row = db.QueryRow("SELECT COALESCE(SUM(duration), 0) as t FROM sessions WHERE date(startTime) = date('now') AND endTime IS NOT NULL")
	var todayPlaytime int
	row.Scan(&todayPlaytime)
	stats["todayPlaytime"] = todayPlaytime

	// Session count
	row = db.QueryRow("SELECT COUNT(*) as c FROM sessions WHERE endTime IS NOT NULL")
	var sessionCount int
	row.Scan(&sessionCount)
	stats["sessionCount"] = sessionCount

	return stats
}

func queryWeeklyActivity() []map[string]interface{} {
	query := `
	SELECT date(startTime) as date, COALESCE(SUM(duration), 0) as totalTime, COUNT(*) as sessions
	FROM sessions WHERE startTime >= datetime('now', '-7 days') AND endTime IS NOT NULL
	GROUP BY date(startTime) ORDER BY date ASC
	`
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Error querying weekly activity: %v", err)
		return nil
	}
	defer rows.Close()

	var activity []map[string]interface{}
	for rows.Next() {
		var date string
		var totalTime, sessions int

		if err := rows.Scan(&date, &totalTime, &sessions); err != nil {
			continue
		}

		activity = append(activity, map[string]interface{}{
			"date":       date,
			"totalTime":  totalTime,
			"sessions":   sessions,
		})
	}

	return activity
}

// Cache queries
func queryCacheEntry(key string) map[string]interface{} {
	// Update last accessed
	db.Exec("UPDATE cache SET lastAccessed = datetime('now') WHERE key = ?", key)

	row := db.QueryRow("SELECT id, key, imageUrl, localPath, metadata, lastAccessed, createdAt FROM cache WHERE key = ?", key)
	var id int
	var cacheKey, imageUrl, localPath, metadata, lastAccessed, createdAt string
	var metadataNull sql.NullString

	err := row.Scan(&id, &cacheKey, &imageUrl, &localPath, &metadataNull, &lastAccessed, &createdAt)
	if err != nil {
		return nil
	}

	if metadataNull.Valid {
		metadata = metadataNull.String
	}

	return map[string]interface{}{
		"id":           id,
		"key":          cacheKey,
		"imageUrl":     imageUrl,
		"localPath":    localPath,
		"metadata":     metadata,
		"lastAccessed": lastAccessed,
		"createdAt":    createdAt,
	}
}

func setCacheEntry(key, imageUrl, localPath, metadata string) error {
	_, err := db.Exec("INSERT OR REPLACE INTO cache (key, imageUrl, localPath, metadata) VALUES (?, ?, ?, ?)",
		key, imageUrl, localPath, metadata)
	return err
}

func cleanCache(days int) int {
	result, err := db.Exec(fmt.Sprintf("DELETE FROM cache WHERE lastAccessed < datetime('now', '-%d days')", days))
	if err != nil {
		return 0
	}
	rows, _ := result.RowsAffected()
	return int(rows)
}

// Settings queries
func querySetting(key string) string {
	row := db.QueryRow("SELECT value FROM settings WHERE key = ?", key)
	var value string
	if err := row.Scan(&value); err != nil {
		return ""
	}
	return value
}

func setSetting(key, value string) error {
	_, err := db.Exec("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", key, value)
	return err
}

func queryAllSettings() map[string]string {
	rows, err := db.Query("SELECT key, value FROM settings")
	if err != nil {
		log.Printf("Error querying all settings: %v", err)
		return nil
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		settings[key] = value
	}
	return settings
}

// Helper function to scan rows into maps
func scanRows(rows *sql.Rows) []map[string]interface{} {
	var results []map[string]interface{}

	cols, _ := rows.Columns()
	for rows.Next() {
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range cols {
			columnPointers[i] = &columns[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			continue
		}

		entry := make(map[string]interface{})
		for i, col := range cols {
			var v interface{}
			val := columns[i]
			b, ok := val.([]byte)
			if ok {
				v = string(b)
			} else {
				v = val
			}
			entry[col] = v
		}

		results = append(results, entry)
	}

	return results
}

// Export functions
func exportToJSON(filter string) string {
	sessions := querySessionsFiltered(filter)
	data, err := json.MarshalIndent(sessions, "", "  ")
	if err != nil {
		return ""
	}
	return string(data)
}

func exportToCSV(filter string) string {
	sessions := querySessionsFiltered(filter)
	if len(sessions) == 0 {
		return ""
	}

	// Get headers from first row
	var headers []string
	firstRow := sessions[0]
	for k := range firstRow {
		headers = append(headers, k)
	}

	csv := ""
	for i, h := range headers {
		if i > 0 {
			csv += ","
		}
		csv += h
	}
	csv += "\n"

	// Add rows
	for _, row := range sessions {
		for i, h := range headers {
			if i > 0 {
				csv += ","
			}
			val := fmt.Sprintf("%v", row[h])
			csv += "\"" + val + "\""
		}
		csv += "\n"
	}

	return csv
}


func getCacheEntry(key string) map[string]interface{} {
	row := db.QueryRow("SELECT key, imageUrl, localPath, metadata FROM cache WHERE key = ?", key)
	var k, imageUrl, localPath, metadata string
	if err := row.Scan(&k, &imageUrl, &localPath, &metadata); err != nil {
		return nil
	}
	return map[string]interface{}{"key": k, "imageUrl": imageUrl, "localPath": localPath, "metadata": metadata}
}

func updateGameImages(id int, icon, coverImage string) {
	db.Exec("UPDATE games SET icon = ?, coverImage = ? WHERE id = ?", icon, coverImage, id)
}
