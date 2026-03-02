/**
 * Session management script for Leaveat frontend.
 * 
 * Responsibilities:    
 * * - Check for JWT token on page load
 * * - Validate token with backend (/users/me)
 * * - Store user info in localStorage (except token)
 * * - Render navbar based on authentication state and role
 * * - Provide logout functionality
 */


// Entry point
document.addEventListener("DOMContentLoaded", initSession);

/* A → SESSION */
// Session initialization: check token, validate, render UI
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

    saveUserToStorage(user);

    // Render UI
    renderLoggedInNavbar(user);
    updateWelcomeTitle(user);
}

// Session closure: clear storage and redirect to home
function logout() {
    localStorage.clear();
    window.location.href = "/index.html";
}

/* B → UTILITY FUNCTIONS */
// Exctract token from localStorage
function getToken() {
    return localStorage.getItem("token");
}

// Saves user info in localStorage (except token) for easy access across pages
function saveUserToStorage(user) {
    localStorage.setItem("firstName", user.firstName);
    localStorage.setItem("role", user.role);
    localStorage.setItem("email", user.email);
}

// Validates token by calling /users/me. Returns user data if valid, null otherwise.
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

/* C → UI RENDERING */
// Render the navbar for logged-out users
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

// Render the navbar for logged-in users
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

// Update the welcome title on the homepage with the user's name
function updateWelcomeTitle(user) {
    const headerTitle = document.querySelector("h1.display-6");
    if (!headerTitle) return;

    headerTitle.textContent = `Benvenuto su Leaveat, ${user.firstName}!`;
}




