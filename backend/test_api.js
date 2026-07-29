const http = require('http');

const post = (path, data) => new Promise((res, rej) => {
    const body = JSON.stringify(data);
    const req = http.request('http://localhost:5000' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, r => {
        let s = '';
        r.on('data', c => s += c);
        r.on('end', () => res(s));
    });
    req.on('error', rej);
    req.write(body);
    req.end();
});

const get = (path) => new Promise((res, rej) => {
    http.get('http://localhost:5000' + path, r => {
        let s = '';
        r.on('data', c => s += c);
        r.on('end', () => res(s));
    }).on('error', rej);
});

(async () => {
    try {
        console.log('Create user:', await post('/api/users', { username: 'testuser' }));
        console.log('All users:', await get('/api/users'));
        console.log('Create artist:', await post('/api/artists', { artist: 'Test Artist', trackscount: 0, about: 'Test bio' }));
        console.log('All artists:', await get('/api/artists'));
    } catch (e) {
        console.log('ERR:', e.message);
    }
})();