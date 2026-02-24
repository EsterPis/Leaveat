const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
  // Dati anagrafici del ristorante
  legalName: { type: String, required: true, trim: true },        // Nome legale
  displayName: { type: String, required: true, trim: true },      // Nome commerciale mostrato ai clienti

  // Contatti
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  email: { type: String, trim: true },

  // Indirizzo strutturato
  address: {
    street:   { type: String, required: true, trim: true }, // Via
    number:   { type: String, required: true, trim: true }, // Civico
    zip:      { type: String, required: true, trim: true }, // CAP
    city:     { type: String, required: true, trim: true }, // Città
    province: { type: String, required: true, trim: true }, // Provincia
  },

  // Informazioni operative
  openingHours: { type: String, required: true, trim: true }, // es: "Lun-Dom 12:00 - 23:00"
  description:  { type: String, trim: true },

  // Presenza online
  websiteUrl: { type: String, trim: true },
  imageUrl:   { type: String, trim: true }, // URL logo/immagine

  // Collegamenti con menù e ordini
  //menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', unique: true },
  status: { type: String, enum: ['DRAFT','ACTIVE'], default: 'DRAFT' },
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);