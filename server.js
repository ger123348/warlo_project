const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'warlo_db',
    password: 'janganlupa',
    port: 5432,
});

app.get('/api/simulasi', async (req, res) => {
    try {
        // Query disesuaikan dengan nama kolom hasil tangkapan layar DB Anda
        // Rawan: nama_lokasi, Balai: name
        const rawanQuery = `SELECT id, nama_lokasi, ST_AsGeoJSON(geom) as geom FROM rawan_longsor_db WHERE geom IS NOT NULL`;
        const balaiQuery = `SELECT id, name, ST_AsGeoJSON(geom) as geom FROM balai_db WHERE geom IS NOT NULL`;

        const rawanRes = await pool.query(rawanQuery);
        const balaiRes = await pool.query(balaiQuery);

        res.json({
            rawan: rawanRes.rows.map(r => ({
                type: "Feature",
                geometry: JSON.parse(r.geom),
                properties: { nama: r.nama_lokasi || "Lokasi Rawan" }
            })),
            balai: balaiRes.rows.map(r => ({
                type: "Feature",
                geometry: JSON.parse(r.geom),
                properties: { nama: r.name || "Balai Evakuasi" }
            }))
        });
    } catch (err) {
        console.error("DEBUG ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cari-rute', async (req, res) => {
    const { lat, lng } = req.query;
    try {
        // Cari balai terdekat dengan ST_Distance
        const query = `
            SELECT name, ST_AsGeoJSON(geom) as geom 
            FROM balai_db 
            ORDER BY geom <-> ST_SetSRID(ST_Point($1, $2), 4326) ASC 
            LIMIT 1`;
        const result = await pool.query(query, [lng, lat]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/simulasi', async (req, res) => {
    const { nama, jenis, lat, lng } = req.body;
    const table = (jenis === 'rawan') ? 'rawan_longsor_db' : 'balai_db';
    const column = (jenis === 'rawan') ? 'nama_lokasi' : 'name';

    try {
        const query = `INSERT INTO ${table} (${column}, geom) 
                       VALUES ($1, ST_SetSRID(ST_Point($2, $3), 4326))`;
        await pool.query(query, [nama, lng, lat]); // lng dulu baru lat (GeoJSON standar)
        res.json({ message: "Sukses!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log('🚀 Server WARLO online di: http://localhost:3000'));