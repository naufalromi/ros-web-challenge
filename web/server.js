require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10kb' }));

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests, try again later' }
});
app.use('/api', apiLimiter);

const logLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many log requests' }
});
app.use('/api/log', logLimiter);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
    res.json({
        rosbridgeUrl: process.env.ROSBRIDGE_URL || '',
        cameraUrl: process.env.CAMERA_URL || ''
    });
});

if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('ERROR: DB_USER dan DB_PASSWORD harus diisi di file .env');
    process.exit(1);
}

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'robot_db'
});

db.connect(err => {
    if (err) {
        console.error('Gagal koneksi ke MySQL:', err);
        return;
    }
    console.log('Sukses terhubung ke database MySQL.');
});

app.post('/api/log', (req, res) => {
    const { action_type, detail } = req.body;
    if (!action_type) {
        return res.status(400).json({ error: 'action_type is required' });
    }
    const query = 'INSERT INTO system_logs (action_type, detail) VALUES (?, ?)';
    db.query(query, [action_type, typeof detail === 'object' ? JSON.stringify(detail) : detail || ''], (err, result) => {
        if (err) {
            console.error('Gagal menyimpan log:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Log berhasil disimpan', id: result.insertId });
    });
});

app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const query = 'SELECT id, action_type, detail, created_at FROM system_logs WHERE created_at > (NOW() - INTERVAL 1 HOUR) ORDER BY created_at DESC LIMIT ? OFFSET ?';
    db.query(query, [limit, offset], (err, results) => {
        if (err) {
            console.error('Gagal membaca log:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

setInterval(() => {
    const cleanupQuery = "DELETE FROM system_logs WHERE created_at < (NOW() - INTERVAL 1 HOUR)";
    db.query(cleanupQuery, (err, result) => {
        if (err) {
            console.error('Gagal menghapus log lama:', err);
        } else if (result.affectedRows > 0) {
            console.log(`Cleanup: ${result.affectedRows} log lama (>1 jam) berhasil dihapus.`);
        }
    });
}, 300000);

app.post('/api/robot/command', (req, res) => {
    const { action } = req.body;
    if (!action || !['on', 'off'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "on" or "off"' });
    }
    const query = 'INSERT INTO robot_commands (action, status) VALUES (?, ?)';
    db.query(query, [action, 'pending'], (err, result) => {
        if (err) {
            console.error('Gagal simpan command:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Command saved', id: result.insertId });
    });
});

app.get('/api/robot/pending-command', (req, res) => {
    const query = 'SELECT id, action FROM robot_commands WHERE status = ? ORDER BY created_at ASC LIMIT 1';
    db.query(query, ['pending'], (err, results) => {
        if (err) {
            console.error('Gagal baca pending command:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) return res.json(null);
        res.json({ id: results[0].id, action: results[0].action });
    });
});

app.post('/api/robot/command/:id/done', (req, res) => {
    const { status } = req.body;
    if (!status || !['done', 'failed'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "done" or "failed"' });
    }
    const query = 'UPDATE robot_commands SET status = ? WHERE id = ?';
    db.query(query, [status, req.params.id], (err) => {
        if (err) {
            console.error('Gagal update command:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Command updated' });
    });
});

app.get('/api/robot/status', (req, res) => {
    const query = 'SELECT action, status FROM robot_commands ORDER BY created_at DESC LIMIT 1';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Gagal baca status robot:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) return res.json({ action: null, status: null });
        const last = results[0];
        const robotOn = last.action === 'on' && last.status === 'done';
        res.json({ action: last.action, status: last.status, robotOn });
    });
});

app.listen(3000, () => {
    console.log('Server Backend berjalan di http://localhost:3000');
});