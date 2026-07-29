# Настройка локальной базы данных PostgreSQL

## Требования

- PostgreSQL 12+ установлен локально
- База данных `nocta` создана в PostgreSQL

## Быстрая настройка

### 1. Создайте базу данных

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE nocta;

# Выйдите из psql
\q
```

### 2. Настройте подключение

Отредактируйте файл `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/nocta
PORT=5000
```

Замените `ВАШ_ПАРОЛЬ` на пароль от PostgreSQL.

### 3. Инициализируйте базу данных

```bash
cd backend
npm run init-db
```

Или вручную:

```bash
psql -U postgres -d nocta -f init.sql
```

### 4. Запустите бэкенд

```bash
cd backend
npm start
```

Сервер запустится на `http://localhost:5000`

## Проверка подключения

При запуске вы должны увидеть:

```
Database connected: 2026-07-29T18:17:00.000Z as postgres
Mode: local
Server is running on port 5000
```

## Структура базы данных

- `users` - пользователи приложения
- `artists` - музыкальные исполнители
- `tracks` - музыкальные треки
- `user_library_tracks` - библиотека треков пользователей
- `user_library_artists` - подписки на артистов

## Переключение на облачную базу

Для использования Supabase или Render:

1. Удалите или закомментируйте `DATABASE_URL` в `backend/.env`
2. Установите переменную окружения `DATABASE_URL` в системе
3. Перезапустите бэкенд

Пример для Render:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Устранение проблем

### Ошибка подключения к базе данных

1. Проверьте, что PostgreSQL запущен:
   ```bash
   # Windows
   net start postgresql
   
   # macOS/Linux
   sudo service postgresql status
   ```

2. Проверьте правильность учетных данных в `backend/.env`

3. Убедитесь, что база данных `nocta` создана

### Ошибка "database does not exist"

```bash
psql -U postgres -c "CREATE DATABASE nocta;"
```

### Ошибка "role does not exist"

```bash
psql -U postgres -c "CREATE USER your_username WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE nocta TO your_username;"