// ========================================================
//  SESSIONE UTENTE - GESTIONE FRONTEND
// ========================================================

// Entry point
document.addEventListener("DOMContentLoaded", initSession);


// --------------------------------------------------------
// Inizializzazione della sessione
// --------------------------------------------------------
async function initSession() {
    const token = getToken();

    if (!token) {
        renderLoggedOutNavbar();
        return;
    }

    // Verifica token con /users/me
    const user = await validateToken(token);

    if (!user) {
        logout();
        return;
    }

    // Salvo i dati minimi nel localStorage (se non già presenti)
    saveUserToStorage(user);

    // Aggiorno UI
    renderLoggedInNavbar(user);
    updateWelcomeTitle(user);
}


// --------------------------------------------------------
// Funzioni: Token / Storage
// --------------------------------------------------------
function getToken() {
    return localStorage.getItem("token");
}

function saveUserToStorage(user) {
    localStorage.setItem("firstName", user.firstName);
    localStorage.setItem("role", user.role);
    localStorage.setItem("email", user.email);
}


// --------------------------------------------------------
// Verifica token presso il backend
// --------------------------------------------------------
async function validateToken(token) {
    try {
        const response = await fetch("http://localhost:3005/api/lv/users/me", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) return null;

        const json = await response.json();
        return json.user; 

    } catch (err) {
        console.error("Errore validazione token:", err);
        return null;
    }
}


// --------------------------------------------------------
// UI: Navbar quando utente NON è loggato
// --------------------------------------------------------
function renderLoggedOutNavbar() {
    const navbar = document.querySelector(".user-section");
    if (!navbar) return;

    const currentPage = window.location.pathname;

    if (currentPage.includes("login.html"))
        navbar.innerHTML = `<a class="btn btn-warning btn-sm" href="/register.html">Registrati</a>`;
    else if (currentPage.includes("register.html"))
        navbar.innerHTML = `<a class="btn btn-outline-light btn-sm" href="/login.html">Login</a>`;
    else 
        navbar.innerHTML = `
        <a class="btn btn-outline-light btn-sm" href="/login.html">Login</a>
        <a class="btn btn-warning btn-sm" href="/register.html">Registrati</a>`;
}


// --------------------------------------------------------
// UI: Navbar quando utente È loggato
// --------------------------------------------------------
function renderLoggedInNavbar(user) {

    const userSection = document.querySelector(".user-section");
    if (!userSection) return;
    const cartButton = document.querySelector(".cart-button");

    let roleButton = "";

    // Pulsante diverso in base al ruolo
    if (user.role === "CUSTOMER") {
        roleButton = `
            <a href="/orders.html" class="btn btn-outline-light btn-sm">
                I miei ordini
            </a>
        `;
    }

    if (user.role === "RESTAURATEUR") {
        roleButton = `
            <a href="/restaurateur-dashboard.html" class="btn btn-outline-light btn-sm">
                Dashboard
            </a>
        `;
        if (cartButton) cartButton.style.display = "none"; // Nascondo carrello ai ristoratori
    }

    userSection.innerHTML = `
        <div class="d-flex align-items-center gap-2">

            <span class="text-white">
                Ciao, <strong>${user.firstName}</strong>
            </span>

            ${roleButton}

            <a href="/account.html"
               class="btn btn-outline-light btn-sm"
               title="Profilo utente">
                <i class="bi bi-person-circle"></i>
            </a>

            <button id="logout-btn"
                    class="btn btn-danger btn-sm">
                Logout
            </button>

        </div>
    `;

    document.getElementById("logout-btn").addEventListener("click", logout);
}


// --------------------------------------------------------
// UI: Messaggio di benvenuto nella home
// --------------------------------------------------------
function updateWelcomeTitle(user) {
    const headerTitle = document.querySelector("h1.display-6");
    if (!headerTitle) return;

    headerTitle.textContent = `Benvenuto su Leaveat, ${user.firstName}!`;
}


// --------------------------------------------------------
// LOGOUT
// --------------------------------------------------------
function logout() {
    localStorage.clear();
    window.location.href = "/index.html";
}
