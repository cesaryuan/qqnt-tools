@echo off

@REM Run uninstall.ps1 with PowerShell
SET mypath=%~dp0
CD /D %mypath%
Powershell.exe -executionpolicy remotesigned -File "uninstall.ps1"

pause