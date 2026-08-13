// Обновляет audio_url, cover_url и lyrics в БД для всех дефолтных треков,
// используя данные из track_data.json (пути к файлам в backend/uploads/)
const { Client } = require('pg');
const trackData = require('./track_data.json');

const c = new Client({ user: 'postgres', password: '28172817', database: 'nocta', host: 'localhost', port: 5432 });

async function main() {
    await c.connect();
    let updatedAudio = 0;
    let updatedCover = 0;
    let updatedLyrics = 0;
    let notFound = 0;

    for (const track of trackData) {
        // Найти трек в БД по названию и исполнителю
        const res = await c.query(`
            SELECT t.id, t.audio_url, t.cover_url, t.lyrics
            FROM public.tracks t
            JOIN public.track_artists ta ON t.id = ta.track_id
            JOIN public.artists a ON ta.artist_id = a.id
            WHERE LOWER(t.title) = LOWER($1) AND LOWER(a.artist) = LOWER($2)
            ORDER BY t.id
            LIMIT 1
        `, [track.title, track.artist]);

        if (res.rows.length === 0) {
            console.log(`NOT FOUND: ${track.artist} - ${track.title}`);
            notFound++;
            continue;
        }

        const trackId = res.rows[0].id;
        const oldAudio = res.rows[0].audio_url;
        const newAudio = track.audio;
        const oldCover = res.rows[0].cover_url;
        const newCover = `/uploads/covers/${track.cover}`;
        const oldLyrics = res.rows[0].lyrics || '';
        const newLyrics = track.lyrics || '';

        if (oldAudio !== newAudio) {
            await c.query('UPDATE public.tracks SET audio_url = $1 WHERE id = $2', [newAudio, trackId]);
            console.log(`AUDIO UPDATED: ${track.artist} - ${track.title} (id=${trackId})`);
            updatedAudio++;
        }

        if (oldCover !== newCover) {
            await c.query('UPDATE public.tracks SET cover_url = $1 WHERE id = $2', [newCover, trackId]);
            console.log(`COVER UPDATED: ${track.artist} - ${track.title} (id=${trackId})`);
            updatedCover++;
        }

        if (oldLyrics !== newLyrics) {
            await c.query('UPDATE public.tracks SET lyrics = $1 WHERE id = $2', [newLyrics, trackId]);
            console.log(`LYRICS UPDATED: ${track.artist} - ${track.title} (id=${trackId})`);
            updatedLyrics++;
        }

        if (oldAudio === newAudio && oldCover === newCover && oldLyrics === newLyrics) {
            console.log(`SAME: ${track.artist} - ${track.title} (id=${trackId})`);
        }
    }

    console.log(`\nDone! Audio: ${updatedAudio}, Cover: ${updatedCover}, Lyrics: ${updatedLyrics}, Not found: ${notFound}`);
    await c.end();
}

main().catch(e => { console.error('ERROR:', e.message); c.end(); process.exit(1); });