# GAT — Game Activity Tracker (Wails)

Converted from Electron + separate Go HTTP backend to a single **Wails v2** app.

## Architecture

```
GAT-wails/
├── main.go          # Wails entry point
├── app.go           # App struct — all bound Go methods
├── database.go      # SQLite queries
├── tracker.go       # Game process tracking
├── sysinfo.go       # CPU/RAM/GPU via PDH (persistent sampler)
├── metadata.go      # IGDB/Steam metadata fetching
├── games.go         # Game registry
├── helpers.go       # Utility functions
├── go.mod
├── wails.json
└── frontend/        # React + Vite + Tailwind
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/renderer/
        ├── api.ts   # Calls window.go.main.App.* (Wails bindings)
        ├── App.tsx
        ├── components/
        ├── pages/
        └── hooks/
```

## Requirements

- Go 1.22+
- Node 18+
- Wails v2 CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- WebView2 (ships with Windows 10 1903+ / auto-installed by Wails installer)

## Dev

```bat
wails dev
```

Starts the Wails dev server with hot reload. The React frontend refreshes on save.

## Build

```bat
wails build
```

Outputs a single `build\bin\GAT.exe` — no separate backend process, no Node, no Electron.

### Production binary size

Wails produces ~10–15MB vs Electron's ~150MB+.

## What changed from the Electron version

| Electron | Wails |
|---|---|
| `src/main/index.ts` | `main.go` + `app.go` |
| `src/main/preload.ts` | Wails injects bindings automatically |
| HTTP `fetch` to `:29029` | Direct `window.go.main.App.<Method>()` calls |
| `window.electronAPI.minimize()` | `app.WindowMinimize()` via Wails runtime |
| `WebkitAppRegion: drag` | `--wails-draggable: drag` CSS var |
| Separate `gat-backend.exe` | Compiled into the single exe |
| `electron-builder` | `wails build` |

## Tray / minimize-to-tray

Wails v2 doesn't have native system tray support built-in. For tray icon, add
[github.com/getlantern/systray](https://github.com/getlantern/systray) and call it
from `app.go` startup. The close button currently hides the window (`WindowHide`);
call `WindowQuit` to exit fully, or wire the tray to show/hide.
