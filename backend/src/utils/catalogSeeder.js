const path = require('path');
const fs = require('fs');
const Dish = require('../models/Dish');

async function isCatalogEmpty() {
  const count = await Dish.countDocuments(); //conta i documenti nella collezione Dish
    return count === 0;
} 
 
function loadMealsData(){ //se la collezione è vuota legge il file meals.json e importa i piatti
    const filePath = path.join(__dirname, '../../data/meals.json'); 
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')); //legge il file e lo converte in oggetto JS
}
 
function mapMealsToDishes(data){
    //mappappatura dei dati per adattarli allo schema Dish
    return data.map(m => ({
      externalId: String(m.idMeal || m.externalId || ''), 
      name: m.strMeal || m.name,
      category: m.strCategory || m.category || '',
      area: m.strArea || m.area || '',
      image: m.strMealThumb || m.image || '',
      description: m.strInstructions || m.description || '',
      ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
      measures: Array.isArray(m.measures) ? m.measures : [],
      price: Number(m.price || 0) || 10.0, //se m.price è truthy lo converte in numero, altrimenti assegna 0. Se il risultato è 0 (falsy), assegna 10.0.
      source: 'catalog'
    }));
}

async function importMealsIfEmpty(){
  if (await isCatalogEmpty()) {
     console.log('Database vuoto, importo meals.json...');
     const meals = loadMealsData();
     const docs = mapMealsToDishes(meals);
    await Dish.insertMany(docs); //inserisce i documenti nella collezione Dish
    console.log(`Importati ${docs.length} piatti da meals.json`);
  } else {
    console.log('Catalogo già popolato.');
  }
}

module.exports = {
  importMealsIfEmpty
};