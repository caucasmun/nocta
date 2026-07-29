# Nocta — музыкальное приложение (локальный запуск)

## Требования
- Node.js 18+
- PostgreSQL (локально, пользователь `postgres`, пароль из `backend/.env`)

## Структура
- `backend/` — Express + PostgreSQL API (порт 5000)
- `frontend/` — React + Vite (порт 5173)

## Быстрый старт

### 1. База данных PostgreSQL
Создайте базу `nocta` (если её нет):
```sql
CREATE DATABASE nocta;
```
Таблицы создаются автоматически при запуске бэкенда (через `init.sql`).

Настройки подключения — в `backend/.env`:
```
PGUSER=postgres
PGPASSWORD=28172817
PGDATABASE=nocta
PGHOST=localhost
PGPORT=5432
PORT=5000
```

### 2. Бэкенд
```bash
cd backend
npm install
npm start
```
Сервер запустится на `http://localhost:5000`.
Проверка: `http://localhost:5000/api/health` → `{"status":"ok"}`

### 3. Фронтенд
```bash
cd frontend
npm install
npm run dev
```
Приложение откроется на `http://localhost:5173`.

Настройки API — в `frontend/.env`:
```
VITE_API_URL=http://localhost:5000
```

## API эндпоинты
- `GET  /api/health` — проверка сервера
- `GET/POST/PUT/DELETE /api/users` — пользователи
- `GET/POST/PUT/DELETE /api/artists` — артисты
- `GET/POST/PUT/DELETE /api/tracks` — треки
- `GET/POST/DELETE /api/users/:userId/library/tracks` — библиотека треков
- `GET/POST/DELETE /api/users/:userId/library/artists` — подписки на артистов
- `POST /api/users/:userId/library/sync` — синхронизация библиотеки
- `POST /api/upload/audio` — загрузка аудио
- `POST /api/upload/image` — загрузка обложек/фото
- `GET /uploads/*` — статические загруженные файлы