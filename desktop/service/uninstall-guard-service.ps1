<#
.SYNOPSIS
    Uninstalls the PCClubGuard Windows Service.
#>

[CmdletBinding()]
param()

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "ERROR: This uninstaller must be run as Administrator!"
    exit 1
}

$ServiceName = "PCClubGuard"

Write-Host "Stopping and removing $ServiceName..." -ForegroundColor Yellow
Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
& sc.exe delete $ServiceName

Write-Host "[SUCCESS] $ServiceName removed cleanly from Windows Services." -ForegroundColor Green
