const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Mengaktifkan fitur keamanan CORS agar frontend (browser) bisa membaca data dari backend ini
app.use(cors());
app.use(express.json());

// Menyajikan file statis (index.html, assets/, dll)
app.use(express.static(__dirname));

// ==========================================
// 1. CONFIG KONEKSI KE DATABASE POSTGRESQL LU
// ==========================================
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'warlo_db',
    password: 'janganlupa', // ⚠️ GANTI INI DENGAN PASSWORD MASTER PGADMIN LU!
    port: 5432,
});

// Tes koneksi database saat server pertama kali dinyalakan
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Waduh, gagal nyambung ke database PostGIS lu, kuncinya salah kali:', err.stack);
    }
    console.log('✅ Mantap! Jembatan ke database warlo_db sukses terhubung!');
    release();
});


// ==========================================
// 2. ENDPOINT USER: Mengambil 4 Titik Lampung (GeoJSON)
// ==========================================
// API ini yang bakal ditembak oleh Leaflet.js untuk memunculkan pin spasial otomatis di peta
app.get('/api/peta', async (req, res) => {
    try {
        const queryText = `
            SELECT jsonb_build_object(
                'type', 'FeatureCollection',
                'features', jsonb_agg(features.feature)
            ) FROM (
                SELECT jsonb_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::jsonb,
                    'properties', jsonb_build_object(
                        'id', id,
                        'nama', nama_lokasi,
                        'kabupaten', kabupaten_kota,
                        'kategori', kategori,
                        'status', status_kondisi,
                        'keterangan', keterangan
                    )
                ) AS feature FROM titik_mitigasi
            ) features;
        `;
        const result = await pool.query(queryText);
        
        // Cek jika database masih kosong melompong
        if (!result.rows[0].jsonb_build_object.features) {
            return res.json({ type: "FeatureCollection", features: [] });
        }
        
        res.json(result.rows[0].jsonb_build_object);
    } catch (err) {
        console.error('Eror query spasial:', err.message);
        res.status(500).send("Gagal mengambil data peta spasial Lampung.");
    }
});


// ==========================================
// 3. ENDPOINT ADMIN: Fitur Simulasi Pemicu Bencana
// ==========================================
// API rahasia untuk mengubah status titik bencana dari 'Normal' menjadi 'Siaga Bahaya' secara instan
app.post('/api/admin/simulasi', async (req, res) => {
    const { id_titik, status_baru, keterangan_baru } = req.body;
    
    // Validasi input sederhana biar gak crash
    if (!id_titik || !status_baru) {
        return res.status(400).json({ error: "Data id_titik dan status_baru wajib diisi!" });
    }

    try {
        const updateQuery = `
            UPDATE titik_mitigasi 
            SET status_kondisi = $1, keterangan = $2 
            WHERE id = $3
            RETURNING *;
        `;
        const result = await pool.query(updateQuery, [status_baru, keterangan_baru, id_titik]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Id titik mitigasi tidak ditemukan di database." });
        }

        res.json({ 
            message: "⚡ Simulasi Sukses! Status lapangan berhasil diubah Admin.", 
            data: result.rows[0] 
        });
    } catch (err) {
        console.error('Eror update simulasi admin:', err.message);
        res.status(500).send("Gagal mengeksekusi simulasi kendali admin.");
    }
});


// ==========================================
// 4. MENYALAKAN MESIN SERVER NODE.JS
// ==========================================
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Server WARLO aman terkendali bebas dari cacing worm!`);
    console.log(`📡 Mengudara di link: http://localhost:${PORT}`);
    console.log(`====================================================`);
});