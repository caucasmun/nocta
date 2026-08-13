// Временный скрипт: проверка доступности данных для дефолтных треков
// (обложки — iTunes API, тексты — Lyrics.ovh). После проверки — удалить.

const ITUNES = 'https://itunes.apple.com/search';
const LYRICS = 'https://api.lyrics.ovh/v1';

const SONGS = [
    { artist: 'Linkin Park', title: 'Numb' },
    { artist: 'Nirvana', title: 'Smells Like Teen Spirit' },
    { artist: 'Radiohead', title: 'Creep' },
    { artist: 'Arctic Monkeys', title: 'Do I Wanna Know?' },
    { artist: 'Gorillaz', title: 'Feel Good Inc.' },
    { artist: 'Michael Jackson', title: 'Billie Jean' },
];

async function test() {
    for (const s of SONGS) {
        // iTunes: ищем обложку
        try {
            const r = await fetch(`${ITUNES}?term=${encodeURIComponent(s.artist + ' ' + s.title)}&media=music&entity=song&limit=1`);
            const d = await r.json();
            const art = d.results && d.results[0];
            if (art) {
                const url = (art.artworkUrl100 || '').replace('100x100bb', '300x300bb');
                console.log(`${s.artist} - ${s.title}: iTunes OK ${url}`);
            } else {
                console.log(`${s.artist} - ${s.title}: iTunes NONE`);
            }
        } catch (e) {
            console.log(`${s.artist} - ${s.title}: iTunes ERR ${e.message}`);
        }

        // Lyrics.ovh: текст песни
        try {
            const r = await fetch(`${LYRICS}/${encodeURIComponent(s.artist)}/${encodeURIComponent(s.title)}`);
            if (r.ok) {
                const d = await r.json();
                console.log(`${s.artist} - ${s.title}: Lyrics OK (${(d.lyrics || '').length} chars)`);
            } else {
                console.log(`${s.artist} - ${s.title}: Lyrics HTTP ${r.status}`);
            }
        } catch (e) {
            console.log(`${s.artist} - ${s.title}: Lyrics ERR ${e.message}`);
        }
    }
}

test();
