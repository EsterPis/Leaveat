const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Restaurant = require('../models/Restaurant');
const Restaurateur = require('../models/Restaurateur');
const Order = require('../models/Order');
const Dish = require('../models/Dish');
const Menu = require('../models/Menu');
const { authMiddleware, requireRole } = require('../middleware/auth');

/* A → UTILITY */

async function checkOwnership(userId, restaurantId) {
    const restaurateur = await Restaurateur.findOne({ userId });
    if (!restaurateur) return false;

    const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        restaurateurId: restaurateur._id
    });

    return !!restaurant;
}

/* B → ROUTES */
// GET /api/lv/restaurants
// Restituisce la lista di tutti i ristoranti (es. per la Home Page)
router.get('/', async (req, res) => {
    try {
        // Selezioniamo solo i campi utili per la lista (leggero)
        // Filtriamo per status 'ACTIVE' se vuoi mostrare solo quelli pronti
        const restaurants = await Restaurant.find({ status: 'ACTIVE' })
            .select('displayName address openingHours imageUrl category tags');

        res.status(200).json({
            success: true,
            data: restaurants
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore server' });
    }
});

// GET /api/lv/restaurants/my-restaurants
// Restituisce SOLO i ristoranti dell'utente loggato (per la dashboard)
router.get('/my-restaurants', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const userId = req.user.id;

        // Trovo il ristoratore
        const restaurateur = await Restaurateur.findOne({ userId });
        if (!restaurateur) {
            return res.status(404).json({ success: false, message: 'Profilo ristoratore non trovato' });
        }

        const myRestaurants = await Restaurant.find({
            restaurateurId: restaurateur._id
        });

        res.status(200).json({
            success: true,
            data: myRestaurants
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore server' });
    }
});

/// GET /api/lv/restaurants/:id
// Recupero pubblico di un ristorante (solo se ACTIVE)
router.get('/:id', async (req, res) => {
    try {
        const restaurantId = req.params.id;

        // Recupero SOLO se ACTIVE
        const restaurant = await Restaurant.findOne({
            _id: restaurantId,
            status: 'ACTIVE'
        })
            .populate({
                path: 'menuId',
                populate: {
                    path: 'dishIds'
                }
            })
            .exec();

        // Se non esiste o è DRAFT → 404
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Ristorante non trovato.'
            });
        }

        return res.status(200).json({
            success: true,
            data: restaurant
        });

    } catch (err) {
        console.error('Errore nel recupero pubblico del ristorante:', err);

        return res.status(500).json({
            success: false,
            message: 'Errore interno del server.'
        });
    }
});

// Dettaglio singolo ristorante + Menù popolato (accesso privato per gestoione)
router.get('/:id/manage', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const restaurantId = req.params.id;
        const userId = req.user.id;

        // 1. Verifica la proprietà (Ownership Check)
        // È fondamentale assicurarsi che il ristoratore stia gestendo il proprio ristorante
        const isOwner = await checkOwnership(userId, restaurantId);
        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Non sei autorizzato a gestire questo ristorante.' });
        }

        // 2. Recupero del Ristorante CON POPOLAMENTO NIDIFICATO
        const restaurant = await Restaurant.findById(restaurantId)
            .populate({
                path: 'menuId',       // PRIMO LIVELLO: Popola il riferimento a 'Menu' nel documento Restaurant
                populate: {
                    path: 'dishIds'   // SECONDO LIVELLO: Popola l'array di 'Dish' all'interno del documento Menu
                }
            })
            .exec(); // Esegue la query Mongoose

        if (!restaurant) {
            return res.status(404).json({ success: false, message: "Ristorante non trovato." });
        }

        // 3. Risposta al Frontend (restaurant-manage.js)
        return res.json({ success: true, data: restaurant });

    } catch (err) {
        console.error("Errore nel recupero del ristorante:", err);
        return res.status(500).json({ success: false, message: 'Errore interno del server durante il recupero del ristorante.' });
    }
});

