//Gestice le modifiche a index.html quando è attiva una sessione utente
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('firstName');

  // trova la navbar
  const navbar = document.querySelector('.navbar .ms-auto');
  if (!navbar) return;

  // rimuove i bottoni esistenti (login, registrati)
  navbar.innerHTML = '';

  if (token && name) {
    // se l'utente è loggato, mostra benvenuto e logout
    const userArea = document.createElement('div');
    userArea.className = 'd-flex align-items-center gap-2 text-white';

    userArea.innerHTML = `
      <span>Benvenuto, <strong>${name}</strong>!</span>
      <button id="logout-btn" class="btn btn-outline-danger btn-sm">Logout</button>
    `;
    navbar.appendChild(userArea);

    // gestisci logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.clear();
      window.location.reload();
    });
  } else {
    // se non è loggato, mostra login e registrazione
    navbar.innerHTML = `
      <a class="btn btn-outline-light btn-sm" href="/login.html">Login</a>
      <a class="btn btn-warning btn-sm" href="/register.html">Registrati</a>
    `;
  }
});
