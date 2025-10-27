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
 * body: { firstName, lastName, email, phoneNumber, password, role}
 */
router.post('/register', async (req, res) => {
  try {
    //estrazione dei campi dal body
    const { firstName, lastName, email, phoneNumber, password, role } = req.body;

    //controllo sui campi - verifica che non esistano già email o numero di telefono
    if (!email || !password || !firstName || !lastName || !phoneNumber ) return res.status(400).json({ success: false, message: 'Compilare tutti i campi' });
    let exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email già registrata' });
    exists = await User.findOne({ phoneNumber });
    if (exists) return res.status(409).json({ success: false, message: 'Numero di telefono già registrato' });

    //creazione utente
    const user = await User.create({ firstName, lastName, email, phoneNumber, password, role: role || 'CUSTOMER' });
    const token = signToken(user); //generazione token JWT
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

    //cerca utente per email
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Utente non trovato' });

    //verifica password
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Password errata' });

    const token = signToken(user); //generazione token JWT
    return res.json({ success: true, data: { token } });
    
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Errore server', error: err.message });
  }
});

module.exports = router;
