const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true},
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true},
    mealIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true }],
    price: { type: Number, required: true, unique: true }
});

module.exports = mongoose.model('Order', OrderSchema);