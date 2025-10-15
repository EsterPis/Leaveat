const express = require('express');
const Dish = require('../models/Dish');
const router = express.Router();

// GET /api/dishes?name=&category=&maxPrice=
router.get('/', async (req, res) => {
  try {
    const { name, category, maxPrice } = req.query;
    const q = {};
    if (name) q.name = { $regex: name, $options: 'i' };
    if (category) q.category = { $regex: category, $options: 'i' };
    if (maxPrice) q.price = { $lte: Number(maxPrice) || 0 };
    const dishes = await Dish.find(q).limit(50);
    res.json({ success: true, data: dishes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Errore server', error: err.message });
  }
});

module.exports = router;
