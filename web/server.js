const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'robot_db'
});

db.connect(err => {
    if (err) {
        console.error('Gagal koneksi ke MySQL:', err);
        return;
    }
    console.log('Sukses terhubung ke database MySQL.');
});

app.post('/api/log', (req, res) => {
    const { linear, angular } = req.body;
    const query = 'INSERT INTO system_logs (command_linear, command_angular) VALUES (?, ?)';
    
    db.query(query, [linear, angular], (err, result) => {
        if (err) {
            console.error('Gagal menyimpan log:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Log berhasil disimpan', id: result.insertId });
    });
});

setInterval(() => {
    const cleanupQuery = "DELETE FROM system_logs WHERE created_at < (NOW() - INTERVAL 1 DAY)";
    db.query(cleanupQuery, (err, result) => {
        if (err) {
            console.error('Gagal menghapus log lama:', err);
        } else if (result.affectedRows > 0) {
            console.log(`Auto-cleanup: ${result.affectedRows} log lama (lebih dari 24 jam) berhasil dihapus.`);
        }
    });
}, 3600000);

// app.listen(3000, () => {
//     console.log('Server Backend berjalan di http://localhost:3000');
// });       

app.listen(80, '0.0.0.0', () => {
    console.log('Server Backend berjalan di Port 80 (Akses via Public IP Azure)');
});