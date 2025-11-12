const mongoose = require('mongoose');
const Restaurateur = require('../models/Restaurateur');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');

async function completeRegistration(userId, payload) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { VATNumber, restaurant: rData, menu } = payload;

    // Trova o crea il restaurateur
    let rest = await Restaurateur.findOne({ userId }).session(session);
    if (!rest) {
      rest = await Restaurateur.create([{
        userId,
        VATNumber,
        restaurantIds: []
      }], { session });
      rest = rest[0];
    } else {
      rest.VATNumber = VATNumber;
      await rest.save({ session });
    }

    // Crea il ristorante
    const restaurant = await Restaurant.create([{
      name: rData.name,
      phoneNumber: rData.phoneNumber,
      address: rData.address,
      status: 'DRAFT'
    }], { session });
    const restaurantDoc = restaurant[0];

    rest.restaurantIds.push(restaurantDoc._id);
    await rest.save({ session });

    // Crea o importa il menù
    let menuDoc;
    if (menu.mode === 'import') {
      const base = await Menu.findById(menu.fromMenuId).session(session);
      if (!base) throw new Error('Menù da importare non trovato');
      menuDoc = await Menu.create([{
        restaurantIds: [restaurantDoc._id],
        restaurateurId: rest._id,
        dishIds: base.dishIds
      }], { session });
      menuDoc = menuDoc[0];
    } else {
      menuDoc = await Menu.create([{
        restaurantIds: [restaurantDoc._id],
        restaurateurId: rest._id,
        dishIds: menu.dishIds
      }], { session });
      menuDoc = menuDoc[0];
    }

    // Collega menù e attiva ristorante
    restaurantDoc.menuId = menuDoc._id;
    restaurantDoc.status = 'ACTIVE';
    await restaurantDoc.save({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      restaurateurId: rest._id,
      restaurantId: restaurantDoc._id,
      menuId: menuDoc._id
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = { completeRegistration };
