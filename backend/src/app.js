require('dotenv').config();  //variabili di ambiente
const express = require('express'); //middelware 
const mongoose = require('mongoose'); //interfaccia con mongoDB
const cors = require('cors'); //permette al frontend di comunicare con il backend senza blocchi di sicurezza
const path = require('path'); //gestione dei percorsi
const fs = require('fs'); //lettura o scrittura di file --> per il caricamento automatico dei piatti

const authRoutes = require('./routes/auth'); //importa le rotte di autenticazione
const dishRoutes = require('./routes/dishes'); //importa le rotte dei piatti
const { authMiddleware } = require('./middleware/auth'); //importa il middleware di autenticazione
const Dish = require('./models/Dish'); //importa il modello Dish
const customerRoutes = require('./routes/customers'); //importa le rotte dei clienti
const categoryRoutes = require('./routes/categories');

//Funzione per il caricamento automatico dei piatti 
async function isCatalogEmpty() {
  const count = await Dish.countDocuments(); //conta i documenti nella collezione Dish
    return count === 0;
} 
 
function loadMealsData(){ //se la collezione è vuota legge il file meals.json e importa i piatti
    const filePath = path.join(__dirname, '../../data/meals.json'); 
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')); //legge il file e lo converte in oggetto JS
}
 
function mapMealsToDishes(data){
    //mappappatura dei dati per adattarli allo schema Dish
    return data.map(m => ({
      externalId: String(m.idMeal || m.externalId || ''), 
      name: m.strMeal || m.name,
      category: m.strCategory || m.category || '',
      area: m.strArea || m.area || '',
      image: m.strMealThumb || m.image || '',
      description: m.strInstructions || m.description || '',
      ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
      measures: Array.isArray(m.measures) ? m.measures : [],
      price: Number(m.price || 0) || 10.0, //se m.price è truthy lo converte in numero, altrimenti assegna 0. Se il risultato è 0 (falsy), assegna 10.0.
      source: 'catalog'
    }));
}

async function importMealsIfEmpty(){
  if (await isCatalogEmpty()) {
     console.log('Database vuoto, importo meals.json...');
     const meals = loadMealsData();
     const docs = mapMealsToDishes(meals);
    await Dish.insertMany(docs); //inserisce i documenti nella collezione Dish
    console.log(`Importati ${docs.length} piatti da meals.json`);
  } else {
    console.log('Catalogo già popolato.');
  }
}

//Configurazione di express
const app = express();
app.use(cors());
app.use(express.json()); //permette di leggere i dati in formato JSON
app.use(express.urlencoded({ extended: true })); //permette di leggere i dati dai form

//Serve frontend static files
app.use('/', express.static(path.join(__dirname, '../../frontend')));

//API routes
app.use('/api/lv/users', authRoutes);
app.use('/api/lv/customers', customerRoutes);
app.use('/api/lv/dishes', dishRoutes);
app.use('/api/lv/categories', categoryRoutes);

//Example protected route: whoami
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
    await importMealsIfEmpty();

    app.listen(PORT, () => console.log('Server running on port ' + PORT));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
