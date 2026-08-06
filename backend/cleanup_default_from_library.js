// Удалить предустановленные треки и исполнителей из библиотек пользователей,
// чтобы они были скрыты во вкладке «Моя библиотека», но доступны через поиск и плеер.

require('dotenv').config();
const pool = require('./db');

async function cleanup() {
    try {
        const defaultTrackTitles = [
            'Numb', 'In the End', 'In The End', "What I've Done", 'Somewhere I Belong',
            'Smells Like Teen Spirit', 'Come As You Are', 'Drain You',
            'Creep', 'No Surprises', 'Karma Police',
            'Do I Wanna Know?', '505', 'I Wanna Be Yours',
            'Feel Good Inc.', 'Billie Jean'
        ];
        const defaultArtistNames = [
            'Linkin Park', 'Nirvana', 'Radiohead', 'Arctic Monkeys', 'Gorillaz', 'Michael Jackson'
        ];

        const trackRes = await pool.query(
            `SELECT id FROM public.tracks WHERE LOWER(title) = ANY($1)`,
            [defaultTrackTitles.map(t => t.toLowerCase())]
        );
        const trackIds = trackRes.rows.map(r => r.id);

        const artistRes = await pool.query(
            `SELECT id FROM public.artists WHERE LOWER(artist) = ANY($1)`,
            [defaultArtistNames.map(a => a.toLowerCase())]
        );
        const artistIds = artistRes.rows.map(r => r.id);

        if (trackIds.length > 0) {
            const res = await pool.query('DELETE FROM public.user_library_tracks WHERE track_id = ANY($1)', [trackIds]);
            console.log(`Удалено записей треков из библиотек: ${res.rowCount}`);
        }
        if (artistIds.length > 0) {
            const res = await pool.query('DELETE FROM public.user_library_artists WHERE artist_id = ANY($1)', [artistIds]);
            console.log(`Удалено записей артистов из библиотек: ${res.rowCount}`);
        }

        const libTracks = await pool.query('SELECT COUNT(*) FROM public.user_library_tracks');
        const libArtists = await pool.query('SELECT COUNT(*) FROM public.user_library_artists');
        console.log(`Осталось в библиотеках: ${libTracks.rows[0].count} треков, ${libArtists.rows[0].count} артистов`);
    } catch (err) {
        console.error('Ошибка:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

cleanup();