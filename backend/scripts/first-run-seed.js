/**
 * Script di seed per popolare il database con dati di esempio al primo avvio.
 * Esegue le seguenti operazioni:
 * 1. Connessione a MongoDB
 * 2. Pulizia completa del database
 * 3. Importazione dei piatti dal file meals.json
 * 4. Creazione utenti Customer e Restaurateur
 * 5. Creazione dei profili Customer e Restaurateur
 * 6. Creazione di ristoranti associati al Restaurateur
 * 7. Popolamento dei menu dei ristoranti con piatti copiati dal catalogo
 * 8. Creazione di un ordine di test per il Customer
 * 9. Log di successo o errori
 */

/* A - IMPORTS */
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

/* B - SEED LOGIC */
// Load meals from meals.json
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

        console.log("-----------Connessione MongoDB riuscita-----------");

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

        console.log("Database pulito");

        /* B.1 - IMPORT DISHES */
        // Loads meals from meals.json 
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

        console.log("- Catalogo importato");

        /* B.2 - USER CREATION*/
        const customerUser = await User.create({
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario@test.com',
            password: 'password123',
            phoneNumber: '3330000001',
            role: 'CUSTOMER'
        });

        const customerUser1 = await User.create({
            firstName: 'Luigi',
            lastName: 'Verdi',
            email: 'luigi@test.com',
            password: 'password123',
            phoneNumber: '3330000002',
            role: 'CUSTOMER'
        });

        const restaurateurUser = await User.create({
            firstName: 'Carlo',
            lastName: 'Neri',
            email: 'carlo@test.com',
            password: 'password123',
            phoneNumber: '3340000001',
            role: 'RESTAURATEUR'
        });

        const restaurateurUser1 = await User.create({
            firstName: 'Giovanni',
            lastName: 'Neri',
            email: 'giovanni@test.com',
            password: 'password123',
            phoneNumber: '3340000002',
            role: 'RESTAURATEUR'
        });

        const restaurateurUser2 = await User.create({
            firstName: 'Antonio',
            lastName: 'Neri',
            email: 'antonio@test.com',
            password: 'password123',
            phoneNumber: '3340000003',
            role: 'RESTAURATEUR'
        });

        const restaurateurUser3 = await User.create({
            firstName: 'Francesco',
            lastName: 'Neri',
            email: 'francesco@test.com',
            password: 'password123',
            phoneNumber: '3340000004',
            role: 'RESTAURATEUR'
        });

        const restaurateurUser4 = await User.create({
            firstName: 'Giuseppe',
            lastName: 'Neri',
            email: 'giuseppe@test.com',
            password: 'password123',
            phoneNumber: '3340000005',
            role: 'RESTAURATEUR'
        });


        console.log("- Utenti creati");

        /* B.3 - PROFILES */
        // Customer profiles
        await Customer.create({
            userId: customerUser._id,
            preferences: {
                favoriteCategories: ['DESSERT', 'SEAFOOD'],
                favoriteRestaurantIds: []
            },
            paymentMethod: 'CREDIT_CARD'
        });

        console.log("- Profilo Customer creato");

        // Restaurateur profiles
        const restaurateur = await Restaurateur.create({
            userId: restaurateurUser._id,
            VATNumber: 'IT12345678901',
            legalRepresentativeName: 'Carlo Neri',
            adminEmail: 'admin@trattoriacarlo.it',
            bankAccountHolder: 'Carlo Neri',
            IBAN: 'IT60X0542811101000000123451'
        });

        const restaurateur1 = await Restaurateur.create({
            userId: restaurateurUser1._id,
            VATNumber: 'IT12345678902',
            legalRepresentativeName: 'Giovanni Neri',
            adminEmail: 'admin@trattoriacarlo.it',
            bankAccountHolder: 'Carlo Neri',
            IBAN: 'IT60X0542811101000000123456'
        });

        const restaurateur2 = await Restaurateur.create({
            userId: restaurateurUser2._id,
            VATNumber: 'IT12345678903',
            legalRepresentativeName: 'Antonio Neri',
            adminEmail: 'admin@trattoriantonio.it',
            bankAccountHolder: 'Antonio Neri',
            IBAN: 'IT60X0542811101000000123452'
        });

        const restaurateur3 = await Restaurateur.create({
            userId: restaurateurUser3._id,
            VATNumber: 'IT12345678904',
            legalRepresentativeName: 'Francesco Neri',
            adminEmail: 'admin@trattoriafrancesco.it',
            bankAccountHolder: 'Francesco Neri',
            IBAN: 'IT60X0542811101000000123453'
        });

        const restaurateur4 = await Restaurateur.create({
            userId: restaurateurUser4._id,
            VATNumber: 'IT12345678905',
            legalRepresentativeName: 'Giuseppe Neri',
            adminEmail: 'admin@trattoriagiuseppe.it',
            bankAccountHolder: 'Giuseppe Neri',
            IBAN: 'IT60X0542811101000000123454'
        });


        console.log("- Profilo Restaurateur creato");

        /* B.4 - RESTAURANTS */
        const restaurant0 = await Restaurant.create({
            legalName: 'Neri Food S.R.L. 1',
            displayName: 'Trattoria da Carlo 1',
            phoneNumber: '0299999999',
            email: 'info@trattoriacarlo.it',
            address: {
                street: 'Via Frtelli Rosselli',
                number: '10',
                zip: '75100',
                city: 'Matera',
                province: 'MT'
            },
            openingHours: 'Lun-Dom 12:00 - 23:00',
            description: 'Cucina italiana tradizionale',
            websiteUrl: 'https://trattoriacarlo1.it',
            imageUrl: 'https://i0.wp.com/www.viaggiascrittori.com/wp-content/uploads/2024/02/53274856469_564bdbe9ce_b.jpg?fit=800%2C534&ssl=1',
            status: 'ACTIVE',
            restaurateurId: restaurateur._id
        });

        const restaurant1 = await Restaurant.create({
            legalName: 'Neri Food S.R.L. 2',
            displayName: 'Trattoria da Carlo 2',
            phoneNumber: '0299999998',
            email: 'info@trattoriacarlo.it',
            address: {
                street: 'Via Sinni',
                number: '11',
                zip: '75100',
                city: 'Matera',
                province: 'MT'
            },
            openingHours: 'Lun-Dom 12:00 - 23:00',
            description: 'Cucina italiana tradizionale',
            websiteUrl: 'https://trattoriacarlo2.it',
            imageUrl: 'https://amministrazione.ratio.it/media/famiglia/1586896804-9121.jpeg',
            status: 'ACTIVE',
            restaurateurId: restaurateur._id
        });

        const restaurant2 = await Restaurant.create({
            legalName: 'Giovanni Food S.R.L.',
            displayName: 'Trattoria da Giovanni',
            phoneNumber: '0299997999',
            email: 'info@trattoriagiovanni.it',
            address: {
                street: 'Via Pretoria',
                number: '10',
                zip: '58100',
                city: 'Potenza',
                province: 'PZ'
            },
            openingHours: 'Lun-Dom 12:00 - 23:00',
            description: 'Cucina italiana tradizionale',
            websiteUrl: 'https://trattoriagiovanni.it',
            imageUrl: '',
            status: 'ACTIVE',
            restaurateurId: restaurateur1._id
        });

        const restaurant3 = await Restaurant.create({
            legalName: 'Antonio S.R.L.',
            displayName: 'Trattoria da Antonio',
            phoneNumber: '0299999989',
            email: 'info@trattoriantonio.it',
            address: {
                street: 'Via Togliatti',
                number: '10',
                zip: '75020',
                city: 'Scanzano Jonico',
                province: 'MT'
            },
            openingHours: 'Lun-Dom 12:00 - 23:00',
            description: 'Cucina italiana tradizionale',
            websiteUrl: 'https://trattoriantonio.it',
            imageUrl: 'https://cdn-bd.ionet.it/villaggiotorredelfaro4/misvagotravel/gallery/1b47c003c9bb11ed98eb0a069e529790.jpg',
            status: 'ACTIVE',
            restaurateurId: restaurateur2._id
        });

        const restaurant4 = await Restaurant.create({
            legalName: 'Francesco S.R.L.',
            displayName: 'Trattoria da Francesco',
            phoneNumber: '02999999879',
            email: 'info@trattoriafrancesco.it',
            address: {
                street: 'Via Pretoria',
                number: '10',
                zip: '58100',
                city: 'Potenza',
                province: 'PZ'
            },
            openingHours: 'Lun-Dom 12:00 - 23:00',
            description: 'Cucina italiana tradizionale',
            websiteUrl: 'https://trattoriafrancesco.it',
            imageUrl: '',
            status: 'ACTIVE',
            restaurateurId: restaurateur3._id
        });

        console.log("- Ristorante creato");

        /* B.5 - POPULATE MENU */

        const sampleDishes = await Dish.find({ source: 'catalog' }).limit(5);

        const restaurants = [restaurant0, restaurant1, restaurant2, restaurant3, restaurant4];

        for (const restaurant of restaurants) {

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

            const menu = await Menu.create({
                restaurantId: restaurant._id,
                dishIds: restaurantDishIds
            });

            restaurant.menuId = menu._id;
            await restaurant.save();
        }

        console.log("- Menu creati e collegati");

        /* B.6 - ORDERS */
        // prendo un piatto appartenente al ristorante 0
        const firstDish = await Dish.findOne({ restaurantId: restaurant0._id });

        const order = await Order.create({
            customerId: customerUser._id,
            restaurantId: restaurant0._id,
            items: [
                {
                    dishId: firstDish._id,
                    quantity: 2
                }
            ],
            totalPrice: firstDish.price * 2,
            status: 'ORDINATO'
        });

        console.log("- Ordine di test creato");

        console.log("\n------------------------SEED COMPLETATO CON SUCCESSO-------------------------\n");
        process.exit(0);

    } catch (err) {
        console.error("ERRORE SEED:", err);
        process.exit(1);
    }
}

seedDatabase();