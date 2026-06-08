package main

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

const (
	AppVersion    = "1.0.1"
	GitHubOwner   = "Ahaduzzamankhan"
	GitHubRepo    = "GAT"
	UpdaterAPIURL = "https://api.github.com/repos/" + GitHubOwner + "/" + GitHubRepo + "/releases/latest"
)

type GitHubRelease struct {
	TagName string `json:"tag_name"`
	Name    string `json:"name"`
	Body    string `json:"body"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
		Size               int64  `json:"size"`
	} `json:"assets"`
}

type UpdateInfo struct {
	Available      bool   `json:"available"`
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseNotes   string `json:"releaseNotes"`
	DownloadURL    string `json:"downloadURL"`
	AssetName      string `json:"assetName"`
	AssetSize      int64  `json:"assetSize"`
}

// normalizeVersion strips leading "v" so "v1.2.3" == "1.2.3"
func normalizeVersion(v string) string {
	return strings.TrimPrefix(strings.TrimSpace(v), "v")
}

// CheckForUpdate fetches the latest GitHub release and compares its tag to AppVersion.
func CheckForUpdate() (*UpdateInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, _ := http.NewRequest("GET", UpdaterAPIURL, nil)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "GAT/"+AppVersion)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("network error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return &UpdateInfo{Available: false, CurrentVersion: AppVersion}, nil
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("parse error: %w", err)
	}

	latest := normalizeVersion(release.TagName)
	current := normalizeVersion(AppVersion)

	info := &UpdateInfo{
		Available:      latest != current && latest != "",
		CurrentVersion: current,
		LatestVersion:  latest,
		ReleaseNotes:   release.Body,
	}

	// Find the Windows x64 asset: prefer .exe installer, fall back to .zip
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if strings.Contains(name, "windows") || strings.Contains(name, "win") || strings.HasSuffix(name, ".exe") || strings.HasSuffix(name, ".zip") {
			info.DownloadURL = asset.BrowserDownloadURL
			info.AssetName = asset.Name
			info.AssetSize = asset.Size
			// Prefer installer exe over zip
			if strings.HasSuffix(name, ".exe") {
				break
			}
		}
	}

	// Fallback: first asset if nothing Windows-specific found
	if info.DownloadURL == "" && len(release.Assets) > 0 {
		info.DownloadURL = release.Assets[0].BrowserDownloadURL
		info.AssetName = release.Assets[0].Name
		info.AssetSize = release.Assets[0].Size
	}

	return info, nil
}

// DownloadAndApplyUpdate downloads the release asset and applies it:
//   - .exe installer → runs it silently (Inno Setup /silent flag)
//   - .zip           → extracts GAT.exe next to current exe, then relaunches
//
// Returns a progress channel (0–100) and an error channel.
func DownloadAndApplyUpdate(info *UpdateInfo) (<-chan int, <-chan error) {
	progress := make(chan int, 10)
	errCh := make(chan error, 1)

	go func() {
		defer close(progress)
		defer close(errCh)

		if info.DownloadURL == "" {
			errCh <- fmt.Errorf("no download URL in release")
			return
		}

		// Download to temp file
		tmpDir := os.TempDir()
		tmpPath := filepath.Join(tmpDir, "GAT_update_"+info.LatestVersion+"_"+info.AssetName)

		if err := downloadWithProgress(info.DownloadURL, tmpPath, info.AssetSize, progress); err != nil {
			errCh <- fmt.Errorf("download failed: %w", err)
			return
		}

		progress <- 95

		assetLower := strings.ToLower(info.AssetName)

		if strings.HasSuffix(assetLower, ".exe") {
			// Inno Setup installer — run silently; it handles replacing the exe
			if err := runInstaller(tmpPath); err != nil {
				errCh <- err
				return
			}
		} else if strings.HasSuffix(assetLower, ".zip") {
			if err := applyZipUpdate(tmpPath); err != nil {
				errCh <- err
				return
			}
		} else {
			errCh <- fmt.Errorf("unsupported asset type: %s", info.AssetName)
			return
		}

		progress <- 100
	}()

	return progress, errCh
}

func downloadWithProgress(url, destPath string, totalSize int64, progress chan<- int) error {
	client := &http.Client{Timeout: 10 * time.Minute}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "GAT/"+AppVersion)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("server returned %d", resp.StatusCode)
	}

	if totalSize == 0 {
		totalSize = resp.ContentLength
	}

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	buf := make([]byte, 32*1024)
	var downloaded int64
	lastPct := 0

	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := out.Write(buf[:n]); werr != nil {
				return werr
			}
			downloaded += int64(n)
			if totalSize > 0 {
				pct := int(downloaded * 90 / totalSize)
				if pct > lastPct {
					lastPct = pct
					select {
					case progress <- pct:
					default:
					}
				}
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}

	return nil
}

// runInstaller launches an Inno Setup /silent installer.
// It does NOT wait — Inno Setup will replace the exe and relaunch if configured.
func runInstaller(exePath string) error {
	cmd := hiddenCmd(exePath, "/silent", "/norestart")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000,
	}
	return cmd.Start() // don't wait — it will kill us and replace the exe
}

// applyZipUpdate extracts GAT.exe from the zip, writes a helper .bat that
// waits for this process to exit, copies the new exe over, and relaunches.
func applyZipUpdate(zipPath string) error {
	// Find the new exe inside the zip
	newExeData, err := extractExeFromZip(zipPath)
	if err != nil {
		return err
	}

	currentExe, err := os.Executable()
	if err != nil {
		return err
	}
	currentExe, _ = filepath.EvalSymlinks(currentExe)

	// Write new exe to a temp location next to current exe
	dir := filepath.Dir(currentExe)
	pendingPath := filepath.Join(dir, "GAT_pending.exe")
	if err := os.WriteFile(pendingPath, newExeData, 0755); err != nil {
		return fmt.Errorf("write pending exe: %w", err)
	}

	// Write a .bat that waits, swaps, relaunches
	batPath := filepath.Join(dir, "GAT_update.bat")
	pid := os.Getpid()
	script := fmt.Sprintf(`@echo off
:wait
tasklist /fi "PID eq %d" 2>nul | find "%d" >nul
if not errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait
)
move /y "%s" "%s"
start "" "%s"
del "%%~f0"
`, pid, pid, pendingPath, currentExe, currentExe)

	if err := os.WriteFile(batPath, []byte(script), 0755); err != nil {
		return err
	}

	// Launch the bat hidden and exit
	updaterCmd := hiddenCmd("cmd.exe", "/c", batPath)
	if err := updaterCmd.Start(); err != nil {
		return err
	}

	log.Println("Update downloaded — relaunching after exit")
	return nil
}

func extractExeFromZip(zipPath string) ([]byte, error) {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, err
	}
	defer r.Close()

	for _, f := range r.File {
		name := strings.ToLower(filepath.Base(f.Name))
		if name == "gat.exe" || name == "gat-amd64.exe" {
			rc, err := f.Open()
			if err != nil {
				return nil, err
			}
			defer rc.Close()
			return io.ReadAll(rc)
		}
	}
	return nil, fmt.Errorf("GAT.exe not found inside zip")
}

// platformAssetName returns the expected asset name suffix for the current OS/arch.
func platformAssetName() string {
	os_ := runtime.GOOS
	arch := runtime.GOARCH
	if os_ == "windows" && arch == "amd64" {
		return "windows-amd64"
	}
	return os_ + "-" + arch
}
