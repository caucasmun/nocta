require('dotenv').config();

const { Pool } = require('pg');

// Локально: без DATABASE_URL → localhost
// На Render: задайте DATABASE_URL (строка из Supabase)
const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:28172817@localhost:5432/postgres';

const isLocal =
    /localhost|127\.0\.0\.1/.test(connectionString) ||
    process.env.DB_SSL === 'false';

const pool = new Pool({
    connectionString,
    // Supabase / облако требуют SSL; локальный Postgres — нет
    ssl: isLocal ? false : { rejectUnauthorized: false },
    // Free-tier Supabase: не держим много соединений
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
});

pool.on('error', (err) => {
    console.error('Unexpected idle client error:', err.message);
});

async function testConnection() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT NOW() AS now');
        console.log('Database connected:', rows[0].now);
        console.log('Mode:', isLocal ? 'local' : 'cloud/ssl');
    } finally {
        client.release();
    }
}

testConnection().catch((err) => {
    console.error('Database connection failed:', err.message);
    console.error(
        'Check DATABASE_URL (Supabase Session/Transaction pooler) or local Postgres.'
    );
});

module.exports = pool;
