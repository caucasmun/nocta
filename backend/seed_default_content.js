// Модуль для добавления предустановленных треков и исполнителей.
// Треки и исполнители создаются как глобальные (user_id = NULL) и
// НЕ добавляются в библиотеку пользователей — они доступны через
// главную страницу (плеер) и поиск, но скрыты во вкладке «Моя библиотека».

require('dotenv').config();
const pool = require('./db');

// Предустановленный контент: исполнитель -> список треков
const DEFAULT_CONTENT = [
    { artist: 'Linkin Park', tracks: ['Numb', 'In the End', "What I've Done", 'Somewhere I Belong'] },
    { artist: 'Nirvana', tracks: ['Smells Like Teen Spirit', 'Come As You Are', 'Drain You'] },
    { artist: 'Radiohead', tracks: ['Creep', 'No Surprises', 'Karma Police'] },
    { artist: 'Arctic Monkeys', tracks: ['Do I Wanna Know?', '505', 'I Wanna Be Yours'] },
    { artist: 'Gorillaz', tracks: ['Feel Good Inc.'] },
    { artist: 'Michael Jackson', tracks: ['Billie Jean'] },
];

function makeSlug(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
}

// Найти или создать предустановленных артистов и треки как глобальные.
// Если трек уже существует (у любого пользователя) — используем его как есть
// (с его audio_url, cover_url, color и т.д.).
async function seedDefaultContent() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = { trackIds: [], artistIds: [] };

        for (const group of DEFAULT_CONTENT) {
            // Найти или создать артиста
            const artistRes = await client.query(
                `INSERT INTO public.artists (artist, slug, trackscount)
                 VALUES ($1, $2, 0)
                 ON CONFLICT (artist) DO UPDATE SET artist = EXCLUDED.artist
                 RETURNING id`,
                [group.artist, makeSlug(group.artist)]
            );
            const artistId = artistRes.rows[0].id;
            result.artistIds.push(artistId);

            for (const title of group.tracks) {
                // Ищем существующий трек с таким названием у этого артиста (без учёта регистра)
                const existing = await client.query(
                    `SELECT t.id, t.audio_url, t.cover_url, t.color, t.lyrics
                     FROM public.tracks t
                     JOIN public.track_artists ta ON t.id = ta.track_id
                     WHERE LOWER(t.title) = LOWER($1) AND ta.artist_id = $2
                     ORDER BY t.id
                     LIMIT 1`,
                    [title, artistId]
                );

                let trackId;
                if (existing.rows.length > 0) {
                    // Трек уже существует — используем его (с его аудио/обложкой)
                    trackId = existing.rows[0].id;
                    // Делаем трек глобальным (user_id = NULL), чтобы он был доступен всем пользователям
                    await client.query(
                        'UPDATE public.tracks SET user_id = NULL WHERE id = $1',
                        [trackId]
                    );
                } else {
                    // Создаём новый глобальный трек (user_id = NULL)
                    const trackRes = await client.query(
                        `INSERT INTO public.tracks (title, lyrics, isliked, user_id, audio_url, cover_url, color)
                         VALUES ($1, '', false, NULL, '', '', '#ff6b00')
                         RETURNING id`,
                        [title]
                    );
                    trackId = trackRes.rows[0].id;

                    // Связываем с артистом
                    await client.query(
                        `INSERT INTO public.track_artists (track_id, artist_id, is_primary)
                         VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
                        [trackId, artistId]
                    );
                }

                result.trackIds.push(trackId);
            }

            // Обновляем trackscount
            await client.query(
                'UPDATE public.artists SET trackscount = (SELECT COUNT(*) FROM public.track_artists WHERE artist_id = $1) WHERE id = $1',
                [artistId]
            );
        }

        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Добавить предустановленный контент всем существующим пользователям
// (только убедиться, что глобальные треки/артисты существуют)
async function seedAllUsers() {
    try {
        const { trackIds, artistIds } = await seedDefaultContent();
        console.log(`Предустановленный контент готов: ${trackIds.length} треков, ${artistIds.length} исполнителей`);
        console.log('Готово! Предустановленные треки и исполнители доступны через плеер и поиск.');
    } catch (err) {
        console.error('Ошибка:', err.message);
        throw err;
    }
}

// Если запущен напрямую (node seed_default_content.js) — выполнить
if (require.main === module) {
    seedAllUsers()
        .then(() => pool.end())
        .catch((err) => {
            console.error('Ошибка:', err.message);
            process.exit(1);
        });
}

module.exports = { seedDefaultContent, seedAllUsers, DEFAULT_CONTENT };