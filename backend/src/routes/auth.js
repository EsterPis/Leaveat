/**
 * Auth routes
 * POST /api/lv/users/register
 * POST /api/lv/users/login
 * GET /api/lv/users/me
 * PUT /api/lv/users/me
 * PUT /api/lv/users/me/email
 * PUT /api/lv/users/me/password
 * DELETE /api/lv/users/me
 */

/* A → IMPORT */
const express = require('express');
const mongoose = require('mongoose');
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
const Order = require('../models/Order');
const Dish = require('../models/Dish');

/* B → UTILITYFUNCTIONS */
//Crea token JWT
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

/* C → ROUTES */
//POST /api/lv/users/register
/*
    #swagger.tags = ['Auth']
    #swagger.summary = 'User registration'
    #swagger.description = 'Creates a new user account. Role can be CUSTOMER or RESTAURATEUR (default CUSTOMER).'

    #swagger.parameters['body'] = { 
        in: 'body',
        description: 'User registration data',
        required: true,
        schema: {
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario.rossi@example.com',
            phoneNumber: '1234567890',
            password: 'password123',
            role: 'CUSTOMER'
        }
    }
    #swagger.responses[201] = { 
        description: 'Registration successful',
        schema: {
            success: true,
            data: {
                token: 'jwt_token',
                userId: 'user_id',
                role: 'CUSTOMER'
            }
        }
            }
    }
    #swagger.responses[400] = { description: 'Invalid or incomplete data' }
    #swagger.responses[409] = { description: 'Email or phone number already registered' }
    #swagger.responses[500] = { description: 'Server error' }
*/
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

//POST /api/lv/users/login
/*
    #swagger.tags = ['Auth']
    #swagger.summary = 'User login'
    #swagger.description = 'Authenticate user and return JWT token.'

    #swagger.parameters['body'] = {
        in: 'body',
        description: 'User login data',
        required: true,
        schema: {
            email: 'mario.rossi@example.com',
            password: 'password123'
        }
    }

    #swagger.responses[200] = {
        description: 'Login successful',
        schema: {
            success: 'true',
            data: {
                token: 'jwt_token',
                userId: 'user_id',
                role: 'CUSTOMER'
            }
        }
    }
    #swagger.responses[401] = { description: 'Invalid credentials' }
    #swagger.responses[500] = { description: 'Server error' }
*/
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password'); //Nel modello dati la password è impostata come celect: false per motivi di sicurezza. 
        if (!user)
            return res.status(401).json({ success: false, message: 'Utente non trovato' });

        const ok = await user.comparePassword(password);
        if (!ok)
            return res.status(401).json({ success: false, message: 'Password errata' });

        const token = signToken(user);

        return res.json({
            success: true,
            data: {
                token,
                userId: user._id,
                role: user.role
            }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Errore server',
            error: err.message
        });
    }
});

//GET /api/lv/users/me
/* #swagger.tags = ['Auth']
   #swagger.summary = 'Profilo utente autenticato'
   #swagger.description = 'Restituisce i dati dell’utente autenticato e il relativo profilo (Customer o Restaurateur)'

   #swagger.security = [{
        "bearerAuth": []
   }]

   #swagger.responses[200] = {
        description: 'Profilo recuperato con successo',
        schema: {
            success: true,
            user: {
                _id: 'user_id',
                email: 'mario.rossi@example.com',
                firstName: 'Mario',
                lastName: 'Rossi',
                role: 'CUSTOMER'
            },
            profile: {
                // struttura variabile in base al ruolo
            }
        }
   }

   #swagger.responses[401] = {
        description: 'Token mancante o non valido'
   }

   #swagger.responses[404] = {
        description: 'Utente non trovato'
   }

   #swagger.responses[500] = {
        description: 'Errore interno del server'
   }
*/
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User
            .findById(req.user.id)
            .select('-password');

        if (!user)
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });


        let profile = null;
        if (user.role === 'CUSTOMER') {
            profile = await Customer
                .findOne({ userId: user._id })
                .populate('preferences.favoriteRestaurantIds', 'displayName imageUrl address');
        }

        if (user.role === 'RESTAURATEUR') {
            profile = await Restaurateur
                .findOne({ userId: user._id });
        }

        res.json({
            success: true,
            user,
            profile
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Errore server',
            error: err.message
        });
    }
});

router.put('/me', authMiddleware, async (req, res) => {
    try {
        const updates = req.body; // { firstName, lastName, phoneNumber ... }

        delete updates.role;
        delete updates.email;
        delete updates.password;

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Errore aggiornamento', error: err.message });
    }
});

// PUT /api/lv/users/me/email
// Allow user to update email with uniqueness check
router.put('/me/email', authMiddleware, async (req, res) => {
    try {

        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email mancante'
            });
        }

        // Controllo unicità email
        const existing = await User.findOne({ email });

        if (existing && existing._id.toString() !== req.user.id) {
            return res.status(409).json({
                success: false,
                message: 'Email già in uso'
            });
        }

        // Aggiorno email
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { email },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            user
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Errore aggiornamento email',
            error: err.message
        });
    }
});

// PUT /api/lv/users/me/password
router.put('/me/password', authMiddleware, async (req, res) => {
    try {

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password mancanti'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La password deve avere almeno 6 caratteri'
            });
        }

        const user = await User.findById(req.user.id).select('+password');

        const ok = await user.comparePassword(currentPassword);
        if (!ok) {
            return res.status(401).json({
                success: false,
                message: 'Password attuale errata'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password aggiornata'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Errore aggiornamento password',
            error: err.message
        });
    }
});

// DELETE /api/lv/users/me
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