const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const ITEMS_FILE = path.join(__dirname, 'items.json');
if (!fs.existsSync(ITEMS_FILE)) fs.writeFileSync(ITEMS_FILE, '[]', 'utf8');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

const readItems = () => {
  try {
    const raw = fs.readFileSync(ITEMS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};
const writeItems = items => {
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf8');
};

app.post('/api/upload', upload.single('image'), (req, res) => {
  const { name, itemName, email, location, description, type } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Image is required.' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email is required.' });

  const items = readItems();
  const item = {
    id: Date.now().toString(),
    type: type || 'found',
    name: name || 'Anonymous',
    itemName: itemName || '',
    email,
    location: location || '',
    description: description || '',
    image: `/uploads/${req.file.filename}`,
    createdAt: new Date().toISOString()
  };
  items.unshift(item);
  writeItems(items);
  res.json({ success: true, item });
});

app.get('/api/items', (req, res) => {
  res.json(readItems());
});

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));