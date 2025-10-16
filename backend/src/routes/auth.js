const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

function signToken(user) {
  const payload = { userId: user._id.toString(), email: user.email, role: user.role };
  const options = { expiresIn: process.env.TOKEN_EXPIRES_IN || '24h' };
  const secret = process.env.JWT_SECRET || 'devsecret';
  return jwt.sign(payload, secret, options);
}

/**
 * POST /api/lv/users/register
 * body: { email, password, role }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email e password sono obbligatorie' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email già registrata' });
    const user = await User.create({ email, password, role: role || 'CUSTOMER' });
    const token = signToken(user);
    return res.status(201).json({ success: true, data: { token } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Errore server', error: err.message });
  }
});

/**
 * POST /api/lv/users/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Credenziali non valide' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Credenziali non valide' });
    const token = signToken(user);
    return res.json({ success: true, data: { token } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Errore server', error: err.message });
  }
});

module.exports = router;
