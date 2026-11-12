# LangWars — промо-видео

Быстрый шоурил платформы LangWars: общий мир, общие имена, поломка чужого решения, язык, рейтинг, ивенты и вход в мир.

- 1920×1080, 30 fps, 53 секунды, со звуком: синтезированный brostep/dubstep и SFX.
- Все экраны собраны на React/Remotion, а не на скриншотах.
- Палитра, шрифты и Neko-9 взяты из реального фронтенда LangWars.
- Игровой текст русский; английский остаётся только в коде, брендах и технических идентификаторах.

## Готовый файл

- `out/langwars-promo.mp4` — 1920×1080, H.264 + AAC 320k, 53,3 секунды.
- `out/poster.png` — кадр для превью.
- `public/audio/langwars-promo-v2.wav` — готовый микс; стемы музыки и SFX — в `out/stems-v2/`.

## Запуск

```sh
npm ci
npm run dev
```

Remotion Studio откроется в браузере. Нужная композиция — `LangWarsPromo`.

## Что заменить перед публикацией

Всё лежит в `src/content.ts`:

```ts
export const JOIN_URL = 'langwars.example';       // куда ведёт ссылка
export const JOIN_URL_HINT = 'langwars.example';  // что видно на экране
export const QR_IMAGE = '';                       // '' — нарисованный плейсхолдер
export const AUTHORS = ['gerosp', 'LocalPiper', 'as3rg', 'Andrien777', 'fkazarin'];
```

Для настоящего QR положите файл в `public/qr.png` и укажите `QR_IMAGE = 'qr.png'`. Плейсхолдер в кадре выглядит как QR, но не сканируется — это сделано специально.

## Рендер

```sh
npx remotion render LangWarsPromo out/langwars-promo.mp4 --codec=h264 --crf=18 --audio-bitrate=320k
```

Для превью отдельных кадров:

```sh
npx remotion still LangWarsPromo out/frame.png --frame=660
```

## Структура

- `src/Promo.tsx` — таймлайн, переходы, общая рамка.
- `src/scenes/` — пять сцен: логотип, манифест, поломка, шоурил, вход.
- `src/components/Neko.tsx` — анимированный Neko-9.
- `src/components/ui.tsx` — окна, код, пилюли, QR.
- `src/components/Type.tsx` — крупная типографика и reveal-анимации.
- `src/content.ts` — ссылка, QR, авторы.
- `tools/make_soundtrack_v2.py` — синтез brostep-микса и SFX, детерминированный сид.
- `tools/make_soundtrack.py` — прежний retro-techno микс (не используется в рендере).
- `public/audio/` — готовый микс; стемы складываются в `out/stems-v2/`.
- `VOICEOVER.md` — короткий закадровый текст с таймкодами.

## Звук

- 150 BPM (12 кадров на долю), A minor; brostep-грув с дабстеп-вобблом на дропах.
- Все удары привязаны к номерам кадров: импакты на склейках 120/330/420/436/576/1086/1266/1402/1584,
  стуттер-монтаж 1086–1176 попадает в каждую смену слова.
- Всё синтезировано локально в `tools/make_soundtrack_v2.py`: без сэмплов и внешних API.
- Мастер: 44,1 кГц, 16 бит, true peak −0,6 dBFS, RMS ≈ −14,9 dBFS; AAC 320k в финальном MP4.
- Пересобрать: `npm run sound:v2` (или `python tools/make_soundtrack_v2.py`). Скрипт пишет микс,
  стемы в `out/stems-v2/` и `out/soundtrack-v2.json` с картой событий.
- Для скрипта нужен numpy: `python3 -m venv .venv-sound && .venv-sound/bin/pip install numpy`.
- Закадровый голос не записан: музыка и SFX уже сведены, а текст для озвучки лежит в `VOICEOVER.md`.

## Дизайн

- Фон `#050510`, циан `#0ff1ca`, маджента `#ff2e88`, фиолетовый `#8a5cf6`, янтарный `#ffcf5c`.
- Unbounded для крупных заголовков, JetBrains Mono для кода, Press Start 2P для логотипа, Manrope для тела.
- Никаких CSS-анимаций: всё считается от `useCurrentFrame()`, поэтому кадры детерминированы.

Игроки, очки, числа ревизий, события и новости в кадре — иллюстративные, это не срез прода.

Команда: @gerosp, @LocalPiper, @as3rg, @Andrien777, @fkazarin.
