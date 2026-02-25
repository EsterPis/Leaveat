const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import dei Modelli
const Order = require('../models/Order');
const Dish = require('../models/Dish');
const Restaurant = require('../models/Restaurant');

// Import Middleware
const { authMiddleware, requireRole } = require('../middleware/auth');

/* ==============================================
 * 1. CREAZIONE ORDINE (Lato Cliente)
 * ============================================== */
// POST /api/lv/orders
router.post('/', authMiddleware, requireRole('CUSTOMER'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const customerId = req.user.id; // Dal token
        const { restaurantId, items } = req.body; // items = [{ dishId, quantity }]

        if (!items || items.length === 0) {
            throw new Error('Il carrello è vuoto');
        }

        // 1. Recupero i dettagli dei piatti dal DB per calcolare il prezzo reale
        // (Non fidarti mai del prezzo inviato dal frontend!)
        let totalPrice = 0;
        const orderItems = [];

        for (const item of items) {
            const dish = await Dish.findById(item.dishId).session(session);
            
            if (!dish) {
                throw new Error(`Piatto con ID ${item.dishId} non trovato`);
            }
            // Controllo opzionale: il piatto appartiene a quel ristorante?
            // if (dish.restaurantId.toString() !== restaurantId) ...

            const quantity = item.quantity || 1;
            totalPrice += dish.price * quantity;

            orderItems.push({
                dishId: dish._id,
                quantity: quantity
            });
        }

        // 2. Creo l'ordine
        const newOrder = new Order({
            customerId: customerId,
            restaurantId: restaurantId,
            items: orderItems,
            totalPrice: totalPrice,
            status: 'ORDINATO'
        });

        await newOrder.save({ session });

        // 3. Aggiungo l'ordine alla lista del Ristorante
        await Restaurant.findByIdAndUpdate(
            restaurantId,
            { $push: { orderIds: newOrder._id } }
        ).session(session);

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            data: newOrder,
            message: 'Ordine creato con successo'
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
        res.status(400).json({ success: false, message: err.message || 'Errore creazione ordine' });
    }
});

/* ==============================================
 * 2. LISTA ORDINI PER RISTORANTE (Dashboard Ristoratore)
 * ============================================== */
// GET /api/lv/orders/restaurant/:restaurantId
router.get('/restaurant/:restaurantId', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Recupero gli ordini filtrando per restaurantId
        // Ordino per data decrescente (dal più recente)
        const orders = await Order.find({ restaurantId: restaurantId })
            .sort({ createdAt: -1 })
            .populate('items.dishId', 'name price'); // Popolo i dettagli dei piatti (nome e prezzo)

        res.status(200).json({
            success: true,
            data: orders
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore server' });
    }
});

/* ==============================================
 * 3. AGGIORNAMENTO STATO (Ristoratore)
 * ============================================== */
// PATCH /api/lv/orders/:id/status
router.patch('/:id/status', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validazione stati permessi
        const allowedStatuses = ['ORDINATO', 'IN_PREPARAZIONE', 'CONSEGNATO', 'ANNULLATO'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Stato non valido' });
        }

        const order = await Order.findByIdAndUpdate(
            id, 
            { status: status }, 
            { new: true } // Restituisce il documento aggiornato
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Ordine non trovato' });
        }

        res.status(200).json({
            success: true,
            data: order,
            message: `Stato aggiornato a ${status}`
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore server' });
    }
});

/* ==============================================
 * 4. STORICO ORDINI CLIENTE (Extra utile)
 * ============================================== */
// GET /api/lv/orders/my-orders
router.get('/my-orders', authMiddleware, requireRole('CUSTOMER'), async (req, res) => {
    try {
        const customerId = req.user.id;

        const orders = await Order.find({ customerId: customerId })
            .sort({ createdAt: -1 })
            .populate('restaurantId', 'displayName address'); // Vedo il nome del ristorante

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Errore server' });
    }
});

module.exports = router;