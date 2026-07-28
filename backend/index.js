const express = require('express');
const pool = require('./db');
const cors = require('cors');
const { log } = require('node:console');

const app = express();
app.use(cors());
app.use(express.json())

app.get('/api/musics', async (req, res) => {
    try {
        const allMusics = await pool.query('SELECT * FROM musics');
        res.json(allMusics.rows);
        
    } catch (err) {
        console.error(err.message);
    }
});

app.listen(5000, () => {
    console.log('test');
})