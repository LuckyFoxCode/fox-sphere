#Requires -Version 5.1
<#
    Снимает агент «что играет»: удаляет задачу Планировщика и скопированную папку.

    Запуск: powershell -ExecutionPolicy Bypass -File uninstall.ps1
#>

$ErrorActionPreference = "Continue"

$taskName = "FoxSphereMusicAgent"
$targetDir = Join-Path $env:LOCALAPPDATA "fox-sphere\music-agent"

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -ne $task) {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Task removed: $taskName"
} else {
    Write-Host "Task not found: $taskName"
}

if (Test-Path $targetDir) {
    Remove-Item -Path $targetDir -Recurse -Force
    Write-Host "Removed: $targetDir"
} else {
    Write-Host "Directory not found: $targetDir"
}
