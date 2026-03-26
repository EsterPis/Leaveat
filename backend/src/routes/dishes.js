const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Dish = require('../models/Dish');
const Restaurateur = require('../models/Restaurateur');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');
const { authMiddleware } = require('../middleware/auth');


/* A → UTILITY FUNCTIONS */

// Verifies that the authenticated restaurateur owns the given restaurant
async function verifyOwnership(userId, restaurantId) {
  const restaurateur = await Restaurateur.findOne({ userId });
  if (!restaurateur) return false;

  const restaurant = await Restaurant.findOne({
    _id: restaurantId,
    restaurateurId: restaurateur._id
  });

  return !!restaurant;
}


/* B → PUBLIC CATALOG ROUTES */
router.get('/', async (req, res) => {
  try {
    const { name, category, maxPrice, ingredient, dishIds } = req.query;

    let filter = {};

    console.log("REQ QUERY:", req.query);
    console.log("DISH IDS RAW:", dishIds);

    // filtro per ID piatti del menu
    if (dishIds) {
      const idsArray = dishIds.split(',').map(id => new mongoose.Types.ObjectId(id));
      filter._id = { $in: idsArray };
    }

    // Nome
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    // Categoria
    if (category) {
      filter.category = category;
    }

    // Prezzo
    if (maxPrice) {
      filter.price = { $lte: Number(maxPrice) };
    }

    // Ingredienti
    if (ingredient) {
      filter.ingredients = { $regex: ingredient, $options: 'i' };
    }

    console.log("FILTER FINALE:", filter);

    const dishes = await Dish.find(filter);

    res.json({
      success: true,
      data: dishes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Errore nel recupero dei piatti"
    });
  }
});

/* C → RESTAURATEUR DISH MANAGEMENT */

// POST /api/lv/dishes
// Creates a new custom dish and adds it to the restaurant menu
router.post('/', authMiddleware, async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.user.role !== 'RESTAURATEUR') {
      throw new Error('Access denied');
    }

    const { restaurantId } = req.body;
    if (!restaurantId) {
      throw new Error('restaurantId is required');
    }

    const ownsRestaurant = await verifyOwnership(req.user.id, restaurantId);
    if (!ownsRestaurant) {
      throw new Error('Unauthorized restaurant access');
    }

    const restaurant = await Restaurant.findById(restaurantId).session(session);

    const newDish = new Dish({
      ...req.body,
      restaurantId,
      source: 'restaurant'
    });

    await newDish.save({ session });

    await Menu.findByIdAndUpdate(
      restaurant.menuId,
      { $push: { dishIds: newDish._id } },
      { session }
    );

    // Verifico se il menu ora contiene almeno un piatto
    const updatedMenu = await Menu.findById(restaurant.menuId).session(session);

    if (updatedMenu && updatedMenu.dishIds.length > 0) {
      await Restaurant.findByIdAndUpdate(
        restaurantId,
        { status: 'ACTIVE' },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Dish added successfully',
      data: newDish
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});


// POST /api/lv/dishes/import
// Imports a catalog dish into a specific restaurant
router.post('/import', authMiddleware, async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.user.role !== 'RESTAURATEUR') {
      throw new Error('Access denied');
    }

    const { catalogDishId, price, restaurantId } = req.body;

    if (!restaurantId) {
      throw new Error('restaurantId is required');
    }

    const ownsRestaurant = await verifyOwnership(req.user.id, restaurantId);
    if (!ownsRestaurant) {
      throw new Error('Unauthorized restaurant access');
    }

    const originalDish = await Dish.findById(catalogDishId).session(session);
    if (!originalDish) {
      throw new Error('Catalog dish not found');
    }

    const restaurant = await Restaurant.findById(restaurantId).session(session);

    const newDish = new Dish({
      name: originalDish.name,
      category: originalDish.category,
      image: originalDish.image,
      description: originalDish.description,
      ingredients: originalDish.ingredients,
      measures: originalDish.measures,
      externalId: originalDish.externalId,
      price: Number(price),
      restaurantId,
      source: 'restaurant'
    });

    await newDish.save({ session });

    await Menu.findByIdAndUpdate(
      restaurant.menuId,
      { $push: { dishIds: newDish._id } },
      { session }
    );

    // Verifico se il menu ora contiene almeno un piatto
    const updatedMenu = await Menu.findById(restaurant.menuId).session(session);

    if (updatedMenu && updatedMenu.dishIds.length > 0) {
      await Restaurant.findByIdAndUpdate(
        restaurantId,
        { status: 'ACTIVE' },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Dish imported successfully',
      data: newDish
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});


// PUT /api/lv/dishes/:id
// Updates a restaurant-owned dish
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ success: false, message: 'Dish not found' });
    }

    if (dish.source === 'catalog') {
      return res.status(403).json({
        success: false,
        message: 'Catalog dishes cannot be modified'
      });
    }

    const ownsRestaurant = await verifyOwnership(req.user.id, dish.restaurantId);
    if (!ownsRestaurant) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized dish modification'
      });
    }

    const updatedDish = await Dish.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Dish updated successfully',
      data: updatedDish
    });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});


// DELETE /api/lv/dishes/:id
// Deletes a restaurant-owned dish
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ success: false, message: 'Dish not found' });
    }

    if (dish.source === 'catalog') {
      return res.status(403).json({
        success: false,
        message: 'Catalog dishes cannot be deleted'
      });
    }

    const ownsRestaurant = await verifyOwnership(req.user.id, dish.restaurantId);
    if (!ownsRestaurant) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized dish deletion'
      });
    }

    await Dish.findByIdAndDelete(req.params.id);

    const restaurant = await Restaurant.findById(dish.restaurantId);
    if (restaurant?.menuId) {
      await Menu.findByIdAndUpdate(
        restaurant.menuId,
        { $pull: { dishIds: dish._id } }
      );
    }

    const updatedMenu = await Menu.findById(restaurant.menuId);

    if (!updatedMenu || updatedMenu.dishIds.length === 0) {
      await Restaurant.findByIdAndUpdate(
        dish.restaurantId,
        { status: 'DRAFT' }
      );
    }

    res.json({
      success: true,
      message: 'Dish deleted successfully'
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;