#Requires -Version 5.1
<#
    Агент «что играет» для fox-sphere.

    Читает Windows GSMTC (то, что Brave сообщает системе как медиасессию),
    интерполирует позицию трека и отправляет состояние POST-ом на бэкенд бота.

    Почему позицию считаем сами: Brave (Chromium) обновляет `Position` только на
    старте трека и при перемотке. Проверено замерами - `Position` стоит на 0.01 с,
    `LastUpdatedTime` не двигается, при этом статус `Playing`. Поэтому сырое
    значение нельзя отправлять как «текущую позицию»: полоска в overlay замерла бы.

    Запускается Планировщиком при входе в систему (см. install.ps1).
#>

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "music-agent.config.json"
$logPath = Join-Path $scriptDir "music-agent.log"

# Один экземпляр на сеанс. Сторожевой триггер задачи и `Start-ScheduledTask` после
# переустановки умеют поднять второй процесс, а два агента пишут один лог и шлют
# одно и то же состояние дважды. Мьютекс держится до конца процесса; второй
# экземпляр просто выходит.
$agentMutex = New-Object System.Threading.Mutex($false, "Local\FoxSphereMusicAgent")
if (-not $agentMutex.WaitOne(0)) {
    exit 0
}

# Лог дописывается, а не перезаписывается: агент перезапускается сторожем, и обрыв
# нужно видеть вместе с тем, что было до него. Расти файлу не даём.
if ((Test-Path $logPath) -and ((Get-Item $logPath).Length -gt 2MB)) {
    Set-Content -Path $logPath -Value "" -Encoding UTF8
}

function Write-Log {
    param([string]$Message)

    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $logPath -Value $line -Encoding UTF8
}

Write-Log "=== start (pid $PID) ==="

if (-not (Test-Path $configPath)) {
    Write-Log "Config not found: $configPath"
    exit 1
}

try {
    $config = Get-Content -Path $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Write-Log "Config is not valid JSON: $($_.Exception.Message)"
    exit 1
}

# Куда отправлять состояние. Адресов в обычной работе два: прод на VM и локальный
# бот в docker compose - чтобы виджет можно было смотреть в дев-оверлее, пока
# эфир идёт с прод-оверлеем. Строка в списке - адрес с общим токеном из
# `token`; объект - адрес со своим токеном (тогда ключ `token` не нужен).
$defaultToken = $config.token
$targets = @()

if ($config.targets) {
    foreach ($entry in $config.targets) {
        if ($entry -is [string]) {
            $targets += [pscustomobject]@{ Url = $entry; Token = $defaultToken; Label = ""; FailCount = 0; LastError = $null }
        } else {
            $entryToken = $defaultToken
            if ($entry.token) { $entryToken = $entry.token }
            $targets += [pscustomobject]@{ Url = $entry.endpoint; Token = $entryToken; Label = ""; FailCount = 0; LastError = $null }
        }
    }
} elseif ($config.endpoint) {
    # Старая форма конфига - один адрес. Оставлена, чтобы уже установленная копия
    # не умерла молча после обновления агента.
    Write-Log "Config uses the old 'endpoint' shape - 'targets' is the current one"
    $targets += [pscustomobject]@{ Url = $config.endpoint; Token = $defaultToken; Label = ""; FailCount = 0; LastError = $null }
}

if ($targets.Count -eq 0) {
    Write-Log "Config has no 'targets' and no 'endpoint'"
    exit 1
}

foreach ($target in $targets) {
    if ([string]::IsNullOrWhiteSpace($target.Url)) {
        Write-Log "A target has no 'endpoint'"
        exit 1
    }

    if ([string]::IsNullOrWhiteSpace($target.Token)) {
        Write-Log "No token for $($target.Url): set 'token' or the target's own 'token'"
        exit 1
    }

    # Метка - хост, а не весь URL: по ней в логе видно, какой адрес отвалился.
    $target.Label = $target.Url
    try {
        $parsedUri = [Uri]$target.Url
        if ($parsedUri.IsDefaultPort) {
            $target.Label = $parsedUri.Host
        } else {
            $target.Label = "{0}:{1}" -f $parsedUri.Host, $parsedUri.Port
        }
    } catch {
        # Нерезолвящийся адрес оставляем как есть - его и надо увидеть в логе.
    }
}

