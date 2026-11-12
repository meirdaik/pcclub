<#
.SYNOPSIS
    Replaces Windows Explorer shell with PC Club Kiosk & locks down system utilities.
.DESCRIPTION
    Configures Windows Winlogon to launch PC Club Kiosk as the primary Windows shell
    instead of explorer.exe. Also enforces DisableTaskMgr, DisableRegistryTools,
    and DisableCMD to prevent player escape attempts.
.PARAMETER KioskExePath
    Optional absolute path to the compiled PC Club Kiosk.exe executable.
#>

[CmdletBinding()]
param(
    [string]$KioskExePath
)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "ERROR: This script must be run as Administrator (Elevated PowerShell)!"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PC CLUB - ENABLING DEDICATED KIOSK SHELL & REGISTRY LOCK " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Resolve Kiosk Executable Path
if (-not $KioskExePath) {
    $searchPaths = @(
        "C:\Program Files\PC Club\PC Club Kiosk.exe",
        "C:\Program Files (x86)\PC Club\PC Club Kiosk.exe",
        "$PSScriptRoot\..\dist\win-unpacked\PC Club Kiosk.exe",
        "C:\Users\Admin\Desktop\des\desktop\dist\win-unpacked\PC Club Kiosk.exe"
    )
    foreach ($p in $searchPaths) {
        if (Test-Path $p) {
            $KioskExePath = (Resolve-Path $p).Path
            break
        }
    }
}

if (-not $KioskExePath -or -not (Test-Path $KioskExePath)) {
    Write-Error "Could not find 'PC Club Kiosk.exe'. Please pass -KioskExePath 'C:\path\to\PC Club Kiosk.exe'"
    exit 1
}

Write-Host "[+] Target Kiosk Executable: $KioskExePath" -ForegroundColor Green

# 2. Backup and Replace Winlogon Shell
$winlogonKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
$currentShell = (Get-ItemProperty -Path $winlogonKey -Name "Shell" -ErrorAction SilentlyContinue).Shell

if ($currentShell -ne $KioskExePath) {
    if (-not (Get-ItemProperty -Path $winlogonKey -Name "ShellBackup" -ErrorAction SilentlyContinue)) {
        Set-ItemProperty -Path $winlogonKey -Name "ShellBackup" -Value $currentShell -Type String
        Write-Host "[+] Backed up original Windows shell ($currentShell) to ShellBackup" -ForegroundColor Green
    }
    Set-ItemProperty -Path $winlogonKey -Name "Shell" -Value $KioskExePath -Type String
    Write-Host "[+] Winlogon Shell replaced with: $KioskExePath" -ForegroundColor Green
} else {
    Write-Host "[*] Winlogon Shell is already pointing to Kiosk executable." -ForegroundColor Yellow
}

# 3. Apply Registry Security Policies
$policies = @(
    @{ Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System"; Name = "DisableTaskMgr"; Value = 1 },
    @{ Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System"; Name = "DisableRegistryTools"; Value = 1 },
    @{ Path = "HKCU:\Software\Policies\Microsoft\Windows\System"; Name = "DisableCMD"; Value = 1 },
    @{ Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"; Name = "DisableTaskMgr"; Value = 1 }
)

foreach ($pol in $policies) {
    if (-not (Test-Path $pol.Path)) {
        New-Item -Path $pol.Path -Force | Out-Null
    }
    Set-ItemProperty -Path $pol.Path -Name $pol.Name -Value $pol.Value -Type DWord -Force
    Write-Host "[+] Enforced Policy: $($pol.Name) = $($pol.Value) at $($pol.Path)" -ForegroundColor Green
}

# 4. Save path to C:\ProgramData\PCClub\kiosk-path.txt
$progDataDir = "C:\ProgramData\PCClub"
if (-not (Test-Path $progDataDir)) {
    New-Item -ItemType Directory -Path $progDataDir -Force | Out-Null
}
Set-Content -Path (Join-Path $progDataDir "kiosk-path.txt") -Value $KioskExePath -Force

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] DEDICATED KIOSK SHELL & REGISTRY LOCK ENABLED! " -ForegroundColor Green
Write-Host " On next Windows sign-in or restart, the PC will boot directly into PC Club Kiosk." -ForegroundColor Green
Write-Host " Explorer desktop, taskbar, Task Manager, and Registry Tools are fully locked." -ForegroundColor Green
Write-Host " To revert, run: .\disable-kiosk-shell.ps1" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
