package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type SteamAppList struct {
	Applist struct {
		Apps []struct {
			Appid int    `json:"appid"`
			Name  string `json:"name"`
		} `json:"apps"`
	} `json:"applist"`
}

var steamAppList []struct {
	Appid int    `json:"appid"`
	Name  string `json:"name"`
}

var lastSteamFetch time.Time

func ensureSteamAppList() {
	if len(steamAppList) > 0 && time.Since(lastSteamFetch) < 24*time.Hour {
		return
	}
	resp, err := http.Get("https://api.steampowered.com/ISteamApps/GetAppList/v2/")
	if err != nil {
		return
	}
	defer resp.Body.Close()
	var list SteamAppList
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		return
	}
	steamAppList = list.Applist.Apps
	lastSteamFetch = time.Now()
}

func findSteamAppID(gameName string) int {
	ensureSteamAppList()
	nameLower := strings.ToLower(gameName)
	for _, app := range steamAppList {
		if strings.ToLower(app.Name) == nameLower {
			return app.Appid
		}
	}
	for _, app := range steamAppList {
		if strings.Contains(strings.ToLower(app.Name), nameLower) {
			return app.Appid
		}
	}
	return 0
}

func fetchGameMetadata(gameId int, gameName, executable string) error {
	userDataPath := getUserDataPath()
	cacheDir := filepath.Join(userDataPath, "cache")
	os.MkdirAll(cacheDir, 0755)

	cacheKey := strings.ToLower(strings.ReplaceAll(gameName, " ", "_"))
	if existing := getCacheEntry(cacheKey); existing != nil {
		return nil
	}

	appID := findSteamAppID(gameName)
	if appID == 0 {
		return fmt.Errorf("game not found on Steam: %s", gameName)
	}

	iconURL := fmt.Sprintf("https://cdn.cloudflare.steamstatic.com/steam/apps/%d/header.jpg", appID)
	iconPath := filepath.Join(cacheDir, fmt.Sprintf("%d_header.jpg", appID))

	if err := downloadFile(iconURL, iconPath); err != nil {
		return fmt.Errorf("failed to download icon: %v", err)
	}

	updateGameImages(gameId, iconPath, iconPath)

	metadataJSON, _ := json.Marshal(map[string]int{"appId": appID})
	setCacheEntry(cacheKey, "", iconPath, string(metadataJSON))
	return nil
}

func downloadFile(url, destPath string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}
	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, resp.Body)
	return err
}

func runPS(script string) (string, error) {
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.Output()
	return string(out), err
}

func getSystemStats() map[string]interface{} {
	stats := map[string]interface{}{
		"cpu":        0,
		"ram":        0,
		"ramUsedMB":  0,
		"ramTotalMB": 0,
		"gpu":        0,
		"gpuName":    "GPU",
	}

	script := `
$cpu = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average)
$os  = Get-CimInstance Win32_OperatingSystem
$free  = $os.FreePhysicalMemory
$total = $os.TotalVisibleMemorySize
$ramPct   = if ($total -gt 0) { [math]::Round(($total - $free) / $total * 100) } else { 0 }
$ramUsed  = [math]::Round(($total - $free) / 1024)
$ramTotal = [math]::Round($total / 1024)
$gpu     = 0
$gpuName = "GPU"
try { $gpuName = (Get-CimInstance Win32_VideoController | Select-Object -First 1).Name } catch {}
try {
  $samples = (Get-Counter "\GPU Engine(*)\Utilization Percentage" -ErrorAction Stop).CounterSamples
  $sum = ($samples | Where-Object { $_.Path -match "engtype_3D" } | Measure-Object CookedValue -Sum).Sum
  $gpu = [math]::Round($sum)
  if ($gpu -gt 100) { $gpu = 100 }
} catch {}
Write-Output "cpu=$cpu"
Write-Output "ram=$ramPct"
Write-Output "ramUsed=$ramUsed"
Write-Output "ramTotal=$ramTotal"
Write-Output "gpu=$gpu"
Write-Output "gpuName=$gpuName"
`

	out, err := runPS(script)
	if err != nil {
		return stats
	}

	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		line = strings.TrimRight(line, "\r")
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		switch key {
		case "cpu":
			if v, e := strconv.Atoi(val); e == nil {
				stats["cpu"] = v
			}
		case "ram":
			if v, e := strconv.Atoi(val); e == nil {
				stats["ram"] = v
			}
		case "ramUsed":
			if v, e := strconv.Atoi(val); e == nil {
				stats["ramUsedMB"] = v
			}
		case "ramTotal":
			if v, e := strconv.Atoi(val); e == nil {
				stats["ramTotalMB"] = v
			}
		case "gpu":
			if v, e := strconv.Atoi(val); e == nil {
				stats["gpu"] = v
			}
		case "gpuName":
			if val != "" {
				stats["gpuName"] = val
			}
		}
	}

	return stats
}