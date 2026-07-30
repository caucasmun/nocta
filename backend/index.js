require('dotenv').config();
const express = require('express');
const pool = require('./db');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Настройка multer для загрузки файлов
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'audio' && !file.mimetype.startsWith('audio/')) {
            return cb(new Error('Only audio files allowed'), false);
        }
        if (file.fieldname === 'cover' && !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files allowed'), false);
        }
        cb(null, true);
    }
});

// Раздача статических файлов (загруженные аудио и обложки)
app.use('/uploads', express.static(uploadsDir));

// Вспомогательная функция для генерации slug
function makeSlug(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
}

// ===================== HEALTH =====================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ===================== USERS =====================

// Получить всех пользователей
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Получить пользователя по ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM public.users WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Создать пользователя
app.post('/api/users', async (req, res) => {
    try {
        const { username, bio } = req.body;
        const result = await pool.query(
            'INSERT INTO public.users (username, bio) VALUES ($1, $2) RETURNING *',
            [username, bio || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Обновить пользователя
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, bio } = req.body;
        const result = await pool.query(
            'UPDATE public.users SET username = COALESCE($1, username), bio = COALESCE($2, bio) WHERE id = $3 RETURNING *',
            [username, bio, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Удалить пользователя
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM public.users WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted', user: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== ARTISTS =====================

// Получить всех артистов
app.get('/api/artists', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.artists ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Получить артиста по ID
app.get('/api/artists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM public.artists WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Artist not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Создать артиста
app.post('/api/artists', async (req, res) => {
    try {
        const { artist, trackscount, about, photo_url, color } = req.body;
        const slug = makeSlug(artist);
        const result = await pool.query(
            `INSERT INTO public.artists (artist, slug, trackscount, about, photo_url, color)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [artist, slug, trackscount || 0, about || '', photo_url || '', color || '#ff6b00']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Обновить артиста
app.put('/api/artists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { artist, trackscount, about, photo_url, color } = req.body;
        const slug = artist ? makeSlug(artist) : null;
        const result = await pool.query(
            `UPDATE public.artists SET
                artist = COALESCE($1, artist),
                slug = COALESCE($2, slug),
                trackscount = COALESCE($3, trackscount),
                about = COALESCE($4, about),
                photo_url = COALESCE($5, photo_url),
                color = COALESCE($6, color)
             WHERE id = $7 RETURNING *`,
            [artist, slug, trackscount, about, photo_url, color, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Artist not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Удалить артиста
app.delete('/api/artists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM public.artists WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Artist not found' });
        res.json({ message: 'Artist deleted', artist: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== TRACKS =====================

// Получить все треки (с JOIN artists)
app.get('/api/tracks', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, a.about AS artist_about, a.trackscount AS artist_trackscount,
                   a.photo_url AS artist_photo_url, a.slug AS artist_slug, a.color AS artist_color
            FROM public.tracks t
            JOIN public.artists a ON t.artist = a.artist
            ORDER BY t.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Получить трек по ID
app.get('/api/tracks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT t.*, a.about AS artist_about, a.trackscount AS artist_trackscount,
                   a.photo_url AS artist_photo_url, a.slug AS artist_slug, a.color AS artist_color
            FROM public.tracks t
            JOIN public.artists a ON t.artist = a.artist
            WHERE t.id = $1
        `, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Track not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Создать трек
app.post('/api/tracks', async (req, res) => {
    try {
        const { title, artist, lyrics, isliked, user_id, audio_url, cover_url, color } = req.body;
        const result = await pool.query(
            `INSERT INTO public.tracks (title, artist, lyrics, isliked, user_id, audio_url, cover_url, color)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [title, artist, lyrics || '', isliked || false, user_id || null, audio_url || '', cover_url || '', color || '#ff6b00']
        );
        // Обновляем trackscount у артиста
        await pool.query(
            'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.tracks WHERE artist = $1) WHERE artist = $1',
            [artist]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Обновить трек
app.put('/api/tracks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, artist, lyrics, isliked, user_id, audio_url, cover_url, color } = req.body;
        const result = await pool.query(
            `UPDATE public.tracks SET
                title = COALESCE($1, title),
                artist = COALESCE($2, artist),
                lyrics = COALESCE($3, lyrics),
                isliked = COALESCE($4, isliked),
                user_id = COALESCE($5, user_id),
                audio_url = COALESCE($6, audio_url),
                cover_url = COALESCE($7, cover_url),
                color = COALESCE($8, color)
             WHERE id = $9 RETURNING *`,
            [title, artist, lyrics, isliked, user_id, audio_url, cover_url, color, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Track not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Удалить трек
app.delete('/api/tracks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const track = await pool.query('SELECT artist FROM public.tracks WHERE id = $1', [id]);
        const result = await pool.query('DELETE FROM public.tracks WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Track not found' });
        // Обновляем trackscount у артиста
        if (track.rows.length > 0) {
            await pool.query(
                'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.tracks WHERE artist = $1) WHERE artist = $1',
                [track.rows[0].artist]
            );
        }
        res.json({ message: 'Track deleted', track: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== USER LIBRARY TRACKS =====================

// Получить библиотеку треков пользователя
app.get('/api/users/:userId/library/tracks', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT t.*, ult.added_at, a.about AS artist_about, a.trackscount AS artist_trackscount,
                   a.photo_url AS artist_photo_url, a.slug AS artist_slug, a.color AS artist_color
            FROM public.user_library_tracks ult
            JOIN public.tracks t ON ult.track_id = t.id
            JOIN public.artists a ON t.artist = a.artist
            WHERE ult.user_id = $1
            ORDER BY ult.added_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Добавить трек в библиотеку пользователя
app.post('/api/users/:userId/library/tracks', async (req, res) => {
    try {
        const { userId } = req.params;
        const { track_id } = req.body;
        const result = await pool.query(
            'INSERT INTO public.user_library_tracks (user_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [userId, track_id]
        );
        res.status(201).json(result.rows[0] || { user_id: userId, track_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Удалить трек из библиотеки пользователя
app.delete('/api/users/:userId/library/tracks/:trackId', async (req, res) => {
    try {
        const { userId, trackId } = req.params;
        const result = await pool.query(
            'DELETE FROM public.user_library_tracks WHERE user_id = $1 AND track_id = $2 RETURNING *',
            [userId, trackId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Track not found in library' });
        res.json({ message: 'Track removed from library' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== USER LIBRARY ARTISTS =====================

// Получить подписки пользователя на артистов
app.get('/api/users/:userId/library/artists', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT a.*, ula.added_at
            FROM public.user_library_artists ula
            JOIN public.artists a ON ula.artist_id = a.id
            WHERE ula.user_id = $1
            ORDER BY ula.added_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Подписаться на артиста
app.post('/api/users/:userId/library/artists', async (req, res) => {
    try {
        const { userId } = req.params;
        const { artist_id } = req.body;
        const result = await pool.query(
            'INSERT INTO public.user_library_artists (user_id, artist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [userId, artist_id]
        );
        res.status(201).json(result.rows[0] || { user_id: userId, artist_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Отписаться от артиста
app.delete('/api/users/:userId/library/artists/:artistId', async (req, res) => {
    try {
        const { userId, artistId } = req.params;
        const result = await pool.query(
            'DELETE FROM public.user_library_artists WHERE user_id = $1 AND artist_id = $2 RETURNING *',
            [userId, artistId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Artist not found in library' });
        res.json({ message: 'Artist removed from library' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== SYNC LIBRARY =====================

// Связать треки с user_id и их артистов с библиотекой пользователя
app.post('/api/users/:userId/library/sync', async (req, res) => {
    const client = await pool.connect();
    try {
        const { userId } = req.params;
        await client.query('BEGIN');

        // Найти все треки этого пользователя
        const tracksRes = await client.query('SELECT id, artist FROM public.tracks WHERE user_id = $1', [userId]);
        let tracksAdded = 0;
        let artistsAdded = 0;

        for (const track of tracksRes.rows) {
            // Добавить трек в библиотеку, если ещё нет
            const ins = await client.query(
                'INSERT INTO public.user_library_tracks (user_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
                [userId, track.id]
            );
            if (ins.rows.length > 0) tracksAdded++;

            // Найти артиста и подписать пользователя
            const artRes = await client.query('SELECT id FROM public.artists WHERE artist = $1', [track.artist]);
            if (artRes.rows.length > 0) {
                const insArt = await client.query(
                    'INSERT INTO public.user_library_artists (user_id, artist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
                    [userId, artRes.rows[0].id]
                );
                if (insArt.rows.length > 0) artistsAdded++;
            }
        }

        await client.query('COMMIT');
        res.json({ tracks_added: tracksAdded, artists_added: artistsAdded });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ===================== FILE UPLOAD =====================

// Загрузка аудиофайла
app.post('/api/upload/audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, filename: req.file.filename });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Загрузка обложки/изображения
app.post('/api/upload/image', upload.single('cover'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, filename: req.file.filename });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== PLAYBACK STATE =====================

// Сохранить состояние воспроизведения
app.put('/api/users/:userId/playback', async (req, res) => {
    try {
        const { userId } = req.params;
        const { track_id, progress_seconds } = req.body;
        const result = await pool.query(
            `INSERT INTO public.user_playback_state (user_id, track_id, progress_seconds, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id)
             DO UPDATE SET track_id = EXCLUDED.track_id, progress_seconds = EXCLUDED.progress_seconds, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [userId, track_id, progress_seconds || 0]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Получить состояние воспроизведения пользователя
app.get('/api/users/:userId/playback', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            `SELECT ups.*, t.title, t.artist, t.audio_url, t.cover_url, t.lyrics, t.color, t.id as track_id,
                    a.slug AS artist_slug, a.photo_url AS artist_photo_url
             FROM public.user_playback_state ups
             JOIN public.tracks t ON ups.track_id = t.id
             JOIN public.artists a ON t.artist = a.artist
             WHERE ups.user_id = $1`,
            [userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'No playback state' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== ИНИЦИАЛИЗАЦИЯ БД =====================

async function initDB() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        await pool.query(sql);
        console.log('Database initialized (init.sql applied)');
    } catch (err) {
        console.error('init.sql error:', err.message);
    }
}

// ===================== ЗАПУСК СЕРВЕРА =====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initDB();
});