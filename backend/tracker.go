package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// Config
const (
	GPU_SAMPLE_MS   = 4000
	GPU_SUSTAIN_SEC = 12
	GPU_THRESHOLD   = 15
	TRACK_INTERVAL  = 6000
)

var (
	activeSessions = make(map[string]*ActiveSession)
	trackingTicker *time.Ticker = nil
	gpuTicker      *time.Ticker = nil

	systemBlocklist = []string{
		"explorer.exe", "svchost.exe", "lsass.exe", "csrss.exe", "winlogon.exe", "services.exe",
		"smss.exe", "system", "registry", "dwm.exe", "taskhostw.exe", "conhost.exe", "fontdrvhost.exe",
		"spoolsv.exe", "searchhost.exe", "searchindexer.exe", "ctfmon.exe", "sihost.exe",
		"runtimebroker.exe", "applicationframehost.exe", "wuauclt.exe", "taskmgr.exe",
		"regedit.exe", "dllhost.exe", "audiodg.exe", "wmiprvse.exe", "nissrv.exe",
		"wsl.exe", "wslhost.exe", "wslservice.exe", "vmmemwsl", "vmmem",
		"msmpeng.exe", "securityhealthsystray.exe", "securityhealthservice.exe",
		"smartscreen.exe", "startmenuexperiencehost.exe", "shellexperiencehost.exe",
		"lockapp.exe", "textinputhost.exe", "inputmethod.exe", "tabletinputservice.exe",
		"usoclient.exe", "musnotification.exe", "musnotificationux.exe",
		"srtasks.exe", "compattelrunner.exe", "wsqmcons.exe", "wermgr.exe", "werhost.exe",
		"msiexec.exe", "setup.exe", "install.exe", "uninstall.exe", "uninst.exe",
		"perfmon.exe", "mmc.exe", "msconfig.exe", "msinfo32.exe", "eventvwr.exe",
		"systemsettings.exe", "settingssynchost.exe",
		"dxdiag.exe", "winver.exe", "osk.exe", "magnify.exe", "narrator.exe",
		"cmd.exe", "powershell.exe", "powershell_ise.exe", "wt.exe", "windowsterminal.exe",
		"chrome.exe", "firefox.exe", "msedge.exe", "opera.exe", "brave.exe", "vivaldi.exe",
		"node.exe", "electron.exe", "code.exe", "devenv.exe", "rider64.exe", "idea64.exe",
		"git.exe", "github desktop.exe", "githubdesktop.exe",
		"python.exe", "python3.exe", "pythonw.exe", "javaws.exe",
		"discord.exe", "slack.exe", "teams.exe", "zoom.exe", "skype.exe", "telegram.exe",
		"spotify.exe", "vlc.exe", "wmplayer.exe", "mpv.exe",
		"gimp-2.10.exe", "inkscape.exe", "krita.exe", "figma.exe",
		"photoshop.exe", "illustrator.exe", "premiere.exe", "aftereffects.exe",
		"davinciresolve.exe", "obs64.exe", "obs32.exe", "obs.exe",
		"steam.exe", "steamwebhelper.exe", "steamservice.exe", "steamtriage.exe",
		"epicgameslauncher.exe", "easyanticheat_launcher.exe", "eacservice.exe",
		"easyanticheat.exe", "easyanticheateos.exe",
		"origin.exe", "eadesktop.exe", "eabackgroundservice.exe",
		"upc.exe", "ubisoftconnect.exe",
		"gog galaxy.exe", "goggalaxy.exe", "galaxyclient.exe",
		"battlenet.exe", "battle.net.exe",
		"xboxapp.exe", "xboxpcapp.exe", "gamingservices.exe", "gamingservicesnet.exe",
		"gamebar.exe", "gamebarft.exe", "gamebarftserver.exe",
		"playnite.exe", "playnite.fullscreenapp.exe", "heroic.exe", "itchio.exe", "itch.exe",
		"vortex.exe", "nexusmods.exe",
		"fraps.exe", "msiafterburner.exe", "rivatuner.exe", "rtss.exe",
		"nvcplui.exe", "nvcontainer.exe", "nvdisplay.container.exe",
		"battleye.exe", "becllient.exe", "vgc.exe", "vanguard.exe", "faceitclient.exe",
		"notepad.exe", "notepad++.exe", "wordpad.exe", "calc.exe", "mspaint.exe",
		"onedrive.exe", "dropbox.exe", "googledrivesync.exe",
		"winrar.exe", "7z.exe", "7zfm.exe", "winzip64.exe",
		"acrobat.exe", "acrord32.exe",
		"lghub.exe", "ghub.exe", "synapse3.exe", "razersynapse.exe", "icue.exe",
		"mbam.exe", "malwarebytes.exe", "avast.exe", "avgui.exe",
		"procexp.exe", "procexp64.exe", "procmon.exe", "autoruns.exe",
		"gat.exe", "everything.exe", "yourphone.exe", "phonelinkprocess.exe",
		"microsoftedgeupdate.exe", "googleupdate.exe", "blender.exe",
	}

	systemPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)^gamebar`),
		regexp.MustCompile(`(?i)^gameinput`),
		regexp.MustCompile(`(?i)gaming(service|overlay)`),
		regexp.MustCompile(`(?i)^xbox(app|pcapp|gaming)`),
		regexp.MustCompile(`(?i)anticheat`),
		regexp.MustCompile(`(?i)battleye`),
		regexp.MustCompile(`(?i)crash(handler|reporter|pad|dump)`),
		regexp.MustCompile(`(?i)^steam(web|service|crash|triage|update|repair)`),
		regexp.MustCompile(`(?i)^ea(crash|update|background|launch)`),
		regexp.MustCompile(`(?i)^nvidia\s?(share|geforce)`),
		regexp.MustCompile(`(?i)^nvcontainer`),
		regexp.MustCompile(`(?i)^nvdisplay`),
		regexp.MustCompile(`(?i)^amd(dvr|ow|rsserv)`),
		regexp.MustCompile(`(?i)update(r|service|daemon)?$`),
		regexp.MustCompile(`(?i)^updater`),
		regexp.MustCompile(`(?i)(install|setup|uninstall|uninst)(er|ation)?$`),
		regexp.MustCompile(`(?i)^(vc_redist|directx|dxsetup|dotnet)`),
		regexp.MustCompile(`(?i)tray(app)?$`),
		regexp.MustCompile(`(?i)systray$`),
		regexp.MustCompile(`(?i)background(task|service|process)?$`),
	}

	ambiguousExes = map[string]bool{
		"javaw.exe":   true,
		"java.exe":    true,
		"wine.exe":    true,
		"wine64.exe":  true,
	}
)

type ProcessInfo struct {
	PID       int
	Name      string // lowercase .exe
	ExeName   string // original casing
	Path      string
	WindowTitle string
}

type ActiveSession struct {
	SessionID  int
	GameID     int
	StartTime  string
	Executable string
	PID        int
}

func startTracking(interval time.Duration) {
	if trackingTicker != nil {
		return
	}

	trackingTicker = time.NewTicker(interval)

	go func() {
		for range trackingTicker.C {
			trackGames()
		}
	}()
}

func stopTracking() {
	if trackingTicker != nil {
		trackingTicker.Stop()
		trackingTicker = nil
	}

	// End all active sessions
	for key, session := range activeSessions {
		endSession(session.SessionID, time.Now().Format(time.RFC3339), int(time.Since(parseTime(session.StartTime)).Seconds()))
		delete(activeSessions, key)
	}
}

func trackGames() {
	// Get list of running processes
	processes := getRunningProcesses()

	// Check for new games
	for _, proc := range processes {
		key := fmt.Sprintf("%s:%d", strings.ToLower(proc.Name), proc.PID)

		if _, exists := activeSessions[key]; !exists {
			// Check if this is a game
			if isGame(proc) {
				// Start tracking
				gameID := upsertGame(proc.ExeName, proc.Name)
				sessionID := startSession(gameID, time.Now().Format(time.RFC3339))

				activeSessions[key] = &ActiveSession{
					SessionID:  sessionID,
					GameID:     gameID,
					StartTime:  time.Now().Format(time.RFC3339),
					Executable: proc.ExeName,
					PID:        proc.PID,
				}

				log.Printf("Started tracking %s (PID: %d)", proc.Name, proc.PID)
			}
		}
	}

	// Check for ended sessions
	runningPIDs := make(map[int]bool)
	for _, proc := range processes {
		runningPIDs[proc.PID] = true
	}

	for key, session := range activeSessions {
		if !runningPIDs[session.PID] {
			// Process ended
			duration := int(time.Since(parseTime(session.StartTime)).Seconds())
			endSession(session.SessionID, time.Now().Format(time.RFC3339), duration)
			delete(activeSessions, key)
			log.Printf("Stopped tracking session %d", session.SessionID)
		}
	}
}

func getRunningProcesses() []ProcessInfo {
	var processes []ProcessInfo

	// Use tasklist to get all processes
	cmd := exec.Command("tasklist.exe", "/v", "/fo", "csv")
	output, err := cmd.Output()
	if err != nil {
		log.Printf("Error getting process list: %v", err)
		return processes
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines[1:] { // Skip header
		if line == "" {
			continue
		}

		fields := strings.Split(line, ",")
		if len(fields) < 3 {
			continue
		}

		name := strings.Trim(strings.Trim(fields[0], "\""), " ")
		var pid int
		fmt.Sscanf(strings.TrimSpace(fields[1]), "%d", &pid)

		if pid == 0 || name == "" {
			continue
		}

		processes = append(processes, ProcessInfo{
			PID:     pid,
			Name:    strings.ToLower(name),
			ExeName: name,
			Path:    "", // Would need additional query for full path
		})
	}

	return processes
}

func isGame(proc ProcessInfo) bool {
	// Check if in blocklist
	for _, blocked := range systemBlocklist {
		if strings.ToLower(proc.Name) == strings.ToLower(blocked) {
			return false
		}
	}

	// Check patterns
	for _, pattern := range systemPatterns {
		if pattern.MatchString(proc.Name) {
			return false
		}
	}

	// Check with registry/game detection
	return detectAuthorizedGame(proc.ExeName) || !isSystemProcess(proc.Name)
}

func isSystemProcess(name string) bool {
	// Simple heuristic - if it's in system directories, likely system process
	systemDirs := []string{
		"system32", "syswow64", "systemapps", "windowsapps",
	}

	nameLower := strings.ToLower(name)
	for _, dir := range systemDirs {
		if strings.Contains(nameLower, dir) {
			return true
		}
	}

	return false
}

func getCurrentlyPlaying() []string {
	var playing []string
	seenGames := make(map[int]bool)

	for _, session := range activeSessions {
		if !seenGames[session.GameID] {
			game := queryGameByID(session.GameID)
			if game != nil {
				playing = append(playing, game["name"].(string))
				seenGames[session.GameID] = true
			}
		}
	}

	return playing
}

func getActiveSessions() []map[string]interface{} {
	var sessions []map[string]interface{}

	for _, session := range activeSessions {
		game := queryGameByID(session.GameID)
		if game != nil {
			sessions = append(sessions, map[string]interface{}{
				"sessionId":   session.SessionID,
				"gameId":      session.GameID,
				"startTime":   session.StartTime,
				"executable":  session.Executable,
				"name":        game["name"],
				"icon":        game["icon"],
				"coverImage":  game["coverImage"],
			})
		}
	}

	return sessions
}

func updateTrayMenu() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Would update system tray in production
		// For now, just a no-op
		_ = getCurrentlyPlaying()
	}
}

func parseTime(timeStr string) time.Time {
	t, _ := time.Parse(time.RFC3339, timeStr)
	return t
}

func writePsScripts(gpuScriptPath, dllScriptPath string) {
	gpuScript := `$counters = Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction SilentlyContinue
