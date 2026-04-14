export function renderNavbar() {

    const navbarHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container">

        <!-- Logo -->
        <a class="navbar-brand" href="/index.html">Leaveat</a>

        <!-- Sezione destra -->
        <div class="d-flex align-items-center gap-3">

          <!-- Carrello -->
          <a href="/cart.html" class="btn btn-outline-light position-relative cart-button">
            <i class="bi bi-cart3"></i>
            <span id="cart-count"
              class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              0
            </span>
          </a>

          <!-- Sezione utente -->
          <div class="user-section"></div>

        </div>

      </div>
    </nav>
    `;

    // Inserisce la navbar all'inizio del body
    document.body.insertAdjacentHTML("afterbegin", navbarHTML);
}