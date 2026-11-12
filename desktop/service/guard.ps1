<#
.SYNOPSIS
    PCClubGuard - NT AUTHORITY\SYSTEM Watchdog Daemon
.DESCRIPTION
    Monitors the PC Club Kiosk client process every 500ms.
    If the process is terminated (e.g., killed by player or crash),
    this service immediately respawns the kiosk within 500ms,
    unless Maintenance Mode is active (indicated by maintenance.flag).
#>

[CmdletBinding()]
param(
    [string]$ConfigDir = "C:\ProgramData\PCClub"
)

$ErrorActionPreference = "Continue"

if (-not (Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
}

$LogFile = Join-Path $ConfigDir "guard.log"
$FlagFile = Join-Path $ConfigDir "maintenance.flag"
$PathFile = Join-Path $ConfigDir "kiosk-path.txt"

function Write-GuardLog([string]$message) {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
    $entry = "[$timestamp] [GUARD] $message"
    try {
        Add-Content -Path $LogFile -Value $entry -ErrorAction SilentlyContinue
    } catch {}
    Write-Host $entry
}

Write-GuardLog "PCClubGuard Service Watchdog started (PID: $PID, User: $env:USERNAME)"

# Default search paths if pathfile not populated
$fallbackPaths = @(
    "C:\Program Files\PC Club\PC Club Kiosk.exe",
    "C:\Program Files (x86)\PC Club\PC Club Kiosk.exe",
    "$env:LOCALAPPDATA\Programs\pcclub\PC Club Kiosk.exe",
    "C:\Users\Admin\Desktop\des\desktop\dist\win-unpacked\PC Club Kiosk.exe"
)

function Resolve-KioskPath {
    if (Test-Path $PathFile) {
        $saved = (Get-Content $PathFile -Raw).Trim()
        if ($saved -and (Test-Path $saved)) {
            return $saved
        }
    }
    foreach ($p in $fallbackPaths) {
        if (Test-Path $p) {
            return $p
        }
    }
    return $null
}

$lastLog = [DateTime]::MinValue

while ($true) {
    try {
        # Check if technician maintenance mode is active
        if (Test-Path $FlagFile) {
            if ((Get-Date) - $lastLog -gt [TimeSpan]::FromMinutes(5)) {
                Write-GuardLog "Maintenance mode flag is ACTIVE ($FlagFile). Watchdog respawn paused for technician."
                $lastLog = Get-Date
            }
            Start-Sleep -Milliseconds 1000
            continue
        }

        # Check if Kiosk process is alive
        $proc = Get-Process -Name "PC Club Kiosk", "pcclub", "electron" -ErrorAction SilentlyContinue |
            Where-Object { $_.Path -notlike "*admin-desktop*" }

        if (-not $proc) {
            Write-GuardLog "ALERT: PC Club Kiosk process not running! Emergency respawn triggered within 500ms..."
            $targetExe = Resolve-KioskPath
            if ($targetExe) {
                Write-GuardLog "Launching kiosk executable: $targetExe"
                # Start process in active interactive desktop session
                Start-Process -FilePath $targetExe -WindowStyle Maximized -ErrorAction SilentlyContinue
            } else {
                Write-GuardLog "ERROR: Could not locate kiosk executable path. Please start the kiosk once or check $PathFile"
            }
            Start-Sleep -Milliseconds 1500
        }
    } catch {
        Write-GuardLog "Unexpected watchdog error: $_"
    }

    Start-Sleep -Milliseconds 500
}
