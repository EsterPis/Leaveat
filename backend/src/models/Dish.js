const mongoose = require('mongoose');

const DishSchema = new mongoose.Schema({
  externalId: { type: String, index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, index: true },
  area: { type: String },
  image: { type: String },
  ingredients: [{ type: String }],
  measures: [{ type: String }],
  price: { type: Number, default: 0 },
  source: { type: String, enum: ['catalog', 'restaurant'], default: 'catalog' }
}, { timestamps: true });

module.exports = mongoose.model('Dish', DishSchema);
