require('dotenv').config();
const express = require('express');
const pool = require('./db');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { seedAllUsers } = require('./seed_default_content');

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

// Получить все треки (с массивом исполнителей track_artists)
app.get('/api/tracks', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'artist_id', a.id,
                               'artist', a.artist,
                               'slug', a.slug,
                               'photo_url', a.photo_url,
                               'color', a.color,
                               'is_primary', ta.is_primary
                           ) ORDER BY ta.is_primary DESC
                       ) FILTER (WHERE a.id IS NOT NULL),
                       '[]'::json
                   ) AS track_artists,
                   (SELECT a.artist FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist,
                   (SELECT a.slug FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_slug,
                   (SELECT a.photo_url FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_photo_url,
                   (SELECT a.color FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_color
            FROM public.tracks t
            LEFT JOIN public.track_artists ta ON t.id = ta.track_id
            LEFT JOIN public.artists a ON ta.artist_id = a.id
            GROUP BY t.id
            ORDER BY t.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Получить трек по ID (с массивом исполнителей track_artists)
app.get('/api/tracks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT t.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'artist_id', a.id,
                               'artist', a.artist,
                               'slug', a.slug,
                               'photo_url', a.photo_url,
                               'color', a.color,
                               'is_primary', ta.is_primary
                           ) ORDER BY ta.is_primary DESC
                       ) FILTER (WHERE a.id IS NOT NULL),
                       '[]'::json
                   ) AS track_artists,
                   (SELECT a.artist FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist,
                   (SELECT a.slug FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_slug,
                   (SELECT a.photo_url FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_photo_url,
                   (SELECT a.color FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_color
            FROM public.tracks t
            LEFT JOIN public.track_artists ta ON t.id = ta.track_id
            LEFT JOIN public.artists a ON ta.artist_id = a.id
            WHERE t.id = $1
            GROUP BY t.id
        `, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Track not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Создать трек с поддержкой нескольких исполнителей
app.post('/api/tracks', async (req, res) => {
    const client = await pool.connect();
    try {
        const { title, artists, lyrics, isliked, user_id, audio_url, cover_url, color } = req.body;
        // artists: массив [{artist_id: 1, is_primary: true}, ...] или массив ID
        const artistIds = Array.isArray(artists) 
            ? artists.map(a => typeof a === 'object' ? a.artist_id : a)
            : [artists];
        
        await client.query('BEGIN');
        
        const result = await client.query(
            `INSERT INTO public.tracks (title, lyrics, isliked, user_id, audio_url, cover_url, color)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, lyrics || '', isliked || false, user_id || null, audio_url || '', cover_url || '', color || '#ff6b00']
        );
        const trackId = result.rows[0].id;
        
        // Создаем связи с исполнителями
        for (let i = 0; i < artistIds.length; i++) {
            const isPrimary = i === 0; // Первый исполнитель - основной
            await client.query(
                'INSERT INTO public.track_artists (track_id, artist_id, is_primary) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [trackId, artistIds[i], isPrimary]
            );
        }
        
        // Обновляем trackscount у всех артистов
        for (const artistId of artistIds) {
            await client.query(
                'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.track_artists WHERE artist_id = $1) WHERE id = $1',
                [artistId]
            );
        }
        
        await client.query('COMMIT');
        
        // Возвращаем трек с массивом исполнителей
        const trackWithArtist = await pool.query(`
            SELECT t.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'artist_id', a.id,
                               'artist', a.artist,
                               'slug', a.slug,
                               'photo_url', a.photo_url,
                               'color', a.color,
                               'is_primary', ta.is_primary
                           ) ORDER BY ta.is_primary DESC
                       ) FILTER (WHERE a.id IS NOT NULL),
                       '[]'::json
                   ) AS track_artists,
                   (SELECT a.artist FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist,
                   (SELECT a.slug FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_slug,
                   (SELECT a.photo_url FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_photo_url,
                   (SELECT a.color FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_color
            FROM public.tracks t
            LEFT JOIN public.track_artists ta ON t.id = ta.track_id
            LEFT JOIN public.artists a ON ta.artist_id = a.id
            WHERE t.id = $1
            GROUP BY t.id
        `, [trackId]);
        
        res.status(201).json(trackWithArtist.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Обновить трек
app.put('/api/tracks/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { title, artists, lyrics, isliked, user_id, audio_url, cover_url, color } = req.body;
        
        await client.query('BEGIN');
        
        // Обновляем основные поля трека
        const result = await client.query(
            `UPDATE public.tracks SET
                title = COALESCE($1, title),
                lyrics = COALESCE($2, lyrics),
                isliked = COALESCE($3, isliked),
                user_id = COALESCE($4, user_id),
                audio_url = COALESCE($5, audio_url),
                cover_url = COALESCE($6, cover_url),
                color = COALESCE($7, color)
             WHERE id = $8 RETURNING *`,
            [title, lyrics, isliked, user_id, audio_url, cover_url, color, id]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Track not found' });
        }
        
        // Если переданы artists - обновляем связи
        if (artists && Array.isArray(artists)) {
            const artistIds = artists.map(a => typeof a === 'object' ? a.artist_id : a);
            
            // Удаляем старые связи
            await client.query('DELETE FROM public.track_artists WHERE track_id = $1', [id]);
            
            // Создаем новые связи
            for (let i = 0; i < artistIds.length; i++) {
                const isPrimary = i === 0;
                await client.query(
                    'INSERT INTO public.track_artists (track_id, artist_id, is_primary) VALUES ($1, $2, $3)',
                    [id, artistIds[i], isPrimary]
                );
            }
        }
        
        await client.query('COMMIT');
        
        // Возвращаем обновленный трек с массивом исполнителей
        const updated = await pool.query(`
            SELECT t.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'artist_id', a.id,
                               'artist', a.artist,
                               'slug', a.slug,
                               'photo_url', a.photo_url,
                               'color', a.color,
                               'is_primary', ta.is_primary
                           ) ORDER BY ta.is_primary DESC
                       ) FILTER (WHERE a.id IS NOT NULL),
                       '[]'::json
                   ) AS track_artists,
                   (SELECT a.artist FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist,
                   (SELECT a.slug FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_slug,
                   (SELECT a.photo_url FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_photo_url,
                   (SELECT a.color FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_color
            FROM public.tracks t
            LEFT JOIN public.track_artists ta ON t.id = ta.track_id
            LEFT JOIN public.artists a ON ta.artist_id = a.id
            WHERE t.id = $1
            GROUP BY t.id
        `, [id]);
        
        res.json(updated.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Удалить трек
app.delete('/api/tracks/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        
        await client.query('BEGIN');
        
        // Удаляем связи с артистами
        await client.query('DELETE FROM public.track_artists WHERE track_id = $1', [id]);
        
        // Удаляем сам трек
        const result = await client.query('DELETE FROM public.tracks WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Track not found' });
        }
        
        // Обновляем trackscount у всех артистов
        await client.query(`
            UPDATE public.artists 
            SET trackscount = (SELECT COUNT(*) FROM public.track_artists WHERE artist_id = artists.id)
        `);
        
        await client.query('COMMIT');
        res.json({ message: 'Track deleted', track: result.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ===================== TRACK ARTISTS =====================

// Получить всех исполнителей трека
app.get('/api/tracks/:trackId/artists', async (req, res) => {
    try {
        const { trackId } = req.params;
        const result = await pool.query(`
            SELECT ta.*, a.artist, a.slug, a.photo_url, a.color, a.about
            FROM public.track_artists ta
            JOIN public.artists a ON ta.artist_id = a.id
            WHERE ta.track_id = $1
            ORDER BY ta.is_primary DESC
        `, [trackId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Добавить исполнителя к треку
app.post('/api/tracks/:trackId/artists', async (req, res) => {
    try {
        const { trackId } = req.params;
        const { artist_id, is_primary } = req.body;
        const result = await pool.query(
            'INSERT INTO public.track_artists (track_id, artist_id, is_primary) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
            [trackId, artist_id, is_primary || false]
        );
        // Обновляем trackscount у артиста
        await pool.query(
            'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.track_artists WHERE artist_id = $1) WHERE id = $1',
            [artist_id]
        );
        res.status(201).json(result.rows[0] || { track_id: trackId, artist_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Удалить исполнителя из трека
app.delete('/api/tracks/:trackId/artists/:artistId', async (req, res) => {
    try {
        const { trackId, artistId } = req.params;
        const result = await pool.query(
            'DELETE FROM public.track_artists WHERE track_id = $1 AND artist_id = $2 RETURNING *',
            [trackId, artistId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Artist not found in track' });
        // Обновляем trackscount у артиста
        await pool.query(
            'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.track_artists WHERE artist_id = $1) WHERE id = $1',
            [artistId]
        );
        res.json({ message: 'Artist removed from track' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Обновить список исполнителей трека
app.put('/api/tracks/:trackId/artists', async (req, res) => {
    const client = await pool.connect();
    try {
        const { trackId } = req.params;
        const { artist_ids } = req.body;
        
        await client.query('BEGIN');
        
        // Удаляем старые связи
        await client.query('DELETE FROM public.track_artists WHERE track_id = $1', [trackId]);
        
        // Создаем новые связи
        for (let i = 0; i < artist_ids.length; i++) {
            const isPrimary = i === 0;
            await client.query(
                'INSERT INTO public.track_artists (track_id, artist_id, is_primary) VALUES ($1, $2, $3)',
                [trackId, artist_ids[i], isPrimary]
            );
        }
        
        // Обновляем trackscount у всех артистов
        await client.query(`
            UPDATE public.artists 
            SET trackscount = (SELECT COUNT(*) FROM public.track_artists WHERE artist_id = artists.id)
        `);
        
        await client.query('COMMIT');
        res.json({ message: 'Track artists updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ===================== ALL TRACKS (GLOBAL + USER) =====================

// Получить все доступные треки: глобальные (user_id = NULL) + треки пользователя
app.get('/api/users/:userId/all-tracks', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT t.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'artist_id', a.id,
                               'artist', a.artist,
                               'slug', a.slug,
                               'photo_url', a.photo_url,
                               'color', a.color,
                               'is_primary', ta.is_primary
                           ) ORDER BY ta.is_primary DESC
                       ) FILTER (WHERE a.id IS NOT NULL),
                       '[]'::json
                   ) AS track_artists,
                   (SELECT a.artist FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist,
                   (SELECT a.slug FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_slug,
                   (SELECT a.photo_url FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_photo_url,
                   (SELECT a.color FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_color
            FROM public.tracks t
            LEFT JOIN public.track_artists ta ON t.id = ta.track_id
            LEFT JOIN public.artists a ON ta.artist_id = a.id
            WHERE t.user_id IS NULL OR t.user_id = $1
            GROUP BY t.id
            ORDER BY t.id DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Получить всех доступных артистов: глобальные + артисты пользователя
app.get('/api/users/:userId/all-artists', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT DISTINCT a.*
            FROM public.artists a
            WHERE a.id IN (
                SELECT ta.artist_id FROM public.track_artists ta
                JOIN public.tracks t ON ta.track_id = t.id
                WHERE t.user_id IS NULL OR t.user_id = $1
            )
            ORDER BY a.id
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===================== USER LIBRARY TRACKS =====================

// Получить библиотеку треков пользователя (без дубликатов, с массивом исполнителей)
app.get('/api/users/:userId/library/tracks', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT t.*, ult.added_at,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'artist_id', a.id,
                               'artist', a.artist,
                               'slug', a.slug,
                               'photo_url', a.photo_url,
                               'color', a.color,
                               'is_primary', ta.is_primary
                           ) ORDER BY ta.is_primary DESC
                       ) FILTER (WHERE a.id IS NOT NULL),
                       '[]'::json
                   ) AS track_artists,
                   (SELECT a.artist FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist,
                   (SELECT a.slug FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_slug,
                   (SELECT a.photo_url FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_photo_url,
                   (SELECT a.color FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_color
            FROM public.user_library_tracks ult
            JOIN public.tracks t ON ult.track_id = t.id
            LEFT JOIN public.track_artists ta ON t.id = ta.track_id
            LEFT JOIN public.artists a ON ta.artist_id = a.id
            WHERE ult.user_id = $1
            GROUP BY t.id, ult.added_at
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

// ===================== USER LIKED TRACKS =====================

// Получить ID лайкнутых треков пользователя
app.get('/api/users/:userId/liked-tracks', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            'SELECT track_id FROM public.user_liked_tracks WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows.map(r => r.track_id));
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Лайкнуть трек
app.post('/api/users/:userId/liked-tracks/:trackId', async (req, res) => {
    try {
        const { userId, trackId } = req.params;
        const result = await pool.query(
            'INSERT INTO public.user_liked_tracks (user_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [userId, trackId]
        );
        res.status(201).json(result.rows[0] || { user_id: userId, track_id: trackId });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Убрать лайк с трека
app.delete('/api/users/:userId/liked-tracks/:trackId', async (req, res) => {
    try {
        const { userId, trackId } = req.params;
        const result = await pool.query(
            'DELETE FROM public.user_liked_tracks WHERE user_id = $1 AND track_id = $2 RETURNING *',
            [userId, trackId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Track not liked' });
        res.json({ message: 'Track unliked' });
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
        const tracksRes = await client.query('SELECT id FROM public.tracks WHERE user_id = $1', [userId]);
        let tracksAdded = 0;
        let artistsAdded = 0;

        for (const track of tracksRes.rows) {
            // Добавить трек в библиотеку, если ещё нет
            const ins = await client.query(
                'INSERT INTO public.user_library_tracks (user_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
                [userId, track.id]
            );
            if (ins.rows.length > 0) tracksAdded++;

            // Найти всех артистов трека и подписать пользователя
            const artRes = await client.query(
                'SELECT artist_id FROM public.track_artists WHERE track_id = $1',
                [track.id]
            );
            for (const art of artRes.rows) {
                const insArt = await client.query(
                    'INSERT INTO public.user_library_artists (user_id, artist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
                    [userId, art.artist_id]
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

// ===================== PLAYLISTS =====================

// Получить все плейлисты пользователя
app.get('/api/users/:userId/playlists', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT p.*,
                   (SELECT COUNT(*)::int FROM public.playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count
            FROM public.playlists p
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Получить плейлист по ID
app.get('/api/playlists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM public.playlists WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Playlist not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Создать плейлист
app.post('/api/users/:userId/playlists', async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, description, cover_url, color } = req.body;
        const result = await pool.query(
            `INSERT INTO public.playlists (name, description, cover_url, color, user_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description || '', cover_url || '', color || '#1db954', userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Обновить плейлист
app.put('/api/playlists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, cover_url, color } = req.body;
        const result = await pool.query(
            `UPDATE public.playlists SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                cover_url = COALESCE($3, cover_url),
                color = COALESCE($4, color)
             WHERE id = $5 RETURNING *`,
            [name, description, cover_url, color, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Playlist not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Удалить плейлист
app.delete('/api/playlists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM public.playlists WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Playlist not found' });
        res.json({ message: 'Playlist deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Получить треки плейлиста
app.get('/api/playlists/:id/tracks', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT t.*, pt.position, pt.added_at,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'artist_id', a.id,
                               'artist', a.artist,
                               'slug', a.slug,
                               'photo_url', a.photo_url,
                               'color', a.color,
                               'is_primary', ta.is_primary
                           ) ORDER BY ta.is_primary DESC
                       ) FILTER (WHERE a.id IS NOT NULL),
                       '[]'::json
                   ) AS track_artists,
                   (SELECT a.artist FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist,
                   (SELECT a.slug FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_slug
            FROM public.playlist_tracks pt
            JOIN public.tracks t ON pt.track_id = t.id
            LEFT JOIN public.track_artists ta ON t.id = ta.track_id
            LEFT JOIN public.artists a ON ta.artist_id = a.id
            WHERE pt.playlist_id = $1
            GROUP BY t.id, pt.position, pt.added_at
            ORDER BY pt.position ASC, pt.added_at ASC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Добавить трек в плейлист
app.post('/api/playlists/:id/tracks', async (req, res) => {
    try {
        const { id } = req.params;
        const { track_id } = req.body;
        const posResult = await pool.query(
            'SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM public.playlist_tracks WHERE playlist_id = $1',
            [id]
        );
        const nextPos = posResult.rows[0].next_pos;
        const result = await pool.query(
            'INSERT INTO public.playlist_tracks (playlist_id, track_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
            [id, track_id, nextPos]
        );
        res.status(201).json(result.rows[0] || { playlist_id: id, track_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Удалить трек из плейлиста
app.delete('/api/playlists/:id/tracks/:trackId', async (req, res) => {
    try {
        const { id, trackId } = req.params;
        const result = await pool.query(
            'DELETE FROM public.playlist_tracks WHERE playlist_id = $1 AND track_id = $2 RETURNING *',
            [id, trackId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Track not found in playlist' });
        res.json({ message: 'Track removed from playlist' });
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

// Получить состояние воспроизведения пользователя (с массивом исполнителей)
app.get('/api/users/:userId/playback', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            `SELECT ups.*, t.title, t.audio_url, t.cover_url, t.lyrics, t.color, t.id as track_id,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'artist_id', a.id,
                               'artist', a.artist,
                               'slug', a.slug,
                               'photo_url', a.photo_url,
                               'color', a.color,
                               'is_primary', ta.is_primary
                           ) ORDER BY ta.is_primary DESC
                       ) FILTER (WHERE a.id IS NOT NULL),
                       '[]'::json
                   ) AS track_artists,
                   (SELECT a.artist FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist,
                   (SELECT a.slug FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_slug,
                   (SELECT a.photo_url FROM public.track_artists ta2
                    JOIN public.artists a ON ta2.artist_id = a.id
                    WHERE ta2.track_id = t.id AND ta2.is_primary = true
                    LIMIT 1) AS artist_photo_url
             FROM public.user_playback_state ups
             JOIN public.tracks t ON ups.track_id = t.id
             LEFT JOIN public.track_artists ta ON t.id = ta.track_id
             LEFT JOIN public.artists a ON ta.artist_id = a.id
             WHERE ups.user_id = $1
             GROUP BY ups.user_id, t.id, ups.track_id, ups.progress_seconds, ups.updated_at`,
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
    // Добавить предустановленные треки и исполнителей всем существующим пользователям
    try {
        await seedAllUsers();
    } catch (err) {
        console.error('Error seeding default content for existing users:', err.message);
    }
});
