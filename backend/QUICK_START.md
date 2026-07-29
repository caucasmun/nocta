# Быстрый старт для локальной разработки

## ⚠️ ВАЖНО: Сначала создайте базу данных!

### Шаг 1: Создайте базу данных PostgreSQL

Откройте PowerShell или Command Prompt и выполните:

```bash
# Подключитесь к PostgreSQL (введите пароль от postgres)
psql -U postgres

# Создайте базу данных
CREATE DATABASE nocta;

# Выйдите
\q
```

Или одной командой:
```bash
psql -U postgres -c "CREATE DATABASE nocta;"
```

### Шаг 2: Инициализируйте таблицы

```bash
cd backend
npm run init-db
```

Вы должны увидеть:
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
ALTER TABLE
ALTER TABLE
ALTER TABLE
```

### Шаг 3: Запустите бэкенд

```bash
cd backend
npm start
```

Должно появиться:
```
Database connected: 2026-07-29T18:30:00.000Z as postgres
Mode: local
Server is running on port 5000
```

### Шаг 4: Запустите фронтенд (в новом терминале)

```bash
cd frontend
npm run dev
```

### Шаг 5: Откройте браузер

```
http://localhost:5173/nocta/
```

## Если PostgreSQL не установлен:

### Windows:
1. Скачайте PostgreSQL с https://www.postgresql.org/download/windows/
2. Установите (запомните пароль для пользователя postgres)
3. Перезагрузите компьютер
4. Выполните Шаг 1 выше

### Или используйте Docker:
```bash
docker run --name nocta-postgres -e POSTGRES_PASSWORD=28172817 -e POSTGRES_DB=nocta -p 5432:5432 -d postgres:15
```

## Проверка работоспособности:

1. **Health check**: http://localhost:5000/api/health
   - Должен вернуть: `{"ok":true,"db":"up"}`

2. **Пользователи**: http://localhost:5000/api/users
   - Должен вернуть: `[]`

3. **Артисты**: http://localhost:5000/api/artists
   - Должен вернуть: `[]`

## Частые проблемы:

### "база данных 'nocta' не существует"
```bash
psql -U postgres -c "CREATE DATABASE nocta;"
```

### "connection refused"
- Проверьте что PostgreSQL запущен: `net start postgresql`
- Проверьте порт: `psql -U postgres -p 5432`

### "password authentication failed"
- Проверьте пароль в `backend/.env`
- Или сбросьте пароль: `psql -U postgres -c "ALTER USER postgres WITH PASSWORD '28172817';"`

## Структура базы данных:

- `users` - пользователи
- `artists` - исполнители (с полями `photo_url` для фото)
- `tracks` - треки (с полями `audio_url`, `cover_url` для файлов)
- `user_library_tracks` - библиотека треков
- `user_library_artists` - подписки на исполнителей