/**
 * Script: reset-db.js
 * Descrizione: Pulisce tutte le collezioni del database MongoDB (come se fosse il primo accesso).
 * Uso: node scripts/reset-db.js
 */

const path = require('path'); 
require('dotenv').config({ path: path.join(__dirname, '..', 'src', '.env') });
const mongoose = require('mongoose');

// Percorso base dei modelli
const modelsPath = path.join(__dirname, '..', 'src', 'models');

// Import modelli
const User = require(path.join(modelsPath, 'User'));
const Customer = require(path.join(modelsPath, 'Customer'));
const Restaurateur = require(path.join(modelsPath, 'Restaurateur'));
const Restaurant = require(path.join(modelsPath, 'Restaurant'));
const Menu = require(path.join(modelsPath, 'Menu'));
const Dish = require(path.join(modelsPath, 'Dish'));
const Order = require(path.join(modelsPath, 'Order'));

async function resetDatabase() {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.DB_NAME;

    if (!uri || !dbName) {
      console.error('Errore: MONGO_URI o DB_NAME non definiti nel file .env');
      process.exit(1);
    }

    await mongoose.connect(uri, { dbName });
    console.log(`Connessione a MongoDB (${dbName}) riuscita!`);

    // Elenco dei modelli da svuotare
    const models = [User, Customer, Restaurateur, Restaurant, Menu, Dish, Order];

    for (const model of models) {
      await model.deleteMany({});
      console.log(`Cancellata collezione: ${model.modelName}`);
    }

    console.log('\n✨ Database resettato con successo (nessun dato presente).');

    await mongoose.disconnect();
    console.log('Disconnessione completata.');
    process.exit(0);
  } catch (err) {
    console.error('Errore durante il reset del database:', err);
    process.exit(1);
  }
}

resetDatabase();
