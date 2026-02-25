const mongoose = require('mongoose');

const RestaurateurSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Dati fiscali
  VATNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  legalRepresentativeName: {
    type: String,
    required: true,
    trim: true
  },

  adminEmail: {
    type: String,
    required: true,
    trim: true
  },

  bankAccountHolder: {
    type: String,
    required: true,
    trim: true
  },

  IBAN: {
    type: String,
    required: true,
    trim: true
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Restaurateur', RestaurateurSchema);
