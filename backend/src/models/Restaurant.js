const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, unique: true, trim: true },
    address: { type: String, required: true, trim: true },
    //collegamento menù (1:1)
    menuId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu', unique: true},
    status: { type: String, enum: ['DRAFT','ACTIVE'], default: 'DRAFT'},
    //collegamento ordini (0:n)
    orderIds:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);