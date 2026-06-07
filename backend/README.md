# GAT Backend (Go)

The GAT backend is now implemented in Go, replacing the previous Electron main process implementation. This provides better performance, lower resource usage, and cleaner separation of concerns.

## Architecture

### Process Structure
- **Electron Main Process** (`src/main/index.ts`): Handles window management and spawns the Go backend
- **Go Backend** (`backend/main.go`): Runs as a separate HTTP server on `http://localhost:29029`
- **React Frontend** (`src/renderer/`): Communicates with Go backend via HTTP fetch API

### API Endpoints

The Go backend exposes the following HTTP endpoints (all POST):

#### Database Operations
- `POST /db/getAllGames` - Get all games
- `POST /db/getStats` - Get statistics
- `POST /db/getFavorites` - Get favorite games
- `POST /db/getRecentSessions` - Get recent sessions
- `POST /db/getSessionsFiltered` - Get filtered sessions
- `POST /db/getWeeklyActivity` - Get weekly activity data
- `POST /db/toggleFavorite` - Toggle game favorite status
- `POST /db/updateGame` - Update game data
- `POST /db/addGameManually` - Manually add a game
- `POST /db/deleteGame` - Delete a game
- `POST /db/getCurrentlyPlaying` - Get currently playing games
- `POST /db/getActiveSessions` - Get active game sessions

#### Settings
- `POST /settings/getAll` - Get all settings
- `POST /settings/set` - Set a setting

#### Metadata
- `POST /metadata/fetch` - Fetch game metadata from Steam
- `POST /metadata/getImage` - Get image as base64

#### Cache
- `POST /cache/clean` - Clean old cache entries

#### Export
- `POST /export/json` - Export sessions as JSON
- `POST /export/csv` - Export sessions as CSV

#### System
- `POST /system/getStats` - Get system statistics (CPU, RAM, GPU)
- `POST /app/getIcon` - Get app icon

#### Utility
- `POST /shell/openExternal` - Open external URL
- `POST /notification/show` - Show system notification

## Building

### Prerequisites
- Go 1.21 or later
- Windows (for native compilation)

### Build Commands

**Windows (batch script):**
```bash
build-backend.bat
```

**Manual build:**
```bash
cd backend
go mod tidy
set GOOS=windows
set GOARCH=amd64
go build -o gat-backend.exe .
```

**Cross-platform (bash):**
```bash
./build-backend.sh
```

## Running

### Development Mode
```bash
# Terminal 1: Start Go backend
cd backend
go run .

# Terminal 2: Start Electron dev server
npm run dev:renderer

# Terminal 3: Start Electron main process watcher
npm run dev:main

# Terminal 4: Run Electron
npm run electron
```

### Production Build
```bash
npm run build
npm start
```

## Database

The Go backend uses SQLite for data persistence:
- **Location**: `%APPDATA%\GAT\gat.db`
- **Tables**: games, sessions, cache, settings

### Schema
- **games**: Game metadata and statistics
- **sessions**: Play sessions for tracking
- **cache**: Steam metadata cache
- **settings**: User configuration

## Game Detection

Games are detected by:
1. **Authorized Games Registry** (`games.go`): Known games with special handling
2. **Blocklist**: System processes are filtered out
3. **Pattern Matching**: Regex patterns for game detection

## Features

### Tracking
- Real-time game process monitoring
- Session start/end detection
- Total playtime calculation
- Last played tracking

### Metadata
- Steam API integration for game metadata
- Image downloading and caching
- Metadata persistence

### System Integration
- Windows process monitoring via tasklist
- CPU/RAM/GPU usage monitoring
- System tray integration
- Game favorites management

## File Structure

```
backend/
├── main.go           # Entry point and HTTP server
├── database.go       # SQLite database operations
├── handlers.go       # HTTP request handlers
├── tracker.go        # Game tracking and monitoring
├── metadata.go       # Game metadata fetching
├── games.go          # Authorized games registry
├── go.mod            # Go module definition
└── go.sum            # Go dependencies lock file
```

## Performance Improvements Over TypeScript Backend

1. **Lower Memory Usage**: Go is compiled and has smaller runtime overhead
2. **Faster Startup**: No Node.js runtime initialization
3. **Better Process Detection**: Native Windows API access
4. **Efficient Concurrency**: Go's goroutines vs Node.js event loop
5. **Smaller Distribution**: Single executable vs Node modules

## Configuration

Settings are stored in the SQLite database and include:
- `startWithWindows`: Auto-start behavior
- `minimizeToTray`: Minimize to system tray
- `notifications`: Enable/disable notifications
- `theme`: UI theme selection
- `trackingEnabled`: Enable/disable game tracking
- `scanInterval`: Milliseconds between game checks
- `cacheDuration`: Days to keep cache entries

## Troubleshooting

### Backend not starting
1. Check if port 29029 is available
2. Ensure Go backend executable exists in expected location
3. Check Windows Event Viewer for errors

### Games not detecting
1. Verify game executable in blocklist isn't preventing detection
2. Check if game is in authorized games registry
3. Review process name vs game name matching

### Database errors
1. Check file permissions on `%APPDATA%\GAT\`
2. Ensure disk space available
3. Check for corrupted database file

## Future Improvements

- [ ] Replace process monitoring with Windows Event Log
- [ ] Add native Windows notifications
- [ ] Implement cloud sync
- [ ] Add more game-specific tracking features
- [ ] Performance profiling and optimization
