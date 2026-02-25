/**
 * Script: reset-db.js
 * Descrizione: Pulisce tutte le collezioni
 */

const path = require('path');
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});
const mongoose = require('mongoose');

const modelsPath = path.join(__dirname, '..', 'src', 'models');
const User = require(path.join(modelsPath, 'User'));
const Customer = require(path.join(modelsPath, 'Customer'));
const Restaurateur = require(path.join(modelsPath, 'Restaurateur'));
const Restaurant = require(path.join(modelsPath, 'Restaurant'));
const Menu = require(path.join(modelsPath, 'Menu'));
const Dish = require(path.join(modelsPath, 'Dish'));
const Order = require(path.join(modelsPath, 'Order'));

async function resetDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME
        });

        console.log("✔ Connesso a MongoDB");

        const models = [User, Customer, Restaurateur, Restaurant, Menu, Dish, Order];

        for (const model of models) {
            await model.deleteMany({});
            console.log(`✔ Svuotata collezione: ${model.modelName}`);
        }

        await mongoose.disconnect();
        console.log("✔ Reset completato");
        process.exit(0);

    } catch (err) {
        console.error("❌ Errore reset:", err);
        process.exit(1);
    }
}

resetDatabase();