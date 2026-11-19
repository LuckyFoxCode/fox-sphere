# Музыкальный агент

Маленький фоновый процесс на Windows, который рассказывает боту, что сейчас играет.
Бот раздаёт это overlay-виджету; сам виджет живёт в `apps/overlay`.

```
Brave (Spotify web / YouTube)
   ↓ Windows GSMTC
music-agent.ps1  ──POST /api/music/state──▶  bot-runtime  ──socket──▶  overlay
```

## Почему не Spotify Web API

С февраля 2026 Development Mode требует Premium у владельца приложения, а эндпоинты
«currently playing» для новых приложений отрезаны ещё в 2024-м. У стримера бесплатный
аккаунт. Расширения в браузере — тоже нет: источник данных только системный.

## Почему позиция трека считается в агенте

Brave (Chromium) обновляет `Position` в SMTC только на старте трека и при перемотке.
Замеры: `Position` = 0.01 с, `LastUpdatedTime` не двигается, статус при этом `Playing`.
Сырое значение нельзя отправлять как «текущую позицию» — полоска в overlay замерла бы.

Агент держит якорь `(position, moment)` и отдаёт `position + (now − moment)` пока
`Playing`. Перемотка определяется по тому, что сырая позиция сдвинулась больше чем на
1.5 с сама по себе. Пауза замораживает предсказанную позицию, продолжение идёт с неё же,
а не с того, что пришлёт Brave.

## Установка

1. На VM в `~/foxsphere/.env` добавить `MUSIC_AGENT_TOKEN=$(openssl rand -hex 32)`
   и перезапустить бота.
2. Рядом с этим README:

   ```powershell
   powershell -ExecutionPolicy Bypass -File install.ps1
   ```

   Скрипт копирует агент в `%LOCALAPPDATA%\fox-sphere\music-agent`, создаёт там
   `music-agent.config.json` из шаблона (существующий не перезаписывает) и регистрирует
   задачу `FoxSphereMusicAgent` при входе в систему.

3. Вписать в `%LOCALAPPDATA%\fox-sphere\music-agent\music-agent.config.json`:

   ```json
   {
     "pollMs": 1000,
     "token": "<тот же MUSIC_AGENT_TOKEN>",
     "targets": [
       "http://<IP-или-домен-VM>/api/music/state",
       "http://localhost:3000/api/music/state"
     ]
   }
   ```

4. `Start-ScheduledTask -TaskName FoxSphereMusicAgent`

Копия в `%LOCALAPPDATA%`, а не запуск из репозитория: репозиторий лежит в WSL, и задача,
указывающая на `\\wsl.localhost\…`, не переживёт вход в систему до запуска WSL.

## Два адреса: прод и локальный

`targets` - это список, и состояние уходит в **каждый** адрес одним и тем же телом. Так
виджет живёт и в прод-оверлее (OBS во время эфира), и в дев-оверлее (`pnpm dev:f`), при
этом править локально можно, не трогая прод: боты друг о друге не знают, каждый хранит
своё состояние в памяти.

Адреса независимы по отказам. Локальный стек выключен большую часть времени - это норма,
прод при этом получает всё как обычно. Чтобы лог не превращался в 5 700 строк в сутки,
упавший адрес пишет первую ошибку, потом смену её текста, потом раз в 20 попыток
(~5 минут), и отдельную строку, когда оживёт:

```
2026-11-19 10:36:17 Starting: pollMs=1000, targets: 79.76.42.154, localhost:3000
2026-11-19 10:36:17 Sent: playing=True pos=20ms (2/2)
2026-11-19 10:41:03 localhost:3000: POST failed (20x): Unable to connect to the remote server
2026-11-19 10:52:10 localhost:3000: POST recovered after 44 failures
```

Строка в списке - адрес с общим `token`. Если окружениям нужны разные токены, адрес
записывается объектом, и общий `token` тогда не нужен:

```json
{
  "targets": [
    { "endpoint": "http://<IP-VM>/api/music/state", "token": "<прод>" },
    { "endpoint": "http://localhost:3000/api/music/state", "token": "<локальный>" }
  ]
}
```

## Что отправляется

`POST /api/music/state`, заголовок `Authorization: Bearer <token>`, тело:

```json
{
  "state": {
    "title": "Black Friday - pretty like the sun",
    "artist": "Lost Frequencies, Tom Odell",
    "album": "Black Friday (pretty like the sun)",
    "artwork": "data:image/png;base64,…",
    "durationMs": 145650,
    "positionMs": 72000,
    "isPlaying": true,
    "sentAt": 1762345678901
  }
}
```

`state: null` означает «сессии нет» — overlay плавно скрывает виджет.

Отправка идёт при смене трека, смене «играет/пауза», перемотке и раз в 15 секунд
сердцебиением. Обложка читается **и отправляется** только при смене трека: сердцебиение
несёт `artwork: null`, а сервер возвращает прежнюю картинку к состоянию того же трека.
Иначе ~270 КБ base64 уезжали бы каждые 15 секунд, это десятки мегабайт за вечер.
Больше 200 КБ обложка ужимается до 256 px через `System.Drawing`.

Ответы: `204` — принято, `401` — неверный токен, `503` — на сервере не задан
`MUSIC_AGENT_TOKEN`, `400` — тело не прошло валидацию. Агент на любую ошибку пишет
строку в `music-agent.log` и продолжает цикл: сеть не должна его ронять.

## Отладка

Лог: `%LOCALAPPDATA%\fox-sphere\music-agent\music-agent.log`, перезаписывается при
каждом старте.

```powershell
Get-Content "$env:LOCALAPPDATA\fox-sphere\music-agent\music-agent.log" -Tail 30
Get-ScheduledTask -TaskName FoxSphereMusicAgent | Get-ScheduledTaskInfo
```

Остановить: `Stop-ScheduledTask -TaskName FoxSphereMusicAgent`.
Снять совсем: `powershell -ExecutionPolicy Bypass -File uninstall.ps1`.

## Что нельзя проверить тестами

Windows GSMTC требует Windows и живого плеера, поэтому агент не покрыт ни юнит-тестами,
ни интеграционными. Проверка ручная: включить трек, посмотреть виджет, поставить паузу,
перемотать, сменить трек, перезагрузить сцену в OBS. Всё, что можно было вынести в чистые
функции (расчёт позиции, формат времени, решение о бегущей строке), вынесено в
`apps/overlay/src/utils/music/` и покрыто там.
