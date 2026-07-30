-- Создание таблиц для музыкального приложения

CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    bio VARCHAR(1000)
);

CREATE TABLE IF NOT EXISTS public.artists (
    id SERIAL PRIMARY KEY,
    artist VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE,
    trackscount INT DEFAULT 0,
    about VARCHAR(1000),
    photo_url VARCHAR(500),
    color VARCHAR(20) DEFAULT '#ff6b00'
);

CREATE TABLE IF NOT EXISTS public.tracks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL REFERENCES public.artists(artist) ON DELETE CASCADE,
    lyrics VARCHAR(10000),
    isliked BOOLEAN DEFAULT false,
    user_id INT REFERENCES public.users(id) ON DELETE SET NULL,
    audio_url VARCHAR(500),
    cover_url VARCHAR(500),
    color VARCHAR(20) DEFAULT '#ff6b00'
);

CREATE TABLE IF NOT EXISTS public.user_library_tracks (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    track_id INT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS public.user_library_artists (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    artist_id INT NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, artist_id)
);

-- Таблица для сохранения состояния воспроизведения
CREATE TABLE IF NOT EXISTS public.user_playback_state (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    track_id INT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    progress_seconds DOUBLE PRECISION DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
);

-- Индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON public.tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_library_tracks_user ON public.user_library_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_library_artists_user ON public.user_library_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_user ON public.user_playback_state(user_id);