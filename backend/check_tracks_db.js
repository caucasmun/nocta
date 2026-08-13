const { Client } = require('pg');
const c = new Client({ user: 'postgres', password: '28172817', database: 'nocta', host: 'localhost', port: 5432 });
c.connect()
    .then(() => c.query(`
        SELECT t.id, t.title, t.audio_url, t.cover_url, t.lyrics, a.artist
        FROM public.tracks t
        JOIN public.track_artists ta ON t.id = ta.track_id
        JOIN public.artists a ON ta.artist_id = a.id
        WHERE t.user_id IS NULL
        ORDER BY t.id
    `))
    .then(r => {
        r.rows.forEach(x => {
            console.log(`${x.id} | ${x.artist} - ${x.title}`);
            console.log(`  audio: [${x.audio_url}]`);
            console.log(`  cover: [${x.cover_url}]`);
            console.log(`  lyrics: [${x.lyrics ? x.lyrics.substring(0, 50) + '...' : 'EMPTY'}]`);
        });
        return c.end();
    })
    .catch(e => { console.log('ERROR:', e.message); c.end(); });