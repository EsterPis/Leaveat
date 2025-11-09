const mongoose = require('mongoose');
const categories = require('../utils/categories');

const CustomerSchema = new mongoose.Schema({
    userId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    //personalizzazione account
    preferences: { 
        favoriteCategories: [{ type: String, enum: categories}],
        favoriteRestaurantIds: [{type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant'}]
    },
    paymentMethod:{ type: String, enum: ['CASH', 'PREPAID_CARD', 'CREDIT_CARD'], default: 'CASH' }
});

module.exports = mongoose.model('Customer', CustomerSchema);