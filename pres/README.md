# Презентация LangWars

12 слайдов, 16:9, на русском. Команда — второй слайд, AI-инструменты — третий, постановка задачи — четвёртый.

## Файлы

| Файл | Назначение |
| --- | --- |
| `LangWars.pdf` | Основной вариант для показа. 12 страниц, 13,33 × 7,5 дюйма, закладки по слайдам. |
| `LangWars.pptx` | PowerPoint: полноэкранные изображения слайдов + заметки докладчика. |
| `index.html` | Живая версия и редактируемый исходник. Шрифты локальные, сеть не нужна. |
| `speaker-notes.md` | План выступления на 6:20 с таймингом. |
| `export_deck.py` | Пересобирает PNG, PDF и PPTX из `index.html`. |
| `ui-tasks-ru.png`, `ui-editor-ru-tall.png` | Скриншоты прода `langwars.gerosp.ru`. |
| `qr.png` | QR на GitHub-репозиторий. |
| `fonts/` | Unbounded, Manrope, JetBrains Mono и Press Start 2P. |

## Показ из HTML

Откройте `index.html` в браузере. Слайд 9 (конвейер отправки) анимирован вживую.

- `→` / `Space` — следующий, `←` — предыдущий
- `N` — заметки докладчика
- `O` — обзор слайдов
- `T` — таймер на 7 минут
- `F` — полный экран
- `?` — подсказка по управлению

## Пересборка PDF / PPTX

```sh
python -m venv .venv
.venv/Scripts/pip install playwright pillow python-pptx img2pdf pypdf
.venv/Scripts/python export_deck.py
```

На Linux/macOS используйте `.venv/bin/python`. Скрипт запускает установленный Microsoft Edge (`channel="msedge"`); при необходимости замените канал на `chromium`.

PPTX специально сделан из изображений, чтобы вёрстка не поехала в PowerPoint; заметки докладчика при этом редактируются. Для правок текста или дизайна меняйте `index.html` и пересобирайте экспорт.

## Источники

- Постановка задачи: <https://cs-uni.ru/index.php?title=LangWars>.
- Прод и скриншоты: <https://langwars.gerosp.ru> (русская локаль), 12 ноября 2026.
- Факты и ограничения: `../remote/README.md`, `../remote/docs/Verification.md`,
  `../remote/docs/StressTestAnalysis.md`, `../remote/docs/Architecture.md`.
- Агентный плейтест: `prompt.txt`, `ZeroExp.md`, `LangZero.md`, `CatExp.md`, `LangCat.md`.
- Роли команды: постановка задачи, git-история и данные команды.