$pollMs = 1000
if ($config.pollMs) { $pollMs = [int]$config.pollMs }

$heartbeatMs = 15000
$seekThresholdMs = 1500
$maxArtworkBytes = 200000
$requestTimeoutSec = 5

Write-Log ("Starting: pollMs={0}, targets: {1}" -f $pollMs, (($targets | ForEach-Object { $_.Label }) -join ", "))

Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing

# WinRT-задачи нельзя ждать напрямую из PowerShell: нужен адаптер AsTask.
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

$asStreamGeneric = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1
} | Select-Object -First 1

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
try {
    $manager = Await ($managerType::RequestAsync()) $managerType
} catch {
    # Единственная ошибка, которую цикл не поймает: без менеджера работать
    # нечем. Без этой ветки задача падала бы молча, с пустым логом.
    Write-Log "Cannot reach Windows media sessions (GSMTC): $($_.Exception.Message)"
    exit 1
}

function Get-PredictedPosition {
    param(
        [double]$AnchorPosMs,
        [datetime]$AnchorAt,
        [datetime]$Now,
        [bool]$Running
    )

    if (-not $Running) { return $AnchorPosMs }

    return $AnchorPosMs + ($Now - $AnchorAt).TotalMilliseconds
}

function Get-ArtworkDataUrl {
    param($ThumbnailReference)

    if ($null -eq $ThumbnailReference) { return $null }

    try {
        $winRtStream = Await ($ThumbnailReference.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        $contentType = $winRtStream.ContentType
        if ([string]::IsNullOrWhiteSpace($contentType)) { $contentType = "image/png" }

        # `AsStreamForRead` живёт в System.IO.WindowsRuntimeStreamExtensions, а не в
        # System.WindowsRuntimeSystemExtensions - иначе получаешь NullArray.
        $netStream = $asStreamGeneric.Invoke($null, @($winRtStream))
        $buffer = [System.IO.MemoryStream]::new()
        $netStream.CopyTo($buffer)
        $bytes = $buffer.ToArray()

        $buffer.Dispose()
        # WinRT-объект не отдаёт `Dispose` в PowerShell напрямую; закрытие
        # .NET-обёртки закрывает и его.
        $netStream.Dispose()

        if ($bytes.Length -eq 0) { return $null }

        # Обложка едет в data URL целиком, поэтому крупные картинки ужимаются:
        # 200 КБ бинарника - это ~270 КБ base64 на каждую смену трека, а в
        # JSON-теле лимит роута 1 МБ.
        if ($bytes.Length -gt $maxArtworkBytes) {
            $sourceStream = [System.IO.MemoryStream]::new($bytes)
            $image = [System.Drawing.Image]::FromStream($sourceStream)

            $scale = [Math]::Min(256 / $image.Width, 256 / $image.Height)
            $width = [int][Math]::Max(1, [Math]::Round($image.Width * $scale))
            $height = [int][Math]::Max(1, [Math]::Round($image.Height * $scale))

            $bitmap = [System.Drawing.Bitmap]::new($width, $height)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($image, 0, 0, $width, $height)

            $resized = [System.IO.MemoryStream]::new()
            $bitmap.Save($resized, [System.Drawing.Imaging.ImageFormat]::Png)
            $bytes = $resized.ToArray()
            $contentType = "image/png"

            $resized.Dispose()
            $graphics.Dispose()
            $bitmap.Dispose()
            $image.Dispose()
            $sourceStream.Dispose()
        }

        return "data:$contentType;base64," + [Convert]::ToBase64String($bytes)
    } catch {
        Write-Log "Artwork failed: $($_.Exception.Message)"
        return $null
    }
}

# Состояние якоря. Живёт в скрипте: каждое сообщение несёт уже посчитанную позицию,
# поэтому overlay ничего не восстанавливает и не догадывается.
$anchorPosMs = 0.0
$anchorAt = Get-Date
$anchorRunning = $false

$lastTrackKey = $null
$lastRawPosMs = $null
$lastIsPlaying = $null
$lastArtwork = $null
$lastSendAt = [datetime]::MinValue

Write-Log "Manager ready, entering loop"

while ($true) {
    try {
        $now = Get-Date
        $session = $manager.GetCurrentSession()
        $properties = $null

        if ($null -ne $session) {
            $properties = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])

            # Пустой заголовок - это не трек: схема на сервере требует минимум один
            # символ, и отправка такого состояния дала бы 400 на каждом цикле.
            if ([string]::IsNullOrWhiteSpace($properties.Title)) { $properties = $null }
        }

        $payloadState = $null
        $shouldSend = $false

        if ($null -eq $properties) {
            # Нет сессии: вкладка закрыта или плеер ничего не отдаёт в систему.
            # Это не пауза - пауза остаётся сессией со статусом Paused.
            if ($lastTrackKey -ne "<none>") {
                $lastTrackKey = "<none>"
                $lastIsPlaying = $null
                $lastArtwork = $null
                $lastRawPosMs = $null
                $anchorPosMs = 0.0
                $anchorAt = $now
                $anchorRunning = $false
                $shouldSend = $true
                Write-Log "No media session - sending null"
            }
        } else {
            $playbackInfo = $session.GetPlaybackInfo()
            $timeline = $session.GetTimelineProperties()

            $isPlaying = $playbackInfo.PlaybackStatus.ToString() -eq "Playing"
            # Разделитель, которого не бывает в названии: `|` встречается в заголовках
            # роликов (замерено - прямо в этом треке), и тогда разные треки
            # склеились бы в один ключ.
            $trackKey = $properties.Title + [char]0 + $properties.Artist
            $rawPosMs = $timeline.Position.TotalMilliseconds
            $durationMs = [int64][Math]::Max(0, $timeline.EndTime.TotalMilliseconds)

            # Позиция, которую предсказывает текущий якорь - до всех правок ниже.
            $predicted = Get-PredictedPosition -AnchorPosMs $anchorPosMs -AnchorAt $anchorAt -Now $now -Running $anchorRunning

            $trackChanged = $trackKey -ne $lastTrackKey
            $seeked = $false

            if ($trackChanged) {
                $anchorPosMs = $rawPosMs
                $anchorAt = $now
                $anchorRunning = $isPlaying
                $lastArtwork = Get-ArtworkDataUrl -ThumbnailReference $properties.Thumbnail
                Write-Log "Track: $($properties.Artist) - $($properties.Title) (dur $([int64]$timeline.EndTime.TotalSeconds)s)"
            } else {
                # Сырая позиция сдвинулась сама - значит это настоящая перемотка
                # (или браузер наконец прислал обновление). Дрожание на доли
                # секунды перемоткой не считается. У потока (радио) длительности
                # нет вовсе, и `Position` приходит нулевым на каждом опросе -
                # сравнивать нечего, это не перемотка, а отсутствие таймлайна.
                if ($durationMs -gt 0 -and $null -ne $lastRawPosMs -and [Math]::Abs($rawPosMs - $lastRawPosMs) -gt $seekThresholdMs) {
                    $anchorPosMs = $rawPosMs
                    $anchorAt = $now
                    $anchorRunning = $isPlaying
                    $seeked = $true
                    Write-Log "Seek detected: raw=$([int64]$rawPosMs)ms"
                } elseif ($null -ne $lastIsPlaying -and $lastIsPlaying -ne $isPlaying) {
                    if ($isPlaying) {
                        # Продолжение: идём с замороженного места, а не с того, что
                        # пришлёт Brave - он пришлёт старое значение.
                        $anchorPosMs = $predicted
                        $anchorAt = $now
                        $anchorRunning = $true
                    } else {
                        # Пауза: фиксируем позицию, время останавливается.
                        $anchorPosMs = $predicted
                        $anchorAt = $now
                        $anchorRunning = $false
                    }
                }
            }

            $positionMs = Get-PredictedPosition -AnchorPosMs $anchorPosMs -AnchorAt $anchorAt -Now $now -Running $anchorRunning
            $positionMs = [Math]::Min([Math]::Max($positionMs, 0), [Math]::Max($durationMs, 0))

            $album = $properties.AlbumTitle
            if ([string]::IsNullOrWhiteSpace($album)) { $album = $null }

            # Обложка едет только при смене трека: сердцебиение с ней же - это
            # ~270 КБ base64 каждые 15 секунд. Сервер вернёт прежнюю картинку
            # к состоянию того же трека (см. mergeNowPlaying).
            $artworkForPayload = $null
            if ($trackChanged) { $artworkForPayload = $lastArtwork }

            $payloadState = @{
                title      = [string]$properties.Title
                artist     = [string]$properties.Artist
                album      = $album
                artwork    = $artworkForPayload
                durationMs = $durationMs
                positionMs = [int64][Math]::Round($positionMs)
                isPlaying  = $isPlaying
                sentAt     = [int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
            }

            $statusChanged = $null -ne $lastIsPlaying -and $lastIsPlaying -ne $isPlaying
            $heartbeatDue = ($now - $lastSendAt).TotalMilliseconds -ge $heartbeatMs

            if ($trackChanged -or $seeked -or $statusChanged -or $heartbeatDue) {
                $shouldSend = $true
            }

            $lastTrackKey = $trackKey
            $lastRawPosMs = $rawPosMs
            $lastIsPlaying = $isPlaying
        }

        if ($shouldSend) {
            $json = @{ state = $payloadState } | ConvertTo-Json -Depth 4 -Compress
            # Строка в `-Body` уходит в ASCII, и любой не-латинский трек приезжает
            # на сервер как "????". Поэтому тело кодируется в UTF-8 заранее.
            $body = [System.Text.Encoding]::UTF8.GetBytes($json)
            $delivered = 0

            foreach ($target in $targets) {
                $headers = @{ Authorization = "Bearer $($target.Token)" }

                try {
                    Invoke-RestMethod -Uri $target.Url -Method Post -Body $body -ContentType "application/json" -Headers $headers -TimeoutSec $requestTimeoutSec | Out-Null
                    $delivered++

                    # Возвращение в строй - отдельной строкой: иначе по логу видно
                    # только начало падения и непонятно, кончилось ли оно.
                    if ($target.FailCount -gt 0) {
                        Write-Log ("{0}: POST recovered after {1} failures" -f $target.Label, $target.FailCount)
                        $target.FailCount = 0
                        $target.LastError = $null
                    }
                } catch {
                    $message = $_.Exception.Message
                    $target.FailCount++

                    # Прод и локальный бот живут разной жизнью: локальный стек
                    # выключен большую часть времени, и строка на каждую попытку -
                    # это 5 700 строк в сутки, которые никто не читает. Пишем
                    # первую ошибку, смену её текста и потом раз в 20 попыток
                    # (примерно раз в 5 минут).
                    $isNewError = $message -ne $target.LastError
                    if ($target.FailCount -eq 1 -or $isNewError -or ($target.FailCount % 20) -eq 0) {
                        Write-Log ("{0}: POST failed ({1}x): {2}" -f $target.Label, $target.FailCount, $message)
                    }

                    $target.LastError = $message
                }
            }

            # Отметка двигается и при неудаче: повтор уйдёт со следующим
            # сердцебиением, а не каждую секунду.
            $lastSendAt = $now

            if ($null -eq $payloadState) {
                Write-Log ("Sent: null ({0}/{1})" -f $delivered, $targets.Count)
            } else {
                Write-Log ("Sent: playing={0} pos={1}ms ({2}/{3})" -f $payloadState.isPlaying, $payloadState.positionMs, $delivered, $targets.Count)
            }
        }

        Start-Sleep -Milliseconds $pollMs
    } catch {
        Write-Log "Loop error: $($_.Exception.Message)"
        Start-Sleep -Milliseconds $pollMs
    }
}
