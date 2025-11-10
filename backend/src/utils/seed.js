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
  console.log('Connessione a MongoDB completata');
}

// Legge il file meals.json
function readMealsFile() {
  const filePath = path.join(__dirname, '../../data/meals.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// Normalizza i dati del file per adattarli al modello Dish
function normalizeMealsData(items) {
  return items.map(m => ({
    externalId: String(m.idMeal || m.externalId || ''),
    name: m.strMeal || m.name,
    category: m.strCategory || m.category || '',
    area: m.strArea || m.area || '',
    image: m.strMealThumb || m.image || '',
    description: m.strInstructions || m.description || '',
    ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
    measures: Array.isArray(m.measures) ? m.measures : [],
    price: Number(m.price || 0) || 10.0,
    source: 'catalog'
  }));
}

// 🔍 Controlla se nel DB mancano i piatti del catalogo base
async function isCatalogEmpty() {
  const count = await Dish.countDocuments({ source: 'catalog' });
  return count === 0;
}

// Inserisce i piatti nel DB
async function insertCatalogData(docs) {
  await Dish.insertMany(docs);
  console.log(`Importati ${docs.length} piatti dal file meals.json`);
}

// Esegue lo script
async function run() {
  try {
    await connectDB();

    if (await isCatalogEmpty()) {
      console.log('Catalogo base assente: importazione in corso...');
      const items = readMealsFile();
      const docs = normalizeMealsData(items);
      await insertCatalogData(docs);
      console.log('Catalogo generale importato con successo.');
    } else {
      console.log('Catalogo base già presente: nessuna importazione necessaria.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Errore durante il seeding:', err);
    process.exit(1);
  }
}

run();
