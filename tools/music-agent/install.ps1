#Requires -Version 5.1
<#
    Устанавливает агент «что играет» для fox-sphere.

    Копирует скрипт в %LOCALAPPDATA%\fox-sphere\music-agent и регистрирует задачу
    Планировщика при входе в систему. Копия, а не запуск из репозитория: репозиторий
    живёт в WSL, и задача, указывающая на \\wsl.localhost\..., не переживёт вход в
    систему до запуска WSL.

    Запуск: powershell -ExecutionPolicy Bypass -File install.ps1
#>

$ErrorActionPreference = "Stop"

$taskName = "FoxSphereMusicAgent"
$targetDir = Join-Path $env:LOCALAPPDATA "fox-sphere\music-agent"
$sourceScript = Join-Path $PSScriptRoot "music-agent.ps1"
$sourceConfig = Join-Path $PSScriptRoot "music-agent.config.example.json"
$targetScript = Join-Path $targetDir "music-agent.ps1"
$targetConfig = Join-Path $targetDir "music-agent.config.json"

if (-not (Test-Path $sourceScript)) {
    Write-Host "music-agent.ps1 not found next to install.ps1" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -Path $sourceScript -Destination $targetScript -Force

# Существующий конфиг не перезаписывается: в нём токен, который человек уже вписал.
if (-not (Test-Path $targetConfig)) {
    Copy-Item -Path $sourceConfig -Destination $targetConfig -Force
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$targetScript`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

# `New-ScheduledTaskSettingsSet` приходит с `IdleSettings.StopOnIdleEnd = $true`,
# и это гасит агент ровно тогда, когда он нужен: Планировщик останавливает
# задачу, как только компьютер перестаёт быть в режиме простоя, то есть через
# несколько минут после первого движения мыши. Завершение приходит как
# 3221225786 (0xC000013A), выглядит как «агент умер сам» и в логе остаётся
# просто обрывом. Задача должна жить, пока жив пользователь.
$settings.IdleSettings.StopOnIdleEnd = $false

# Переустановка поверх работающей задачи: без остановки `Register -Force` не
# подменит запущенный экземпляр, и старые настройки останутся жить до перезагрузки.
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "fox-sphere: sends the currently playing track to the overlay" `
    -Force | Out-Null

Start-ScheduledTask -TaskName $taskName

Write-Host ""
Write-Host "Installed to: $targetDir"
Write-Host "Task:         $taskName (runs at logon, hidden)"
Write-Host "Log:          $(Join-Path $targetDir 'music-agent.log')"
Write-Host ""
Write-Host "Fill in endpoint and token in:" -ForegroundColor Yellow
Write-Host "  $targetConfig"
Write-Host ""
Write-Host "Then restart the task:"
Write-Host "  Start-ScheduledTask -TaskName $taskName"
