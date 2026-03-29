const mongoose = require('mongoose');
const { Schema } = mongoose;

const DishSchema = new mongoose.Schema({
  externalId: { type: String, index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, index: true },
  area: { type: String },
  image: { type: String },
  description: { type: String },
  ingredients: [{ type: String, required: true }],
  measures: [{ type: String }],
  price: { type: Number, default: 0, required: true },
  //prepTime: { type: Number, default: 15, min: 1 }, // in minutes
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
  source: { type: String, enum: ['catalog', 'restaurant'], default: 'catalog' }
}, { timestamps: true });

module.exports = mongoose.model('Dish', DishSchema);
