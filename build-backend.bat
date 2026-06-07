@echo off
REM Build script for GAT Backend (Go)

if not exist "backend" (
    echo Error: backend directory not found
    exit /b 1
)

cd backend

REM Check if go is installed
where go >nul 2>nul
if errorlevel 1 (
    echo Error: Go is not installed or not in PATH
    exit /b 1
)

echo Building GAT Backend...

REM Download dependencies
go mod tidy

REM Build for Windows
set GOOS=windows
set GOARCH=amd64
go build -o gat-backend.exe .

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)

echo Build successful! Output: gat-backend.exe

cd ..
