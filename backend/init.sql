-- Схема для локального Postgres и Supabase (SQL Editor)

CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.artists (
    id SERIAL PRIMARY KEY,
    artist VARCHAR(255) UNIQUE NOT NULL,
    trackscount INT DEFAULT 0,
    about VARCHAR(1000),
    photo_url VARCHAR(1000) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.tracks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL REFERENCES public.artists(artist) ON DELETE CASCADE,
    lyrics VARCHAR(10000),
    isliked BOOLEAN DEFAULT false,
    user_id INT REFERENCES public.users(id) ON DELETE SET NULL,
    audio_url VARCHAR(1000) DEFAULT '',
    cover_url VARCHAR(1000) DEFAULT ''
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

CREATE INDEX IF NOT EXISTS idx_tracks_artist ON public.tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_library_tracks_user ON public.user_library_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_library_artists_user ON public.user_library_artists(user_id);

-- Если таблицы уже были без новых колонок — безопасно добавить:
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS photo_url VARCHAR(1000) DEFAULT '';
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS cover_url VARCHAR(1000) DEFAULT '';
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS audio_url VARCHAR(1000) DEFAULT '';
