const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth'); 

const Customer = require('../models/Customer');

// PUT /api/lv/customers
// Crea il profilo cliente collegato all'utente
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
