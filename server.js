const express = require('express');
const multer = require('multer');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const usePostgres = !!process.env.DATABASE_URL;
let db;

if (usePostgres) {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        itemName TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        studentNumber TEXT,
        image TEXT,
        createdAt TIMESTAMP NOT NULL,
        returned BOOLEAN DEFAULT false
      )
    `);

    await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS returned BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS studentNumber TEXT`);
  })();
} else {
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
        studentNumber TEXT,
        image TEXT,
        createdAt TEXT NOT NULL,
        returned INTEGER DEFAULT 0
      )
    `);

    db.all(`PRAGMA table_info(items);`, [], (err, cols) => {
      const hasSN = cols.some(c => c.name === 'studentNumber');
      if (!hasSN) {
        db.run(`ALTER TABLE items ADD COLUMN studentNumber TEXT`);
      }
      const hasReturned = cols.some(c => c.name === 'returned');
      if (!hasReturned) {
        db.run(`ALTER TABLE items ADD COLUMN returned INTEGER DEFAULT 0`);
      }
    });
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: 'djs5iygtw',
  api_key: '824711358753588',
  api_secret: 'LUJb34Qsl9vNBKtWfB33in1Vx2U'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'foundit_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg']
  }
});

const upload = multer({ storage });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Routes ---

// Create item
app.post('/api/upload', upload.single('image'), async (req, res) => {
  const { itemName, description, location, name, email, studentNumber } = req.body;
  const image = req.file ? req.file.path : '';
  const createdAt = new Date().toISOString();

  if (!itemName || !description || !location || !name || !email || !studentNumber) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }

  try {
    if (usePostgres) {
      const result = await db.query(
        `INSERT INTO items (itemName, description, location, name, email, studentNumber, image, createdAt, returned)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [itemName, description, location, name, email, studentNumber, image, createdAt, false]
      );
      res.json({ success: true, id: result.rows[0].id });
    } else {
      db.run(
        `INSERT INTO items (itemName, description, location, name, email, studentNumber, image, createdAt, returned)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [itemName, description, location, name, email, studentNumber, image, createdAt, 0],
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
      const result = await db.query(`
        SELECT id, itemName, description, location, name, email, studentNumber, image, createdAt, returned
        FROM items ORDER BY id DESC
      `);
      const rows = result.rows.map(r => ({
        ...r,
        createdAt: new Date(r.createdAt).toISOString()
      }));
      res.json(rows);
    } else {
      db.all(`SELECT * FROM items ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const normalized = rows.map(r => ({
          ...r,
          createdAt: new Date(r.createdAt).toISOString()
        }));
        res.json(normalized);
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Update item
app.put('/api/items/:id', async (req, res) => {
  const id = req.params.id;
  const { itemName, description, location, name, email, studentNumber, returned } = req.body;

  try {
    if (usePostgres) {
      const result = await db.query(
        `UPDATE items SET itemName=$1, description=$2, location=$3, name=$4, email=$5, studentNumber=$6, returned=$7 WHERE id=$8`,
        [itemName, description, location, name, email, studentNumber, returned, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ success: true });
    } else {
      db.run(
        `UPDATE items SET itemName=?, description=?, location=?, name=?, email=?, studentNumber=?, returned=? WHERE id=?`,
        [itemName, description, location, name, email, studentNumber, returned ? 1 : 0, id],
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

// Mark item as returned
app.put('/api/items/:id/returned', async (req, res) => {
  const id = req.params.id;
  try {
    if (usePostgres) {
      const result = await db.query(`UPDATE items SET returned=true WHERE id=$1`, [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ success: true });
    } else {
      db.run(`UPDATE items SET returned=1 WHERE id=?`, [id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Item not found' });
        res.json({ success: true });
      });
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
});   // ✅ close the delete route properly

// --- Temporary schema fix route ---
// Read items
app.get('/api/items', async (req, res) => {
  try {
    if (usePostgres) {
      const result = await db.query(`
        SELECT id, itemName, description, location, name, email, studentNumber, image, createdAt, returned
        FROM items ORDER BY id DESC
      `);
      const rows = result.rows.map(r => {
        let iso;
        try {
          iso = r.createdat ? new Date(r.createdat).toISOString() : new Date().toISOString();
        } catch {
          iso = new Date().toISOString();
        }
        return { ...r, createdAt: iso };
      });
      res.json(rows);
    } else {
      db.all(`SELECT * FROM items ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const normalized = rows.map(r => {
          let iso;
          try {
            iso = r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString();
          } catch {
            iso = new Date().toISOString();
          }
          return { ...r, createdAt: iso, returned: !!r.returned };
        });
        res.json(normalized);
      });
    }
  } catch (err) {
    console.error("GET /api/items error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});
// Finally start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT} (Postgres: ${usePostgres})`));


