require('dotenv').config();
const Pool = require('pg').Pool;

// Поддержка DATABASE_URL (Render/прод) и отдельных параметров (локально)
const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
    : {
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '28172817',
        database: process.env.PGDATABASE || 'nocta',
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
    };

const pool = new Pool(config);

module.exports = pool;