<#
.SYNOPSIS
    Restores default Windows Explorer shell and unblocks system utilities.
.DESCRIPTION
    Restores explorer.exe as the primary Windows shell and unlocks Task Manager,
    Registry Tools, and Command Prompt.
#>

[CmdletBinding()]
param()

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "ERROR: This script must be run as Administrator (Elevated PowerShell)!"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PC CLUB - RESTORING DEFAULT WINDOWS EXPLORER SHELL      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Restore Winlogon Shell to explorer.exe
$winlogonKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
$backup = (Get-ItemProperty -Path $winlogonKey -Name "ShellBackup" -ErrorAction SilentlyContinue).ShellBackup
$targetShell = if ($backup -and (Test-Path $backup)) { $backup } else { "explorer.exe" }

Set-ItemProperty -Path $winlogonKey -Name "Shell" -Value $targetShell -Type String
Write-Host "[+] Restored Winlogon Shell to: $targetShell" -ForegroundColor Green

# 2. Unlock Registry Security Policies
$policies = @(
    @{ Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System"; Name = "DisableTaskMgr" },
    @{ Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System"; Name = "DisableRegistryTools" },
    @{ Path = "HKCU:\Software\Policies\Microsoft\Windows\System"; Name = "DisableCMD" },
    @{ Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"; Name = "DisableTaskMgr" }
)

foreach ($pol in $policies) {
    if (Test-Path $pol.Path) {
        Remove-ItemProperty -Path $pol.Path -Name $pol.Name -ErrorAction SilentlyContinue
        Write-Host "[+] Unlocked Policy: $($pol.Name) at $($pol.Path)" -ForegroundColor Green
    }
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Default Windows desktop and policies restored!  " -ForegroundColor Green
Write-Host " On next sign-in or restart, Windows will boot to desktop. " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
