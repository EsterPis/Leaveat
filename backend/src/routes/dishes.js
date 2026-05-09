const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Dish = require('../models/Dish');
const Restaurateur = require('../models/Restaurateur');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');
const { authMiddleware, requireRole } = require('../middleware/auth');


/* A → UTILITY FUNCTIONS */

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
/* #swagger.tags = ['Dishes']
   #swagger.summary = 'Catalogo piatti'
   #swagger.description = 'Restituisce i piatti filtrabili tramite query parameters.'

   #swagger.parameters['name'] = { in: 'query', type: 'string' }
   #swagger.parameters['category'] = { in: 'query', type: 'string' }
   #swagger.parameters['maxPrice'] = { in: 'query', type: 'number' }
   #swagger.parameters['ingredient'] = { in: 'query', type: 'string' }
   #swagger.parameters['dishIds'] = { in: 'query', type: 'string' }
   #swagger.parameters['source'] = { in: 'query', type: 'string' }

   #swagger.responses[200] = {
        description: 'Lista piatti',
        schema: {
            success: true,
            data: []
        }
   }

   #swagger.responses[500] = {
        description: 'Errore server'
   }
*/
router.get('/', async (req, res) => {
  try {
    const { name, category, maxPrice, ingredient, dishIds, source } = req.query;

    let filter = {};

    if (source === 'catalog') {
      filter.source = 'catalog';
    }

    // filtro per ID piatti del menu
    if (dishIds) {
      const idsArray = dishIds.split(',').map(id => new mongoose.Types.ObjectId(id));
      filter._id = { $in: idsArray };
    }

    // Nome
    if (name) {
      filter.name = { $regex: name, $options: 'i' }; //case insensitive
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
/* #swagger.tags = ['Dishes']
   #swagger.summary = 'Creazione piatto'
   #swagger.description = 'Permette al ristoratore di creare un nuovo piatto e aggiungerlo al menu del ristorante.'

   #swagger.security = [{
      "bearerAuth": []
   }]

   #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
         restaurantId: 'restaurant_id',
         name: 'Pizza Margherita',
         price: 10,
         category: 'Pizza'
      }
   }

   #swagger.responses[201] = {
      description: 'Piatto creato'
   }

   #swagger.responses[400] = {
      description: 'Errore richiesta'
   }

   #swagger.responses[401] = {
      description: 'Non autenticato'
   }

   #swagger.responses[403] = {
      description: 'Accesso negato'
   }

   #swagger.responses[500] = {
      description: 'Errore server'
   }
*/
router.post('/', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /*if (req.user.role !== 'RESTAURATEUR') {
      throw new Error('Access denied');
    }*/

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
      ...req.body, //spread operator
      restaurantId,
      source: 'restaurant'
    });

    await newDish.save({ session });

    await Menu.findByIdAndUpdate(
      restaurant.menuId,
      { $push: { dishIds: newDish._id } },
      { session }
    );


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
/* #swagger.tags = ['Dishes']
   #swagger.summary = 'Importa piatto dal catalogo'
   #swagger.description = 'Duplica un piatto del catalogo globale e lo associa al menu del ristorante.'

   #swagger.security = [{
      "bearerAuth": []
   }]

   #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
         catalogDishId: 'dish_id',
         restaurantId: 'restaurant_id',
         price: 12,
         prepTime: 15
      }
   }

   #swagger.responses[201] = {
      description: 'Piatto importato con successo'
   }

   #swagger.responses[400] = {
      description: 'Errore richiesta'
   }

   #swagger.responses[401] = {
      description: 'Non autenticato'
   }

   #swagger.responses[403] = {
      description: 'Accesso negato'
   }

   #swagger.responses[404] = {
      description: 'Piatto catalogo non trovato'
   }

   #swagger.responses[500] = {
      description: 'Errore server'
   }
*/
router.post('/import', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /* if (req.user.role !== 'RESTAURATEUR') {
       throw new Error('Access denied');
     }*/

    const { catalogDishId, price, restaurantId, prepTime } = req.body;

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
      prepTime: prepTime || 15,
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

router.get('/:id', async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Piatto non trovato'
      });
    }

    res.json({
      success: true,
      data: dish
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del piatto'
    });
  }
});


// PUT /api/lv/dishes/:id
/* #swagger.tags = ['Dishes']
   #swagger.summary = 'Aggiorna piatto'

   #swagger.security = [{
      "bearerAuth": []
   }]

   #swagger.parameters['id'] = {
      in: 'path',
      required: true,
      type: 'string',
      description: 'ID del piatto'
   }

   #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
         name: 'Pizza',
         price: 10,
         category: 'Pizza'
      }
   }

   #swagger.responses[200] = {
      description: 'Piatto aggiornato'
   }

   #swagger.responses[400] = {
      description: 'Dati non validi'
   }

   #swagger.responses[401] = {
      description: 'Non autenticato'
   }

   #swagger.responses[403] = {
      description: 'Accesso negato'
   }

   #swagger.responses[404] = {
      description: 'Piatto non trovato'
   }

   #swagger.responses[500] = {
      description: 'Errore server'
   }
*/
router.put('/:id', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
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
/* #swagger.tags = ['Dishes']
   #swagger.summary = 'Elimina piatto'

   #swagger.security = [{
      "bearerAuth": []
   }]

   #swagger.parameters['id'] = {
      in: 'path',
      required: true,
      type: 'string',
      description: 'ID del piatto'
   }

   #swagger.responses[200] = {
      description: 'Piatto eliminato'
   }

   #swagger.responses[400] = {
      description: 'Dati non validi'
   }

   #swagger.responses[401] = {
      description: 'Non autenticato'
   }

   #swagger.responses[403] = {
      description: 'Accesso negato'
   }

   #swagger.responses[404] = {
      description: 'Piatto non trovato'
   }

   #swagger.responses[500] = {
      description: 'Errore server'
   }
*/
router.delete('/:id', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
  let session;
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ success: false, message: 'Dish not found' });
    }

    // non è possibile eliminare un piatto del catalogo 
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
    
    session = await mongoose.startSession();
    session.startTransaction();

    await Dish.findByIdAndDelete(req.params.id).session(session);

    //Rimuovo il piatto dal menu del ristorante
    const restaurant = await Restaurant.findById(dish.restaurantId).session(session);
    if (restaurant?.menuId) {
      await Menu.findByIdAndUpdate(
        restaurant.menuId,
        { $pull: { dishIds: dish._id } }
      ).session(session);
    }

    const updatedMenu = await Menu.findById(restaurant.menuId);
    if (!updatedMenu || updatedMenu.dishIds.length === 0) {
      await Restaurant.findByIdAndUpdate(
        dish.restaurantId,
        { status: 'DRAFT' }
      ).session(session);
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Dish deleted successfully'
    });

  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;