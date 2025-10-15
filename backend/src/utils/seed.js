require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Dish = require('../models/Dish');

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.DB_NAME || 'leaveat';
    if (!uri) throw new Error('Missing MONGO_URI');
    await mongoose.connect(uri, { dbName });
    console.log('MongoDB connected for seeding');

    const filePath = path.join(__dirname, '../../data/meals.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const items = JSON.parse(raw);

    // Normalize a few fields
    const docs = items.map(m => ({
      externalId: String(m.idMeal || m.externalId || ''),
      name: m.strMeal || m.name,
      category: m.strCategory || m.category || '',
      area: m.strArea || m.area || '',
      image: m.strMealThumb || m.image || '',
      ingredients: m.ingredients || [],
      measures: m.measures || [],
      price: Number(m.price || 0) || 8.0, // default price for catalog
      source: 'catalog'
    }));

    await Dish.deleteMany({ source: 'catalog' });
    await Dish.insertMany(docs);
    console.log(`Seeded catalog dishes: ${docs.length}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

run();
