const jwt = require('jsonwebtoken'); //modulo per la decodifica e verifica dei token

// La funzione si aspetta di leggere un formato del tipo "Authorization: Bearer <token>"
function authMiddleware(req, res, next) {
  // legge l'header Authorization, se non esiste assegna una stringa vuota
  const header = req.headers['authorization'] || ''; 
  const [scheme, token] = header.split(' '); //divide la stringa in due parti
  if (scheme !== 'Bearer' || !token) { //controlla che lo schema sia "Bearer" e che il token esista
    return res.status(401).json({ success: false, message: 'Missing or invalid Authorization header' });
  }
  try {
    //verifica della validità del token utilizzando la chiave definita in .env
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret'); //verifica il token usando la chiave segreta
    req.user = payload; //aggiunge il payload decodificato alla richiesta per l'uso nei middleware successivi
    next(); //passa il controllo alla prossima funzione
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { authMiddleware };
