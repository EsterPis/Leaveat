# Leaveat
Leveat è una applicazione web che consente la gestione di un servizio di 
ordinazione e ritiro di cibo presso ristoranti registrati sulla piattaforma.

L'applicazione adotta un'architettura client-server basata su API REST e database MongoDB.

## Requisiti
Prima di eseguire il progetto è necessario aver installato:
- Node.js
- npm
- Accesso a MongoDB

## Installazione
Da terminale, nella cartella principale del progetto \leaveat installare le dipendenze tramite: 
npm install

## Configurazione ambiente
Creare il file 
backend/.env

Inserire le variabili:
MONGO_URI= <uri>
DB_NAME=leaveat 
JWT_SECRET=password_super_sicura 
TOKEN_EXPIRES_IN=24h

Uri utilizzato in locale:
mongodb://esteratlante:adminAdmin@ac-onoyjk5-shard-00-00.4no44bt.mongodb.net:27017,ac-onoyjk5-shard-00-01.4no44bt.mongodb.net:27017,ac-onoyjk5-shard-00-02.4no44bt.mongodb.net:27017/leaveat?ssl=true&replicaSet=atlas-tnnd8q-shard-0&authSource=admin&appName=EsterCluster

## Avvio del progetto
### Importante
Eseguire i comandi in /leaveat
È fortemente consigliato avviare il progetto tramite il comando
npm run test:run

Lo script effettua un reset del db, un successivo seed ed avvia il server.

Dal secondo avvio, se non si desidera tornale allo stato 'di avvio' del progetto, 
e quindi se non si vogliono perdere le modifiche apportate al database
dopo il primo avvio è possibile usare il server tramite comando:
npm start

L'applicazione sarà disponibile all'indirizzo
http://localhost:3005/

## Account demo
Account customer:
mario@test.com
password123

Account restaurateur:
carlo@test.com
password123

È possibile effettuare l'accesso a tutti gli account restaturateur con 
nome@test.com, password123
dove nome può essere:
- Carlo
- Giovanni
- Francesco
- Antonio
- Giuseppe

## Documentazione API
La documentazione Swagger è disponibile all'indirizzo:
http://localhost:3005/docs/

## Cartella Git del progetto 
https://github.com/EsterPis/Leaveat
