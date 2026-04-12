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
// Creates a new order from customer cart
router.post('/', authMiddleware, requireRole('CUSTOMER'), async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const customerId = req.user.id;
    const { restaurantId, items } = req.body;

    /* ---------------- VALIDAZIONI BASE ---------------- */

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

    const restaurant = await Restaurant.findById(restaurantId).session(session);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    let totalPrice = 0;
    const orderItems = [];

    /* ---------------- CONTROLLO PIATTI ---------------- */

    for (const item of items) {

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

      // Ensure dish belongs to selected restaurant
      if (dish.restaurantId?.toString() !== restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Dish does not belong to selected restaurant'
        });
      }

      const quantity = item.quantity || 1;

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid quantity'
        });
      }

      totalPrice += dish.price * quantity;

      orderItems.push({
        dishId: dish._id,
        quantity
      });
    }

    /* ---------------- CREAZIONE ORDINE ---------------- */

    const newOrder = new Order({
      customerId,
      restaurantId,
      items: orderItems,
      totalPrice,
      status: 'ORDINATO'
    });

    await newOrder.save({ session });

    await session.commitTransaction();
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
// Returns orders for a specific restaurant (dashboard)
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
// Updates order status (restaurateur only)
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
// Returns logged customer order history
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
// Allows customer to cancel an order only if status is ORDINATO
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

    // Ensure order belongs to logged customer
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