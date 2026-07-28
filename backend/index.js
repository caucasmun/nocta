require('dotenv').config();

const express = require('express');
const pool = require('./db');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

function parseUserId(raw, res) {
    const userId = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(userId) || userId <= 0) {
        res.status(400).json({ error: 'Invalid user id' });
        return null;
    }
    return userId;
}

// Проверка живости API и БД (удобно для Render / локального теста)
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, db: 'up' });
    } catch (err) {
        res.status(503).json({ ok: false, db: 'down', error: err.message });
    }
});

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

// Раздача статических файлов
app.use('/uploads', express.static(uploadsDir));

// ===================== USERS =====================

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

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

app.post('/api/users', async (req, res) => {
    try {
        const { username } = req.body;
        const result = await pool.query(
            'INSERT INTO public.users (username) VALUES ($1) RETURNING *',
            [username]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== ARTISTS =====================

app.get('/api/artists', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.artists ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/artists', async (req, res) => {
    try {
        const { artist, trackscount, about, photo_url, user_id } = req.body;
        const result = await pool.query(
            'INSERT INTO public.artists (artist, trackscount, about, photo_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [artist, trackscount || 0, about || '', photo_url || '']
        );
        if (user_id) {
            await pool.query(
                `INSERT INTO public.user_library_artists (user_id, artist_id)
                 VALUES ($1, $2) ON CONFLICT (user_id, artist_id) DO NOTHING`,
                [user_id, result.rows[0].id]
            );
        }
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== TRACKS =====================

// Получить все треки
app.get('/api/tracks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.tracks ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Создать трек (ПРИНИМАЕТ ТОЛЬКО JSON)
app.post('/api/tracks', async (req, res) => {
    try {
        const { title, artist, lyrics, isliked, user_id, audio_url, cover_url } = req.body;
        
        if (!title || !artist) {
            return res.status(400).json({ error: 'Поля title и artist обязательны' });
        }

        const result = await pool.query(
            `INSERT INTO public.tracks (title, artist, lyrics, isliked, user_id, audio_url, cover_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, artist, lyrics || '', isliked || false, user_id || null, audio_url || '', cover_url || '']
        );

        const trackRow = result.rows[0];
        if (user_id) {
            await pool.query(
                `INSERT INTO public.user_library_tracks (user_id, track_id)
                 VALUES ($1, $2) ON CONFLICT (user_id, track_id) DO NOTHING`,
                [user_id, trackRow.id]
            );
            const artistRow = await pool.query(
                'SELECT id FROM public.artists WHERE artist = $1',
                [artist]
            );
            if (artistRow.rows.length > 0) {
                await pool.query(
                    `INSERT INTO public.user_library_artists (user_id, artist_id)
                     VALUES ($1, $2) ON CONFLICT (user_id, artist_id) DO NOTHING`,
                    [user_id, artistRow.rows[0].id]
                );
            }
        }
        
        // Безопасное обновление счетчика у артиста
        try {
            await pool.query(
                'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.tracks WHERE artist = $1) WHERE artist = $1',
                [artist]
            );
        } catch (e) {
            console.error('Не удалось обновить счетчик артиста:', e.message);
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка БД:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Обновить трек
app.put('/api/tracks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, artist, lyrics, isliked, user_id, audio_url, cover_url } = req.body;
        
        const result = await pool.query(
            `UPDATE public.tracks SET
                title = COALESCE($1, title),
                artist = COALESCE($2, artist),
                lyrics = COALESCE($3, lyrics),
                isliked = COALESCE($4, isliked),
                user_id = COALESCE($5, user_id),
                audio_url = COALESCE($6, audio_url),
                cover_url = COALESCE($7, cover_url)
             WHERE id = $8 RETURNING *`,
            [title, artist, lyrics, isliked, user_id, audio_url, cover_url, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Track not found' });
        
        if (artist) {
            await pool.query(
                'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.tracks WHERE artist = $1) WHERE artist = $1',
                [artist]
            );
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tracks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const track = await pool.query('SELECT artist FROM public.tracks WHERE id = $1', [id]);
        if (track.rows.length === 0) return res.status(404).json({ error: 'Track not found' });
        
        const artistName = track.rows[0].artist; // ИСПРАВЛЕНО: добавлен индекс [0]
        
        const result = await pool.query('DELETE FROM public.tracks WHERE id = $1 RETURNING *', [id]);
        
        await pool.query(
            'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.tracks WHERE artist = $1) WHERE artist = $1',
            [artistName]
        );
        res.json({ message: 'Track deleted', track: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});


// ===================== FILE UPLOAD =====================

// Загрузка аудиофайла (возвращает ТОЛЬКО урл)
app.post('/api/upload/audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl }); // Фронтенд возьмет эту строку
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Загрузка обложки
app.post('/api/upload/image', upload.single('cover'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl }); // Фронтенд возьмет эту строку
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});


// ===================== USER LIBRARY TRACKS =====================

app.get('/api/users/:userId/library/tracks', async (req, res) => {
    try {
        const userId = parseUserId(req.params.userId, res);
        if (userId == null) return;
        const result = await pool.query(`
            SELECT t.*, ult.added_at
            FROM public.user_library_tracks ult
            JOIN public.tracks t ON ult.track_id = t.id
            WHERE ult.user_id = $1
            ORDER BY ult.added_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:userId/library/tracks', async (req, res) => {
    try {
        const userId = parseUserId(req.params.userId, res);
        if (userId == null) return;
        const { track_id } = req.body;
        
        const result = await pool.query(
            `INSERT INTO public.user_library_tracks (user_id, track_id) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id, track_id) DO NOTHING 
             RETURNING *`,
            [userId, track_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(409).json({ message: 'Track already in library' });
        }
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:userId/library/tracks/:trackId', async (req, res) => {
    try {
        const userId = parseUserId(req.params.userId, res);
        if (userId == null) return;
        const trackId = Number.parseInt(req.params.trackId, 10);
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

app.get('/api/users/:userId/library/artists', async (req, res) => {
    try {
        const userId = parseUserId(req.params.userId, res);
        if (userId == null) return;
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

app.post('/api/users/:userId/library/artists', async (req, res) => {
    try {
        const userId = parseUserId(req.params.userId, res);
        if (userId == null) return;
        const { artist_id } = req.body;
        
        const result = await pool.query(
            `INSERT INTO public.user_library_artists (user_id, artist_id) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id, artist_id) DO NOTHING 
             RETURNING *`,
            [userId, artist_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(409).json({ message: 'Already subscribed to this artist' });
        }
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:userId/library/artists/:artistId', async (req, res) => {
    try {
        const userId = parseUserId(req.params.userId, res);
        if (userId == null) return;
        const artistId = Number.parseInt(req.params.artistId, 10);
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

// Подтянуть в библиотеку треки/артистов, созданные с user_id, но без связи в user_library_*
app.post('/api/users/:userId/library/sync', async (req, res) => {
    try {
        const userId = parseUserId(req.params.userId, res);
        if (userId == null) return;
        const tracks = await pool.query(
            `INSERT INTO public.user_library_tracks (user_id, track_id)
             SELECT $1::int, t.id FROM public.tracks t
             WHERE t.user_id = $1::int
             AND NOT EXISTS (
                 SELECT 1 FROM public.user_library_tracks ult
                 WHERE ult.user_id = $1::int AND ult.track_id = t.id
             )
             RETURNING track_id`,
            [userId]
        );
        const artists = await pool.query(
            `INSERT INTO public.user_library_artists (user_id, artist_id)
             SELECT DISTINCT $1::int, a.id
             FROM public.tracks t
             JOIN public.artists a ON a.artist = t.artist
             WHERE t.user_id = $1::int
             AND NOT EXISTS (
                 SELECT 1 FROM public.user_library_artists ula
                 WHERE ula.user_id = $1::int AND ula.artist_id = a.id
             )
             RETURNING artist_id`,
            [userId]
        );
        res.json({
            tracks_added: tracks.rowCount,
            artists_added: artists.rowCount,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Глобальная обработка ошибок Multer (опционально, защищает от падения при неверных файлах)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

// ===================== ЗАПУСК СЕРВЕРА =====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

