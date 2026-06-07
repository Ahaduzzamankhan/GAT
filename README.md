# GAT - Game Activity Tracker

A desktop application for tracking game activity on Windows.

## Development

### Prerequisites
- Node.js 16+
- Go 1.21+
- Windows 10+

### Setup
```bash
npm install
```

### Development Mode

**Terminal 1 - Frontend (Vite):**
```bash
npm run dev:renderer
```

**Terminal 2 - Backend (Go):**
```bash
npm run dev:backend
```

**Terminal 3 - Main Process (TypeScript):**
```bash
npm run dev:main
```

**Terminal 4 - Launch Electron:**
```bash
npm run electron
```

Or run all in one with:
```bash
npm run dev
```

## Build

```bash
npm run build      # Build Go backend, React frontend, and Electron main
npm run dist       # Build installer
npm run build:win  # Build Windows installer
```

## Architecture

GAT uses a modern multi-process architecture:

- **Electron Main Process** (`src/main/`): Window management, spawns backend
- **Go Backend** (`backend/`): HTTP server for all business logic
  - Database operations (SQLite)
  - Game process tracking and monitoring
  - Metadata fetching and caching
  - System statistics collection
- **React Renderer** (`src/renderer/`): Frontend UI
  - Real-time game monitoring
  - Session history and statistics
  - Settings and preferences
  - TailwindCSS + Framer Motion for styling and animation

### Process Flow
1. Electron main process starts
2. Go backend spawned as HTTP server (port 29029)
3. React frontend loads
4. Frontend communicates with backend via HTTP fetch
5. Backend manages database, tracking, and system integration

### Why Go Backend?
- **Performance**: Compiled language with lower memory footprint
- **Reliability**: Better Windows process monitoring
- **Maintainability**: Cleaner separation of concerns
- **Scalability**: Easy to add new features or use backend independently

## Database

SQLite at `%APPDATA%/GAT/gat.db`

Tables:
- `games`: Game metadata and statistics
- `sessions`: Play session history
- `cache`: Steam metadata cache
- `settings`: User preferences

## Game Detection

Games are identified through:
1. **Authorized Games Registry** (`backend/games.go`): Known games with special handling
2. **Process Blocklist**: System processes filtered out
3. **Pattern Matching**: Regex patterns for game detection
4. **Windows Monitoring**: Real-time process tracking via tasklist

## Features

- 🎮 **Real-time Tracking**: Automatically detects when games start/stop
- 📊 **Statistics**: Total playtime, daily/weekly activity charts
- 🎯 **Favorites**: Mark games as favorites
- 🖼️ **Artwork**: Automatic Steam metadata and cover art
- ⚙️ **System Tray**: Minimize to system tray
- 📤 **Export**: Export game sessions as JSON or CSV
- 🔔 **Notifications**: System notifications for game activity (optional)

## Configuration

Settings stored in database:
- Start with Windows
- Minimize to tray
- Notifications
- UI theme
- Scan interval (ms)
- Cache duration (days)

## Assets Required

Place these files in `src/assets/`:
- `icon.ico` (Windows icon, 256x256)
- `icon.png` (PNG icon)
- `tray-icon.png` (Tray icon, 16x16 or 32x32)

## Troubleshooting

### Backend won't start
```bash
# Check if port 29029 is available
netstat -ano | findstr :29029

# Try rebuilding
npm run build:backend
```

### Games not detecting
1. Check if game executable is in Windows blocklist
2. Verify game is not in authorized games registry
3. Check database for manual game additions

### Database corruption
```bash
# Backup and delete database, it will be recreated
del %APPDATA%\GAT\gat.db
```

## Documentation

- [Backend Documentation](backend/README.md)
- [Migration Guide (TypeScript → Go)](MIGRATION.md)

## License

MIT

