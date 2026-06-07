package main

import (
	"regexp"
	"strings"
)

type AuthorizedGameFeature struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type AuthorizedGameAssets struct {
	Icon       string `json:"icon"`
	Banner     string `json:"banner"`
	Logo       string `json:"logo,omitempty"`
	Background string `json:"background,omitempty"`
}

type AuthorizedGame struct {
	ID               string
	Name             string
	Executables      []string
	ProcessPatterns  []*regexp.Regexp
	Assets           AuthorizedGameAssets
	Features         []AuthorizedGameFeature
	Genre            string
	Developer        string
	Publisher        string
	Website          string
	Color            string
	AccentColor      string
}

var authorizedGames = map[string]*AuthorizedGame{
	"minecraft": {
		ID:          "minecraft",
		Name:        "Minecraft",
		Executables: []string{"minecraft.exe", "minecraftlauncher.exe", "javaw.exe"},
		ProcessPatterns: []*regexp.Regexp{
			regexp.MustCompile("(?i)minecraft"),
			regexp.MustCompile("(?i)\\.minecraft"),
			regexp.MustCompile("(?i)multimc"),
			regexp.MustCompile("(?i)prism.?launcher"),
			regexp.MustCompile("(?i)atlauncher"),
			regexp.MustCompile("(?i)curseforge"),
			regexp.MustCompile("(?i)modrinth"),
			regexp.MustCompile("(?i)technic"),
			regexp.MustCompile("(?i)ftb.?app"),
		},
		Assets: AuthorizedGameAssets{
			Icon:   "https://www.minecraft.net/content/dam/games/minecraft/key-art/MC_The_Wild_Update-_Warden_Face_ArtBoard_1.jpg",
			Banner: "https://www.minecraft.net/content/dam/games/minecraft/key-art/MC-Marketing-Keyart-NewEra.jpg",
			Logo:   "https://www.minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/img/minecraft-creeper-face.png",
		},
		Genre:       "Sandbox / Survival",
		Developer:   "Mojang Studios",
		Publisher:   "Microsoft",
		Website:     "https://minecraft.net",
		Color:       "#5A7C3C",
		AccentColor: "#62B300",
	},
	"roblox": {
		ID:          "roblox",
		Name:        "Roblox",
		Executables: []string{"robloxplayerbeta.exe", "robloxstudio.exe", "robloxplayer.exe"},
		ProcessPatterns: []*regexp.Regexp{
			regexp.MustCompile("(?i)roblox"),
		},
		Assets: AuthorizedGameAssets{
			Icon:   "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Roblox_Logo_2022.svg/512px-Roblox_Logo_2022.svg.png",
			Banner: "https://cdn2.steamgriddb.com/hero/9e3cfc48ca6b8f63bcdb03ad8e685651.png",
		},
		Genre:       "Platform / Metaverse",
		Developer:   "Roblox Corporation",
		Publisher:   "Roblox Corporation",
		Website:     "https://roblox.com",
		Color:       "#E2231A",
		AccentColor: "#FF4136",
	},
	"gtav": {
		ID:          "gtav",
		Name:        "Grand Theft Auto V",
		Executables: []string{"gta5.exe", "gtav.exe", "grandtheftautov.exe"},
		ProcessPatterns: []*regexp.Regexp{
			regexp.MustCompile("(?i)gta.?5|gtav|grand.*theft.*auto.*v"),
		},
		Assets: AuthorizedGameAssets{
			Icon:   "https://upload.wikimedia.org/wikipedia/en/a/a5/GTA_V.png",
			Banner: "https://cdn2.steamgriddb.com/hero/b6d767d2f8ed5d21a44b0e5886680cb9.png",
		},
		Genre:       "Open World / Action",
		Developer:   "Rockstar North",
		Publisher:   "Rockstar Games",
		Website:     "https://www.rockstargames.com/gta-v",
		Color:       "#1A1A2E",
		AccentColor: "#F7C900",
	},
	"rdr2": {
		ID:          "rdr2",
		Name:        "Red Dead Redemption 2",
		Executables: []string{"rdr2.exe", "reddeadredemption2.exe"},
		ProcessPatterns: []*regexp.Regexp{
			regexp.MustCompile("(?i)rdr2|red.*dead.*redemption.*2"),
		},
		Assets: AuthorizedGameAssets{
			Icon:   "https://upload.wikimedia.org/wikipedia/en/4/43/Red_Dead_Redemption_II_cover.png",
			Banner: "https://cdn2.steamgriddb.com/hero/fd18b29bef541549b1c5ba46d2248351.png",
		},
		Genre:       "Open World / Action Adventure",
		Developer:   "Rockstar Games",
		Publisher:   "Rockstar Games",
		Website:     "https://www.rockstargames.com/reddeadredemption2",
		Color:       "#8B0000",
		AccentColor: "#DC143C",
	},
}

func initGameRegistry() {
	// Regex patterns already compiled in struct definitions
}

func detectAuthorizedGame(executable string) bool {
	exeLower := strings.ToLower(executable)

	for _, game := range authorizedGames {
		// Check by exact executable name
		for _, exe := range game.Executables {
			if strings.EqualFold(executable, exe) {
				return true
			}
		}

		// Check by pattern
		for _, pattern := range game.ProcessPatterns {
			if pattern.MatchString(exeLower) {
				return true
			}
		}
	}

	return false
}

func getAuthorizedGame(name string) *AuthorizedGame {
	nameLower := strings.ToLower(name)

	for _, game := range authorizedGames {
		if strings.EqualFold(game.Name, name) {
			return game
		}

		for _, pattern := range game.ProcessPatterns {
			if pattern.MatchString(nameLower) {
				return game
			}
		}
	}

	return nil
}
