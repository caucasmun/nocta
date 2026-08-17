<p align="center">
  <img src="frontend/public/nocta-logo.svg" alt="Nocta Logo" width="120" />
</p>

<h1 align="center">🎧 Nocta — музыкальное приложение</h1>

<p align="center">
  <b>Слушай музыку, создавай библиотеку, лайкай любимые треки и ищи новое.</b>
</p>

<p align="center">
  <a href="https://github.com/caucasmun/nocta"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-Nocta-1db954?style=for-the-badge&logo=github&logoColor=white"></a>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white">
</p>

---

## ✨ Возможности

| | Функция | Описание |
|--|---------|----------|
| 🎵 | **Готовый музыкальный каталог** | 15 предустановленных треков: Linkin Park, Nirvana, Radiohead, Arctic Monkeys, Gorillaz, Michael Jackson — доступны **каждому пользователю** сразу после регистрации |
| 🔍 | **Поиск** | Поиск по трекам и исполнителям — глобальным и собственным |
| 👤 | **Страница исполнителя** | Биография, дискография, переходы между артистами |
| ❤️ | **Любимые треки** | Лайки привязаны к конкретному пользователю и отображаются только у него |
| 📚 | **Моя библиотека** | Треки, подписки на исполнителей и плейлисты |
| ▶️ | **Умный плеер** | Полноэкранный плеер с визуализатором, громкостью, перемоткой, фейдом; треки не повторяются, пока не пройдёт весь плейлист (перемешивание Фишера-Йетса) |
| 💾 | **Сохранение состояния** | При следующем входе воспроизведение продолжается с того же места |
| 🎨 | **Добавление контента** | Загрузка своих треков, обложек и текстов песен, создание исполнителей (включая выбор глобальных артистов) |
| 📝 | **Тексты песен** | Все предустановленные треки содержат полные тексты |
| 📱 | **Адаптивный дизайн** | Полная поддержка мобильных устройств: свайпы, touch-навигация, мобильный плеер |

---

## 🚀 Технологии

