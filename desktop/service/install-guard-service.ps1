<#
.SYNOPSIS
    Installs and starts the PCClubGuard Windows Service running as NT AUTHORITY\SYSTEM.
.DESCRIPTION
    Configures a background Windows service that boots automatically with the machine,
    monitoring the PC Club kiosk process and respawning it within 500ms if killed.
#>

[CmdletBinding()]
param()

# Ensure elevated Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "ERROR: This installer must be run as Administrator (Elevated PowerShell)!"
    exit 1
}

$ServiceName = "PCClubGuard"
$ServiceDisplayName = "PC Club Kiosk Guard Watchdog"
$ServiceDescription = "Continuously protects PC Club Kiosk client. Respawns kiosk process within 500ms if closed or killed outside Maintenance Mode."
$TargetDir = "C:\ProgramData\PCClub"
$ScriptSource = Join-Path $PSScriptRoot "guard.ps1"
$ScriptDest = Join-Path $TargetDir "guard.ps1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PC CLUB - INSTALLING NT AUTHORITY\SYSTEM GUARD SERVICE   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Prepare Target Directory and copy script
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    Write-Host "[+] Created directory: $TargetDir" -ForegroundColor Green
}

Copy-Item -Path $ScriptSource -Destination $ScriptDest -Force
Write-Host "[+] Deployed guard script to $ScriptDest" -ForegroundColor Green

# 2. Stop and remove existing service if present
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[*] Existing $ServiceName found. Stopping and updating..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    & sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 1
}

# 3. Create Windows Service with auto-start under NT AUTHORITY\SYSTEM
$binPath = "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$ScriptDest`""

Write-Host "[*] Creating Windows Service via sc.exe..." -ForegroundColor Yellow
& sc.exe create $ServiceName binPath= $binPath start= auto obj= "NT AUTHORITY\SYSTEM" DisplayName= $ServiceDisplayName

# 4. Set description and recovery behavior
& sc.exe description $ServiceName $ServiceDescription | Out-Null
& sc.exe failure $ServiceName reset= 0 actions= restart/1000/restart/1000/restart/1000 | Out-Null

# 5. Start the service
Write-Host "[*] Starting $ServiceName..." -ForegroundColor Yellow
Start-Sleep -Seconds 1
& sc.exe start $ServiceName | Out-Null

Start-Sleep -Seconds 2
$status = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($status -and $status.Status -eq "Running") {
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] $ServiceName is INSTALLED and RUNNING!" -ForegroundColor Green
    Write-Host " Status: $($status.Status) | Startup: Automatic | Account: NT AUTHORITY\SYSTEM" -ForegroundColor Green
    Write-Host " Logs: $TargetDir\guard.log" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "[!] Service registered. Current status: $($status.Status)" -ForegroundColor Yellow
}
