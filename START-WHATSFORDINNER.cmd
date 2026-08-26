@echo off
setlocal
rem Double-click launcher for the What's For Dinner desktop app.
cd /d "%~dp0"
rem `node --version` (not `where node`): the WindowsApps App Execution Alias
rem stub answers `where` but only opens the Microsoft Store when run.
node --version >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this computer.
  echo Install it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
node scripts\desktop.js %*
pause
