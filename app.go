package main

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/getlantern/systray"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed build/appicon.png
var appIcon []byte

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	userDataPath := getUserDataPath()
	dbPath := filepath.Join(userDataPath, "gat.db")

	if err := initDatabase(dbPath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	tmpDir := os.TempDir()
	writePsScripts(
		filepath.Join(tmpDir, "gat-gpu.ps1"),
		filepath.Join(tmpDir, "gat-dll.ps1"),
	)

	initGameRegistry()
	initSampler()

	interval := 6000 * time.Millisecond
	if setting := querySetting("scanInterval"); setting != "" {
		var ms int64
		fmt.Sscanf(setting, "%d", &ms)
		if ms > 0 {
			interval = time.Duration(ms) * time.Millisecond
		}
	}
	startTracking(interval)

	// Start system tray in a goroutine
	go a.setupSystray()
}

func (a *App) shutdown(ctx context.Context) {
	stopTracking()
	closeDatabase()
	systray.Quit()
}

// ── Window controls ──────────────────────────────────────────────────────────

func (a *App) WindowMinimize() {
	runtime.WindowMinimise(a.ctx)
}

func (a *App) WindowMaximize() {
	if runtime.WindowIsMaximised(a.ctx) {
		runtime.WindowUnmaximise(a.ctx)
	} else {
		runtime.WindowMaximise(a.ctx)
	}
}

func (a *App) WindowClose() {
	if querySetting("minimizeToTray") == "true" {
		runtime.WindowHide(a.ctx)
	} else {
		runtime.Quit(a.ctx)
	}
}

func (a *App) WindowQuit() {
	systray.Quit()
	runtime.Quit(a.ctx)
}

// ── System Tray ──────────────────────────────────────────────────────────────

func (a *App) setupSystray() {
	systray.Run(a.onTrayReady, a.onTrayExit)
}

func (a *App) onTrayReady() {
	systray.SetIcon(appIcon)
	systray.SetTooltip("GAT - Game Activity Tracker")

	mShow := systray.AddMenuItem("Show GAT", "Restore GAT window")
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Quit GAT")

	for {
		select {
		case <-mShow.ClickedCh:
			runtime.WindowShow(a.ctx)
		case <-mQuit.ClickedCh:
			systray.Quit()
			runtime.Quit(a.ctx)
			return
		}
	}
}

func (a *App) onTrayExit() {
	// Clean up if needed
}

// ── DB ───────────────────────────────────────────────────────────────────────

func (a *App) GetAllGames() []map[string]interface{} {
	games := queryAllGames()
	if games == nil {
		return []map[string]interface{}{}
	}
	return games
}

func (a *App) GetStats() map[string]interface{} {
	return queryStats()
}

func (a *App) GetFavorites() []map[string]interface{} {
	favs := queryFavorites()
	if favs == nil {
		return []map[string]interface{}{}
	}
	return favs
}

func (a *App) GetRecentSessions(limit int) []map[string]interface{} {
	if limit <= 0 {
		limit = 20
	}
	sessions := queryRecentSessions(limit)
	if sessions == nil {
		return []map[string]interface{}{}
	}
	return sessions
}

func (a *App) GetSessionsFiltered(filter string) []map[string]interface{} {
	sessions := querySessionsFiltered(filter)
	if sessions == nil {
		return []map[string]interface{}{}
	}
	return sessions
}

func (a *App) GetWeeklyActivity() []map[string]interface{} {
	activity := queryWeeklyActivity()
	if activity == nil {
		return []map[string]interface{}{}
	}
	return activity
}

func (a *App) ToggleFavorite(id int) bool {
	return toggleFavorite(id) == nil
}

func (a *App) UpdateGame(id int, data map[string]interface{}) bool {
	return updateGame(id, data) == nil
}

func (a *App) AddGameManually(executable string, name string) int {
	return addGameManually(executable, name)
}

func (a *App) DeleteGame(id int) bool {
	return deleteGame(id) == nil
}

func (a *App) GetCurrentlyPlaying() []string {
	playing := getCurrentlyPlaying()
	if playing == nil {
		return []string{}
	}
	return playing
}

