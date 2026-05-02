const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Order = require('../models/Order');
const Dish = require('../models/Dish');
const Restaurant = require('../models/Restaurant');
const Restaurateur = require('../models/Restaurateur');

const { authMiddleware, requireRole } = require('../middleware/auth');


/* A → UTILITY FUNCTIONS */

// Verifies that the authenticated restaurateur owns the restaurant
async function verifyRestaurantOwnership(userId, restaurantId) {
  const restaurateur = await Restaurateur.findOne({ userId });
  if (!restaurateur) return false;

  const restaurant = await Restaurant.findOne({
    _id: restaurantId,
    restaurateurId: restaurateur._id
  });

  return !!restaurant;
}


/* B → CUSTOMER ORDER CREATION */
// POST /api/lv/orders
/* #swagger.tags = ['Orders']
   #swagger.summary = 'Create order from cart'
   #swagger.description = 'Creates a new order for the authenticated customer.'

   #swagger.security = [{
        "bearerAuth": []
   }]

   #swagger.parameters['body'] = {
        in: 'body',
        description: 'Dati ordine',
        required: true,
        schema: {
            restaurantId: 'restaurant_id',
            items: [
                {
                    dishId: 'dish_id',
                    quantity: 2
                }
            ]
        }
   }

   #swagger.responses[201] = {
        description: 'Ordine creato con successo',
        schema: {
            success: true,
            data: {
                _id: 'order_id',
                customerId: 'user_id',
                restaurantId: 'restaurant_id',
                items: [
                    {
                        dishId: 'dish_id',
                        quantity: 2
                    }
                ],
                totalPrice: 25.50,
                status: 'ORDINATO'
            }
        }
   }

   #swagger.responses[400] = {
        description: 'Invalid input data (empty cart, invalid quantity, invalid dish)'
   }

   #swagger.responses[401] = {
        description: 'Authentication required'
   }

   #swagger.responses[403] = {
        description: 'Unauthorized access (only CUSTOMER)'
   }

   #swagger.responses[404] = {
        description: 'Restaurant or dish not found'
   }

   #swagger.responses[500] = {
        description: 'Internal server error'
   }
*/
router.post('/', authMiddleware, requireRole('CUSTOMER'), async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    /* 1. VALIDAZIONE INPUT E PREPARAZIONE DATI */
    const customerId = req.user.id;
    const { restaurantId, items } = req.body;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId is required'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    //Se il ristorante non trova ricontro nel db blocca l'ordine
    const restaurant = await Restaurant.findById(restaurantId).session(session);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    //inizio creazione ordine
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      //verifico che ogni item abbia un dishId valido e che il piatto appartenga al ristorante selezionato
      if (!item.dishId) {
        return res.status(400).json({
          success: false,
          message: 'dishId is required'
        });
      }

      const dish = await Dish.findById(item.dishId).session(session);
      if (!dish) {
        return res.status(404).json({
          success: false,
          message: `Dish ${item.dishId} not found`
        });
      }

      if (dish.restaurantId?.toString() !== restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Dish does not belong to selected restaurant'
        });
      }

      const quantity = item.quantity || 1; //assegno quantità, default 1 se non specificata

      //controllo sulla quantità
      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid quantity'
        });
      }

      totalPrice += dish.price * quantity; //calcolo del prezzo totale

      //preparazione dell'array da salvare nell'ordine
      orderItems.push({
        dishId: dish._id,
        quantity
      });
    }

    /* 2. CREAZIONE ORDINE */
    const newOrder = new Order({
      customerId,
      restaurantId,
      items: orderItems,
      totalPrice,
      status: 'ORDINATO'
    });

    await newOrder.save({ session });
    await session.commitTransaction(); //Scrittura effettiva dell'ordine sul db
    session.endSession();

    return res.status(201).json({
      success: true,
      data: newOrder,
      message: 'Order created successfully'
    });

  } catch (err) {

    await session.abortTransaction();
    session.endSession();

    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/* C → RESTAURATEUR ORDER MANAGEMENT */

// GET /api/lv/orders/restaurant/:restaurantId
/* #swagger.tags = ['Orders']
   #swagger.summary = 'Get orders for restaurant'
   #swagger.description = 'Gets all orders associated with a restaurant, accessible only to the owner.'

   #swagger.security = [{
        "bearerAuth": []
   }]

   #swagger.parameters['restaurantId'] = {
        in: 'path',
        description: 'ID del ristorante',
        required: true,
        type: 'string'
   }

   #swagger.responses[200] = {
        description: 'Lista ordini',
        schema: {
            success: true,
            data: []
        }
   }

   #swagger.responses[401] = {
        description: 'Authentication required'
   }

   #swagger.responses[403] = {
        description: 'Unauthorized restaurant access'
   }

   #swagger.responses[500] = {
        description: 'Server error'
   }
*/
router.get('/restaurant/:restaurantId', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const ownsRestaurant = await verifyRestaurantOwnership(req.user.id, restaurantId);
    if (!ownsRestaurant) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized restaurant access'
      });
    }

    const orders = await Order.find({ restaurantId })
      .sort({ createdAt: -1 })
      .populate('items.dishId', 'name price')
      .populate('customerId', 'firstName lastName email');

    res.json({
      success: true,
      data: orders
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// PATCH /api/lv/orders/:id/status
/* #swagger.tags = ['Orders']
   #swagger.summary = 'Update order status'
   #swagger.description = 'Allows restaurateur to update the status of an order.'

   #swagger.security = [{
        "bearerAuth": []
   }]

   #swagger.parameters['id'] = {
        in: 'path',
        required: true,
        type: 'string',
        description: 'ID ordine'
   }

   #swagger.parameters['body'] = {
        in: 'body',
        required: true,
        schema: {
            status: 'IN_PREPARAZIONE'
        }
   }

   #swagger.responses[200] = {
        description: 'Order status updated'
   }

   #swagger.responses[400] = {
        description: 'Invalid transition or status'
   }

   #swagger.responses[401] = {
        description: 'Authentication required'
   }

   #swagger.responses[403] = {
        description: 'Unauthorized order update'
   }

   #swagger.responses[404] = {
        description: 'Order not found'
   }

   #swagger.responses[500] = {
        description: 'Server error'
   }
*/
router.patch('/:id/status', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      'ORDINATO',
      'IN_PREPARAZIONE',
      'CONSEGNATO',
      'ANNULLATO'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const transitions = {
      ORDINATO: ['IN_PREPARAZIONE', 'ANNULLATO'],
      IN_PREPARAZIONE: ['CONSEGNATO'],
      CONSEGNATO: [],
      ANNULLATO: []
    };

    if (!transitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition from ${order.status} to ${status}`
      });
    }

    const ownsRestaurant = await verifyRestaurantOwnership(req.user.id, order.restaurantId);
    if (!ownsRestaurant) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized order update'
      });
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      data: order,
      message: `Status updated to ${status}`
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


/* D → CUSTOMER ORDER HISTORY */

// GET /api/lv/orders/my-orders
/* #swagger.tags = ['Orders']
   #swagger.summary = 'Customer order history'
   #swagger.description = 'Shows the authenticated customer their order history with details and estimated wait times.'

    #swagger.security = [{
        "bearerAuth": []
    }]

   #swagger.responses[200] = {
        description: 'Lista ordini del cliente',
        schema: {
            success: true,
            data: [
                {
                    _id: 'order_id',
                    restaurantId: {
                        _id: 'restaurant_id',
                        displayName: 'Nome Ristorante',
                        address: 'Indirizzo',
                        imageUrl: 'url_immagine'
                    },
                    items: [
                        {
                            dishId: {
                                _id: 'dish_id',
                                name: 'Nome Piatto',
                                price: 12.50,
                                image: 'url_immagine',
                                prepTime: 15
                            },
                            quantity: 2
                        }
                    ],
                    totalPrice: 25.50,
                    status: 'ORDINATO',
                    estimatedWaitTime: 30
                }
            ]
        }
    }
    #swagger.responses[401] = {
        description: 'Authentication required'
    }
    #swagger.responses[403] = {
        description: 'Unauthorized order access'
    } 
    #swagger.responses[500] = {
        description: 'Server error'
    }
*/
router.get('/my-orders', authMiddleware, requireRole('CUSTOMER'), async (req, res) => {
  try {

    const customerId = req.user.id;

    const orders = await Order.find({ customerId })
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'displayName address imageUrl')
      .populate({
        path: 'items.dishId',
        select: 'name price image prepTime'
      });

    // ordine → calcolo tempo di attesa → restituzione ordine aggiornato
    const ordersWithPrepTime = await Promise.all(orders.map(async (order) => {
      const pendingOrders = await Order.find({
        restaurantId: order.restaurantId._id,
        status: { $in: ['ORDINATO', 'IN_PREPARAZIONE'] },
        createdAt: { $lte: order.createdAt } //escludo gli ordini creati dopo il corrente
      }).populate({
        path: 'items.dishId',
        select: 'prepTime'
      });

      let totalPrepTime = 0;

      pendingOrders.forEach(o => {
        o.items.forEach(item => {
          const prep = item.dishId?.prepTime || 0;
          totalPrepTime += prep * item.quantity;
        });
      });

      const orderObj = order.toObject();
      orderObj.estimatedWaitTime = totalPrepTime;

      return orderObj;
    }));

    res.json({
      success: true,
      data: ordersWithPrepTime
    });



  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/lv/orders/:id/cancel
/* #swagger.tags = ['Orders']
   #swagger.summary = 'Cancel order'
   #swagger.description = 'Allows a customer to cancel their order if it has not yet been prepared.'

  #swagger.security = [{
      "bearerAuth": []
  }]  
  #swagger.parameters['id'] = {
      in: 'path',
      required: true,
      type: 'string',
      description: 'ID ordine da cancellare'
  }   
  #swagger.responses[200] = {
      description: 'Order cancelled successfully'
  }
  #swagger.responses[400] = {
      description: 'Order cannot be cancelled at this stage'
  }
  #swagger.responses[401] = {
      description: 'Authentication required'
  }
  #swagger.responses[403] = {
      description: 'Unauthorized order access'
  }
  #swagger.responses[404] = {
      description: 'Order not found'
  }
  #swagger.responses[500] = {
      description: 'Server error'
  }
*/
router.patch('/:id/cancel', authMiddleware, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.customerId.toString() !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized order access'
      });
    }

    // Only allow cancel if still ORDINATO
    if (order.status !== 'ORDINATO') {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    order.status = 'ANNULLATO';
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;