// Модуль для добавления предустановленных треков и исполнителей.
// Треки и исполнители создаются как глобальные (user_id = NULL) и
// НЕ добавляются в библиотеку пользователей — они доступны через
// главную страницу (плеер) и поиск, но скрыты во вкладке «Моя библиотека».

require('dotenv').config();
const pool = require('./db');
const trackData = require('./track_data.json');

// Предустановленный контент: исполнитель -> список треков
// с описанием, фото (файлы лежат в backend/uploads/artists/) и цветом
const DEFAULT_CONTENT = [
    {
        artist: 'Linkin Park',
        about: 'Американская рок-группа, основанная в 1996 году в Агуре-Хиллз (Калифорния). Сочетает ню-метал, альтернативный рок и электронику. Дебютный альбом Hybrid Theory (2000) стал одним из самых продаваемых дебютов XXI века. После трагической смерти Честера Беннингтона группа вернулась на сцену в 2024 году с новой вокалисткой Эмили Армстронг.',
        photo_url: '/uploads/artists/linkin-park.jpg',
        color: '#5b2c6f',
        tracks: ['Numb', 'In the End', "What I've Done", 'Somewhere I Belong']
    },
    {
        artist: 'Nirvana',
        about: 'Американская гранж-группа из Абердина (штат Вашингтон), основанная Куртом Кобейном и Кристом Новоселичем в 1987 году. Альбом Nevermind (1991) с хитом «Smells Like Teen Spirit» сделал группу иконой поколения и вывел гранж в мейнстрим, навсегда изменив рок-музыку 90-х.',
        photo_url: '/uploads/artists/nirvana.jpg',
        color: '#f1c40f',
        tracks: ['Smells Like Teen Spirit', 'Come As You Are', 'Drain You']
    },
    {
        artist: 'Radiohead',
        about: 'Британская рок-группа из Оксфордшира, образованная в 1985 году. Начав с гитарного рока и хита «Creep», группа стала известна экспериментальным звучанием, а альбом OK Computer (1997) признан одной из величайших пластинок всех времён. Продолжают расширять границы жанра с каждой новой записью.',
        photo_url: '/uploads/artists/radiohead.jpg',
        color: '#7f8c8d',
        tracks: ['Creep', 'No Surprises', 'Karma Police']
    },
    {
        artist: 'Arctic Monkeys',
        about: 'Британская инди-рок группа из Шеффилда, образованная в 2002 году. Дебютный альбом Whatever People Say I Am, That\u2019s What I\u2019m Not (2006) стал самым быстро продаваемым дебютом в истории Великобритании. Известны хитами «Do I Wanna Know?» и «505» — от гаражного рока до атмосферного звучания последних пластинок.',
        photo_url: '/uploads/artists/arctic-monkeys.jpg',
        color: '#2c3e50',
        tracks: ['Do I Wanna Know?', '505', 'I Wanna Be Yours']
    },
    {
        artist: 'Gorillaz',
        about: 'Виртуальная группа, созданная музыкантом Дэймоном Албарном (Blur) и художником Джейми Хьюлеттом в 1998 году. Участники — анимированные персонажи 2D, Мёрдок, Рассел и Нудл. Музыка сочетает альтернативный рок, хип-хоп и электронику. Сингл «Feel Good Inc.» принёс группе премию «Грэмми».',
        photo_url: '/uploads/artists/gorillaz.jpg',
        color: '#c0392b',
        tracks: ['Feel Good Inc.']
    },
    {
        artist: 'Michael Jackson',
        about: 'Американский певец, автор песен и танцор, известный как «король поп-музыки». Один из самых продаваемых музыкантов в истории: альбом Thriller (1982) остаётся самым продаваемым альбомом всех времён. Его хиты «Billie Jean», «Beat It» и «Thriller» определили звучание поп-музыки на десятилетия вперёд.',
        photo_url: '/uploads/artists/michael-jackson.jpg',
        color: '#f39c12',
        tracks: ['Billie Jean']
    },
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
            // Найти или создать артиста; при конфликте обновляем описание/фото/цвет
            const artistRes = await client.query(
                `INSERT INTO public.artists (artist, slug, trackscount, about, photo_url, color)
                 VALUES ($1, $2, 0, $3, $4, $5)
                 ON CONFLICT (artist) DO UPDATE SET
                     about = EXCLUDED.about,
                     photo_url = EXCLUDED.photo_url,
                     color = EXCLUDED.color
                 RETURNING id`,
                [group.artist, makeSlug(group.artist), group.about, group.photo_url, group.color]
            );
            const artistId = artistRes.rows[0].id;
            result.artistIds.push(artistId);

            for (const title of group.tracks) {
                // Найти данные трека в track_data.json (audio, cover, lyrics)
                const trackInfo = trackData.find(t =>
                    t.artist.toLowerCase() === group.artist.toLowerCase() &&
                    t.title.toLowerCase() === title.toLowerCase()
                );

                const audioUrl = trackInfo?.audio || '';
                const coverUrl = trackInfo?.cover ? `/uploads/covers/${trackInfo.cover}` : '';
                const lyrics = trackInfo?.lyrics || '';

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
                    // Трек уже существует — обновляем его аудио/обложку/текст
                    trackId = existing.rows[0].id;
                    await client.query(
                        `UPDATE public.tracks SET
                            user_id = NULL,
                            audio_url = COALESCE(NULLIF($1, ''), audio_url),
                            cover_url = COALESCE(NULLIF($2, ''), cover_url),
                            lyrics = COALESCE(NULLIF($3, ''), lyrics)
                         WHERE id = $4`,
                        [audioUrl, coverUrl, lyrics, trackId]
                    );
                } else {
                    // Создаём новый глобальный трек (user_id = NULL)
                    const trackRes = await client.query(
                        `INSERT INTO public.tracks (title, lyrics, isliked, user_id, audio_url, cover_url, color)
                         VALUES ($1, $2, false, NULL, $3, $4, '#ff6b00')
                         RETURNING id`,
                        [title, lyrics, audioUrl, coverUrl]
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
