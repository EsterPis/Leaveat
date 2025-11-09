const mongoose = require('mongoose');

const RestaurateurSchema = new mongoose.Schema({
    userId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    restaurantIds:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true}], 
    VATNumber: { type: String, required: true, unique: true, trim: true },
});

module.exports = mongoose.model('Restaurateur', RestaurateurSchema);