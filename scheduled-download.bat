@echo off
REM Turkish Medicine API - Scheduled Download Script
REM This script downloads the latest medicine data from TITCK

REM Change to the script's directory
cd /d "%~dp0"
if not exist logs mkdir logs

REM Log the start time
echo [%date% %time%] Starting scheduled download... >> logs\scheduler.log

REM Run the download script
call node src/downloader.js >> logs\scheduler.log 2>&1
set "DOWNLOAD_EXIT_CODE=%ERRORLEVEL%"

REM Log the completion
echo [%date% %time%] Download finished with exit code %DOWNLOAD_EXIT_CODE%. >> logs\scheduler.log
echo. >> logs\scheduler.log
exit /b %DOWNLOAD_EXIT_CODE%