// POST /api/lv/restaurants
// Crea un nuovo ristorante (senza menù inizialmente)
router.post('/', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user.id;
        const rData = req.body;

        // 1. Trovo il ristoratore
        const restaurateur = await Restaurateur.findOne({ userId }).session(session);
        if (!restaurateur) {
            throw new Error('Profilo ristoratore non trovato');
        }

        // 2. Creo il ristorante
        const newRestaurant = new Restaurant({
            restaurateurId: restaurateur._id,
            legalName: rData.legalName,
            displayName: rData.displayName,
            phoneNumber: rData.phoneNumber,
            email: rData.email,
            address: rData.address,
            openingHours: rData.openingHours,
            description: rData.description,
            websiteUrl: rData.websiteUrl,
            imageUrl: rData.imageUrl,
            status: 'DRAFT' // Parte come bozza finché non ha un menù
        });

        // Validazione automatica di Mongoose scatta qui
        await newRestaurant.save({ session });

        const newMenu = new (require('../models/Menu'))({
            restaurantId: newRestaurant._id,
            dishIds: []
        });

        await newMenu.save({ session });

        // Collego il menu al ristorante
        newRestaurant.menuId = newMenu._id;
        await newRestaurant.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            data: newRestaurant,
            message: 'Ristorante creato con successo'
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
        // Gestione errore duplicato (telefono unico)
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'Dati duplicati (es. numero telefono già in uso)' });
        }
        res.status(400).json({ success: false, message: err.message || 'Errore creazione' });
    }
});

// PUT /api/lv/restaurants/:id
// Modifica dati ristorante
router.put('/:id', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;

        // 1. Controllo che il ristorante sia mio
        const isOwner = await checkOwnership(userId, id);
        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questo ristorante' });
        }

        // 2. Aggiorno
        // { new: true } restituisce il documento aggiornato
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        res.status(200).json({
            success: true,
            data: updatedRestaurant,
            message: 'Ristorante aggiornato'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore server' });
    }
});

// DELETE /api/lv/restaurants/:id
// Elimina ristorante (Solo se non ha ordini attivi!)
router.delete('/:id', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const userId = req.user.id;

        // 1. Controllo proprietà
        const isOwner = await checkOwnership(userId, id);
        if (!isOwner) {
            throw new Error('Non autorizzato o ristorante non trovato');
        }

        // 2. Controllo ordini attivi (Specifiche Tecniche: errore 409 se ordini attivi)
        const activeOrder = await Order.findOne({
            restaurantId: id,
            status: { $in: ['ORDINATO', 'IN_PREPARAZIONE'] }
        }).session(session);

        if (activeOrder) {
            // Se ci sono ordini in corso, non posso cancellare
            throw new Error('IMPOSSIBLE_DELETE_ORDERS');
        }

        // 3. Rimuovo il ristorante
        await Restaurant.findByIdAndDelete(id).session(session);
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'Ristorante eliminato con successo' });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        if (err.message === 'IMPOSSIBLE_DELETE_ORDERS') {
            return res.status(409).json({ success: false, message: 'Impossibile eliminare: ci sono ordini in corso.' });
        }
        if (err.message === 'Non autorizzato o ristorante non trovato') {
            return res.status(403).json({ success: false, message: err.message });
        }

        console.error(err);
        res.status(500).json({ success: false, message: 'Errore server' });
    }
});

// POST /api/lv/restaurants/:id/clone-menu
router.post('/:id/clone-menu', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const targetRestaurantId = req.params.id;
        const { sourceRestaurantId } = req.body;
        const userId = req.user.id;

        // 1️⃣ Verifica ownership target
        const isOwnerTarget = await checkOwnership(userId, targetRestaurantId);
        if (!isOwnerTarget) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }

        // 2️⃣ Verifica ownership source
        const isOwnerSource = await checkOwnership(userId, sourceRestaurantId);
        if (!isOwnerSource) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }

        const sourceRestaurant = await Restaurant.findById(sourceRestaurantId)
            .populate({
                path: 'menuId',
                populate: { path: 'dishIds' }
            });

        const targetRestaurant = await Restaurant.findById(targetRestaurantId);

        if (!sourceRestaurant.menuId) {
            return res.status(400).json({ success: false, message: 'Menu sorgente non trovato' });
        }

        const dishes = sourceRestaurant.menuId.dishIds;

        // Copia ogni piatto creando nuovi documenti
        for (const dish of dishes) {
            const newDish = await Dish.create({
                name: dish.name,
                category: dish.category,
                price: dish.price,
                ingredients: dish.ingredients,
                description: dish.description,
                restaurantId: targetRestaurantId,
                source: 'restaurant'
            });

            await Menu.findByIdAndUpdate(
                targetRestaurant.menuId,
                { $push: { dishIds: newDish._id } }
            );
        }

        // Attiva ristorante
        await Restaurant.findByIdAndUpdate(targetRestaurantId, { status: 'ACTIVE' });

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore clonazione' });
    }
});

module.exports = router;