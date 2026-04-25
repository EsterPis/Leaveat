const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Leaveat API',
    description: 'Documentazione API del progetto Leaveat'
  },
  host: 'localhost:3000',
  schemes: ['http']
};

const outputFile = './swagger-output.json';
const path = require('path');
const endpointsFiles = [path.join(__dirname, 'src', 'app.js')];

swaggerAutogen(outputFile, endpointsFiles, doc);