if (-not $counters) { exit }
$result = @{}
foreach ($s in $counters.CounterSamples) {
  if ($s.CookedValue -lt 0.5) { continue }
  if ($s.Path -notmatch 'pid_(\\d+)') { continue }
  $pid = [int]$Matches[1]
  if ($s.Path -notmatch 'engtype_3D') { continue }
  if ($result.ContainsKey($pid)) { $result[$pid] += $s.CookedValue }
  else { $result[$pid] = $s.CookedValue }
}
foreach ($kv in $result.GetEnumerator()) {
  Write-Output "$($kv.Key)=$([math]::Round($kv.Value,1))"
}`

	dllScript := `param([string]$Pids, [string]$Dlls)
$pidList = $Pids -split ',' | ForEach-Object { [int]$_ }
$dllList = $Dlls -split ','
$out = @()
foreach ($pid in $pidList) {
  try {
    $proc = Get-Process -Id $pid -ErrorAction Stop
    $mods = $proc.Modules | Select-Object -ExpandProperty ModuleName -ErrorAction SilentlyContinue
    foreach ($dll in $dllList) {
      if ($mods -contains $dll) { $out += $pid; break }
    }
  } catch {}
}
Write-Output ($out -join ',')`

	os.WriteFile(gpuScriptPath, []byte(gpuScript), 0644)
	os.WriteFile(dllScriptPath, []byte(dllScript), 0644)
}
