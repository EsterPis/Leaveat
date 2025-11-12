// Base API per le rotte utente
const API_BASE = '/api/lv/users';

// Messaggi d'aiuto Bootstrap
function setMessage(el, text, type = 'success') {
  el.innerHTML = `<div class="alert alert-${type}" role="alert">${text}</div>`;
}

// ----- REGISTRAZIONE -----
function setupRegister() {
  const form = document.getElementById('regForm');
  const msg = document.getElementById('msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.innerHTML = '';

    const formData = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const out = await res.json();

      if (!out.success) {
        throw new Error(out.message || 'Errore durante la registrazione');
      }
      localStorage.setItem('token', out.data.token);
      localStorage.setItem('userId', out.data.userId);
      localStorage.setItem('firstName', formData.firstName);
      localStorage.setItem('role', out.data.role);

      // reindirizza in base al ruolo scelto
      if (out.data.role === 'CUSTOMER') {
        setTimeout(() => (window.location.href = '/complete-customer.html'), 1500);
      } else if (out.data.role === 'RESTAURATEUR') {
        setTimeout(() => (window.location.href = '/complete-restaurateur.html'), 1500);
      } else {
        setTimeout(() => (window.location.href = '/login.html'), 1500);
      }

    } catch (err) {
      setMessage(msg, err.message, 'danger');
    }
  });
}

// ----- LOGIN -----
// ----- LOGIN -----
function setupLogin() {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('msg'); 

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.innerHTML = '';

    const { email, password } = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const out = await res.json();

      if (!out.success) {
        if (out.message === 'Utente non trovato') {
          setMessage(msg, `Utente non registrato. <a href="/register.html">Registrati qui</a>`, 'warning');
        } else {
          setMessage(msg, out.message || 'Credenziali non valide.', 'danger');
        }
        return;
      }

      // ✅ Salviamo i dati nel localStorage
      const token = out.data?.token;
      if (!token) throw new Error('Token mancante nella risposta del server');

      // Decodifica del token per ricavare nome, email e ruolo
      const payload = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('token', token);
      localStorage.setItem('userId', payload.userId);
      localStorage.setItem('role', payload.role);
      localStorage.setItem('email', payload.email);

      // Se hai già salvato anche firstName in fase di registrazione:
      // lo manteniamo sincronizzato
      if (!localStorage.getItem('firstName')) {
        localStorage.setItem('firstName', payload.firstName || 'Utente');
      }

      setMessage(msg, 'Accesso riuscito! Reindirizzamento...', 'success');
      setTimeout(() => (window.location.href = '/index.html'), 1000);
    } catch (err) {
      setMessage(msg, err.message || 'Errore di connessione al server', 'danger');
    }
  });
}
