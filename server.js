const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Detect environment
const usePostgres = !!process.env.DATABASE_URL;

let db; // will hold either sqlite3 or pg pool

if (usePostgres) {
  // PostgreSQL (Render)
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Create table if not exists
  (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        itemName TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        image TEXT,
        createdAt TIMESTAMP NOT NULL
      )
    `);
  })();
} else {
  // SQLite (local dev)
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'foundit.db');
  db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        itemName TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        image TEXT,
        createdAt TEXT NOT NULL
      )
    `);
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// --- Routes ---

// Create item
app.post('/api/upload', upload.single('image'), async (req, res) => {
  const { itemName, description, location, name, email } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  const createdAt = new Date().toISOString();

  if (!itemName || !description || !location || !name || !email) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    if (usePostgres) {
      const result = await db.query(
        `INSERT INTO items (itemName, description, location, name, email, image, createdAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [itemName, description, location, name, email, image, createdAt]
      );
      res.json({ success: true, id: result.rows[0].id });
    } else {
      db.run(
        `INSERT INTO items (itemName, description, location, name, email, image, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemName, description, location, name, email, image, createdAt],
        function (err) {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, id: this.lastID });
        }
      );
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Read items
app.get('/api/items', async (req, res) => {
  try {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM items ORDER BY id DESC`);
      res.json(result.rows);
    } else {
      db.all(`SELECT * FROM items ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Update item
app.put('/api/items/:id', async (req, res) => {
  const id = req.params.id;
  const { itemName, description, location, name, email } = req.body;

  try {
    if (usePostgres) {
      const result = await db.query(
        `UPDATE items SET itemName=$1, description=$2, location=$3, name=$4, email=$5 WHERE id=$6`,
        [itemName, description, location, name, email, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ success: true });
    } else {
      db.run(
        `UPDATE items SET itemName=?, description=?, location=?, name=?, email=? WHERE id=?`,
        [itemName, description, location, name, email, id],
        function (err) {
          if (err) return res.status(500).json({ error: 'Database error' });
          if (this.changes === 0) return res.status(404).json({ error: 'Item not found' });
          res.json({ success: true });
        }
      );
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (usePostgres) {
      const result = await db.query(`DELETE FROM items WHERE id=$1`, [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ success: true });
    } else {
      db.run(`DELETE FROM items WHERE id=?`, [id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Item not found' });
        res.json({ success: true });
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT} (Postgres: ${usePostgres})`));
