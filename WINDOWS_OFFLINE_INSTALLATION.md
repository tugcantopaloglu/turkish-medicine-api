# Windows Server 2025 Offline Installation Guide

This guide will help you install and run the Turkish Medicine API on Windows Server 2025 without internet connection (except for downloading the XLSX file from TITCK).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Preparation (On a Machine with Internet)](#preparation-on-a-machine-with-internet)
3. [Transfer to Windows Server](#transfer-to-windows-server)
4. [Installation on Offline Server](#installation-on-offline-server)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [Setting Up Automatic Startup](#setting-up-automatic-startup)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need

1. **Windows Server 2025** (offline server)
2. **A computer with internet** (for downloading dependencies)
3. **USB drive or network share** (for transferring files)
4. **Administrator access** on Windows Server

---

## Preparation (On a Machine with Internet)

### Step 1: Download Node.js Installer

1. Go to: https://nodejs.org/
2. Download **Node.js LTS version** (Windows Installer .msi)
   - Choose: `node-v20.x.x-x64.msi` (64-bit)
3. Save to a folder called `turkish-medicine-api-bundle`

### Step 2: Get the Project Files

Download or copy this entire project to `turkish-medicine-api-bundle/app`:

```
turkish-medicine-api-bundle/
├── node-v20.x.x-x64.msi          # Node.js installer
└── app/                           # Your project
    ├── src/
    ├── data/
    ├── package.json
    ├── .env
    └── ...
```

### Step 3: Bundle Node Modules (IMPORTANT!)

On the computer with internet, package all dependencies:

**Option A: Using npm pack (Recommended)**

1. Navigate to the app folder:
```cmd
cd turkish-medicine-api-bundle\app
```

2. Install dependencies:
```cmd
npm install
```

3. The `node_modules` folder is now complete. Keep it!

**Option B: Create Offline Package**

1. Create a packages folder:
```cmd
mkdir ..\packages
```

2. Download all packages:
```cmd
npm pack express axios cheerio xlsx node-cron dotenv
```

This creates `.tgz` files you can install offline.

### Step 4: Download NSSM (Service Manager)

1. Go to: https://nssm.cc/download
2. Download the latest version (nssm-x.xx.zip)
3. Extract and copy `nssm.exe` (64-bit version from `win64` folder) to your bundle
4. Save to: `turkish-medicine-api-bundle\nssm.exe`

### Step 5: Your Complete Bundle

Your bundle should now look like this:

```
turkish-medicine-api-bundle/
├── node-v20.x.x-x64.msi           # Node.js installer
├── nssm.exe                        # Service manager
├── INSTALLATION_INSTRUCTIONS.txt   # Copy this guide
└── app/                            # Complete project with node_modules
    ├── src/
    ├── data/
    ├── node_modules/               # All dependencies (IMPORTANT!)
    ├── package.json
    ├── .env
    ├── README.md
    └── ...
```

### Step 6: Transfer to USB/Network Share

Copy the entire `turkish-medicine-api-bundle` folder to USB drive or network location.

---

## Transfer to Windows Server

1. Copy the `turkish-medicine-api-bundle` folder to Windows Server
2. Recommended location: `C:\turkish-medicine-api\`

```
C:\turkish-medicine-api\
├── node-v20.x.x-x64.msi
├── nssm.exe
└── app\
    └── (all project files)
```

---

## Installation on Offline Server

### Step 1: Install Node.js

1. Open File Explorer and navigate to `C:\turkish-medicine-api\`
2. Double-click `node-v20.x.x-x64.msi`
3. Follow the installation wizard:
   - Accept license agreement
   - Use default installation path
   - **IMPORTANT**: Check "Automatically install necessary tools"
   - Complete installation
4. Restart the server (recommended)

### Step 2: Verify Node.js Installation

1. Open Command Prompt as Administrator
2. Run:
```cmd
node --version
npm --version
```

You should see version numbers like:
```
v20.10.0
10.2.3
```

### Step 3: Verify Dependencies

Navigate to the app folder:
```cmd
cd C:\turkish-medicine-api\app
```

Check if node_modules exists:
```cmd
dir node_modules
```

If `node_modules` folder exists with packages, you're good!

If NOT, and you have `.tgz` files in a packages folder:
```cmd
npm install ..\packages\express-*.tgz
npm install ..\packages\axios-*.tgz
npm install ..\packages\cheerio-*.tgz
npm install ..\packages\xlsx-*.tgz
npm install ..\packages\node-cron-*.tgz
npm install ..\packages\dotenv-*.tgz
```

---

## Configuration

### Step 1: Configure Network Access

Edit `.env` file at `C:\turkish-medicine-api\app\.env`:

```env
# Server Configuration
PORT=3000

# Download Configuration
DOWNLOAD_URL=https://www.titck.gov.tr/dinamikmodul/43
DOWNLOAD_PATH=./data
EXCEL_FILENAME=medicines.xlsx

# Scheduler Configuration (cron format)
# Every Monday at 9:00 AM
SCHEDULE_CRON=0 9 * * 1
```

### Step 2: Configure Firewall

**Allow TITCK Website Access Only** (for downloading Excel file):

1. Open Windows Defender Firewall with Advanced Security
2. Create New Outbound Rule:
   - Rule Type: Custom
   - Program: `C:\Program Files\nodejs\node.exe`
   - Protocol: TCP
   - Remote IP: Allow `titck.gov.tr` (you may need to allow all HTTPS)
   - Action: Allow
   - Name: "Turkish Medicine API - TITCK Access"

**Allow Local API Access** (optional, if you need to access from other machines):

1. Create New Inbound Rule:
   - Rule Type: Port
   - Protocol: TCP
   - Port: 3000
   - Action: Allow
   - Name: "Turkish Medicine API - Local Access"

### Step 3: Initial Data Download

Before going fully offline, download the initial Excel file:

```cmd
cd C:\turkish-medicine-api\app
npm run download
```

This creates `data\medicines.xlsx` and `data\medicines.json`.

---

## Running the Application

### Manual Start (Testing)

**Start API Server**:
```cmd
cd C:\turkish-medicine-api\app
npm start
```

Server will run on: http://localhost:3000

**Start Scheduler** (in a new Command Prompt):
```cmd
cd C:\turkish-medicine-api\app
npm run scheduler
```

**Test the API**:
Open browser and go to: http://localhost:3000

Press `Ctrl+C` to stop when done testing.

---

## Setting Up Automatic Startup

### Using NSSM (Recommended for Windows Server)

NSSM (Non-Sucking Service Manager) allows you to run Node.js apps as Windows Services.

#### Step 1: Install API Server as Service

Open Command Prompt as Administrator:

```cmd
cd C:\turkish-medicine-api

nssm install TurkishMedicineAPI "C:\Program Files\nodejs\node.exe"
```

Configure the service:
- **Path**: `C:\Program Files\nodejs\node.exe`
- **Startup directory**: `C:\turkish-medicine-api\app`
- **Arguments**: `src\server.js`
- **Service name**: `TurkishMedicineAPI`

Or use command line:
```cmd
nssm install TurkishMedicineAPI "C:\Program Files\nodejs\node.exe"
nssm set TurkishMedicineAPI AppDirectory "C:\turkish-medicine-api\app"
nssm set TurkishMedicineAPI AppParameters "src\server.js"
nssm set TurkishMedicineAPI DisplayName "Turkish Medicine API Server"
nssm set TurkishMedicineAPI Description "REST API for Turkish Medicine Database (TITCK)"
nssm set TurkishMedicineAPI Start SERVICE_AUTO_START
```

#### Step 2: Install Scheduler as Service

```cmd
nssm install TurkishMedicineScheduler "C:\Program Files\nodejs\node.exe"
nssm set TurkishMedicineScheduler AppDirectory "C:\turkish-medicine-api\app"
nssm set TurkishMedicineScheduler AppParameters "src\scheduler.js"
nssm set TurkishMedicineScheduler DisplayName "Turkish Medicine API Scheduler"
nssm set TurkishMedicineScheduler Description "Weekly data download scheduler for Turkish Medicine API"
nssm set TurkishMedicineScheduler Start SERVICE_AUTO_START
```

#### Step 3: Configure Service Dependencies

Make scheduler depend on API server:
```cmd
sc config TurkishMedicineScheduler depend= TurkishMedicineAPI
```

#### Step 4: Set Service Recovery Options

Configure automatic restart on failure:
```cmd
nssm set TurkishMedicineAPI AppStdout "C:\turkish-medicine-api\logs\api-output.log"
nssm set TurkishMedicineAPI AppStderr "C:\turkish-medicine-api\logs\api-error.log"

nssm set TurkishMedicineScheduler AppStdout "C:\turkish-medicine-api\logs\scheduler-output.log"
nssm set TurkishMedicineScheduler AppStderr "C:\turkish-medicine-api\logs\scheduler-error.log"
```

Create logs directory:
```cmd
mkdir C:\turkish-medicine-api\logs
```

#### Step 5: Start Services

```cmd
net start TurkishMedicineAPI
net start TurkishMedicineScheduler
```

Or use Services Manager (`services.msc`):
1. Press `Win + R`
2. Type `services.msc`
3. Find "Turkish Medicine API Server"
4. Right-click → Start

#### Step 6: Verify Services

Check service status:
```cmd
nssm status TurkishMedicineAPI
nssm status TurkishMedicineScheduler
```

Test API:
```cmd
curl http://localhost:3000/health
```

Or open browser: http://localhost:3000

---

## Alternative: Using Task Scheduler

If you can't use NSSM, use Windows Task Scheduler:

### Create Start Script

Create `C:\turkish-medicine-api\start-api.bat`:
```batch
@echo off
cd C:\turkish-medicine-api\app
node src\server.js
```

Create `C:\turkish-medicine-api\start-scheduler.bat`:
```batch
@echo off
cd C:\turkish-medicine-api\app
node src\scheduler.js
```

### Create Scheduled Tasks

1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task:
   - Name: "Turkish Medicine API Server"
   - Trigger: "When the computer starts"
   - Action: "Start a program"
   - Program: `C:\turkish-medicine-api\start-api.bat`
   - Properties → Check "Run whether user is logged on or not"
   - Properties → Check "Run with highest privileges"

3. Repeat for scheduler

---

## Troubleshooting

### Service Won't Start

**Check Node.js Path**:
```cmd
where node
```

Should return: `C:\Program Files\nodejs\node.exe`

**Check Service Logs**:
```cmd
type C:\turkish-medicine-api\logs\api-error.log
```

**Test Manually**:
```cmd
cd C:\turkish-medicine-api\app
node src\server.js
```

### Cannot Download Excel File

**Test Internet Connectivity**:
```cmd
ping titck.gov.tr
```

**Test Manual Download**:
```cmd
cd C:\turkish-medicine-api\app
npm run download
```

**Check Firewall Rules**:
- Ensure Node.js has outbound HTTPS access
- Check Windows Defender Firewall logs

### Port 3000 Already in Use

**Find Process Using Port**:
```cmd
netstat -ano | findstr :3000
```

**Kill Process**:
```cmd
taskkill /PID <process_id> /F
```

**Change Port**:
Edit `.env` and change `PORT=3000` to another port.

### Missing Dependencies

**Reinstall from Bundle**:
```cmd
cd C:\turkish-medicine-api\app
rmdir /s /q node_modules
npm install
```

If you have `.tgz` packages, install them manually.

### Data Not Loading

**Check Data Files**:
```cmd
dir C:\turkish-medicine-api\app\data
```

Should show:
- `medicines.xlsx`
- `medicines.json`
- `metadata.json`

**Manually Download**:
```cmd
npm run download
```

### Service Stops Unexpectedly

**Check Event Viewer**:
1. Open Event Viewer (`eventvwr.msc`)
2. Windows Logs → Application
3. Look for errors related to Node.js or your services

**Increase Memory Limit** (if out of memory):
```cmd
nssm set TurkishMedicineAPI AppEnvironmentExtra NODE_OPTIONS=--max-old-space-size=4096
```

---

## Maintenance

### Update Data Manually

```cmd
cd C:\turkish-medicine-api\app
npm run download
```

### View Logs

```cmd
type C:\turkish-medicine-api\logs\api-output.log
type C:\turkish-medicine-api\logs\scheduler-output.log
```

### Restart Services

```cmd
net stop TurkishMedicineAPI
net stop TurkishMedicineScheduler
net start TurkishMedicineAPI
net start TurkishMedicineScheduler
```

### Check Service Status

```cmd
sc query TurkishMedicineAPI
sc query TurkishMedicineScheduler
```

---

## Backup & Recovery

### Backup Important Files

Regular backup of:
- `C:\turkish-medicine-api\app\data\` - Downloaded data
- `C:\turkish-medicine-api\app\.env` - Configuration
- `C:\turkish-medicine-api\logs\` - Logs (optional)

### Recovery

If server crashes:
1. Reinstall Node.js from bundle
2. Copy app folder back
3. Reinstall services using NSSM commands above
4. Start services

---

## Security Recommendations

1. **Restrict Network Access**:
   - Only allow outbound HTTPS to `titck.gov.tr`
   - Block all other internet traffic

2. **File System Permissions**:
   - Restrict write access to `C:\turkish-medicine-api\`
   - Only SYSTEM and Administrators should have full control

3. **Service Account**:
   - Run services under a dedicated service account (not SYSTEM)
   - Grant minimal required permissions

4. **Monitor Logs**:
   - Regularly check logs for suspicious activity
   - Set up alerts for failed download attempts

---

## Performance Tuning

### For Large Datasets

Edit `.env`:
```env
NODE_OPTIONS=--max-old-space-size=4096
```

### Optimize Startup

Pre-generate JSON on initial setup:
```cmd
npm run download
```

This creates a cached JSON file for faster loading.

---

## Uninstallation

### Remove Services

```cmd
net stop TurkishMedicineAPI
net stop TurkishMedicineScheduler
nssm remove TurkishMedicineAPI confirm
nssm remove TurkishMedicineScheduler confirm
```

### Remove Files

```cmd
rmdir /s /q C:\turkish-medicine-api
```

### Uninstall Node.js

Use Windows "Add or Remove Programs"

---

## Support

For issues specific to Windows Server deployment, check:
- `logs\api-error.log`
- `logs\scheduler-error.log`
- Windows Event Viewer

For API issues, see `API_DOCUMENTATION.md`

---

## Summary Checklist

- [ ] Downloaded Node.js installer
- [ ] Created bundle with all dependencies
- [ ] Transferred to Windows Server
- [ ] Installed Node.js
- [ ] Verified dependencies installed
- [ ] Configured `.env` file
- [ ] Set up firewall rules
- [ ] Downloaded initial data
- [ ] Installed services with NSSM
- [ ] Started services
- [ ] Tested API endpoint
- [ ] Configured automatic startup
- [ ] Set up logging
- [ ] Created backup plan

Your Turkish Medicine API is now running offline on Windows Server 2025! ✅
