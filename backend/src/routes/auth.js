const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
//middleware
const { authMiddleware } = require('../middleware/auth');
//models
const User = require('../models/User');
const Customer = require('../models/Customer');
const Restaurateur = require('../models/Restaurateur');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');

function signToken(user) {
    const payload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName
    };
    const secret = process.env.JWT_SECRET || 'devsecret';
    return jwt.sign(payload, secret, { expiresIn: '24h' });
}

router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, password, role } = req.body;
        if (!email || !password || !firstName || !lastName || !phoneNumber) return res.status(400).json({ success: false, message: 'Compilare tutti i campi' });

        let exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ success: false, message: 'Email già registrata' });
        exists = await User.findOne({ phoneNumber });
        if (exists) return res.status(409).json({ success: false, message: 'Numero di telefono già registrato' });

        const user = await User.create({ firstName, lastName, email, phoneNumber, password, role: role || 'CUSTOMER' });

        if (user.role === 'CUSTOMER') {
            await Customer.create({ userId: user._id });
        } else if (user.role === 'RESTAURATEUR') {
            await Restaurateur.create({
                userId: user._id,
                VATNumber: "DA_COMPLETARE_" + user._id, // Placeholder temporaneo
                legalRepresentativeName: user.firstName + " " + user.lastName,
                adminEmail: user.email,
                bankAccountHolder: user.firstName + " " + user.lastName,
                IBAN: "DA_COMPLETARE"
            });
        }

        const token = signToken(user);
        return res.status(201).json({ success: true, data: { token, userId: user._id, role: user.role } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Errore server', error: err.message });
    }
});

router.post('/login', async (req, res) => {
    // ... (Il tuo codice login esistente va bene qui) ...
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Utente non trovato' });

        const ok = await user.comparePassword(password);
        if (!ok) return res.status(401).json({ success: false, message: 'Password errata' });

        const token = signToken(user);
        return res.json({ success: true, data: { token } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Errore server', error: err.message });
    }
});


router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'Utente non trovato' });

        let profile = null;

        // Recupera dati specifici in base al ruolo
        if (user.role === 'CUSTOMER') {
            profile = await Customer.findOne({ userId: user._id });
        } else if (user.role === 'RESTAURATEUR') {
            profile = await Restaurateur.findOne({ userId: user._id });
        }

        // Restituisce un oggetto unico con tutto
        res.json({
            success: true,
            user: user,
            profile: profile
        });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Errore server', error: err.message });
    }
});

// 2. PUT /me - Aggiorna dati anagrafici (User)
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const updates = req.body; // { firstName, lastName, phoneNumber ... }

        // Evitiamo che l'utente cambi ruolo o email da qui per sicurezza semplificata
        delete updates.role;
        delete updates.email;
        delete updates.password; // La password richiederebbe gestione a parte con hash

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Errore aggiornamento', error: err.message });
    }
});

// DELETE /api/lv/users/me
// Deletes user account and all related data
router.delete('/me', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const user = await User.findById(userId).session(session);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Customer cascade
    if (user.role === 'CUSTOMER') {

      // Elimina profilo cliente
      await Customer.findOneAndDelete({ userId }).session(session);

      // Elimina ordini del cliente
      await Order.deleteMany({ customerId: userId }).session(session);
    }

    // Restaurateur cascade
    if (user.role === 'RESTAURATEUR') {

      const restaurateur = await Restaurateur.findOne({ userId }).session(session);

      if (restaurateur) {

        // Trova risporanti
        const restaurants = await Restaurant.find({
          restaurateurId: restaurateur._id
        }).session(session);
        const restaurantIds = restaurants.map(r => r._id);
        // Elimina menù
        await Menu.deleteMany({
          restaurantId: { $in: restaurantIds }
        }).session(session);
        // Elimina piatti
        await Dish.deleteMany({
          restaurantId: { $in: restaurantIds }
        }).session(session);
        // Elimina ristoranti
        await Restaurant.deleteMany({
          restaurateurId: restaurateur._id
        }).session(session);
        // Elimina profilo
        await Restaurateur.findByIdAndDelete(restaurateur._id).session(session);
      }
    }

    await User.findByIdAndDelete(userId).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Error during account deletion'
    });
  }
});

module.exports = router;