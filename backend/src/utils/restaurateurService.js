const mongoose = require('mongoose');
const Restaurateur = require('../models/Restaurateur');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');
const Dish = require('../models/Dish'); // <--- MANCAVA QUESTO IMPORT

// Utility
function isEmpty(value) {
  return !value || !value.toString().trim();
}

// Validazioni (invariate)
function validateFiscalData(data) {
  const { VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN } = data;
  if ([VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN].some(isEmpty)) {
    throw new Error('Compila tutti i campi dei dati fiscali.');
  }
}

function validateRestaurantData(rData) {
  if (!rData) throw new Error('Dati ristorante mancanti.');
  const requiredFields = [
    rData.legalName, rData.displayName, rData.phoneNumber, rData.openingHours,
    rData?.address?.street, rData?.address?.number, rData?.address?.zip, 
    rData?.address?.city, rData?.address?.province
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
      VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN,
      restaurant: rData,
      menu
    } = payload;

    // 1. Validazione
    validateFiscalData({ VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN });
    validateRestaurantData(rData);

    if (!menu) throw new Error('Dati menù mancanti.');

    // 2. Gestione Ristoratore (Trova o Crea)
    let rest = await Restaurateur.findOne({ userId }).session(session);
    if (!rest) {
      const created = await Restaurateur.create([{
        userId, VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN,
        restaurantIds: []
      }], { session });
      rest = created[0];
    } else {
      // Aggiorna esistente
      rest.VATNumber = VATNumber;
      rest.legalRepresentativeName = legalRepresentativeName;
      rest.adminEmail = adminEmail;
      rest.bankAccountHolder = bankAccountHolder;
      rest.IBAN = IBAN;
      await rest.save({ session });
    }

    // 3. Crea il Ristorante
    const createdRestaurant = await Restaurant.create([{
      legalName: rData.legalName,
      displayName: rData.displayName,
      phoneNumber: rData.phoneNumber,
      email: rData.email,
      address: rData.address,
      openingHours: rData.openingHours,
      description: rData.description,
      websiteUrl: rData.websiteUrl,
      imageUrl: rData.imageUrl,
      status: 'DRAFT', // Rimane DRAFT finché non colleghiamo il menu
    }], { session });

    const restaurantDoc = createdRestaurant[0];

    // Collega ristorante al ristoratore
    rest.restaurantIds.push(restaurantDoc._id);
    await rest.save({ session });

    // 4. GESTIONE PIATTI E MENU (La parte corretta)
    let finalDishIds = [];

    // A) Piatti Custom (Nuovi inseriti a mano)
    if (menu.customDishes && menu.customDishes.length > 0) {
      const customDishesDocs = menu.customDishes.map(d => ({
        name: d.name,
        category: d.category,
        price: d.price,
        ingredients: d.ingredients,
        description: d.description,
        image: d.imageUrl,
        restaurantId: restaurantDoc._id, // Importante: colleghiamo al ristorante
        source: 'restaurant'
      }));
      
      const savedCustomDishes = await Dish.create(customDishesDocs, { session });
      savedCustomDishes.forEach(d => finalDishIds.push(d._id));
    }

    // B) Piatti dal Catalogo (Bisogna clonarli/referenziarli)
    // Nota: Nelle specifiche si dice di creare una copia personalizzata
    if (menu.fromCatalog && menu.fromCatalog.length > 0) {
       for (const item of menu.fromCatalog) {
          // Recuperiamo il piatto originale per copiare i dati base (nome, ingredienti, ecc)
          const originalDish = await Dish.findById(item.dishId).session(session);
          
          if (originalDish) {
              const catalogCopy = new Dish({
                  name: originalDish.name,
                  category: originalDish.category,
                  area: originalDish.area,
                  instructions: originalDish.instructions,
                  image: originalDish.image,
                  ingredients: originalDish.ingredients,
                  measures: originalDish.measures,
                  // Usiamo il prezzo deciso dal ristoratore, non quello base
                  price: item.price, 
                  restaurantId: restaurantDoc._id,
                  source: 'restaurant', // Diventa un piatto del ristorante
                  externalId: originalDish.externalId // Manteniamo ref se serve
              });
              
              await catalogCopy.save({ session });
              finalDishIds.push(catalogCopy._id);
          }
       }
    }

    // 5. Crea il Menù con gli ID raccolti
    const createdMenu = await Menu.create([{
      restaurantIds: [restaurantDoc._id],
      restaurateurId: rest._id,
      dishIds: finalDishIds, // Ora l'array è pieno!
    }], { session });

    const menuDoc = createdMenu[0];

    // 6. Aggiorna Ristorante (Attiva e collega menu)
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