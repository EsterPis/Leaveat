const express = require('express');
const router = express.Router();
const categories = require('../utils/categories');
/* #swagger.tags = ['Categories']
   #swagger.summary = 'Elenco categorie'
   #swagger.description = 'Restituisce tutte le categorie disponibili.'

   #swagger.responses[200] = {
        description: 'Lista categorie',
        schema: {
            success: true,
            data: ['Pizza', 'Sushi', 'Burger']
        }
   }
*/
router.get('/', (req, res) => {
  res.json({ success: true, data: categories });
});

module.exports = router;