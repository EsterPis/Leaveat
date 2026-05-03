const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth'); 

const Customer = require('../models/Customer');

// PUT /api/lv/customers
/* #swagger.tags = ['Customers']
   #swagger.summary = 'Aggiornamento profilo cliente'
   #swagger.description = 'Aggiorna le informazioni del profilo cliente associato all’utente autenticato.'

   #swagger.security = [{
      "bearerAuth": []
   }]

   #swagger.parameters['body'] = {
     in: 'body',
     description: 'Dati del profilo cliente (campi opzionali)',
     required: true,
     schema: {
       preferences: ['Pizza', 'Sushi'],
       paymentMethod: 'Credit Card'
     }
   }

   #swagger.responses[200] = {
     description: 'Profilo aggiornato con successo'
   }

   #swagger.responses[401] = {
     description: 'Non autenticato'
   }

   #swagger.responses[404] = {
     description: 'Profilo cliente non trovato'
   }

   #swagger.responses[500] = {
     description: 'Errore server'
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
