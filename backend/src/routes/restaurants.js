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
/* #swagger.tags = ['Restaurants']
   #swagger.summary = 'Lista ristoranti'

   #swagger.parameters['name'] = { in: 'query', type: 'string' }
   #swagger.parameters['city'] = { in: 'query', type: 'string' }

   #swagger.responses[200] = { description: 'Lista ristoranti' }
   #swagger.responses[500] = { description: 'Errore server' }
*/
router.get('/', async (req, res) => {
  try {
    const { name, city } = req.query;

    let filter = { status: 'ACTIVE' };

    // Filtro per nome (case insensitive)
    if (name) {
      filter.displayName = { $regex: name, $options: 'i' };
    }

    // Filtro per città
    if (city) {
      filter['address.city'] = { $regex: city, $options: 'i' };
    }

    const restaurants = await Restaurant.find(filter)
      .select('displayName address openingHours imageUrl category tags phoneNumber');

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
/* #swagger.tags = ['Restaurants']
   #swagger.summary = 'I miei ristoranti'

   #swagger.security = [{ "bearerAuth": [] }]

   #swagger.responses[200] = { description: 'Lista ristoranti' }
   #swagger.responses[401] = { description: 'Non autenticato' }
   #swagger.responses[403] = { description: 'Accesso negato' }
*/
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
/* #swagger.tags = ['Restaurants']
    #swagger.summary = 'Dettaglio ristorante pubblico'
    #swagger.parameters['id'] = { in: 'path', type: 'string', description: 'ID del ristorante' }

    #swagger.responses[200] = { description: 'Dettaglio ristorante' }
    #swagger.responses[404] = { description: 'Ristorante non trovato' }
    #swagger.responses[500] = { description: 'Errore server' }
*/
// Recupero pubblico di un ristorante (solo se ACTIVE)
router.get('/:id', async (req, res) => {
    try {
        const restaurantId = req.params.id;

        //controllo stato e popolamento menù
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

/* #swagger.tags = ['Restaurants']
    #swagger.summary = 'Dettaglio ristorante per gestione (con menù popolato)'
    #swagger.parameters['id'] = { in: 'path', type: 'string', description: 'ID del ristorante' }
    #swagger.security = [{ "bearerAuth": [] }]  
    #swagger.responses[200] = { description: 'Dettaglio ristorante con menù' }
    #swagger.responses[403] = { description: 'Non autorizzato' }
    #swagger.responses[404] = { description: 'Ristorante non trovato' }
    #swagger.responses[500] = { description: 'Errore server' }
*/
// Dettaglio singolo ristorante + Menù popolato (accesso privato per gestoione)
router.get('/:id/manage', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const restaurantId = req.params.id;
        const userId = req.user.id;

        //controllo proprietà
        const isOwner = await checkOwnership(userId, restaurantId);
        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Non sei autorizzato a gestire questo ristorante.' });
        }


        const restaurant = await Restaurant.findById(restaurantId)
            .populate({
                path: 'menuId',       
                populate: {
                    path: 'dishIds'   
                }
            })
            .exec(); 

        if (!restaurant) {
            return res.status(404).json({ success: false, message: "Ristorante non trovato." });
        }

        return res.json({ success: true, data: restaurant });

    } catch (err) {
        console.error("Errore nel recupero del ristorante:", err);
        return res.status(500).json({ success: false, message: 'Errore interno del server durante il recupero del ristorante.' });
    }
});

// POST /api/lv/restaurants
/* #swagger.tags = ['Restaurants']
   #swagger.summary = 'Crea un nuovo ristorante'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = {
        description: 'Dati del nuovo ristorante',
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/Restaurant"
                }
            }
        }
    }
}   
    #swagger.responses[201] = { description: 'Ristorante creato con successo' }
    #swagger.responses[400] = { description: 'Dati non validi' }
    #swagger.responses[409] = { description: 'Dati duplicati' }
    #swagger.responses[500] = { description: 'Errore server' }
*/
// Crea un nuovo ristorante 
router.post('/', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user.id;
        const rData = req.body;

        
        const restaurateur = await Restaurateur.findOne({ userId }).session(session);
        if (!restaurateur) {
            throw new Error('Profilo ristoratore non trovato');
        }

        
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

        
        await newRestaurant.save({ session });

        const newMenu = new (require('../models/Menu'))({
            restaurantId: newRestaurant._id,
            dishIds: []
        });

        await newMenu.save({ session });

        // Collega il menu al ristorante
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
/* #swagger.tags = ['Restaurants']
    #swagger.summary = 'Modifica dati ristorante'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = {
        description: 'Dati da aggiornare del ristorante',
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/Restaurant"
                }
            }
        }
    }
}   
    #swagger.responses[200] = { description: 'Ristorante aggiornato con successo' }
    #swagger.responses[400] = { description: 'Dati non validi' }
    #swagger.responses[403] = { description: 'Non autorizzato' }
    #swagger.responses[404] = { description: 'Ristorante non trovato' }
    #swagger.responses[500] = { description: 'Errore server' }
*/
// Modifica dati ristorante
router.put('/:id', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;

        // Controllo proprietà
        const isOwner = await checkOwnership(userId, id);
        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questo ristorante' });
        }


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
/* #swagger.tags = ['Restaurants']
    #swagger.summary = 'Elimina ristorante (solo se non ha ordini attivi)'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', type: 'string', description: 'ID del ristorante' }

    #swagger.responses[200] = { description: 'Ristorante eliminato con successo' }
    #swagger.responses[403] = { description: 'Non autorizzato o ristorante non trovato' }
    #swagger.responses[409] = { description: 'Impossibile eliminare: ci sono ordini in corso' }
    #swagger.responses[500] = { description: 'Errore server' }
*/
// Elimina ristorante (Solo se non ha ordini attivi)
router.delete('/:id', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const userId = req.user.id;

        
        const isOwner = await checkOwnership(userId, id);
        if (!isOwner) {
            throw new Error('Non autorizzato o ristorante non trovato');
        }

        //controllo ordini attivi
        const activeOrder = await Order.findOne({
            restaurantId: id,
            status: { $in: ['ORDINATO', 'IN_PREPARAZIONE'] }
        }).session(session);

        if (activeOrder) {
            throw new Error('IMPOSSIBLE_DELETE_ORDERS');
        }

        //elimino ristorante, menù e piatti in cascata
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
/* #swagger.tags = ['Restaurants']
    #swagger.summary = 'Clona menù da un ristorante all\'altro (per creare un nuovo ristorante partendo da un template)'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.parameters['id'] = { in: 'path', type: 'string', description: 'ID del ristorante target (quello che riceve il menù)' }
    #swagger.requestBody = {
        description: 'ID del ristorante sorgente (quello da cui copiare il menù)',
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: 'object',
                    properties: {
                        sourceRestaurantId: { type: 'string' }
                    }
                }
            }
        }
    }
}   
    #swagger.responses[200] = { description: 'Menù clonato con successo' }
    #swagger.responses[400] = { description: 'Dati non validi o menù sorgente non trovato' }
    #swagger.responses[403] = { description: 'Non autorizzato' }
    #swagger.responses[500] = { description: 'Errore server' }
*/
router.post('/:id/clone-menu', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
        const targetRestaurantId = req.params.id;
        const { sourceRestaurantId } = req.body;
        const userId = req.user.id;

        
        const isOwnerTarget = await checkOwnership(userId, targetRestaurantId);
        if (!isOwnerTarget) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }

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