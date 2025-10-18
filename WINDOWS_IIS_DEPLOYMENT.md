# Windows Server 2025 - IIS Deployment Guide

Deploy the Turkish Medicine API using **IIS (Internet Information Services)** with **iisnode** for a professional, production-ready setup.

## Table of Contents

1. [Why IIS + iisnode?](#why-iis--iisnode)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Scheduled Tasks for Weekly Updates](#scheduled-tasks-for-weekly-updates)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Monitoring & Logs](#monitoring--logs)
9. [Troubleshooting](#troubleshooting)

---

## Why IIS + iisnode?

**Advantages over NSSM:**
- ✅ Native Windows Server integration
- ✅ Built-in application pool management
- ✅ Advanced load balancing and scaling
- ✅ Integrated SSL/HTTPS support
- ✅ Better performance and reliability
- ✅ Professional logging and monitoring
- ✅ IIS Manager GUI for easy administration
- ✅ Auto-restart on failure (built-in)
- ✅ Process recycling and health monitoring

---

## Prerequisites

### Required Components

1. **Windows Server 2025** (offline or online)
2. **Node.js LTS** (already installed)
3. **IIS with required features**
4. **iisnode module**
5. **URL Rewrite module**
6. **Administrator access**

---

## Installation Steps

### Step 1: Install IIS

Open PowerShell as Administrator:

```powershell
# Install IIS with required features
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Install additional IIS features
Install-WindowsFeature -Name Web-WebSockets
Install-WindowsFeature -Name Web-App-Dev
Install-WindowsFeature -Name Web-Asp-Net45
Install-WindowsFeature -Name Web-ISAPI-Ext
Install-WindowsFeature -Name Web-ISAPI-Filter
```

**Or using Server Manager (GUI):**
1. Open Server Manager
2. Click "Add roles and features"
3. Select "Web Server (IIS)"
4. Include:
   - Web Server
   - Management Tools
   - Application Development Features
   - ISAPI Extensions
   - ISAPI Filters

Verify installation:
```powershell
Get-WindowsFeature | Where-Object {$_.Name -like "Web-*"} | Where-Object {$_.Installed -eq $true}
```

### Step 2: Download Required Modules (On Internet-Connected Machine)

Download these installers:

**1. URL Rewrite Module**
- URL: https://www.iis.net/downloads/microsoft/url-rewrite
- File: `rewrite_amd64_en-US.msi`

**2. iisnode**
- URL: https://github.com/Azure/iisnode/releases
- File: `iisnode-full-v0.2.26-x64.msi` (or latest version)

**3. Web Platform Installer (Optional)**
- URL: https://www.microsoft.com/web/downloads/platform.aspx

### Step 3: Transfer to Offline Server

Copy these files to your Windows Server:
```
C:\ServerSetup\
├── rewrite_amd64_en-US.msi
├── iisnode-full-v0.2.26-x64.msi
└── node-v20.x.x-x64.msi (if not already installed)
```

### Step 4: Install URL Rewrite Module

On Windows Server:

```powershell
cd C:\ServerSetup
Start-Process msiexec.exe -Wait -ArgumentList '/i rewrite_amd64_en-US.msi /quiet'
```

Or double-click the MSI and follow the wizard.

Verify:
```powershell
Test-Path "C:\Program Files\IIS\URL Rewrite"
```

### Step 5: Install iisnode

```powershell
cd C:\ServerSetup
Start-Process msiexec.exe -Wait -ArgumentList '/i iisnode-full-v0.2.26-x64.msi /quiet'
```

Or double-click the MSI and follow the wizard.

Verify:
```powershell
Test-Path "C:\Program Files\iisnode"
```

After installation, **restart IIS**:
```powershell
iisreset
```

---

## Configuration

### Step 1: Prepare Application Directory

Create the application directory:

```powershell
New-Item -ItemType Directory -Path "C:\inetpub\turkish-medicine-api" -Force
```

Copy your application files:
```
C:\inetpub\turkish-medicine-api\
├── src\
├── data\
├── node_modules\
├── package.json
├── .env
└── web.config (we'll create this)
```

### Step 2: Create web.config

Create `C:\inetpub\turkish-medicine-api\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>

    <!-- iisnode configuration -->
    <iisnode
      nodeProcessCommandLine="C:\Program Files\nodejs\node.exe"
      loggingEnabled="true"
      logDirectory="logs"
      debuggingEnabled="false"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="100"
      namedPipeConnectionRetryDelay="250"
      maxNamedPipeConnectionPoolSize="512"
      maxNamedPipePooledConnectionAge="30000"
      asyncCompletionThreadCount="0"
      initialRequestBufferSize="4096"
      maxRequestBufferSize="65536"
      watchedFiles="*.js;iisnode.yml"
      uncFileChangesPollingInterval="5000"
      gracefulShutdownTimeout="60000"
      devErrorsEnabled="false"
      flushResponse="false"
      enableXFF="false"
      promoteServerVars=""
    />

    <!-- URL Rewrite Rules -->
    <rewrite>
      <rules>
        <!-- Redirect all requests to Node.js app -->
        <rule name="Turkish Medicine API">
          <match url="/*" />
          <action type="Rewrite" url="src/server.js" />
        </rule>
      </rules>
    </rewrite>

    <!-- Security -->
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules" />
          <add segment=".env" />
          <add segment="logs" />
        </hiddenSegments>
      </requestFiltering>
    </security>

    <!-- Default document -->
    <defaultDocument enabled="false" />

    <!-- Error handling -->
    <httpErrors existingResponse="PassThrough" />

    <!-- Static content (if needed) -->
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>

  </system.webServer>
</configuration>
```

### Step 3: Set Permissions

Set proper permissions for IIS Application Pool identity:

```powershell
$path = "C:\inetpub\turkish-medicine-api"
$acl = Get-Acl $path

# Grant IIS_IUSRS full control
$permission = "IIS_IUSRS","FullControl","ContainerInherit,ObjectInherit","None","Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)

# Grant IUSR read access
$permission = "IUSR","Read","ContainerInherit,ObjectInherit","None","Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)

Set-Acl $path $acl
```

### Step 4: Create IIS Application Pool

Open PowerShell as Administrator:

```powershell
Import-Module WebAdministration

# Create dedicated application pool
New-WebAppPool -Name "TurkishMedicineAPI"

# Configure application pool
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "managedRuntimeVersion" -value ""
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "processModel.identityType" -value "ApplicationPoolIdentity"
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "enable32BitAppOnWin64" -value $false

# Set recycling options
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "recycling.periodicRestart.time" -value "00:00:00"
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "recycling.periodicRestart.schedule" -value @{value="03:00:00"}

# Set failure handling
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "failure.rapidFailProtection" -value $true
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "failure.rapidFailProtectionMaxCrashes" -value 5
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "startMode" -value "AlwaysRunning"
```

### Step 5: Create IIS Website

**Option A: Using PowerShell**

```powershell
# Remove default website (optional)
Remove-Website -Name "Default Web Site"

# Create new website
New-Website -Name "TurkishMedicineAPI" `
            -Port 80 `
            -PhysicalPath "C:\inetpub\turkish-medicine-api" `
            -ApplicationPool "TurkishMedicineAPI"

# Start the website
Start-Website -Name "TurkishMedicineAPI"
```

**Option B: Using IIS Manager (GUI)**

1. Open IIS Manager (`inetmgr`)
2. Right-click "Sites" → "Add Website"
3. Settings:
   - **Site name**: TurkishMedicineAPI
   - **Application pool**: TurkishMedicineAPI
   - **Physical path**: C:\inetpub\turkish-medicine-api
   - **Binding**:
     - Type: http
     - IP: All Unassigned
     - Port: 80
     - Host name: (leave blank or add domain)
4. Click OK
5. Start the website

### Step 6: Configure Firewall

```powershell
# Allow HTTP traffic
New-NetFirewallRule -DisplayName "Turkish Medicine API - HTTP" `
                    -Direction Inbound `
                    -Protocol TCP `
                    -LocalPort 80 `
                    -Action Allow

# Allow HTTPS traffic (for later)
New-NetFirewallRule -DisplayName "Turkish Medicine API - HTTPS" `
                    -Direction Inbound `
                    -Protocol TCP `
                    -LocalPort 443 `
                    -Action Allow

# Allow outbound to TITCK only
New-NetFirewallRule -DisplayName "Turkish Medicine API - TITCK Access" `
                    -Direction Outbound `
                    -Program "C:\Program Files\nodejs\node.exe" `
                    -Action Allow
```

---

## Deployment

### Step 1: Initial Data Download

Before starting the website:

```powershell
cd C:\inetpub\turkish-medicine-api
npm run download
```

### Step 2: Test the Application

```powershell
# Start website if not already running
Start-Website -Name "TurkishMedicineAPI"

# Wait a moment for app to initialize
Start-Sleep -Seconds 5

# Test the API
Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing
```

Expected response:
```json
{"status":"healthy","dataLoaded":true,"recordCount":17713}
```

### Step 3: Browse the API

Open browser and navigate to:
- http://localhost/
- http://localhost/health
- http://localhost/api/medicines?limit=5
- http://localhost/api/sheets/active

---

## Scheduled Tasks for Weekly Updates

Since we're using IIS, use **Windows Task Scheduler** for weekly data updates.

### Create Download Script

Create `C:\inetpub\turkish-medicine-api\scheduled-download.bat`:

```batch
@echo off
cd /d C:\inetpub\turkish-medicine-api
"C:\Program Files\nodejs\node.exe" src\downloader.js >> logs\scheduled-download.log 2>&1
```

### Create Scheduled Task

Using PowerShell:

```powershell
$action = New-ScheduledTaskAction -Execute "C:\inetpub\turkish-medicine-api\scheduled-download.bat"

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName "Turkish Medicine API - Weekly Download" `
                       -Action $action `
                       -Trigger $trigger `
                       -Principal $principal `
                       -Settings $settings `
                       -Description "Weekly download of Turkish medicine data from TITCK"
```

**Or using Task Scheduler GUI:**

1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task
3. Name: "Turkish Medicine API - Weekly Download"
4. Trigger: Weekly, Monday, 9:00 AM
5. Action: Start a program
6. Program: `C:\inetpub\turkish-medicine-api\scheduled-download.bat`
7. Settings:
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges
   - ✅ Wake computer to run this task

### Verify Scheduled Task

```powershell
Get-ScheduledTask -TaskName "Turkish Medicine API - Weekly Download"
```

---

## SSL/HTTPS Setup

### Using Self-Signed Certificate (Development)

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate -DnsName "localhost", "your-server-name" `
                                   -CertStoreLocation "cert:\LocalMachine\My" `
                                   -FriendlyName "Turkish Medicine API"

# Get certificate thumbprint
$thumbprint = $cert.Thumbprint

# Add HTTPS binding
New-WebBinding -Name "TurkishMedicineAPI" `
               -Protocol https `
               -Port 443 `
               -SslFlags 0

# Bind certificate
$binding = Get-WebBinding -Name "TurkishMedicineAPI" -Protocol https
$binding.AddSslCertificate($thumbprint, "my")
```

### Using Real SSL Certificate (Production)

1. Obtain SSL certificate from CA
2. Import certificate to `cert:\LocalMachine\My`
3. Bind to IIS website:

```powershell
# Import certificate (if .pfx file)
$certPassword = ConvertTo-SecureString -String "your-password" -Force -AsPlainText
Import-PfxCertificate -FilePath "C:\path\to\certificate.pfx" `
                      -CertStoreLocation Cert:\LocalMachine\My `
                      -Password $certPassword

# Get thumbprint
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Subject -like "*yourdomain.com*"}
$thumbprint = $cert.Thumbprint

# Bind to website
New-WebBinding -Name "TurkishMedicineAPI" -Protocol https -Port 443
$binding = Get-WebBinding -Name "TurkishMedicineAPI" -Protocol https
$binding.AddSslCertificate($thumbprint, "my")
```

### Redirect HTTP to HTTPS

Add to `web.config`:

```xml
<rewrite>
  <rules>
    <!-- Redirect HTTP to HTTPS -->
    <rule name="Redirect to HTTPS" stopProcessing="true">
      <match url="(.*)" />
      <conditions>
        <add input="{HTTPS}" pattern="off" ignoreCase="true" />
      </conditions>
      <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
    </rule>

    <!-- Existing Node.js rule -->
    <rule name="Turkish Medicine API">
      <match url="/*" />
      <action type="Rewrite" url="src/server.js" />
    </rule>
  </rules>
</rewrite>
```

---

## Monitoring & Logs

### iisnode Logs

Located at: `C:\inetpub\turkish-medicine-api\logs\`

View recent logs:
```powershell
Get-Content "C:\inetpub\turkish-medicine-api\logs\*.log" -Tail 50
```

### IIS Logs

Located at: `C:\inetpub\logs\LogFiles\`

View today's access log:
```powershell
$today = Get-Date -Format "yyMMdd"
Get-Content "C:\inetpub\logs\LogFiles\W3SVC*\u_ex$today.log" -Tail 50
```

### Application Pool Status

```powershell
Get-WebAppPoolState -Name "TurkishMedicineAPI"
```

### Restart Application Pool

```powershell
Restart-WebAppPool -Name "TurkishMedicineAPI"
```

### Event Viewer

Check Windows Event Logs:
```powershell
Get-EventLog -LogName Application -Source "iisnode" -Newest 20
```

Or open Event Viewer GUI:
```powershell
eventvwr.msc
```

Navigate to: **Windows Logs → Application**

---

## Troubleshooting

### Issue: 500 Internal Server Error

**Check iisnode logs:**
```powershell
Get-ChildItem "C:\inetpub\turkish-medicine-api\logs\" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content
```

**Common causes:**
- Node.js not found - verify path in web.config
- Missing dependencies - check node_modules folder
- Port conflict - ensure PORT in .env is not used
- Syntax errors - check application logs

### Issue: Application Pool Crashes

**Check rapid fail protection:**
```powershell
Get-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "failure.rapidFailProtection"
```

**View crash dumps:**
```powershell
Get-EventLog -LogName Application -Source "WAS" -Newest 20
```

**Disable rapid fail temporarily:**
```powershell
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "failure.rapidFailProtection" -value $false
```

### Issue: Cannot Download Excel File

**Test network connectivity:**
```powershell
Test-NetConnection -ComputerName titck.gov.tr -Port 443
```

**Check firewall rules:**
```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Turkish*"}
```

**Manual test:**
```powershell
Invoke-WebRequest -Uri "https://www.titck.gov.tr/dinamikmodul/43" -UseBasicParsing
```

### Issue: High Memory Usage

**Check process memory:**
```powershell
Get-Process -Name node | Select-Object Name, @{Name="Memory(MB)";Expression={[math]::Round($_.WS/1MB,2)}}
```

**Increase memory limit in web.config:**
```xml
<iisnode nodeProcessCommandLine="C:\Program Files\nodejs\node.exe --max-old-space-size=4096" />
```

**Recycle application pool:**
```powershell
Restart-WebAppPool -Name "TurkishMedicineAPI"
```

### Issue: Permissions Error

**Reset permissions:**
```powershell
icacls "C:\inetpub\turkish-medicine-api" /grant "IIS_IUSRS:(OI)(CI)F" /T
icacls "C:\inetpub\turkish-medicine-api" /grant "IUSR:(OI)(CI)R" /T
```

---

## Performance Optimization

### Enable Output Caching

Add to `web.config`:

```xml
<caching>
  <profiles>
    <add extension=".json" policy="CacheUntilChange" kernelCachePolicy="CacheUntilChange" />
  </profiles>
</caching>
```

### Enable Compression

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompressionDynamic
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompressionStatic

# Enable for site
Set-WebConfigurationProperty -Filter "/system.webServer/urlCompression" `
                             -Name "doDynamicCompression" `
                             -Value $true `
                             -PSPath "IIS:\Sites\TurkishMedicineAPI"
```

### Application Initialization

Keep app always running:

```powershell
Set-ItemProperty IIS:\AppPools\TurkishMedicineAPI -name "startMode" -value "AlwaysRunning"
Set-WebConfigurationProperty -Filter "/system.webServer/applicationInitialization" `
                             -Name "doAppInitAfterRestart" `
                             -Value $true `
                             -PSPath "IIS:\Sites\TurkishMedicineAPI"
```

---

## Backup & Recovery

### Backup Configuration

```powershell
# Backup IIS configuration
Backup-WebConfiguration -Name "TurkishMedicineAPI-$(Get-Date -Format 'yyyyMMdd')"

# Backup application files
$backupPath = "C:\Backups\TurkishMedicineAPI-$(Get-Date -Format 'yyyyMMdd').zip"
Compress-Archive -Path "C:\inetpub\turkish-medicine-api\*" -DestinationPath $backupPath
```

### Restore

```powershell
# Restore IIS configuration
Restore-WebConfiguration -Name "TurkishMedicineAPI-20251018"

# Restore application files
Expand-Archive -Path "C:\Backups\TurkishMedicineAPI-20251018.zip" `
               -DestinationPath "C:\inetpub\turkish-medicine-api" -Force
```

---

## Summary Checklist

- [ ] IIS installed with required features
- [ ] URL Rewrite module installed
- [ ] iisnode module installed
- [ ] Application files deployed to C:\inetpub\turkish-medicine-api
- [ ] web.config created and configured
- [ ] Permissions set correctly
- [ ] Application pool created and configured
- [ ] IIS website created and started
- [ ] Firewall rules configured
- [ ] Initial data downloaded
- [ ] API tested and working
- [ ] Scheduled task created for weekly updates
- [ ] SSL/HTTPS configured (optional)
- [ ] Monitoring and logging verified
- [ ] Backup strategy implemented

---

## Advantages of This Setup

✅ **Professional & Reliable** - Enterprise-grade hosting
✅ **Auto-Recovery** - IIS automatically restarts failed apps
✅ **GUI Management** - Easy administration via IIS Manager
✅ **Better Performance** - Optimized for Windows Server
✅ **SSL Support** - Easy HTTPS configuration
✅ **Load Balancing** - Built-in support for scaling
✅ **Health Monitoring** - Integrated with Windows monitoring
✅ **Standard Windows** - No third-party service managers needed

Your Turkish Medicine API is now running on **IIS with iisnode** - a modern, professional deployment! 🚀
