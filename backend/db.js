require('dotenv').config();

const { Pool } = require('pg');

// Поддержка локальной и облачной базы данных
const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
    console.error('Ошибка: DATABASE_URL не задан в backend/.env');
    console.error('Пример для локальной базы:');
    console.error('DATABASE_URL=postgresql://postgres:password@localhost:5432/nocta');
    process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(rawUrl);

function buildConnectionString(url) {
    if (isLocal) return url;
    // Для облачных баз (Supabase, Render) добавляем sslmode=no-verify
    if (/[?&]sslmode=/.test(url)) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}sslmode=no-verify`;
}

const connectionString = buildConnectionString(rawUrl);

const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX || 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
    allowExitOnIdle: true,
});

pool.on('error', (err) => {
    console.error('Unexpected idle client error:', err.message);
});

async function testConnection() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT NOW() AS now, current_user AS user'
        );
        console.log('Database connected:', rows[0].now, 'as', rows[0].user);
        console.log('Mode:', isLocal ? 'local' : 'cloud/ssl');
    } finally {
        client.release();
    }
}

testConnection().catch((err) => {
    console.error('Database connection failed:', err.message);
    console.error(
        'На Render: Environment → DATABASE_URL = pooler URI из Supabase.'
    );
    console.error(
        'Локально: backend/.env с DATABASE_URL или DB_SSL=false для Postgres.'
    );
});

module.exports = pool;
