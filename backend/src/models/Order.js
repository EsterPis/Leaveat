const mongoose = require('mongoose');

// Definisco uno schema per gli elementi interni dell'ordine (il singolo piatto con quantità)
const OrderItemSchema = new mongoose.Schema({
    dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: true },
    quantity: { type: Number, required: true, default: 1 }
}, { _id: false }); // _id false perché è un sotto-documento semplice

const OrderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    items: [OrderItemSchema], 
    totalPrice: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['ORDINATO', 'IN_PREPARAZIONE', 'CONSEGNATO', 'ANNULLATO'], 
        default: 'ORDINATO' 
    },
    timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);