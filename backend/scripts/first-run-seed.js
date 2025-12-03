const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'src', '.env') });
console.log('MONGO_URI:', process.env.MONGO_URI);

const mongoose = require('mongoose');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Percorso modelli
const modelsPath = path.join(__dirname, '..', 'src', 'models');

// Import modelli
const User = require(path.join(modelsPath, 'User'));
const Customer = require(path.join(modelsPath, 'Customer'));
const Restaurateur = require(path.join(modelsPath, 'Restaurateur'));
const Restaurant = require(path.join(modelsPath, 'Restaurant'));
const Menu = require(path.join(modelsPath, 'Menu'));
const Dish = require(path.join(modelsPath, 'Dish'));
const Order = require(path.join(modelsPath, 'Order'));


// ================================
// FUNZIONE IMPORT meals.json
// ================================
function loadMealsData() {
  const filePath = path.join(__dirname, '../../data/meals.json'); 
  
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    
    // Ritorna TUTTI i dati, senza tagliarli
    return data; 
  } catch (err) {
    console.error("Errore lettura meals.json:", err);
    return [];
  }
}


// ================================
// MAIN SEED FUNCTION
// ================================
async function seedDatabase() {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.DB_NAME;

    await mongoose.connect(uri, { dbName });
    console.log(`Connessione a MongoDB (${dbName}) riuscita`);

    await rmOrderIndex();

    // Import piatti catalogo
    const insertedDishes = await insertDishes();

    // ================================
    // UTENTI FINTI
    // ================================
    const users = await createUsers();
    console.log(`Creati ${users.length} utenti.`);

    // ================================
    // CUSTOMERS
    // ================================
    await createCostumers(users);

    // ================================
    // RESTAURATEURS (nuovi campi)
    // ================================
    const restaurateurs = await createRestaurateurs(users);

    // ================================
    // CREAZIONE RISTORANTI + MENU
    // ================================
    const createdRestaurants = [];

    for (const r of restaurateurs) {
      const restaurant = await Restaurant.create({
        legalName: `Ristorante ${r.legalRepresentativeName}`,
        displayName: `Locale di ${r.legalRepresentativeName}`,
        phoneNumber: '39' + Math.floor(100000000 + Math.random() * 900000000),
        email: r.adminEmail,
        openingHours: 'Lun-Dom 12:00 - 23:00',

        address: {
          street: 'Via Demo',
          number: String(Math.floor(Math.random() * 50)),
          zip: '00100',
          city: 'Roma',
          province: 'RM'
        },

        description: 'Ristorante di test generato automaticamente.',
        status: 'ACTIVE',
        orderIds: []
      });

      // CREAZIONE MENU
      const menu = await Menu.create({
        restaurateurId: r._id,
        restaurantIds: [restaurant._id],
        dishIds: insertedDishes
          .sort(() => 0.5 - Math.random())
          .slice(0, 5)
          .map(d => d._id)
      });

      // Aggiorna ristorante
      restaurant.menuId = menu._id;
      await restaurant.save();

      // Aggiorna ristoratore
      r.restaurantIds.push(restaurant._id);
      await r.save();

      createdRestaurants.push(restaurant);
    }

    console.log(`Creati ${createdRestaurants.length} ristoranti con menu.`);

    // ================================
    // Ordini fittizi
    // ================================
    const customers = await Customer.find();
    const sampleOrders = [];

    for (let i = 0; i < 5; i++) {
      const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
      const randomRestaurant = createdRestaurants[Math.floor(Math.random() * createdRestaurants.length)];
      const randomDishes = insertedDishes.sort(() => 0.5 - Math.random()).slice(0, 3);

      const order = await Order.create({
        customerId: randomCustomer.userId,
        restaurantId: randomRestaurant._id,
        mealIds: randomDishes.map(d => d._id),
        price: randomDishes.reduce((sum, d) => sum + d.price, 0)
      });

      sampleOrders.push(order);
    }

    console.log(`Creati ${sampleOrders.length} ordini.`);

    console.log('\nSeed completato con successo!');
    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('Errore durante il seeding:', err);
    process.exit(1);
  }

    async function createRestaurateurs(users) {
        return await Restaurateur.insertMany(
            users
                .filter(u => u.role === 'RESTAURATEUR')
                .map(u => ({
                    userId: u._id,
                    VATNumber: `IT${Math.floor(10000000 + Math.random() * 90000000)}`,
                    legalRepresentativeName: `${u.firstName} ${u.lastName}`,
                    adminEmail: `admin_${u.email}`,
                    bankAccountHolder: `${u.firstName} ${u.lastName}`,
                    IBAN: `IT60X0542811101000000${Math.floor(Math.random() * 9999)}`,
                    restaurantIds: []
                }))
        );
    }

    async function createCostumers(users) {
        await Customer.insertMany(
            users
                .filter(u => u.role === 'CUSTOMER')
                .map(u => ({
                    userId: u._id,
                    paymentMethod: 'CASH',
                    preferences: { favouriteCategory: ['DESSERT'] }
                }))
        );
    }

    async function createUsers() {
        const rawUsers = [
            { firstName: 'Mario', lastName: 'Rossi', email: 'mario@demo.com', phoneNumber: '1111111111', password: 'password1', role: 'CUSTOMER' },
            { firstName: 'Luisa', lastName: 'Bianchi', email: 'luisa@demo.com', phoneNumber: '2222222222', password: 'password2', role: 'CUSTOMER' },
            { firstName: 'Carlo', lastName: 'Neri', email: 'carlo@demo.com', phoneNumber: '4444444444', password: 'password4', role: 'RESTAURATEUR' },
            { firstName: 'Anna', lastName: 'Russo', email: 'anna@demo.com', phoneNumber: '5555555555', password: 'password5', role: 'RESTAURATEUR' }
        ];

        for(let user of rawUsers){
            const salt = await bcrypt.genSalt(10);
            user.password =  await bcrypt.hash(user.password, salt);
        }

        return await User.insertMany(rawUsers);
    }
}


// ================================
// UTILITY FUNCTIONS
// ================================
async function insertDishes() {
  const meals = loadMealsData();

  const mapped = meals.map(m => ({
    externalId: String(m.idMeal || ''),
    name: m.strMeal,
    category: m.strCategory || 'Altro',
    area: m.strArea || '',
    image: m.strMealThumb,
    description: m.strInstructions || '',
    ingredients: m.ingredients || [],
    measures: m.measures || [],
    price: Number(m.price || 10),
    source: 'catalog'
  }));

  const inserted = await Dish.insertMany(mapped);
  console.log(`Importati ${inserted.length} piatti del catalogo.`);
  return inserted;
}

async function rmOrderIndex() {
  try {
    await mongoose.connection.db.collection('orders').dropIndexes();
    console.log('Indici "orders" rimossi.');
  } catch {
    console.log('Nessun indice da rimuovere.');
  }
}


// RUN
seedDatabase();

