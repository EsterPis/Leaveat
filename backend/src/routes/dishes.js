const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Dish = require('../models/Dish');
const Restaurateur = require('../models/Restaurateur');
const Menu = require('../models/Menu');
const Restaurant = require('../models/Restaurant');
const { authMiddleware } = require('../middleware/auth');

// GET /api/lv/dishes - 
// Filtri: name, category, ingredient, maxPrice
router.get('/', async (req, res) => {
  try {
    const { name, category, ingredient, maxPrice } = req.query;
    const query = { source: 'catalog' }; // catalogo pubblico di base

    if (name) query.name = { $regex: name, $options: 'i' };
    if (category) query.category = { $regex: category, $options: 'i' };
    if (ingredient) query.ingredients = { $regex: ingredient, $options: 'i' };
    if (maxPrice) query.price = { $lte: Number(maxPrice) };

    const dishes = await Dish.find(query).limit(50);
    res.json({ success: true, count: dishes.length, data: dishes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/lv/dishes/catalog
// Filtri: name, category, ingredient, maxPrice
router.get('/catalog', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'RESTAURATEUR') { //verifica del ruolo
      return res.status(403).json({ success: false, message: 'Accesso negato' }); //forbidden
    }

    //costruzione oggetto query
    const { name, category, ingredient, maxPrice } = req.query; //req.query contiene i parametri passati nell'URL dopo ?
    const query = { source: 'catalog' };

    //applicazione filtri
    if (name) query.name = { $regex: name, $options: 'i' };
    if (category) query.category = { $regex: category, $options: 'i' };
    if (ingredient) query.ingredients = { $regex: ingredient, $options: 'i' };
    if (maxPrice) query.price = { $lte: Number(maxPrice) };

    const dishes = await Dish.find(query).sort({ name: 1 }); //ordinamento alfabetico
    res.json({ success: true, count: dishes.length, data: dishes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// GET /api/lv/dishes/:id
/*router.get('/:id', async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ success: false, message: 'Piatto non trovato' });
    res.json({ success: true, data: dish });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});*/
router.get('/:id', async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ success: false, message: 'Piatto non trovato' });

    console.log("DEBUG GET - Piatto trovato:", dish.name);
    console.log("DEBUG GET - restaurantId del piatto:", dish.restaurantId);

    res.json({ success: true, data: dish });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lv/dishes
// Solo ristoratore: aggiunge un piatto al proprio menù e aggiorna il documento Menu
router.post('/', authMiddleware, async (req, res) => {
  // Avviamo una sessione per garantire che o salviamo tutto (Piatto + Aggiornamento Menu) o nulla
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verifica Ruolo
    if (req.user.role !== 'RESTAURATEUR') {
      throw new Error('Accesso negato: solo i ristoratori possono creare piatti.');
    }

    // 2. Recuperiamo l'ID del ristorante dal body (il frontend deve inviarlo!)
    // Nota: Prima usavi req.user.restaurantId, ma un utente può avere più ristoranti,
    // quindi deve essere specificato nella richiesta.
    const { restaurantId } = req.body;

    if (!restaurantId) {
      throw new Error('ID del ristorante mancante.');
    }

    // 3. Troviamo il Ristorante per recuperare l'ID del suo Menù
    const restaurant = await Restaurant.findById(restaurantId).session(session);
    if (!restaurant) {
      throw new Error('Ristorante non trovato.');
    }

    // (Opzionale) Qui potresti aggiungere un controllo se il req.user.id è davvero il proprietario del ristorante

    // 4. Creiamo il Piatto
    const newDish = new Dish({
      ...req.body,           // name, price, ingredients, description...
      restaurantId: restaurant._id,
      source: 'restaurant'   // Importante per distinguerlo da quelli del catalogo
    });

    // Salviamo il piatto nella collezione 'dishes'
    await newDish.save({ session });

    // 5. AGGIORNAMENTO FONDAMENTALE DEL MENU
    // Aggiungiamo l'ID del nuovo piatto all'array dishIds del Menù collegato
    await Menu.findByIdAndUpdate(
      restaurant.menuId,
      { $push: { dishIds: newDish._id } },
      { session }
    );

    // Confermiamo la transazione
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: 'Piatto aggiunto al menù con successo', data: newDish });

  } catch (err) {
    // Se qualcosa va storto, annulliamo tutto
    await session.abortTransaction();
    session.endSession();

    // Gestione status code
    const statusCode = err.message.includes('Accesso negato') ? 403 : 400;
    res.status(statusCode).json({ success: false, message: err.message });
  }
});

router.post('/import', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.user.role !== 'RESTAURATEUR') throw new Error('Accesso negato');

    const { catalogDishId, price, restaurantId } = req.body;
    console.log("DEBUG IMPORT - Ricevuto restaurantId:", restaurantId);

    if (!restaurantId) {
      throw new Error("Il campo restaurantId è obbligatorio per l'importazione.");
    }

    // 1. Verifica che il ristorante appartenga al ristoratore loggato
    const restaurateur = await Restaurateur.findOne({ userId: req.user.id });
    if (!restaurateur || !restaurateur.restaurantIds.map(String).includes(restaurantId)) {
      throw new Error('Non sei autorizzato a gestire questo ristorante');
    }

    // 2. Trova il piatto originale nel catalogo
    const originalDish = await Dish.findById(catalogDishId).session(session);
    if (!originalDish) throw new Error('Piatto catalogo non trovato');

    // 3. Trova il Ristorante per avere il menuId
    const restaurant = await Restaurant.findById(restaurantId).session(session);

    // 4. Crea la COPIA LOCALE del piatto
    const newDish = new Dish({
      name: originalDish.name,
      category: originalDish.category,
      image: originalDish.image,
      description: originalDish.description,
      ingredients: originalDish.ingredients,
      measures: originalDish.measures,
      externalId: originalDish.externalId,
      price: Number(price), // Prezzo deciso dal ristoratore
      restaurantId: restaurantId,
      source: 'restaurant' // Questo lo rende modificabile/eliminabile
    });

    await newDish.save({ session });

    // 5. Aggiunge al Menù
    await Menu.findByIdAndUpdate(
      restaurant.menuId,
      { $push: { dishIds: newDish._id } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: newDish, message: 'Piatto importato con successo' });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/lv/dishes/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const dishId = req.params.id;
    const dish = await Dish.findById(dishId);

    if (!dish) return res.status(404).json({ success: false, message: 'Piatto non trovato' });

    // 1. Controllo Proprietà: Usiamo userId dal tuo token
    const restaurateur = await Restaurateur.findOne({ userId: req.user.id });

    // Verifichiamo se il restaurantId del piatto è presente tra quelli del ristoratore
    const isOwner = restaurateur && restaurateur.restaurantIds.some(id => id.toString() === dish.restaurantId?.toString());

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Non sei autorizzato a modificare questo piatto.' });
    }

    // 2. Protezione Catalogo: Non si modificano i piatti originali
    if (dish.source === 'catalog') {
      return res.status(403).json({ success: false, message: 'I piatti del catalogo non possono essere modificati direttamente.' });
    }

    // 3. Aggiornamento
    const updatedDish = await Dish.findByIdAndUpdate(dishId, req.body, { new: true });
    res.json({ success: true, message: 'Piatto aggiornato', data: updatedDish });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/lv/dishes/:id
/*router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ success: false, message: 'Piatto non trovato' });

    // 1. Controllo Proprietà 
    const restaurateur = await Restaurateur.findOne({ userId: req.user.userId });
    const isOwner = restaurateur && restaurateur.restaurantIds.some(id => id.toString() === dish.restaurantId?.toString());

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Non sei autorizzato a eliminare questo piatto.' });
    }

    if (dish.source === 'catalog') {
        return res.status(403).json({ success: false, message: 'Impossibile eliminare piatti dal catalogo globale.' });
    }

    // 2. Eliminazione fisica
    await Dish.findByIdAndDelete(req.params.id);

    // 3. Pulizia riferimento nel Menù
    const restaurant = await Restaurant.findById(dish.restaurantId);
    if (restaurant && restaurant.menuId) {
        await Menu.findByIdAndUpdate(restaurant.menuId, {
            $pull: { dishIds: dish._id }
        });
    }

    res.json({ success: true, message: 'Piatto eliminato con successo' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});*/
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    console.log("DEBUG DELETE - ID Utente dal token:", req.user.id);

    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ success: false, message: 'Piatto non trovato' });

    const restaurateur = await Restaurateur.findOne({ userId: req.user.id});

    if (!restaurateur) {
      console.log("DEBUG DELETE - Ristoratore non trovato per userId:", req.user.id);
      return res.status(403).json({ success: false, message: 'Profilo ristoratore non trovato' });
    }

    console.log("DEBUG DELETE - I tuoi ristoranti:", restaurateur.restaurantIds);
    console.log("DEBUG DELETE - Ristorante del piatto:", dish.restaurantId);

    const isOwner = restaurateur.restaurantIds.some(id => id.toString() === dish.restaurantId?.toString());

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Non sei il proprietario' });
    }

    await Dish.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Eliminato' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

