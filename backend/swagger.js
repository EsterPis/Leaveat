const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Leaveat API',
    description: 'Documentazione API del progetto Leaveat'
  },
  host: 'localhost:3005',
  schemes: ['http']
};

const outputFile = './backend/swagger-output.json';
const endpointsFiles = [
  './backend/src/app.js',
  './backend/src/routes/auth.js'
];

swaggerAutogen(outputFile, endpointsFiles, doc);