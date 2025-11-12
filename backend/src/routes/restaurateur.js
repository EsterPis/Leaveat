const express = require('express');
const router = express.Router();
const { completeRegistration } = require('../utils/restaurateurService');
const { requireAuth, requireRole } = require('../middleware/auth');

// endpoint principale
router.post('/restaurateurs/complete-registration',
  requireAuth,
  requireRole('RESTAURATEUR'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const data = req.body;
      const result = await completeRegistration(userId, data);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
