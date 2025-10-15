# Leaveat (bozza CJS + JWT)
Prerequisiti: Node >= 18.

## Setup
```bash
npm install
# crea e controlla .env
npm run seed     # importa data/meals.json nei "dishes"
npm start        # avvia http://localhost:3005
```

## Rotte principali
- `POST /api/auth/register` { email, password, role }
- `POST /api/auth/login`
- `GET  /api/users/me` (protetta, Authorization: Bearer <token>)
- `GET  /api/dishes` (pubblica con filtri opzionali)

Frontend statico in `/frontend`:
- `/` Home con ricerca piatti
- `/login.html` e `/register.html`
