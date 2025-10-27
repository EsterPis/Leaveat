const express = require('express');
const Dish = require('../models/Dish');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth'); //importa il middleware di autenticazione

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

// GET /api/lv/dishes/:id
router.get('/:id', async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ success: false, message: 'Piatto non trovato' });
    res.json({ success: true, data: dish });
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

    const dishes = await Dish.find(query).sort({ name: 1 }).limit(100); //limite di 100 piatti per evitare risposte troppo grandi, ordinamento alfabetico
    res.json({ success: true, count: dishes.length, data: dishes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// POST /api/lv/dishes
// Solo ristoratore: aggiunge un piatto al proprio menù
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'RESTAURATEUR') {
      return res.status(403).json({ success: false, message: 'Accesso negato' });
    }

    const newDish = new Dish({
      ...req.body,
      restaurantId: req.user.restaurantId,
      source: 'restaurant'
    });

    await newDish.save();
    res.status(201).json({ success: true, message: 'Piatto aggiunto', data: newDish });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/lv/dishes/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ success: false, message: 'Piatto non trovato' });

    if (String(dish.restaurantId) !== req.user.restaurantId) {
      return res.status(403).json({ success: false, message: 'Non puoi modificare questo piatto' });
    }

    Object.assign(dish, req.body);
    await dish.save();

    res.json({ success: true, message: 'Piatto aggiornato', data: dish });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/lv/dishes/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ success: false, message: 'Piatto non trovato' });

    if (String(dish.restaurantId) !== req.user.restaurantId) {
      return res.status(403).json({ success: false, message: 'Non puoi eliminare questo piatto' });
    }

    await dish.deleteOne();
    res.json({ success: true, message: 'Piatto eliminato' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

