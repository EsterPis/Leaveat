const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'src', '.env') });

const mongoose = require('mongoose');
const fs = require('fs');

// Import modelli
const modelsPath = path.join(__dirname, '..', 'src', 'models');
const User = require(path.join(modelsPath, 'User'));
const Customer = require(path.join(modelsPath, 'Customer'));
const Restaurateur = require(path.join(modelsPath, 'Restaurateur'));
const Restaurant = require(path.join(modelsPath, 'Restaurant'));
const Menu = require(path.join(modelsPath, 'Menu'));
const Dish = require(path.join(modelsPath, 'Dish'));
const Order = require(path.join(modelsPath, 'Order'));

function loadMealsData() {
    const filePath = path.join(__dirname, '../../data/meals.json');
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error("Errore lettura meals.json:", err);
        return [];
    }
}

async function seedDatabase() {
    try {
        const uri = process.env.MONGO_URI;
        await mongoose.connect(uri, { dbName: process.env.DB_NAME });
        console.log("Connessione a MongoDB riuscita.");

        // 1. Pulizia Database
        await User.deleteMany({});
        await Customer.deleteMany({});
        await Restaurateur.deleteMany({});
        await Restaurant.deleteMany({});
        await Menu.deleteMany({});
        await Dish.deleteMany({});
        await Order.deleteMany({});
        console.log("Database pulito.");

        // 2. Importazione Piatti (Dish)
        const meals = loadMealsData();
        const dishesToInsert = meals.map(m => ({
            externalId: String(m.idMeal),
            name: m.strMeal,
            category: m.strCategory ? m.strCategory.toUpperCase() : 'MISCELLANEOUS',
            area: m.strArea || '',
            image: m.strMealThumb,
            description: m.strInstructions || '',
            ingredients: m.ingredients || ['Sale', 'Olio'],
            price: Math.floor(Math.random() * 10) + 7,
            source: 'catalog'
        }));
        const insertedDishes = await Dish.insertMany(dishesToInsert);
        console.log(`${insertedDishes.length} piatti inseriti.`);

        // 3. Creazione Utenti (Password in chiaro per attivare pre-save hook)
        const userData = [
            { firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com', password: 'password123', phoneNumber: '3330000001', role: 'CUSTOMER' },
            { firstName: 'Carlo', lastName: 'Neri', email: 'carlo@test.com', password: 'password2', phoneNumber: '3330000003', role: 'RESTAURATEUR' }
        ];

        const insertedUsers = [];
        for (const u of userData) {
            const newUser = new User(u);
            await newUser.save();
            insertedUsers.push(newUser);
        }
        console.log("Utenti creati.");

        // 4. Creazione profili Customer
        // CORREZIONE: Uso dei valori ENUM corretti (Tutto maiuscolo)
        const customers = insertedUsers.filter(u => u.role === 'CUSTOMER');
        for (const c of customers) {
            await Customer.create({
                userId: c._id,
                preferences: {
                    favoriteCategories: ['DESSERT', 'SEAFOOD'] // Modificato da Dessert/Seafood a DESSERT/SEAFOOD
                },
                paymentMethod: 'CREDIT_CARD'
            });
        }

        // 5. Creazione Restaurateur, Restaurant e Menu
        const restaurateurs = insertedUsers.filter(u => u.role === 'RESTAURATEUR');
        for (const resUser of restaurateurs) {
            const restaurateurDoc = await Restaurateur.create({
                userId: resUser._id,
                VATNumber: `IT${Math.floor(10000000000 + Math.random() * 90000000000)}`,
                legalRepresentativeName: `${resUser.firstName} ${resUser.lastName}`,
                adminEmail: `admin@${resUser.lastName.toLowerCase()}.it`,
                bankAccountHolder: resUser.firstName,
                IBAN: 'IT00000000000000000000000',
                restaurantIds: []
            });

            const restaurant = await Restaurant.create({
                legalName: `${resUser.lastName} Food S.R.L.`,
                displayName: `Trattoria da ${resUser.firstName}`,
                phoneNumber: resUser.phoneNumber,
                email: `info@${resUser.lastName.toLowerCase()}.it`,
                address: { street: 'Via Roma', number: '1', zip: '20100', city: 'Milano', province: 'MI' },
                openingHours: '12:00-23:00',
                status: 'ACTIVE'
            });

            const dishesToCopy = insertedDishes.slice(0, 5);
            const menuDishIds = [];

            for (const d of dishesToCopy) {
                const copiedDish = new Dish({
                    name: d.name,
                    category: d.category,
                    area: d.area,
                    image: d.image,
                    description: d.description,
                    ingredients: d.ingredients,
                    price: d.price,
                    restaurantId: restaurant._id, 
                    source: 'restaurant'          
                });
                await copiedDish.save();
                menuDishIds.push(copiedDish._id);
            }

            const menu = await Menu.create({
                restaurateurId: restaurateurDoc._id,
                restaurantIds: [restaurant._id],
                dishIds: menuDishIds 
            });

            restaurant.menuId = menu._id;
            await restaurant.save();

            restaurateurDoc.restaurantIds.push(restaurant._id);
            await restaurateurDoc.save();
        }

        console.log("Seed completato con successo!");
        process.exit(0);

    } catch (err) {
        console.error("ERRORE DURANTE IL SEED:", err);
        process.exit(1);
    }
}

seedDatabase();