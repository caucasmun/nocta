// Создать таблицу user_liked_tracks и перенести старые лайки
require('dotenv').config();
const pool = require('./db');

async function migrate() {
    const client = await pool.connect();
    try {
        // Создаём таблицу, если она ещё не создана через init.sql
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.user_liked_tracks (
                user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                track_id INT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
                liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, track_id)
            )
        `);
        console.log('Таблица user_liked_tracks создана');

        // Перенести старые лайки (tracks.isliked = true) — привязываем к их владельцу (user_id)
        const likedRes = await client.query(
            `SELECT id, user_id FROM public.tracks WHERE isliked = true AND user_id IS NOT NULL`
        );
        let migrated = 0;
        for (const track of likedRes.rows) {
            await client.query(
                'INSERT INTO public.user_liked_tracks (user_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [track.user_id, track.id]
            );
            migrated++;
        }
        console.log(`Перенесено лайков: ${migrated}`);

        // Сбросить isliked на всех треках (больше не используется для хранения лайков)
        await client.query('UPDATE public.tracks SET isliked = false');
        console.log('Поле isliked сброшено на всех треках');
    } catch (err) {
        console.error('Ошибка:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();