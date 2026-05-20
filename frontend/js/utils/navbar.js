// aggiorna badge carrello cliente
export function updateCartBadge() {
    const badge = document.getElementById("cart-count");
    if (!badge) return;

    const cart = JSON.parse(localStorage.getItem("cart")) || null;
    if (!cart || !cart.items.length) {
        badge.textContent = 0;
        return;
    }

    const totalItems = cart.items.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    badge.textContent = totalItems;
}

// renderizza la navbar con stili dinamici in base al ruolo dell'utente (restaurateur o cliente)
export function renderNavbar() {
    const role = localStorage.getItem("role");
    const navbarClass = role === "RESTAURATEUR"
    ? "navbar-restaurateur"
    : "navbar-default";

    const navbarHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark ${navbarClass}">
      <div class="container">

        <a class="navbar-brand" href="/index.html">Leaveat</a>

        <div class="d-flex align-items-center gap-3">

          <a href="/cart.html" class="btn btn-outline-light position-relative cart-button">
            <i class="bi bi-cart3"></i>
            <span id="cart-count"
              class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              0
            </span>
          </a>

          <div class="user-section"></div>

        </div>

      </div>
    </nav>
    `;

    document.body.insertAdjacentHTML("afterbegin", navbarHTML); // Inserisce la navbar all'inizio del body
    updateCartBadge(); // Aggiorna il badge del carrello al caricamento della pagina
}