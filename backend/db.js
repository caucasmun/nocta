const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:28172817@localhost:5432/postgres';

const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

module.exports = pool;
