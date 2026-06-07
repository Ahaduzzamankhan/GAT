package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
)

func main() {
	// Initialize database
	userDataPath := getUserDataPath()
	dbPath := filepath.Join(userDataPath, "gat.db")
	
	if err := initDatabase(dbPath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer closeDatabase()
	
	// Create output directory for PowerShell scripts
	tmpDir := os.TempDir()
	gpuScriptPath := filepath.Join(tmpDir, "gat-gpu.ps1")
	dllScriptPath := filepath.Join(tmpDir, "gat-dll.ps1")
	writePsScripts(gpuScriptPath, dllScriptPath)
	
	// Initialize game registry
	initGameRegistry()
	
	// Start tracking
	interval := 6000 * time.Millisecond
	if setting := querySetting("scanInterval"); setting != "" {
		var ms int64
		fmt.Sscanf(setting, "%d", &ms)
		interval = time.Duration(ms) * time.Millisecond
	}
	startTracking(interval)
	defer stopTracking()
	
	// Update tray menu periodically
	go updateTrayMenu()
	
	// Setup HTTP routes
	mux := http.NewServeMux()
	
	// Database handlers
	mux.HandleFunc("POST /db/getAllGames", handleGetAllGames)
	mux.HandleFunc("POST /db/getStats", handleGetStats)
	mux.HandleFunc("POST /db/getFavorites", handleGetFavorites)
	mux.HandleFunc("POST /db/getRecentSessions", handleGetRecentSessions)
	mux.HandleFunc("POST /db/getSessionsFiltered", handleGetSessionsFiltered)
	mux.HandleFunc("POST /db/getWeeklyActivity", handleGetWeeklyActivity)
	mux.HandleFunc("POST /db/toggleFavorite", handleToggleFavorite)
	mux.HandleFunc("POST /db/updateGame", handleUpdateGame)
	mux.HandleFunc("POST /db/addGameManually", handleAddGameManually)
	mux.HandleFunc("POST /db/deleteGame", handleDeleteGame)
	mux.HandleFunc("POST /db/getCurrentlyPlaying", handleGetCurrentlyPlaying)
	mux.HandleFunc("POST /db/getActiveSessions", handleGetActiveSessions)
	
	// Settings handlers
	mux.HandleFunc("POST /settings/getAll", handleGetAllSettings)
	mux.HandleFunc("POST /settings/set", handleSetSetting)
	
	// Metadata handlers
	mux.HandleFunc("POST /metadata/fetch", handleFetchMetadata)
	mux.HandleFunc("POST /metadata/getImage", handleGetImage)
	
	// Cache handlers
	mux.HandleFunc("POST /cache/clean", handleCleanCache)
	
	// Export handlers
	mux.HandleFunc("POST /export/json", handleExportJSON)
	mux.HandleFunc("POST /export/csv", handleExportCSV)
	
	// System handlers
	mux.HandleFunc("POST /system/getStats", handleGetSystemStats)
	mux.HandleFunc("POST /app/getIcon", handleGetAppIcon)
	
	// Window handlers (no-op for backend)
	mux.HandleFunc("POST /window/minimize", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("POST /window/maximize", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("POST /window/close", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	
	// Shell handlers
	mux.HandleFunc("POST /shell/openExternal", handleOpenExternal)
	mux.HandleFunc("POST /notification/show", handleShowNotification)
	
	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	
	// Create HTTP server
	server := &http.Server{
		Addr:         ":29029", // Use a specific port
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	
	log.Printf("Starting GAT backend server on %s", server.Addr)
	
	// Run server in goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v", err)
		}
	}()
	
	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan
	
	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	server.Shutdown(ctx)
}

func getUserDataPath() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("Failed to get home directory: %v", err)
	}
	appDataPath := filepath.Join(homeDir, "AppData", "Roaming", "GAT")
	os.MkdirAll(appDataPath, 0755)
	return appDataPath
}
