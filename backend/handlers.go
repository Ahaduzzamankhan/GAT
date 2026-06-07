package main

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
)

func writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// Database handlers
func handleGetAllGames(w http.ResponseWriter, r *http.Request) {
	games := queryAllGames()
	if games == nil {
		games = []map[string]interface{}{}
	}
	writeJSON(w, games)
}

func handleGetStats(w http.ResponseWriter, r *http.Request) {
	stats := queryStats()
	writeJSON(w, stats)
}

func handleGetFavorites(w http.ResponseWriter, r *http.Request) {
	favorites := queryFavorites()
	if favorites == nil {
		favorites = []map[string]interface{}{}
	}
	writeJSON(w, favorites)
}

func handleGetRecentSessions(w http.ResponseWriter, r *http.Request) {
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
		if l, ok := req["limit"].(float64); ok {
			limit = int(l)
		}
	}

	sessions := queryRecentSessions(limit)
	if sessions == nil {
		sessions = []map[string]interface{}{}
	}
	writeJSON(w, sessions)
}

func handleGetSessionsFiltered(w http.ResponseWriter, r *http.Request) {
	filter := ""
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
		if f, ok := req["filter"].(string); ok {
			filter = f
		}
	}

	sessions := querySessionsFiltered(filter)
	if sessions == nil {
		sessions = []map[string]interface{}{}
	}
	writeJSON(w, sessions)
}

func handleGetWeeklyActivity(w http.ResponseWriter, r *http.Request) {
	activity := queryWeeklyActivity()
	if activity == nil {
		activity = []map[string]interface{}{}
	}
	writeJSON(w, activity)
}

func handleToggleFavorite(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := int(req["id"].(float64))
	if err := toggleFavorite(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]bool{"success": true})
}

func handleUpdateGame(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := int(req["id"].(float64))
	data := req["data"].(map[string]interface{})

	if err := updateGame(id, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]bool{"success": true})
}

func handleAddGameManually(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	executable := req["executable"].(string)
	name := req["name"].(string)

	id := addGameManually(executable, name)
	writeJSON(w, map[string]int{"id": id})
}

func handleDeleteGame(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := int(req["id"].(float64))
	if err := deleteGame(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]bool{"success": true})
}

func handleGetCurrentlyPlaying(w http.ResponseWriter, r *http.Request) {
	playing := getCurrentlyPlaying()
	writeJSON(w, playing)
}

func handleGetActiveSessions(w http.ResponseWriter, r *http.Request) {
	sessions := getActiveSessions()
	if sessions == nil {
		sessions = []map[string]interface{}{}
	}
	writeJSON(w, sessions)
}

// Settings handlers
func handleGetAllSettings(w http.ResponseWriter, r *http.Request) {
	settings := queryAllSettings()
	writeJSON(w, settings)
}

func handleSetSetting(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	key := req["key"].(string)
	value := req["value"].(string)

	if err := setSetting(key, value); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]bool{"success": true})
}

// Metadata handlers
func handleFetchMetadata(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	gameId := int(req["gameId"].(float64))
	gameName := req["gameName"].(string)
	executable := req["executable"].(string)

	go func() {
		if err := fetchGameMetadata(gameId, gameName, executable); err != nil {
			log.Printf("Error fetching metadata: %v", err)
		}
	}()

	writeJSON(w, map[string]bool{"success": true})
}

func handleGetImage(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	imagePath := req["imagePath"].(string)
	base64 := getImageAsBase64(imagePath)

	writeJSON(w, map[string]string{"base64": base64})
}

// Cache handlers
func handleCleanCache(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	days := int(req["days"].(float64))
	count := cleanCache(days)

	writeJSON(w, map[string]int{"cleaned": count})
}

// Export handlers
func handleExportJSON(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	json.NewDecoder(r.Body).Decode(&req)

	filter := ""
	if f, ok := req["filter"].(string); ok {
		filter = f
	}

	sessions := querySessionsFiltered(filter)
	if sessions == nil {
		sessions = []map[string]interface{}{}
	}
	
	jsonStr, _ := json.MarshalIndent(sessions, "", "  ")
	writeJSON(w, map[string]string{"data": string(jsonStr)})
}

func handleExportCSV(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	json.NewDecoder(r.Body).Decode(&req)

	filter := ""
	if f, ok := req["filter"].(string); ok {
		filter = f
	}

	data := exportToCSV(filter)
	writeJSON(w, map[string]string{"data": data})
}

// System handlers
func handleGetSystemStats(w http.ResponseWriter, r *http.Request) {
	stats := getSystemStats()
	writeJSON(w, stats)
}

func handleGetAppIcon(w http.ResponseWriter, r *http.Request) {
	// Return a placeholder or empty for now
	// In production, you'd load the actual icon
	writeJSON(w, map[string]string{"icon": ""})
}

// Shell handlers
func handleOpenExternal(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	url := req["url"].(string)
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	}

	if cmd != nil {
		cmd.Start()
	}

	writeJSON(w, map[string]bool{"success": true})
}

func handleShowNotification(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	title := req["title"].(string)
	body := req["body"].(string)

	// Only show if notifications are enabled
	if querySetting("notifications") == "true" {
		// Windows notification - would use go-toast or similar in production
		log.Printf("Notification: %s - %s", title, body)
	}

	writeJSON(w, map[string]bool{"success": true})
}

// Utility function to get image as base64
func getImageAsBase64(imagePath string) string {
	if imagePath == "" {
		return ""
	}

	data, err := os.ReadFile(imagePath)
	if err != nil {
		return ""
	}

	ext := filepath.Ext(imagePath)
	if ext == ".jpg" {
		ext = ".jpeg"
	}
	if ext == "" {
		ext = ".png"
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	return "data:image/" + ext[1:] + ";base64," + encoded
}
