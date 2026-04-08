/**
 * restaurateurService.js
 * Handles the business logic for completing the restaurateur registration process.
 * 
 * Responsibilities:
 *  - Validate fiscal and restaurant data
 *  - Create or update the Restaurateur profile
 *  - Create the Restaurant entity
 *  - Handle custom and catalog dishes
 *  - Create the Menu and link it to the Restaurant
 *  - Execute the entire flow inside a MongoDB transaction
 */
const mongoose = require('mongoose');
const Restaurateur = require('../models/Restaurateur');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');
const Dish = require('../models/Dish');

/* A → UTILITY */
function isEmpty(value) {
  return !value || !value.toString().trim();
}

/* B → VALIDATION */
// Validates mandatory fiscal data 
function validateFiscalData(data) {
  const { VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN } = data;

  if ([VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN].some(isEmpty)) {
    throw new Error('All fiscal fields must be completed.');
  }
}

// Validates mandatory restaurant data.
function validateRestaurantData(rData) {
  if (!rData) throw new Error('Restaurant data missing.');

  const requiredFields = [
    rData.legalName,
    rData.displayName,
    rData.phoneNumber,
    rData.openingHours,
    rData?.address?.street,
    rData?.address?.number,
    rData?.address?.zip,
    rData?.address?.city,
    rData?.address?.province
  ];

  if (requiredFields.some(isEmpty)) {
    throw new Error('All mandatory restaurant fields must be completed.');
  }
}

/* C → MAIN SERVICE FUNCTIONS */
// Creates or updates the Restaurateur profile 
async function createOrUpdateRestaurateur(userId, fiscalData, session) {
  let restaurateur = await Restaurateur.findOne({ userId }).session(session);

  if (!restaurateur) {
    const created = await Restaurateur.create([{
      userId,
      ...fiscalData
    }], { session });

    restaurateur = created[0];
  } else {
    Object.assign(restaurateur, fiscalData);
    await restaurateur.save({ session });
  }

  return restaurateur;
}


// Creates a Restaurant linked to the Restaurateur
async function createRestaurant(restaurateurId, rData, session) {
  const created = await Restaurant.create([{
    restaurateurId,
    legalName: rData.legalName,
    displayName: rData.displayName,
    phoneNumber: rData.phoneNumber,
    email: rData.email,
    address: rData.address,
    openingHours: rData.openingHours,
    description: rData.description,
    websiteUrl: rData.websiteUrl,
    imageUrl: rData.imageUrl,
    status: 'DRAFT'
  }], { session });

  return created[0];
}

// Creates the Menu and links it to the Restaurant
async function createMenu(restaurantId, dishIds, session) {
  const created = await Menu.create([{
    restaurantId,
    dishIds
  }], { session });

  return created[0];
}

// Main function to complete the registration process
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
      menu
    } = payload;

    validateFiscalData({ VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN });
    if (!menu) {
      // Caso registrazione solo dati fiscali
      const fiscalData = { VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN };
      const restaurateur = await createOrUpdateRestaurateur(userId, fiscalData, session);

      await session.commitTransaction();
      session.endSession();

      return {
        restaurateurId: restaurateur._id
      };
    }
    validateRestaurantData(rData);

    const fiscalData = { VATNumber, legalRepresentativeName, adminEmail, bankAccountHolder, IBAN };
    const restaurateur = await createOrUpdateRestaurateur(userId, fiscalData, session);
    const restaurant = await createRestaurant(restaurateur._id, rData, session);
    const allDishIds = [];
    const menuDoc = await createMenu(restaurant._id, allDishIds, session);

    for (const dish of menu) {
      console.log("MENU LENGTH:", menu.length);
      let newDish;

      if (dish.source === 'catalog') {
        // clone catalog
        const original = await Dish.findById(dish._id).session(session);

        if (!original) continue;

        newDish = new Dish({
          name: original.name,
          category: original.category,
          area: original.area,
          instructions: original.instructions,
          image: original.image,
          ingredients: original.ingredients,
          measures: original.measures,
          price: dish.price,
          restaurantId: restaurant._id,
          source: 'restaurant',
          externalId: original.externalId
        });

        await newDish.save({ session });

      } else {
        // custom
        newDish = await Dish.create([{
          ...dish,
          restaurantId: restaurant._id,
          source: 'restaurant'
        }], { session });

        newDish = newDish[0];
      }

      allDishIds.push(newDish._id);
    }

    restaurant.menuId = menuDoc._id;
    restaurant.status = 'ACTIVE';
    await restaurant.save({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      restaurateurId: restaurateur._id,
      restaurantId: restaurant._id,
      menuId: menuDoc._id
    };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = { completeRegistration };