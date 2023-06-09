@echo off

@REM Run install.ps1 with PowerShell
SET mypath=%~dp0
CD /D %mypath%
Powershell.exe -executionpolicy remotesigned -File "install.ps1"

pause