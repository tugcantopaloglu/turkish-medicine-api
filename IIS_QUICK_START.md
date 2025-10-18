# IIS Deployment - Quick Start Guide

**5-Minute Setup for Turkish Medicine API on Windows Server 2025**

## Prerequisites Checklist

- [ ] Windows Server 2025
- [ ] Administrator access
- [ ] Node.js installed
- [ ] Internet connection (for downloading IIS modules)

---

## Step 1: Install IIS (5 minutes)

Open PowerShell as Administrator:

```powershell
# Install IIS with one command
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Restart to apply changes
Restart-Computer -Force
```

---

## Step 2: Download & Install Modules (10 minutes)

### Download these files on a machine with internet:

1. **URL Rewrite**: https://www.iis.net/downloads/microsoft/url-rewrite
2. **iisnode**: https://github.com/Azure/iisnode/releases (get latest x64 version)

### Install on Windows Server:

```powershell
# Install URL Rewrite
msiexec /i rewrite_amd64_en-US.msi /quiet

# Install iisnode
msiexec /i iisnode-full-v0.2.26-x64.msi /quiet

# Restart IIS
iisreset
```

---

## Step 3: Deploy Application (5 minutes)

```powershell
# Create directory
New-Item -ItemType Directory -Path "C:\inetpub\turkish-medicine-api" -Force

# Copy your application files to C:\inetpub\turkish-medicine-api\
# Should include: src/, node_modules/, package.json, .env

# Download initial data
cd C:\inetpub\turkish-medicine-api
npm run download
```

---

## Step 4: Create web.config (2 minutes)

Create `C:\inetpub\turkish-medicine-api\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <iisnode nodeProcessCommandLine="C:\Program Files\nodejs\node.exe"
             loggingEnabled="true"
             logDirectory="logs" />

    <rewrite>
      <rules>
        <rule name="API">
          <match url="/*" />
          <action type="Rewrite" url="src/server.js" />
        </rule>
      </rules>
    </rewrite>

    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules" />
          <add segment=".env" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

---

## Step 5: Create IIS Site (3 minutes)

```powershell
# Create application pool
New-WebAppPool -Name "TurkishMedicineAPI"
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "managedRuntimeVersion" -value ""

# Create website
New-Website -Name "TurkishMedicineAPI" `
            -Port 80 `
            -PhysicalPath "C:\inetpub\turkish-medicine-api" `
            -ApplicationPool "TurkishMedicineAPI"

# Start website
Start-Website -Name "TurkishMedicineAPI"
```

---

## Step 6: Configure Firewall (1 minute)

```powershell
New-NetFirewallRule -DisplayName "Turkish Medicine API - HTTP" `
                    -Direction Inbound `
                    -Protocol TCP `
                    -LocalPort 80 `
                    -Action Allow
```

---

## Step 7: Test (1 minute)

```powershell
# Test API
Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing

# Or open browser:
# http://localhost/
# http://localhost/api/medicines?limit=5
```

**Expected Response:**
```json
{"status":"healthy","dataLoaded":true,"recordCount":17713}
```

---

## Step 8: Setup Weekly Updates (2 minutes)

Create `C:\inetpub\turkish-medicine-api\scheduled-download.bat`:

```batch
@echo off
cd /d C:\inetpub\turkish-medicine-api
"C:\Program Files\nodejs\node.exe" src\downloader.js
```

**Create Scheduled Task:**

```powershell
$action = New-ScheduledTaskAction -Execute "C:\inetpub\turkish-medicine-api\scheduled-download.bat"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -TaskName "Turkish Medicine API - Weekly Download" `
                       -Action $action `
                       -Trigger $trigger `
                       -Principal $principal
```

---

## Done! ✅

Your API is now running at: **http://localhost/**

### Quick Commands:

```powershell
# Restart website
Restart-WebAppPool -Name "TurkishMedicineAPI"

# View logs
Get-Content "C:\inetpub\turkish-medicine-api\logs\*.log" -Tail 20

# Check status
Get-WebAppPoolState -Name "TurkishMedicineAPI"

# Stop website
Stop-Website -Name "TurkishMedicineAPI"

# Start website
Start-Website -Name "TurkishMedicineAPI"
```

---

## Troubleshooting

### Issue: 500 Error

```powershell
# Check logs
Get-ChildItem "C:\inetpub\turkish-medicine-api\logs\" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 |
    Get-Content
```

### Issue: Application Pool Stopped

```powershell
# Check status
Get-WebAppPoolState -Name "TurkishMedicineAPI"

# Start if stopped
Start-WebAppPool -Name "TurkishMedicineAPI"
```

### Issue: Permission Denied

```powershell
# Fix permissions
icacls "C:\inetpub\turkish-medicine-api" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

---

## Using IIS Manager (GUI)

Prefer GUI? Open IIS Manager:

```powershell
inetmgr
```

Then:
1. Expand server → Sites → TurkishMedicineAPI
2. Right panel: Start/Stop/Restart
3. Browse website (on the right)
4. View application pools
5. Check logs

---

## SSL/HTTPS Setup (Optional)

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate -DnsName "localhost" `
        -CertStoreLocation "cert:\LocalMachine\My"

# Add HTTPS binding
New-WebBinding -Name "TurkishMedicineAPI" -Protocol https -Port 443

# Bind certificate
$binding = Get-WebBinding -Name "TurkishMedicineAPI" -Protocol https
$binding.AddSslCertificate($cert.Thumbprint, "my")
```

Access via: **https://localhost/**

---

## Performance Tips

### Keep App Always Running

```powershell
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "startMode" -value "AlwaysRunning"
```

### Enable Compression

```powershell
Set-WebConfigurationProperty -Filter "/system.webServer/urlCompression" `
    -Name "doDynamicCompression" -Value $true `
    -PSPath "IIS:\Sites\TurkishMedicineAPI"
```

### Schedule Daily Recycle (3 AM)

```powershell
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI `
    -name "recycling.periodicRestart.schedule" `
    -value @{value="03:00:00"}
```

---

## Backup

```powershell
# Backup everything
Compress-Archive -Path "C:\inetpub\turkish-medicine-api\*" `
                 -DestinationPath "C:\Backups\API-$(Get-Date -Format 'yyyyMMdd').zip"

# Backup IIS config
Backup-WebConfiguration -Name "API-Backup-$(Get-Date -Format 'yyyyMMdd')"
```

---

## Summary

**Total Setup Time:** ~30 minutes

✅ IIS installed
✅ Modules installed (URL Rewrite, iisnode)
✅ Application deployed
✅ Website created and running
✅ Firewall configured
✅ Weekly updates scheduled
✅ Monitoring enabled

**Your API is live at:** http://localhost/

**For detailed information, see:** `WINDOWS_IIS_DEPLOYMENT.md`

---

## Support

**View full documentation:**
- `WINDOWS_IIS_DEPLOYMENT.md` - Complete guide
- `API_DOCUMENTATION.md` - API endpoints
- `README.md` - General information

**Need help?**
- Check logs: `C:\inetpub\turkish-medicine-api\logs\`
- Event Viewer: `eventvwr.msc`
- IIS logs: `C:\inetpub\logs\LogFiles\`
