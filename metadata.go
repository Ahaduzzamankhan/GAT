package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ── Steam app list ────────────────────────────────────────────────────────────

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
	resp, err := httpGet("https://api.steampowered.com/ISteamApps/GetAppList/v2/")
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

// ── Known non-Steam games ─────────────────────────────────────────────────────
// Direct CDN URLs for games that are never on Steam.

var knownGames = map[string]string{
	"minecraft":           "https://www.minecraft.net/content/dam/games/minecraft/key-art/MC_The-Wild-Update_540x300.jpg",
	"minecraft launcher":  "https://www.minecraft.net/content/dam/games/minecraft/key-art/MC_The-Wild-Update_540x300.jpg",
	"roblox":              "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Roblox_logo.png/480px-Roblox_logo.png",
	"robloxplayerbeta":    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Roblox_logo.png/480px-Roblox_logo.png",
	"fortnite":            "https://cdn2.unrealengine.com/Fortnite%2Foverview%2Fchapter-5%2FBR-LandingPage-Season-Keyart-1920x1080-d57a5da5a2de.jpg",
	"epicgameslauncher":   "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Epic_Games_logo.svg/480px-Epic_Games_logo.svg.png",
	"league of legends":   "https://www.leagueoflegends.com/static/open-graph-2e582ae9fae8b0b396ca46ff21fd47a8.jpg",
	"valorant":            "https://www.valorant.com/valorant-game/valorant-og-image.jpg",
	"genshin impact":      "https://uploadstatic.mihoyo.com/contentweb/20220209/2022020918362827373.jpg",
	"genshinimpact":       "https://uploadstatic.mihoyo.com/contentweb/20220209/2022020918362827373.jpg",
	"battle.net":          "https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt59b98ebf53ed8c34/60b66a2ce6a6e660a2c0f53a/BattleNet-OG.jpg",
	"battlenet launcher":  "https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt59b98ebf53ed8c34/60b66a2ce6a6e660a2c0f53a/BattleNet-OG.jpg",
	"overwatch 2":         "https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt9f8a3fa5fa3a8c68/62fdf3a7dc88517a1c77b8f2/ow2-launch-keyart-16x9.jpg",
	"warzone":             "https://www.callofduty.com/content/dam/atvi/callofduty/cod-touchui/warzone/meta-and-og/mobile-warzone-ALL-OG.jpg",
	"call of duty":        "https://www.callofduty.com/content/dam/atvi/callofduty/cod-touchui/warzone/meta-and-og/mobile-warzone-ALL-OG.jpg",
	"apex legends":        "https://media.contentapi.ea.com/content/dam/apex-legends/images/2019/01/apex-featured-image-16x9.jpg.adapt.1920w.jpg",
	"origin":              "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Origin_Logo.svg/480px-Origin_Logo.svg.png",
	"ea app":              "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Origin_Logo.svg/480px-Origin_Logo.svg.png",
	"ubisoft connect":     "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/6KJx8RMAAAA4AAAAAAAABA/1920x1080/UbisoftConnect.jpg",
	"uplay":               "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/6KJx8RMAAAA4AAAAAAAABA/1920x1080/UbisoftConnect.jpg",
	"teamspeak":           "https://www.teamspeak.com/images/teamspeak_logo_social.png",
	"discord":             "https://discord.com/assets/4f9952cc96f484cc4e0fa5e80bc0aa23.png",
	"steam":               "https://store.cloudflare.steamstatic.com/public/shared/images/header/globalheader_logo.png",
}

func lookupKnownGame(name string) string {
	key := strings.ToLower(strings.TrimSuffix(strings.TrimSuffix(name, ".exe"), ".EXE"))
	key = strings.TrimSpace(key)
	if url, ok := knownGames[key]; ok {
		return url
	}
	// Partial match
	for k, u := range knownGames {
		if strings.Contains(key, k) || strings.Contains(k, key) {
			return u
		}
	}
	return ""
}

// ── RAWG (free, no key needed for basic search) ───────────────────────────────

type rawgResult struct {
	Results []struct {
		Name            string `json:"name"`
		BackgroundImage string `json:"background_image"`
	} `json:"results"`
}

