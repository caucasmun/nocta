// Временный скрипт: скачивает обложки (iTunes) и тексты (Lyrics.ovh)
// для всех дефолтных треков и сохраняет результат в backend/track_data.json.
// После использования — удалить.

const fs = require('fs');
const path = require('path');

const TRACKS = [
    { artist: 'Linkin Park', title: 'Numb' },
    { artist: 'Linkin Park', title: 'In the End' },
    { artist: 'Linkin Park', title: "What I've Done" },
    { artist: 'Linkin Park', title: 'Somewhere I Belong' },
    { artist: 'Nirvana', title: 'Smells Like Teen Spirit' },
    { artist: 'Nirvana', title: 'Come As You Are' },
    { artist: 'Nirvana', title: 'Drain You' },
    { artist: 'Radiohead', title: 'Creep' },
    { artist: 'Radiohead', title: 'No Surprises' },
    { artist: 'Radiohead', title: 'Karma Police' },
    { artist: 'Arctic Monkeys', title: 'Do I Wanna Know?' },
    { artist: 'Arctic Monkeys', title: '505' },
    { artist: 'Arctic Monkeys', title: 'I Wanna Be Yours' },
    { artist: 'Gorillaz', title: 'Feel Good Inc.' },
    { artist: 'Michael Jackson', title: 'Billie Jean' },
];

const COVERS_DIR = path.join(__dirname, 'uploads', 'covers');
const OUT_JSON = path.join(__dirname, 'track_data.json');

function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function artistSlug(artist) {
    return slugify(artist);
}

function trackSlug(title) {
    return slugify(title);
}

function fileName(artist, title, ext) {
    return `${artistSlug(artist)}-${trackSlug(title)}.${ext}`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options, retries = 3) {
    let lastErr;
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            return res;
        } catch (err) {
            lastErr = err;
            await sleep(2000 * (i + 1));
        }
    }
    throw lastErr;
}

async function getCover(artist, title) {
    // iTunes Search API — без ключа
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&media=music&entity=song&limit=3`;
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    const data = await res.json();

    // Ищем точное совпадение по исполнителю (регистронезависимо)
    const results = (data.results || []).filter(r =>
        (r.artistName || '').toLowerCase() === artist.toLowerCase()
    );
    const hit = results[0] || data.results[0];
    if (!hit || !hit.artworkUrl100) return null;

    let artUrl = hit.artworkUrl100.replace('100x100bb', '600x600bb');
    const extMatch = artUrl.split('?')[0].match(/\.(png|jpe?g)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

    return { url: artUrl, ext };
}

async function downloadImage(url) {
    const res = await fetchWithRetry(url, {
        headers: { 'User-Agent': 'NoctaTrackCovers/1.0 (personal music app)' },
    });
    if (!res.ok) throw new Error(`IMG HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

async function getLyrics(artist, title) {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) return ''; // 404 — текста нет
    const data = await res.json();
    return data.lyrics || '';
}

async function main() {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
    const result = [];

    for (const track of TRACKS) {
        const item = { artist: track.artist, title: track.title, cover: '', lyrics: '' };
        console.log(`--- ${track.artist} - ${track.title}`);

        // 1. Обложка
        try {
            const cover = await getCover(track.artist, track.title);
            if (cover) {
                const buf = await downloadImage(cover.url);
                if (buf.length >= 1000) {
                    const fname = fileName(track.artist, track.title, cover.ext);
                    fs.writeFileSync(path.join(COVERS_DIR, fname), buf);
                    item.cover = fname;
                    console.log(`  cover OK ${fname} (${buf.length} bytes)`);
                } else {
                    console.log('  cover SKIP (маленький файл)');
                }
            } else {
                console.log('  cover NONE');
            }
        } catch (err) {
            console.log(`  cover ERR ${err.message}`);
        }

        // 2. Текст
        try {
            const lyrics = await getLyrics(track.artist, track.title);
            if (lyrics) {
                item.lyrics = lyrics.trim();
                console.log(`  lyrics OK (${item.lyrics.length} chars)`);
            } else {
                console.log('  lyrics NONE');
            }
        } catch (err) {
            console.log(`  lyrics ERR ${err.message}`);
        }

        result.push(item);
        await sleep(800);
    }

    fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));
    console.log('\nСохранено в backend/track_data.json');
}

main().catch(err => {
    console.error('Ошибка:', err.message);
    process.exit(1);
});
