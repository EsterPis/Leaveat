/**
 * restaurateurs.js
 * Handles RESTAURATEUR profile completion.
 * 
 * This route allows an authenticated user with role "RESTAURATEUR"
 * to complete their registration by:
 *  - Creating the Restaurateur profile with fiscal information
 *  - Creating an associated Restaurant
 *  - Creating or importing a related Menu
 *
 * Business logic is delegated to the restaurateurService layer.
 */

const express = require('express');
const router = express.Router();
const { completeRegistration } = require('../utils/restaurateurService'); //logica di completamento registrazione
const { authMiddleware, requireRole } = require('../middleware/auth');

router.post(
  '/complete-registration',
  authMiddleware,
  requireRole('RESTAURATEUR'),
  async (req, res) => {
    try {
      const userId = req.user.id; // dipende da come hai popolato req.user nel middleware
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