func fetchFromRAWG(gameName string) (imageURL string, err error) {
	q := url.QueryEscape(gameName)
	apiURL := fmt.Sprintf("https://api.rawg.io/api/games?search=%s&page_size=3&key=", q)
	// RAWG allows keyless requests with rate limiting — works fine for a desktop app
	resp, err := httpGet(apiURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var result rawgResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	nameLower := strings.ToLower(gameName)
	for _, r := range result.Results {
		if r.BackgroundImage == "" {
			continue
		}
		if strings.Contains(strings.ToLower(r.Name), nameLower) ||
			strings.Contains(nameLower, strings.ToLower(r.Name)) {
			return r.BackgroundImage, nil
		}
	}
	if len(result.Results) > 0 && result.Results[0].BackgroundImage != "" {
		return result.Results[0].BackgroundImage, nil
	}
	return "", fmt.Errorf("not found on RAWG")
}

// ── Steam store search ────────────────────────────────────────────────────────

type steamSearchResult struct {
	Items []struct {
		Name     string `json:"name"`
		Logo     string `json:"logo"`
		AppID    string `json:"id"`
	} `json:"items"`
}

func fetchFromSteamSearch(gameName string) (imageURL string, appID string, err error) {
	q := url.QueryEscape(gameName)
	apiURL := fmt.Sprintf("https://store.steampowered.com/api/storesearch/?term=%s&l=english&cc=US", q)
	resp, err := httpGet(apiURL)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	var result steamSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", err
	}
	nameLower := strings.ToLower(gameName)
	for _, item := range result.Items {
		if strings.Contains(strings.ToLower(item.Name), nameLower) && item.Logo != "" {
			return item.Logo, item.AppID, nil
		}
	}
	return "", "", fmt.Errorf("not found via Steam search")
}

// ── Main entry point ──────────────────────────────────────────────────────────

func fetchGameMetadata(gameId int, gameName, executable string) error {
	userDataPath := getUserDataPath()
	cacheDir := filepath.Join(userDataPath, "cache")
	os.MkdirAll(cacheDir, 0755)

	cacheKey := strings.ToLower(strings.ReplaceAll(gameName, " ", "_"))
	if existing := getCacheEntry(cacheKey); existing != nil {
		return nil
	}

	ext := filepath.Ext(executable)
	baseName := strings.TrimSuffix(filepath.Base(executable), ext)
	names := dedupStrings([]string{gameName, baseName})

	var imageURL string
	var source string

	for _, name := range names {
		// 1. Known games map (instant, no network)
		if u := lookupKnownGame(name); u != "" {
			imageURL = u
			source = "known"
			break
		}

		// 2. Steam app list (exact/fuzzy match → CDN URL)
		if appID := findSteamAppID(name); appID != 0 {
			imageURL = fmt.Sprintf("https://cdn.cloudflare.steamstatic.com/steam/apps/%d/header.jpg", appID)
			source = "steam"
			break
		}

		// 3. Steam store search API
		if u, _, err := fetchFromSteamSearch(name); err == nil && u != "" {
			imageURL = u
			source = "steam-search"
			break
		}

		// 4. RAWG
		if u, err := fetchFromRAWG(name); err == nil && u != "" {
			imageURL = u
			source = "rawg"
			break
		}
	}

	if imageURL == "" {
		log.Printf("No artwork found for %q (tried known-games, Steam, RAWG)", gameName)
		// Still cache a negative result so we don't spam API calls
		setNegativeCacheEntry(cacheKey)
		return fmt.Errorf("no artwork found for: %s", gameName)
	}

	log.Printf("Fetched artwork for %q via %s", gameName, source)

	ext2 := ".jpg"
	if strings.Contains(imageURL, ".png") {
		ext2 = ".png"
	}
	iconPath := filepath.Join(cacheDir, fmt.Sprintf("%s_header%s", cacheKey, ext2))

	if err := downloadFile(imageURL, iconPath); err != nil {
		return fmt.Errorf("failed to download artwork: %v", err)
	}

	updateGameImages(gameId, iconPath, iconPath)
	metadataJSON, _ := json.Marshal(map[string]string{"source": source, "imageUrl": imageURL})
	setCacheEntry(cacheKey, imageURL, iconPath, string(metadataJSON))
	return nil
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

var httpClient = &http.Client{Timeout: 15 * time.Second}

func httpGet(url string) (*http.Response, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "GAT-GameActivityTracker/1.0")
	return httpClient.Do(req)
}

func downloadFile(url, destPath string) error {
	resp, err := httpGet(url)
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

// ── Utilities ─────────────────────────────────────────────────────────────────

func dedupStrings(ss []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range ss {
		if s != "" && !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

func setNegativeCacheEntry(key string) {
	// Cache "not found" for 7 days so we don't retry constantly
	setCacheEntry(key, "", "", `{"notFound":true}`)
}
