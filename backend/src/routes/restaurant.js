const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import dei Modelli
const Restaurant = require('../models/Restaurant');
const Restaurateur = require('../models/Restaurateur');
const Order = require('../models/Order');

// Middleware di autenticazione
const { authMiddleware, requireRole } = require('../middleware/auth');

/* ==============================================
 * FUNZIONI DI UTILITÀ (HELPER)
 * ============================================== */

// Verifica che il ristorante appartenga all'utente loggato
async function checkOwnership(userId, restaurantId) {
    // 1. Trovo il profilo del ristoratore collegato all'utente
    const restaurateur = await Restaurateur.findOne({ userId: userId });
    
    if (!restaurateur) return false;

    // 2. Controllo se l'ID del ristorante è nella sua lista
    // Nota: usiamo map(String) per confrontare le stringhe e non gli oggetti ObjectId
    const ids = restaurateur.restaurantIds.map(id => id.toString());
    return ids.includes(restaurantId.toString());
}


/* ==============================================
 * ROTTE PUBBLICHE (Visitor & Customer)
 * ============================================== */

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

// GET /api/lv/restaurants/:id
// Dettaglio singolo ristorante + Menù popolato
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Cerco il ristorante e "popolo" (carico i dati completi) del menù
        // e dentro il menù popolo anche i piatti (dishIds)
        const restaurant = await Restaurant.findById(id)
            .populate({
                path: 'menuId',
                populate: { path: 'dishIds' } // Carica i dettagli dei piatti
            });

        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Ristorante non trovato' });
        }

        res.status(200).json({
            success: true,
            data: restaurant
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore server' });
    }
});


/* ==============================================
 * ROTTE PROTETTE (Solo Restaurateur)
 * ============================================== */

// GET /api/lv/restaurants/my-restaurants
// Restituisce SOLO i ristoranti dell'utente loggato (per la dashboard)
router.get('/my-restaurants', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const userId = req.user.userId;

        // Trovo il ristoratore
        const restaurateur = await Restaurateur.findOne({ userId });
        if (!restaurateur) {
            return res.status(404).json({ success: false, message: 'Profilo ristoratore non trovato' });
        }

        // Trovo tutti i ristoranti che hanno l'ID presente nell'array del ristoratore
        const myRestaurants = await Restaurant.find({
            _id: { $in: restaurateur.restaurantIds }
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

// POST /api/lv/restaurants
// Crea un nuovo ristorante (senza menù inizialmente)
router.post('/', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const userId = req.user.userId;
        const rData = req.body;

        // 1. Trovo il ristoratore
        const restaurateur = await Restaurateur.findOne({ userId }).session(session);
        if (!restaurateur) {
            throw new Error('Profilo ristoratore non trovato');
        }

        // 2. Creo il ristorante
        const newRestaurant = new Restaurant({
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

        // 3. Aggiungo l'ID del ristorante alla lista del ristoratore
        restaurateur.restaurantIds.push(newRestaurant._id);
        await restaurateur.save({ session });

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
        const userId = req.user.userId;

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
        const userId = req.user.userId;

        // 1. Controllo proprietà
        const isOwner = await checkOwnership(userId, id);
        if (!isOwner) {
            throw new Error('Non autorizzato o ristorante non trovato');
        }

        // 2. Controllo ordini attivi (Specifiche Tecniche: errore 409 se ordini attivi)
        const activeOrder = await Order.findOne({
            restaurantId: id,
            status: { $in: ['ORDINATO', 'IN_PREPARAZIONE', 'IN_CONSEGNA'] }
        }).session(session);

        if (activeOrder) {
            // Se ci sono ordini in corso, non posso cancellare
            throw new Error('IMPOSSIBLE_DELETE_ORDERS');
        }

        // 3. Rimuovo il ristorante
        await Restaurant.findByIdAndDelete(id).session(session);

        // 4. Rimuovo il riferimento dal Ristoratore
        await Restaurateur.findOneAndUpdate(
            { userId: userId },
            { $pull: { restaurantIds: id } }
        ).session(session);

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

module.exports = router;