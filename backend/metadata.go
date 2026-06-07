package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func getCacheDir() string {
	userDataPath := getUserDataPath()
	cacheDir := filepath.Join(userDataPath, "cache", "images")
	os.MkdirAll(cacheDir, 0755)
	return cacheDir
}

func downloadImage(url, filename string) (string, error) {
	localPath := filepath.Join(getCacheDir(), filename)

	// Return if already exists
	if _, err := os.Stat(localPath); err == nil {
		return localPath, nil
	}

	// Download image
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download image: %d", resp.StatusCode)
	}

	// Write to file
	file, err := os.Create(localPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	if _, err := io.Copy(file, resp.Body); err != nil {
		return "", err
	}

	return localPath, nil
}

type SteamAppListResponse struct {
	AppList struct {
		Apps []struct {
			AppID int    `json:"appid"`
			Name  string `json:"name"`
		} `json:"apps"`
	} `json:"applist"`
}

func fetchSteamAppID(gameName string) (int, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("steam_appid_%s", strings.ToLower(strings.ReplaceAll(gameName, " ", "_")))
	if cached := queryCacheEntry(cacheKey); cached != nil {
		if metadata, ok := cached["metadata"].(string); ok && metadata != "" {
			var data map[string]interface{}
			if err := json.Unmarshal([]byte(metadata), &data); err == nil {
				if appID, ok := data["appId"].(float64); ok {
					return int(appID), nil
				}
			}
		}
	}

	// Fetch from Steam API
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get("https://api.steampowered.com/ISteamApps/GetAppList/v2/")
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("steam api error: %d", resp.StatusCode)
	}

	var steamResp SteamAppListResponse
	if err := json.NewDecoder(resp.Body).Decode(&steamResp); err != nil {
		return 0, err
	}

	// Normalize game name by removing non-alphanumeric characters
	normalizedName := ""
	for _, r := range gameName {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			normalizedName += string(r)
		} else if r >= 'A' && r <= 'Z' {
			normalizedName += string(r - 'A' + 'a')
		}
	}

	// Find best match
	for _, app := range steamResp.AppList.Apps {
		normalizedApp := ""
		for _, r := range app.Name {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
				normalizedApp += string(r)
			} else if r >= 'A' && r <= 'Z' {
				normalizedApp += string(r - 'A' + 'a')
			}
		}

		if normalizedApp == normalizedName {
			// Cache the result
			metadataJSON, _ := json.Marshal(map[string]int{"appId": app.AppID})
			setCacheEntry(cacheKey, "", "", string(metadataJSON))
			return app.AppID, nil
		}
	}

	return 0, fmt.Errorf("game not found on steam")
}

func fetchGameMetadata(gameID int, gameName, executable string) error {
	cacheKey := fmt.Sprintf("metadata_%s", strings.TrimSuffix(strings.ToLower(executable), ".exe"))

	// Check if already cached
	if queryCacheEntry(cacheKey) != nil {
		return nil
	}

	// Try to fetch Steam App ID
	appID, err := fetchSteamAppID(gameName)
	if err != nil {
		// Mark as no data available
		metadataJSON, _ := json.Marshal(map[string]bool{"noData": true})
		setCacheEntry(cacheKey, "", "", string(metadataJSON))
		return nil
	}

	// Download images
	iconURL := fmt.Sprintf("https://cdn.cloudflare.steamstatic.com/steam/apps/%d/capsule_231x87.jpg", appID)
	coverURL := fmt.Sprintf("https://cdn.cloudflare.steamstatic.com/steam/apps/%d/library_600x900.jpg", appID)

	iconPath, _ := downloadImage(iconURL, fmt.Sprintf("icon_%d.jpg", appID))
	coverPath, _ := downloadImage(coverURL, fmt.Sprintf("cover_%d.jpg", appID))

	// Update game with image paths
	if iconPath != "" {
		updateGame(gameID, map[string]interface{}{"icon": iconPath})
	}
	if coverPath != "" {
		updateGame(gameID, map[string]interface{}{"coverImage": coverPath})
	}

	// Cache metadata
	metadataJSON, _ := json.Marshal(map[string]int{"appId": appID})
	setCacheEntry(cacheKey, "", iconPath, string(metadataJSON))

	return nil
}

func getSystemStats() map[string]interface{} {
	stats := make(map[string]interface{})
	stats["cpu"] = 0
	stats["ram"] = 0
	stats["ramUsedMB"] = 0
	stats["ramTotalMB"] = 0
	stats["gpu"] = 0
	stats["gpuName"] = "GPU"

	// Try to get CPU usage via wmic
	cmd := exec.Command("cmd", "/c", "wmic cpu get loadpercentage /value")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.Contains(line, "LoadPercentage") {
				parts := strings.Split(line, "=")
				if len(parts) == 2 {
					var cpu int
					fmt.Sscanf(strings.TrimSpace(parts[1]), "%d", &cpu)
					stats["cpu"] = cpu
				}
			}
		}
	}

	// Try to get memory usage via wmic
	cmd = exec.Command("cmd", "/c", "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /value")
	output, err = cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		var free, total int64

		for _, line := range lines {
			if strings.Contains(line, "FreePhysicalMemory") {
				parts := strings.Split(line, "=")
				if len(parts) == 2 {
					fmt.Sscanf(strings.TrimSpace(parts[1]), "%d", &free)
				}
			}
			if strings.Contains(line, "TotalVisibleMemorySize") {
				parts := strings.Split(line, "=")
				if len(parts) == 2 {
					fmt.Sscanf(strings.TrimSpace(parts[1]), "%d", &total)
				}
			}
		}

		if total > 0 {
			ramUsed := ((total - free) / total) * 100
			stats["ram"] = ramUsed
			stats["ramUsedMB"] = (total - free) / 1024
			stats["ramTotalMB"] = total / 1024
		}
	}

	return stats
}
