/*-A- IMPORT MODULES */
require('dotenv').config();  //variabili di ambiente
const express = require('express'); //middelware 
const mongoose = require('mongoose'); //interfaccia con mongoDB
const cors = require('cors'); //permette al frontend di comunicare con il backend senza blocchi di sicurezza
const path = require('path'); //gestione dei percorsi
const fs = require('fs'); //lettura o scrittura di file --> per il caricamento automatico dei piatti

/*-B- IMPORT MIDDLEWARE AND ROUTES */
const { authMiddleware } = require('./middleware/auth'); //MODIFICARE
const { importMealsIfEmpty } = require('./utils/catalogSeeder');
const authRoutes = require('./routes/auth'); 
const customerRoutes = require('./routes/customers'); 
const restaurateurRoutes = require('./routes/restaurateur'); 
const restaurantRoutes = require('./routes/restaurant'); 
const dishRoutes = require('./routes/dishes'); 
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders'); 

/*-C- EXPRESS CONFIGURATION */
const app = express();
app.use(cors());
app.use(express.json()); //permette di leggere i dati in formato JSON
app.use(express.urlencoded({ extended: true })); //permette di leggere i dati dai form

//Serve frontend static files
app.use('/', express.static(path.join(__dirname, '../../frontend')));

//----------------IMMAGINE PROVVISORIA MODIFICARE----------------
app.use('/data', express.static(path.join(__dirname, '../../data'))); //permette di accedere alla cartella data per le immagini caricate

/*-D- API ROUTES */
app.use('/api/lv/users', authRoutes);
app.use('/api/lv/categories', categoryRoutes);
app.use('/api/lv/customers', customerRoutes);
app.use('/api/lv/restaurateurs', restaurateurRoutes);
app.use('/api/lv/restaurants', restaurantRoutes);
app.use('/api/lv/dishes', dishRoutes);
app.use('/api/lv/orders', orderRoutes);

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
    await importMealsIfEmpty();

    app.listen(PORT, () => console.log('Server running on port ' + PORT));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