**Frontend**
- [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- [React Router 7](https://reactrouter.com/)
- CSS Modules
- Canvas-анимации (визуализатор, частицы, винил)

**Backend**
- [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/) (pg)
- [Multer](https://github.com/expressjs/multer) — загрузка файлов
- [dotenv](https://github.com/motdotla/dotenv) — конфигурация

---

## 📂 Структура проекта

```
nocta/
├── package.json               # Корневой скрипты (npm run dev, install:all)
├── backend/                   # Express + PostgreSQL API
│   ├── index.js               # Основной сервер и все эндпоинты
│   ├── db.js                  # Пул подключений к PostgreSQL
│   ├── init.sql               # Создание таблиц
│   ├── seed_default_content.js # Предустановленные треки/исполнители
│   ├── migrate_likes.js       # Миграция лайков (одноразово)
│   ├── cleanup_default_from_library.js # Очистка библиотек (одноразово)
│   └── uploads/               # Загруженные файлы (аудио, обложки)
└── frontend/                  # React SPA
    └── src/
        ├── components/        # LeftNav, BottomPlayer
        ├── context/           # AuthContext, AudioContext
        ├── data/              # api.js, db.js (слой данных)
        └── pages/             # Home, Search, Library, Liked, Artist, ...
```

---

## 🛠️ Установка и запуск

### Требования

- **Node.js** 18 или новее
- **PostgreSQL** 13+ (локально или в Docker)

### Шаг 1. База данных

Создайте базу данных:

```sql
CREATE DATABASE nocta;
```

Таблицы создадутся автоматически при первом запуске бэкенда через `init.sql`.

### Шаг 2. Настройка бэкенда

Создайте файл конфигурации:

```bash
cd backend
cp .env.example .env
```

Заполните `.env`:

```env
PGUSER=postgres
PGPASSWORD=your_password_here
PGDATABASE=nocta
PGHOST=localhost
PGPORT=5432
PORT=5000
```

### Шаг 3. Установка зависимостей

Из корневой папки проекта одной командой:

```bash
npm run install:all
```

Эта команда установит зависимости в корне, в `backend` и в `frontend`.

### Шаг 4. Запуск

Запустите фронтенд и бэкенд **одновременно одной командой** из корня:

```bash
npm run dev
```

> ✅ Backend запустится на `http://localhost:5000`  
> ✅ Frontend запустится на `http://localhost:5173`  
> ✅ При первом запуске автоматически создадутся таблицы и **предустановленные треки** (Linkin Park, Nirvana, Radiohead, Arctic Monkeys, Gorillaz, Michael Jackson) — доступные всем пользователям.

Также доступны отдельные команды:

```bash
npm run dev:backend   # только бэкенд
npm run dev:frontend  # только фронтенд
```

Проверка:

```bash
curl http://localhost:5000/api/health
# {"status":"ok"}
```

API по умолчанию — `http://localhost:5000`. Если бэкенд на другом адресе, создайте `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

### Шаг 5. Пользователи

Зарегистрируйте нового пользователя в интерфейсе — и сразу получите доступ к предустановленному каталогу из 15 треков и 6 исполнителей.

---

## 📡 API эндпоинты

### Базовые

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/health` | Проверка сервера |
| `GET` / `POST` | `/api/users` | Список / создание пользователя |
| `GET` / `PUT` / `DELETE` | `/api/users/:id` | Работа с конкретным пользователем |

### Треки и артисты

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` / `POST` | `/api/tracks` | Все треки / создание трека |
| `GET` / `PUT` / `DELETE` | `/api/tracks/:id` | Работа с треком |
| `GET` / `POST` | `/api/artists` | Все артисты / создание артиста |
| `GET` / `PUT` / `DELETE` | `/api/artists/:id` | Работа с артистом |
| `GET` | `/api/users/:userId/all-tracks` | **Все доступные треки** (глобальные + свои) |
| `GET` | `/api/users/:userId/all-artists` | **Все доступные артисты** (глобальные + свои) |

### Библиотека пользователя

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` / `POST` / `DELETE` | `/api/users/:userId/library/tracks` | Треки в библиотеке |
| `GET` / `POST` / `DELETE` | `/api/users/:userId/library/artists` | Подписки на артистов |
| `POST` | `/api/users/:userId/library/sync` | Синхронизация библиотеки с треками пользователя |

### Лайки (привязаны к пользователю)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/users/:userId/liked-tracks` | ID лайкнутых треков пользователя |
| `POST` | `/api/users/:userId/liked-tracks/:trackId` | Поставить лайк |
| `DELETE` | `/api/users/:userId/liked-tracks/:trackId` | Убрать лайк |

### Плейлисты и воспроизведение

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` / `POST` | `/api/users/:userId/playlists` | Плейлисты пользователя |
| `GET` / `PUT` / `DELETE` | `/api/playlists/:id` | Работа с плейлистом |
| `GET` / `POST` / `DELETE` | `/api/playlists/:id/tracks` | Треки плейлиста |
| `GET` / `PUT` | `/api/users/:userId/playback` | Состояние воспроизведения |

### Файлы

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/upload/audio` | Загрузка аудиофайла |
| `POST` | `/api/upload/image` | Загрузка обложки / фото |
| `GET` | `/uploads/*` | Статические файлы |

---

## 🎵 Предустановленный каталог

При первом запуске бэкенда автоматически создаются глобальные треки и исполнители, доступные **всем** пользователям:

| Исполнитель | Треки |
|-------------|-------|
| **Linkin Park** | Numb, In the End, What I've Done, Somewhere I Belong |
| **Nirvana** | Smells Like Teen Spirit, Come As You Are, Drain You |
| **Radiohead** | Creep, No Surprises, Karma Police |
| **Arctic Monkeys** | Do I Wanna Know?, 505, I Wanna Be Yours |
| **Gorillaz** | Feel Good Inc. |
| **Michael Jackson** | Billie Jean |

Каждый трек содержит: аудиофайл, обложку, цвет и **полный текст песни**.

---

## 🔑 Ключевые особенности реализации

- **Глобальные предустановленные треки** — создаются с `user_id = NULL`, поэтому принадлежат платформе и видны всем пользователям (в плеере, поиске, на странице исполнителя, при добавлении контента), но **не засоряют** библиотеку.
- **Персональные лайки** — лайки хранятся в таблице `user_liked_tracks` (связка `user_id` + `track_id`). Лайк одного пользователя не влияет на других.
- **Умная очередь воспроизведения** — треки перемешиваются по алгоритму Фишера-Йетса, один и тот же трек не повторится, пока не будут проиграны все.
- **Визуализатор** — полноэкранный плеер с анимированным винилом, спектр-анализатором, частицами и динамической цветовой палитрой, извлекаемой из обложки.
- **Сохранение прогресса** — последний трек и позиция запоминаются, при новом входе воспроизведение продолжается.
- **Автоматическая миграция** — таблицы, предустановленный контент и перенос старых лайков выполняются автоматически при старте сервера.

---

## 🧰 Полезные команды

```bash
# Запуск фронтенда и бэкенда одновременно
npm run dev

# Установка всех зависимостей (корень + backend + frontend)
npm run install:all

# Сборка фронтенда
cd frontend && npm run build

# Линтинг фронтенда
cd frontend && npm run lint

# Публикация фронтенда на GitHub Pages
cd frontend && npm run deploy

# Проверка базы данных
cd backend && node check_db.js

# Тест API
cd backend && node test_api.js
```

---

## 📄 Лицензия

Проект распространяется по лицензии **ISC**.

---

<p align="center">
  Сделано с ❤️ и 🎧 · <a href="https://github.com/caucasmun/nocta">caucasmun/nocta</a>
</p>