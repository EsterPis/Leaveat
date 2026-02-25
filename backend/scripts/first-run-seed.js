const path = require('path');
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});
const mongoose = require('mongoose');
const fs = require('fs');

// Modelli
const modelsPath = path.join(__dirname, '..', 'src', 'models');
const User = require(path.join(modelsPath, 'User'));
const Customer = require(path.join(modelsPath, 'Customer'));
const Restaurateur = require(path.join(modelsPath, 'Restaurateur'));
const Restaurant = require(path.join(modelsPath, 'Restaurant'));
const Menu = require(path.join(modelsPath, 'Menu'));
const Dish = require(path.join(modelsPath, 'Dish'));
const Order = require(path.join(modelsPath, 'Order'));

// Caricamento dataset meals.json
function loadMeals() {
    const filePath = path.join(__dirname, '../../data/meals.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME
        });

        console.log("✔ Connessione MongoDB riuscita");

        // RESET COMPLETO
        await Promise.all([
            User.deleteMany({}),
            Customer.deleteMany({}),
            Restaurateur.deleteMany({}),
            Restaurant.deleteMany({}),
            Menu.deleteMany({}),
            Dish.deleteMany({}),
            Order.deleteMany({})
        ]);

        console.log("✔ Database pulito");

        // ---------------------------------------------------
        // 1️⃣ IMPORT CATALOGO PIATTI (source = catalog)
        // ---------------------------------------------------

        const meals = loadMeals();

        const catalogDishes = meals.map(m => ({
            externalId: m.idMeal,
            name: m.strMeal,
            category: m.strCategory ? m.strCategory.toUpperCase() : 'MISCELLANEOUS',
            area: m.strArea,
            image: m.strMealThumb,
            description: m.strInstructions,
            ingredients: m.ingredients || ['Sale', 'Olio'],
            measures: m.measures || [],
            price: Math.floor(Math.random() * 10) + 7,
            source: 'catalog'
        }));

        await Dish.insertMany(catalogDishes);

        console.log("✔ Catalogo importato");

        // ---------------------------------------------------
        // 2️⃣ CREAZIONE UTENTI
        // ---------------------------------------------------

        const customerUser = await User.create({
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario@test.com',
            password: 'password123',
            phoneNumber: '3330000001',
            role: 'CUSTOMER'
        });

        const restaurateurUser = await User.create({
            firstName: 'Carlo',
            lastName: 'Neri',
            email: 'carlo@test.com',
            password: 'password123',
            phoneNumber: '3330000002',
            role: 'RESTAURATEUR'
        });

        console.log("✔ Utenti creati");

        // ---------------------------------------------------
        // 3️⃣ CUSTOMER PROFILE
        // ---------------------------------------------------

        await Customer.create({
            userId: customerUser._id,
            preferences: {
                favoriteCategories: ['DESSERT', 'SEAFOOD'],
                favoriteRestaurantIds: []
            },
            paymentMethod: 'CREDIT_CARD'
        });

        console.log("✔ Profilo Customer creato");

        // ---------------------------------------------------
        // 4️⃣ RESTAURATEUR
        // ---------------------------------------------------

        const restaurateur = await Restaurateur.create({
            userId: restaurateurUser._id,
            VATNumber: 'IT12345678901',
            legalRepresentativeName: 'Carlo Neri',
            adminEmail: 'admin@trattoriacarlo.it',
            bankAccountHolder: 'Carlo Neri',
            IBAN: 'IT60X0542811101000000123456'
        });

        console.log("✔ Profilo Restaurateur creato");

        // ---------------------------------------------------
        // 5️⃣ RESTAURANT
        // ---------------------------------------------------

        const restaurant = await Restaurant.create({
            legalName: 'Neri Food S.R.L.',
            displayName: 'Trattoria da Carlo',
            phoneNumber: '0299999999',
            email: 'info@trattoriacarlo.it',
            address: {
                street: 'Via Roma',
                number: '10',
                zip: '20100',
                city: 'Milano',
                province: 'MI'
            },
            openingHours: 'Lun-Dom 12:00 - 23:00',
            description: 'Cucina italiana tradizionale',
            websiteUrl: 'https://trattoriacarlo.it',
            imageUrl: '',
            status: 'ACTIVE',
            restaurateurId: restaurateur._id
        });

        console.log("✔ Ristorante creato");

        // ---------------------------------------------------
        // 6️⃣ COPIA PIATTI DAL CATALOGO PER IL MENU
        // ---------------------------------------------------

        const sampleDishes = await Dish.find({ source: 'catalog' }).limit(5);

        const restaurantDishIds = [];

        for (const d of sampleDishes) {
            const copiedDish = await Dish.create({
                name: d.name,
                category: d.category,
                area: d.area,
                image: d.image,
                description: d.description,
                ingredients: d.ingredients,
                measures: d.measures,
                price: d.price,
                restaurantId: restaurant._id,
                source: 'restaurant'
            });

            restaurantDishIds.push(copiedDish._id);
        }

        console.log("✔ Piatti duplicati per il ristorante");

        // ---------------------------------------------------
        // 7️⃣ MENU
        // ---------------------------------------------------

        const menu = await Menu.create({
            restaurantId: restaurant._id,
            dishIds: restaurantDishIds
        });

        restaurant.menuId = menu._id;
        await restaurant.save();

        console.log("✔ Menu creato e collegato");

        // ---------------------------------------------------
        // 8️⃣ ORDINE DI TEST
        // ---------------------------------------------------

        const order = await Order.create({
            customerId: customerUser._id, // ATTENZIONE: Order referenzia User
            restaurantId: restaurant._id,
            items: [
                {
                    dishId: restaurantDishIds[0],
                    quantity: 2
                }
            ],
            totalPrice: sampleDishes[0].price * 2,
            status: 'ORDINATO'
        });

        console.log("✔ Ordine di test creato");

        console.log("\n🎉 SEED COMPLETATO CON SUCCESSO");
        process.exit(0);

    } catch (err) {
        console.error("❌ ERRORE SEED:", err);
        process.exit(1);
    }
}

seedDatabase();