@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%openclaw-codex-bridge.mjs" %*
exit /b %ERRORLEVEL%
