const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth'); 
const Customer = require('../models/Customer');

// POST /api/lv/customers
// Crea il profilo cliente collegato all'utente
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, preferences, paymentMethod } = req.body;

    if (!userId || !preferences)
      return res.status(400).json({ success: false, message: 'Dati incompleti' });

    // controlla se esiste già un profilo customer per quell'utente
    const exists = await Customer.findOne({ userId });
    if (exists)
      return res.status(409).json({ success: false, message: 'Profilo già esistente' });

    // crea nuovo documento
    const newCustomer = await Customer.create({
      userId,
      preferences,
      paymentMethod
    });

    return res.status(201).json({ success: true, data: newCustomer });
  } catch (err) {
    console.error('Errore creazione profilo Customer:', err);
    return res.status(500).json({ success: false, message: 'Errore server', error: err.message });
  }
});

module.exports = router;
