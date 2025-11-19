const express = require('express');
const router = express.Router();
const { completeRegistration } = require('../utils/restaurateurService');
const { authMiddleware, requireRole } = require('../middleware/auth');

// POST /api/lv/restaurateurs/complete-registration
// Completa il profilo del ristoratore creando:
// - dati fiscali del Restaurateur
// - un ristorante collegato
// - il relativo menù (nuovo o importato)
router.post(
  '/restaurateurs/complete-registration',
  authMiddleware,
  requireRole('RESTAURATEUR'),
  async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId; // dipende da come hai popolato req.user nel middleware
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

module.exports = router;