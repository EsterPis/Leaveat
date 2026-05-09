/**
 * RESTAURATEURS ROUTES
 * 
 * POST /complete-registration → Completa il profilo del ristoratore (dati fiscali, ecc.)
 * PUT /me → Aggiorna i dati del ristoratore (es. partita IVA, IBAN)
 */

const express = require('express');
const router = express.Router();
const { completeRegistration } = require('../utils/restaurateurService'); //logica di completamento registrazione
const { authMiddleware, requireRole } = require('../middleware/auth');
const Restaurateur = require('../models/Restaurateur');

router.post('/complete-registration', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
    try {
      const userId = req.user.id; 
      const data = req.body;

      const result = await completeRegistration(userId, data);

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Profilo ristoratore completato con successo.',
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Errore durante il completamento del profilo ristoratore.',
      });
    }
  }
);

router.put('/me', authMiddleware, requireRole('RESTAURATEUR'), async (req, res) => {
  try {
    const { VATNumber, IBAN } = req.body;

    const restaurateur = await Restaurateur.findOne({ userId: req.user.id });

    if (!restaurateur) {
      return res.status(404).json({
        success: false,
        message: "Ristoratore non trovato"
      });
    }

    // aggiorno solo i campi passati
    if (VATNumber) restaurateur.VATNumber = VATNumber;
    if (IBAN) restaurateur.IBAN = IBAN;

    await restaurateur.save();

    res.json({
      success: true,
      message: "Dati fiscali aggiornati",
      data: restaurateur
    });

  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Partita IVA già esistente"
      });
    }
    res.status(500).json({
      success: false,
      message: "Errore server"
    });
  }
});

module.exports = router;