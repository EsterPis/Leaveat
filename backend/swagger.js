const swaggerAutogen = require('swagger-autogen')();
const path = require('path');
process.chdir(__dirname);

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

const outputFile = path.resolve(__dirname, 'swagger-output.json');

const endpointsFiles = [
  './src/app.js',
  './src/routes/auth.js',
  './src/routes/categories.js',
  './src/routes/customers.js',
  './src/routes/restaurateurs.js',
  './src/routes/restaurants.js',
  './src/routes/statistics.js',
  './src/routes/dishes.js',
  './src/routes/orders.js'
];



swaggerAutogen(outputFile, endpointsFiles, doc);