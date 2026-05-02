const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Leaveat API',
    description: 'Documentazione API del progetto Leaveat'
  },
  host: 'localhost:3005',
  schemes: ['http'],

  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header"
    }
  }
};

const outputFile = './backend/swagger-output.json';
const endpointsFiles = [
  './backend/src/app.js',
  './backend/src/routes/auth.js',
  './backend/src/routes/categories.js',
  './backend/src/routes/customers.js',
  './backend/src/routes/restaurateurs.js',
  './backend/src/routes/restaurants.js',
  './backend/src/routes/statistics.js',
  './backend/src/routes/dishes.js',
  './backend/src/routes/orders.js'
];



swaggerAutogen(outputFile, endpointsFiles, doc);