const mongoose = require('mongoose');
const Restaurateur = require('../models/Restaurateur');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');

// Piccola funzione di utilità per controllare che una stringa non sia vuota
function isEmpty(value) {
  return !value || !value.toString().trim();
}

function validateFiscalData(data) {
  const {
    VATNumber,
    legalRepresentativeName,
    adminEmail,
    bankAccountHolder,
    IBAN,
  } = data;

  if ([
    VATNumber,
    legalRepresentativeName,
    adminEmail,
    bankAccountHolder,
    IBAN,
  ].some(isEmpty)) {
    throw new Error('Compila tutti i campi dei dati fiscali.');
  }
}

function validateRestaurantData(rData) {
  if (!rData) throw new Error('Dati ristorante mancanti.');

  const requiredFields = [
    rData.legalName,
    rData.displayName,
    rData.phoneNumber,
    rData.openingHours,
    rData?.address?.street,
    rData?.address?.number,
    rData?.address?.zip,
    rData?.address?.city,
    rData?.address?.province,
  ];

  if (requiredFields.some(isEmpty)) {
    throw new Error('Compila tutti i campi obbligatori del ristorante.');
  }
}

async function completeRegistration(userId, payload) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      VATNumber,
      legalRepresentativeName,
      adminEmail,
      bankAccountHolder,
      IBAN,
      restaurant: rData,
      menu,
    } = payload;

    // 1. Validazione base
    validateFiscalData({
      VATNumber,
      legalRepresentativeName,
      adminEmail,
      bankAccountHolder,
      IBAN,
    });
    validateRestaurantData(rData);

    if (!menu || !menu.mode) {
      throw new Error('Dati menù mancanti.');
    }

    // 2. Trova o crea il restaurateur
    let rest = await Restaurateur.findOne({ userId }).session(session);

    if (!rest) {
      // creazione nuovo documento
      const created = await Restaurateur.create([{
        userId,
        VATNumber,
        legalRepresentativeName,
        adminEmail,
        bankAccountHolder,
        IBAN,
        restaurantIds: [],
      }], { session });

      rest = created[0];
    } else {
      // aggiornamento di un restauratore già esistente
      rest.VATNumber = VATNumber;
      rest.legalRepresentativeName = legalRepresentativeName;
      rest.adminEmail = adminEmail;
      rest.bankAccountHolder = bankAccountHolder;
      rest.IBAN = IBAN;
      await rest.save({ session });
    }

    // 3. Crea il ristorante collegato
    const createdRestaurant = await Restaurant.create([{
      legalName: rData.legalName,
      displayName: rData.displayName,
      phoneNumber: rData.phoneNumber,
      email: rData.email,
      address: {
        street: rData.address.street,
        number: rData.address.number,
        zip: rData.address.zip,
        city: rData.address.city,
        province: rData.address.province,
      },
      openingHours: rData.openingHours,
      description: rData.description,
      websiteUrl: rData.websiteUrl,
      imageUrl: rData.imageUrl,
      status: 'DRAFT',
    }], { session });

    const restaurantDoc = createdRestaurant[0];

    rest.restaurantIds.push(restaurantDoc._id);
    await rest.save({ session });

    // 4. Crea o importa il menù
    let menuDoc;

    if (menu.mode === 'import') {
      const base = await Menu.findById(menu.fromMenuId).session(session);
      if (!base) {
        throw new Error('Menù da importare non trovato.');
      }

      const createdMenu = await Menu.create([{
        restaurantIds: [restaurantDoc._id],
        restaurateurId: rest._id,
        dishIds: base.dishIds,
      }], { session });

      menuDoc = createdMenu[0];
    } else {
      const dishIds = Array.isArray(menu.dishIds) ? menu.dishIds : [];

      const createdMenu = await Menu.create([{
        restaurantIds: [restaurantDoc._id],
        restaurateurId: rest._id,
        dishIds,
      }], { session });

      menuDoc = createdMenu[0];
    }

    // 5. Collega menù e attiva ristorante
    restaurantDoc.menuId = menuDoc._id;
    restaurantDoc.status = 'ACTIVE';
    await restaurantDoc.save({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      restaurateurId: rest._id,
      restaurantId: restaurantDoc._id,
      menuId: menuDoc._id,
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = { completeRegistration };
