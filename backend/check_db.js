const { Client } = require('pg');
const c = new Client({ user: 'postgres', password: '28172817', database: 'nocta', host: 'localhost', port: 5432 });
c.connect()
    .then(() => c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
    .then(r => { console.log('Tables:', r.rows.map(x => x.table_name).join(', ')); return c.end(); })
    .catch(e => { console.log('ERROR:', e.message); c.end(); });