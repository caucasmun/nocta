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
        const { artist, trackscount, about } = req.body;
        const result = await pool.query(
            'INSERT INTO public.artists (artist, trackscount, about) VALUES ($1, $2, $3) RETURNING *',
            [artist, trackscount || 0, about || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== TRACKS =====================

app.get('/api/tracks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.tracks ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Создать трек
app.post('/api/tracks', async (req, res) => {
    try {
        const { title, artist, lyrics, isliked, user_id, audio_url, cover_url } = req.body;
        
        // Валидация: проверяем, переданы ли обязательные поля
        if (!title || !artist) {
            return res.status(400).json({ error: 'Поля title и artist обязательны для заполнения' });
        }

        // Выполняем запрос к БД (включаем все возможные поля)
        const result = await pool.query(
            `INSERT INTO public.tracks (title, artist, lyrics, isliked, user_id, audio_url)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, artist, lyrics || '', isliked || false, user_id || null, audio_url || '']
        );
        
        // Безопасное обновление счетчика треков у артиста.
        // Используем пул, чтобы если артиста нет, сервер не падал.
        try {
            await pool.query(
                'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.tracks WHERE artist = $1) WHERE artist = $1',
                [artist]
            );
        } catch (artistErr) {
            console.error('Ошибка обновления trackscount у артиста:', artistErr.message);
            // Не блокируем ответ клиенту, если трек уже успешно создался
        }

        // Возвращаем созданный трек в формате JSON
        return res.status(201).json(result.rows[0]);

    } catch (err) {
        // Если база данных ругнется, мы вернем ЧЕТКИЙ JSON, а не HTML страницу
        console.error('КРИТИЧЕСКАЯ ОШИБКА БД ПРИ СОЗДАНИИ ТРЕКА:', err.message);
        return res.status(500).json({ 
            error: 'Ошибка базы данных при создании трека', 
            details: err.message 
        });
    }
});

app.put('/api/tracks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, artist, lyrics, isliked, user_id, audio_url } = req.body;
        
        const result = await pool.query(
            `UPDATE public.tracks SET
                title = COALESCE($1, title),
                artist = COALESCE($2, artist),
                lyrics = COALESCE($3, lyrics),
                isliked = COALESCE($4, isliked),
                user_id = COALESCE($5, user_id),
                audio_url = COALESCE($6, audio_url)
             WHERE id = $7 RETURNING *`,
            [title, artist, lyrics, isliked, user_id, audio_url, id]
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
        
        const artistName = track.rows[0].artist; // Исправлено: добавлено [0]
        
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

// ===================== USER LIBRARY TRACKS =====================

app.get('/api/users/:userId/library/tracks', async (req, res) => {
    try {
        const { userId } = req.params;
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
        const { userId } = req.params;
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

app.post('/api/users/:userId/library/artists', async (req, res) => {
    try {
        const { userId } = req.params;
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

