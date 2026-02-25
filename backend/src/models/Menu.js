const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        unique: true
    },
    //Collegamento piatti (1:n)
    dishIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Dish", }],
});

module.exports = mongoose.model('Menu', menuSchema);