func (a *App) GetActiveSessions() []map[string]interface{} {
	sessions := getActiveSessions()
	if sessions == nil {
		return []map[string]interface{}{}
	}
	return sessions
}

// ── Settings ─────────────────────────────────────────────────────────────────

func (a *App) GetAllSettings() map[string]string {
	settings := queryAllSettings()
	if settings == nil {
		return map[string]string{
			"startWithWindows": "false",
			"minimizeToTray":   "true",
			"notifications":    "true",
			"theme":            "dark",
			"trackingEnabled":  "true",
			"scanInterval":     "5000",
			"cacheDuration":    "30",
		}
	}
	return settings
}

func (a *App) SetSetting(key string, value string) bool {
	return setSetting(key, value) == nil
}

// ── Metadata ─────────────────────────────────────────────────────────────────

func (a *App) FetchMetadata(gameId int, gameName string, executable string) bool {
	go func() {
		if err := fetchGameMetadata(gameId, gameName, executable); err != nil {
			log.Printf("Error fetching metadata: %v", err)
		}
	}()
	return true
}

func (a *App) GetImage(imagePath string) string {
	return getImageAsBase64(imagePath)
}

// ── Cache ─────────────────────────────────────────────────────────────────────

func (a *App) CleanCache(days int) int {
	return cleanCache(days)
}

// ── Export ────────────────────────────────────────────────────────────────────

func (a *App) ExportJSON(filter string) string {
	sessions := querySessionsFiltered(filter)
	if sessions == nil {
		return "[]"
	}
	b, _ := jsonMarshalIndent(sessions)
	return string(b)
}

func (a *App) ExportCSV(filter string) string {
	return exportToCSV(filter)
}

// ── System ────────────────────────────────────────────────────────────────────

func (a *App) GetSystemStats() map[string]interface{} {
	return getSystemStats()
}

// ── Updater ───────────────────────────────────────────────────────────────────

func (a *App) CheckForUpdate() map[string]interface{} {
	info, err := CheckForUpdate()
	if err != nil {
		return map[string]interface{}{"error": err.Error(), "available": false}
	}
	return map[string]interface{}{
		"available":      info.Available,
		"currentVersion": info.CurrentVersion,
		"latestVersion":  info.LatestVersion,
		"releaseNotes":   info.ReleaseNotes,
		"downloadURL":    info.DownloadURL,
		"assetName":      info.AssetName,
		"assetSize":      info.AssetSize,
	}
}

func (a *App) DownloadAndApplyUpdate(downloadURL, latestVersion, assetName string, assetSize int64) map[string]interface{} {
	info := &UpdateInfo{
		DownloadURL:   downloadURL,
		LatestVersion: latestVersion,
		AssetName:     assetName,
		AssetSize:     assetSize,
	}

	progressCh, errCh := DownloadAndApplyUpdate(info)

	// Stream progress events to the frontend via Wails events
	go func() {
		for pct := range progressCh {
			runtime.EventsEmit(a.ctx, "update:progress", pct)
		}
	}()

	// Wait for completion
	if err := <-errCh; err != nil {
		return map[string]interface{}{"success": false, "error": err.Error()}
	}

	// For zip updates, we need to quit so the bat can swap the exe
	go func() {
		time.Sleep(500 * time.Millisecond)
		runtime.Quit(a.ctx)
	}()

	return map[string]interface{}{"success": true}
}

func (a *App) GetAppVersion() string {
	return AppVersion
}

// ── Shell ─────────────────────────────────────────────────────────────────────

func (a *App) OpenExternal(url string) bool {
	runtime.BrowserOpenURL(a.ctx, url)
	return true
}

func (a *App) ShowNotification(title string, body string) bool {
	if querySetting("notifications") == "true" {
		log.Printf("Notification: %s — %s", title, body)
	}
	return true
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func getUserDataPath() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("Failed to get home directory: %v", err)
	}
	appDataPath := filepath.Join(homeDir, "AppData", "Roaming", "GAT")
	os.MkdirAll(appDataPath, 0755)
	return appDataPath
}
