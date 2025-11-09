const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
    //Collegamento ristorante (1:n)
    restaurantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true }],
    //Collegamento ristoratore(1:1)
    restaurateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurateur", required: true, unique: true},
    //Collegamento piatti (1:n)
    dishIds: [{type: mongoose.Schema.Types.ObjectId, ref: "Dish", }],
});

module.exports = mongoose.model('Menu', menuSchema);