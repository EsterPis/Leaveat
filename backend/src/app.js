require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const { authMiddleware } = require('./middleware/auth');
const Dish = require('./models/Dish');

// Funzione per il caricamento automatico dei piatti 
async function autoSeed() {
  const count = await Dish.countDocuments();
  if (count === 0) {
    console.log('Database vuoto, importo meals.json...');
    const filePath = path.join(__dirname, '../../data/meals.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const docs = data.map(m => ({
      externalId: String(m.idMeal || m.externalId || ''),
      name: m.strMeal || m.name,
      category: m.strCategory || m.category || '',
      area: m.strArea || m.area || '',
      image: m.strMealThumb || m.image || '',
      ingredients: m.ingredients || [],
      measures: m.measures || [],
      price: Number(m.price || 0) || 8.0,
      source: 'catalog'
    }));
    await Dish.insertMany(docs);
    console.log(`Importati ${docs.length} piatti da meals.json`);
  } else {
    console.log('Catalogo già popolato.');
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use('/', express.static(path.join(__dirname, '../../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);

// Example protected route: whoami
app.get('/api/users/me', authMiddleware, async (req, res) => {
  res.json({ success: true, data: { userId: req.user.userId, email: req.user.email, role: req.user.role } });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.DB_NAME || 'leaveat';
    if (!uri) {
      console.error('Missing MONGO_URI in .env');
      process.exit(1);
    }
    await mongoose.connect(uri, { dbName });
    console.log('MongoDB connected');
    await autoSeed(); 

    app.listen(PORT, () => console.log('Server running on port ' + PORT));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
