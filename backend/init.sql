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
    lyrics VARCHAR(10000),
    isliked BOOLEAN DEFAULT false,
    user_id INT REFERENCES public.users(id) ON DELETE SET NULL,
    audio_url VARCHAR(500),
    cover_url VARCHAR(500),
    color VARCHAR(20) DEFAULT '#ff6b00'
);

CREATE TABLE IF NOT EXISTS public.track_artists (
    track_id INT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    artist_id INT NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT true,
    PRIMARY KEY (track_id, artist_id)
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

-- Таблица лайков пользователей (лайки привязаны к пользователю, а не к треку)
CREATE TABLE IF NOT EXISTS public.user_liked_tracks (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    track_id INT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, track_id)
);

-- Таблица для сохранения состояния воспроизведения
CREATE TABLE IF NOT EXISTS public.user_playback_state (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    track_id INT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    progress_seconds DOUBLE PRECISION DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
);

-- Таблица плейлистов
CREATE TABLE IF NOT EXISTS public.playlists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    cover_url VARCHAR(500),
    color VARCHAR(20) DEFAULT '#1db954',
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связей плейлистов и треков
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
    playlist_id INT NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    track_id INT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    position INT DEFAULT 0,
    PRIMARY KEY (playlist_id, track_id)
);

-- Индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_library_tracks_user ON public.user_library_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_library_artists_user ON public.user_library_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_tracks_user ON public.user_liked_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_tracks_track ON public.user_liked_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playback_user ON public.user_playback_state(user_id);
CREATE INDEX IF NOT EXISTS idx_track_artists_track ON public.track_artists(track_id);
CREATE INDEX IF NOT EXISTS idx_track_artists_artist ON public.track_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id);
