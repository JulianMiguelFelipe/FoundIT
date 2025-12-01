const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Load items from JSON
function loadItems() {
  try {
    return JSON.parse(fs.readFileSync('items.json', 'utf8'));
  } catch {
    return [];
  }
}

// Save items to JSON
function saveItems(items) {
  fs.writeFileSync('items.json', JSON.stringify(items, null, 2));
}

// Upload route
app.post('/api/upload', upload.single('image'), (req, res) => {
  const items = loadItems();
  const newItem = {
    id: Date.now().toString(),
    itemName: req.body.itemName,
    description: req.body.description,
    location: req.body.location,
    name: req.body.name,
    email: req.body.email,
    image: req.file ? '/uploads/' + req.file.filename : '',
    createdAt: new Date().toISOString()
  };
  items.push(newItem);
  saveItems(items);
  res.json({ success: true });
});

// Get items
app.get('/api/items', (req, res) => {
  res.json(loadItems());
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
