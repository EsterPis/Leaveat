/**
 * app.js - Main application file for the LeaveAt backend server.
 * -A- Imports necessary modules and middleware.
 * -B- Imports route handlers for different API endpoints.
 * -C- Configures Express application and middleware.
 * -D- Sets up API routes.
 * -E- Connects to MongoDB and starts the server on the specified port.
 */

/* A → IMPORT MODULES */
require('dotenv').config();  //variabili di ambiente
const express = require('express'); //middelware 
const mongoose = require('mongoose'); //interfaccia con mongoDB
const cors = require('cors'); //permette al frontend di comunicare con il backend senza blocchi di sicurezza
const path = require('path'); //gestione dei percorsi

/* B → IMPORT MIDDLEWARE AND ROUTES */
const { importMealsIfEmpty } = require('./utils/catalogSeeder');
const authRoutes = require('./routes/auth'); 
const customerRoutes = require('./routes/customers'); 
const restaurateurRoutes = require('./routes/restaurateurs'); 
const restaurantRoutes = require('./routes/restaurants'); 
const dishRoutes = require('./routes/dishes'); 
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders'); 

/* C → EXPRESS CONFIGURATION */
const app = express();
app.use(cors());
app.use(express.json()); //permette di leggere i dati in formato JSON
app.use(express.urlencoded({ extended: true })); //permette di leggere i dati dai form

//Serve frontend static files
app.use('/', express.static(path.join(__dirname, '../../frontend')));

//----------------IMMAGINE PROVVISORIA MODIFICARE----------------
app.use('/data', express.static(path.join(__dirname, '../../data'))); //permette di accedere alla cartella data per le immagini caricate

/* D → API ROUTES */
app.use('/api/lv/users', authRoutes);
app.use('/api/lv/categories', categoryRoutes);
app.use('/api/lv/customers', customerRoutes);
app.use('/api/lv/restaurateurs', restaurateurRoutes);
app.use('/api/lv/restaurants', restaurantRoutes);
app.use('/api/lv/dishes', dishRoutes);
app.use('/api/lv/orders', orderRoutes);

/* E → START SERVER */
const PORT = process.env.PORT || 3000;

async function connectDB() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || 'leaveat';
  if (!uri) {
    console.error('Missing MONGO_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri, { dbName });
  console.log('MongoDB connected');
}

async function start() {
  try {
    await connectDB();
    await importMealsIfEmpty();

    app.listen(PORT, () => console.log('Server running on port ' + PORT));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
