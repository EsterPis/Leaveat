require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Dish = require('../models/Dish');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || 'leaveat';
  if (!uri) throw new Error('Missing MONGO_URI');
  await mongoose.connect(uri, { dbName });
  console.log('✅ Connessione a MongoDB completata');
}

function readMealsFile() {
  const filePath = path.join(__dirname, '../../data/meals.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function normalizeMealsData(items) {
  return items.map(m => ({
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
}

async function clearOldCatalog() {
  await Dish.deleteMany({ source: 'catalog' });
  console.log('🧹 Catalogo precedente rimosso');
}

async function insertCatalogData(docs) {
  await Dish.insertMany(docs);
  console.log(`🍽️ Importati ${docs.length} piatti nel catalogo`);
}


async function run() {
  try {
    await connectDB();
    const items = readMealsFile();
    const docs = normalizeMealsData(items);
    await clearOldCatalog();
    await insertCatalogData(docs);
    process.exit(0);
  } catch (err) {
    console.error('❌ Errore durante il seeding:', err);
    process.exit(1);
  }
}

run();
