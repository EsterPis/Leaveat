const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true},
    mealIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true }],
    price: { type: Number, required: true},
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);