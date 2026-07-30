const { Client } = require('pg');
const c = new Client({ user: 'postgres', password: '28172817', database: 'nocta', host: 'localhost', port: 5432 });

async function migrate() {
    await c.connect();
    
    // 1. Создаем таблицу track_artists (если еще не создана)
    await c.query(`
        CREATE TABLE IF NOT EXISTS public.track_artists (
            track_id INT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
            artist_id INT NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
            is_primary BOOLEAN DEFAULT true,
            PRIMARY KEY (track_id, artist_id)
        )
    `);
    console.log('✅ Table track_artists created/verified');

    // 2. Создаем индекс для track_artists
    try {
        await c.query('CREATE INDEX IF NOT EXISTS idx_track_artists_track ON public.track_artists(track_id)');
        await c.query('CREATE INDEX IF NOT EXISTS idx_track_artists_artist ON public.track_artists(artist_id)');
        console.log('✅ Created indexes for track_artists');
    } catch (e) {
        console.log('⚠️ Index creation:', e.message);
    }

    console.log('🎉 Migration completed!');
    await c.end();
}

migrate().catch(e => {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
});