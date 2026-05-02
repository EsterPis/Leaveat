const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth'); 

const Customer = require('../models/Customer');

// PUT /api/lv/customers
/* #swagger.tags = ['Customers']
   #swagger.description = 'Aggiorna il profilo cliente collegato all'utente'
   #swagger.parameters['body'] = {
     in: 'body',
     description: 'Dati del profilo cliente',
     required: true,
     schema: {
       type: 'object',
       properties: {
         preferences: {
           type: 'array',
           items: {
             type: 'string'
           }
         },
         paymentMethod: {
           type: 'string'
         }
       }
     }
   }
*/
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { preferences, paymentMethod } = req.body;

    const customer = await Customer.findOne({ userId: req.user.id });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Profilo cliente non trovato'
      });
    }

    customer.preferences = preferences;
    customer.paymentMethod = paymentMethod;
    await customer.save();

    return res.json({
      success: true,
      data: customer
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Errore aggiornamento profilo',
      error: err.message
    });
  }
});

module.exports = router;
