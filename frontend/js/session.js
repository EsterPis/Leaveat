// Gestisce le modifiche a index.html quando è attiva una sessione utente
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('firstName');

  const navbar = document.querySelector('.navbar .ms-auto');
  const headerTitle = document.querySelector('h1.display-6');

  if (!navbar) return;

  // Se l'utente è loggato
  if (token && name) {
    // 1️⃣ Aggiorna navbar
    navbar.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <span class="text-white">Ciao, <strong>${name}</strong></span>
        <a href="/account.html" class="btn btn-outline-light btn-sm" title="Profilo utente">
          <i class="bi bi-person-circle"></i>
        </a>
        <button id="logout-btn" class="btn btn-danger btn-sm">Logout</button>
      </div>
    `;

    // 2️⃣ Aggiunge nome anche nel titolo principale
    if (headerTitle) headerTitle.textContent = `Benvenuto su Leaveat, ${name}!`;

    // 3️⃣ Gestione logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '/login.html';
    });

  } else {
    // Se non loggato, mostra i bottoni classici
    navbar.innerHTML = `
      <a class="btn btn-outline-light btn-sm" href="/login.html">Login</a>
      <a class="btn btn-warning btn-sm" href="/register.html">Registrati</a>
    `;
  }
});

