@echo off
REM Turkish Medicine API - Scheduled Download Script
REM This script downloads the latest medicine data from TITCK

REM Change to the script's directory
cd /d "%~dp0"

REM Log the start time
echo [%date% %time%] Starting scheduled download... >> logs\scheduler.log

REM Run the download script
node src/downloader.js >> logs\scheduler.log 2>&1

REM Log the completion
echo [%date% %time%] Download completed. >> logs\scheduler.log
echo. >> logs\scheduler.log
