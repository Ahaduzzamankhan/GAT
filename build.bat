@echo off
setlocal

echo ============================================
echo  GAT Build Script
echo ============================================
echo.

:: 1. Build the Wails app
echo [1/2] Building Wails app...
wails build -platform windows/amd64 -o GAT.exe
if %ERRORLEVEL% neq 0 (
    echo ERROR: wails build failed.
    pause & exit /b 1
)
echo       Done: build\bin\GAT.exe

echo.

:: 2. Build the Inno Setup installer (optional — skip if ISCC not found)
echo [2/2] Building installer...
set ISCC_PATH=
for %%p in (
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    "C:\Program Files\Inno Setup 6\ISCC.exe"
    "C:\Program Files (x86)\Inno Setup 5\ISCC.exe"
) do (
    if exist %%p set ISCC_PATH=%%~p
)

if "%ISCC_PATH%"=="" (
    echo       ISCC.exe not found — skipping installer.
    echo       Install Inno Setup 6 from: https://jrsoftware.org/isinfo.php
) else (
    mkdir installer 2>nul
    "%ISCC_PATH%" installer.iss
    if %ERRORLEVEL% neq 0 (
        echo ERROR: Inno Setup compilation failed.
    ) else (
        echo       Done: installer\GAT-Setup-1.0.0.exe
    )
)

echo.
echo ============================================
echo  Build complete!
echo  Portable:  build\bin\GAT.exe
echo  Installer: installer\GAT-Setup-1.0.0.exe
echo ============================================
pause
