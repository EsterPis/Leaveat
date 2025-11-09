/**
 * Script: first-run-seed.js
 * Descrizione: Popola il database con dati fittizi realistici (utenti, ristoratori, ristoranti, menu, piatti, ordini).
 * Uso: node scripts/first-run-seed.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'src', '.env') });
console.log('MONGO_URI:', process.env.MONGO_URI);
const mongoose = require('mongoose');
const fs = require('fs');

// Percorso base modelli
const modelsPath = path.join(__dirname, '..', 'src', 'models');

// Import modelli
const User = require(path.join(modelsPath, 'User'));
const Customer = require(path.join(modelsPath, 'Customer'));
const Restaurateur = require(path.join(modelsPath, 'Restaurateur'));
const Restaurant = require(path.join(modelsPath, 'Restaurant'));
const Menu = require(path.join(modelsPath, 'Menu'));
const Dish = require(path.join(modelsPath, 'Dish'));
const Order = require(path.join(modelsPath, 'Order'));


// Funzione per leggere meals.json
function loadMealsData() {
    const filePath = path.join(__dirname, '../../data/meals.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.slice(0, 20); // ne prendiamo solo 20 per evitare troppi documenti
}

async function seedDatabase() {
    try {
        const uri = process.env.MONGO_URI;
        const dbName = process.env.DB_NAME;

        await mongoose.connect(uri, { dbName });
        console.log(`Connessione a MongoDB (${dbName}) riuscita`);

        // Rimuovi indici esistenti sulla collezione Order
        try {
            await mongoose.connection.db.collection('orders').dropIndexes();
            console.log('Indici sulla collezione "orders" rimossi (se esistevano).');
        } catch (err) {
            console.log('Nessun indice da rimuovere sulla collezione "orders".');
        }

        //Inserimento piatti del catalogo
        const meals = loadMealsData();
        const dishes = meals.map(m => ({
            externalId: String(m.idMeal || ''),
            name: m.strMeal || m.name,
            category: m.strCategory || m.category || 'Altro',
            area: m.strArea || '',
            image: m.strMealThumb || '',
            description: m.strInstructions || '',
            ingredients: m.ingredients || [],
            measures: m.measures || [],
            price: Number(m.price || 10),
            source: 'catalog'
        }));
        const insertedDishes = await Dish.insertMany(dishes);
        console.log(`Importati ${insertedDishes.length} piatti del catalogo.`);

        //Creazione utenti fittizi
        const users = await User.insertMany([
            { firstName: 'Mario', lastName: 'Rossi', email: 'mario@demo.com', phoneNumber: '1111111111', password: 'password1', role: 'CUSTOMER' },
            { firstName: 'Luisa', lastName: 'Bianchi', email: 'luisa@demo.com', phoneNumber: '2222222222', password: 'password2', role: 'CUSTOMER' },
            { firstName: 'Paolo', lastName: 'Verdi', email: 'paolo@demo.com', phoneNumber: '3333333333', password: 'password3', role: 'CUSTOMER' },
            { firstName: 'Carlo', lastName: 'Neri', email: 'carlo@demo.com', phoneNumber: '4444444444', password: 'password4', role: 'RESTAURATEUR' },
            { firstName: 'Anna', lastName: 'Russo', email: 'anna@demo.com', phoneNumber: '5555555555', password: 'password5', role: 'RESTAURATEUR' },
        ]);
        console.log(`Creati ${users.length} utenti fittizi.`);

        //Crea Customers e Restaurateurs
        const customers = await Customer.insertMany(users.filter(u => u.role === 'CUSTOMER').map(u => ({
            userId: u._id,
            paymentMethod: 'CASH',
            preferences: { favoriteCategories: ['DESSERT', 'CHICKEN'] }
        })));

        const restaurateurs = await Restaurateur.insertMany(users.filter(u => u.role === 'RESTAURATEUR').map(u => ({
            userId: u._id,
            VATNumber: `VAT${Math.floor(Math.random() * 10000)}`,
            restaurantIds: []
        })));

        //Crea Ristoranti e Menù
        const createdRestaurants = [];
        for (const r of restaurateurs) {
            const restaurant = await Restaurant.create({
                name: `Ristorante di ${r.userId}`,
                phoneNumber: '39' + Math.floor(100000000 + Math.random() * 900000000),
                address: `Via Demo ${Math.floor(Math.random() * 50)}, Roma`,
                status: 'ACTIVE',
                orderIds: []
            });

            const menu = await Menu.create({
                restaurateurId: r._id,
                restaurantIds: [restaurant._id],
                dishIds: insertedDishes
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 5)
                    .map(d => d._id)
            });

            restaurant.menuId = menu._id;
            await restaurant.save();

            r.restaurantIds.push(restaurant._id);
            await r.save();

            createdRestaurants.push(restaurant);
        }
        console.log(`Creati ${createdRestaurants.length} ristoranti con menù.`);

        //Crea Ordini fittizi
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

        console.log(`Creati ${sampleOrders.length} ordini fittizi.`);

        console.log('\nSeed completato con successo!');
        await mongoose.disconnect();
        console.log('Disconnessione completata.');
        process.exit(0);
    } catch (err) {
        console.error('Errore durante il seeding:', err);
        process.exit(1);
    }
}

seedDatabase();
