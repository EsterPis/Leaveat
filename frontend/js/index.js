document.addEventListener("DOMContentLoaded", initHome);

// If the user is a customer, show a personalized homepage
async function initHome() {
    const role = localStorage.getItem("role");

    if (role !== "CUSTOMER") return; //standard homepage

    renderPersonalizedSections();

    const data = await fetchCustomerProfile();
    const profileData = await fetchCustomerProfile();

    if (profileData?.profile) {
        const favorites = profileData.profile.preferences?.favoriteRestaurantIds;
        renderFavoriteRestaurants(favorites);
    }

    const orders = await fetchUserOrders();
    const recentRestaurants = getRecentRestaurants(orders);
    renderRecentRestaurants(recentRestaurants);
}

/* B → UTILITY FUNCTIONS */
function renderPersonalizedSections() {
    const container = document.getElementById("personalized-home");
    if (!container) return;

    container.innerHTML = `
        <!-- Ristoranti preferiti -->
        <section class="mb-5" style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h3 class="mb-3">⭐ Preferiti </h3>
            <div id="favorite-restaurants" class="row g-3"></div>
        </section>

        <!-- Ultimi ordini -->
        <section class="mb-5" style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h3 class="mb-3">🕓 Gli ultimi da cui hai ordinato </h3>
            <div id="recent-restaurants" class="row g-3"></div>
        </section>
    `;
}

async function fetchCustomerProfile() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("http://localhost:3005/api/lv/users/me", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) throw new Error("Errore fetch profilo");
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Errore nel recupero profilo:", err);
        return null;
    }
}

function renderFavoriteRestaurants(restaurants) {
    const container = document.getElementById("favorite-restaurants");
    if (!container) return;
    container.innerHTML = "";

    if (!restaurants || restaurants.length === 0) {
        container.innerHTML = `<p class="text-muted">Nessun ristorante preferito</p>`;
        return;
    }
    
    // creazione card ristoranti preferiti
    restaurants.forEach(r => {
        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-lg-4";
        const imageSrc = (r.imageUrl && r.imageUrl.trim() !== "")
            ? r.imageUrl
            : "/assets/logo-default.png";
        col.innerHTML = `
            <div class="card h-100 shadow-sm">

                <img src="${imageSrc}"
                    onerror="this.src='/assets/logo-default.png'"
                    class="card-img-top"
                    alt="${r.displayName}"
                    style="height:200px; object-fit:cover;">

                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${r.displayName}</h5>

                    <a href="/restaurant-details.html?id=${r._id}"
                    class="btn btn-outline-primary btn-sm mt-auto">
                    Visualizza menu
                    </a>
                </div>
            </div>
        `;

        container.appendChild(col); //inserimento della card nel container
    });
}

// recupero ordini dal db
async function fetchUserOrders() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("http://localhost:3005/api/lv/orders/my-orders", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) throw new Error("Errore fetch ordini");

        const data = await response.json();
        return data.data || [];

    } catch (err) {
        console.error("Errore nel recupero ordini:", err);
        return [];
    }
}

function getRecentRestaurants(orders) {
    const seen = new Set(); //collezione per evitare duplicati
    const result = [];

    for (let order of orders) {
        const restaurant = order.restaurantId; //recupero ristorante
        if (!restaurant || seen.has(restaurant._id)) continue;

        seen.add(restaurant._id);
        result.push(restaurant);
        
        if (result.length === 3) break; //mostro solo gli ultimi 3 ristoranti
    }

    return result;
}

function renderRecentRestaurants(restaurants) {

    const container = document.getElementById("recent-restaurants");
    if (!container) return;

    container.innerHTML = "";

    if (!restaurants || restaurants.length === 0) {
        container.innerHTML = `<p class="text-muted">Nessun ordine recente</p>`;
        return;
    }

    restaurants.forEach(r => {
        const col = document.createElement("div"); 
        col.className = "col-12 col-md-6 col-lg-4";
        const imageSrc = (r.imageUrl && r.imageUrl.trim() !== "")
            ? r.imageUrl
            : "/assets/logo-default.png";

        const address = r.address
            ? `${r.address.street} ${r.address.number}, ${r.address.city} (${r.address.province})`
            : "Indirizzo non disponibile";

        col.innerHTML = `
            <div class="card h-100 shadow-sm">

                <img src="${imageSrc}"
                    onerror="this.src='/assets/logo-default.png'"
                    class="card-img-top"
                    alt="${r.displayName}"
                    style="height:200px; object-fit:cover;">

                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${r.displayName}</h5>

                    <p class="card-text small text-muted mb-3">
                        ${address}
                    </p>

                    <a href="/restaurant-details.html?id=${r._id}"
                    class="btn btn-outline-primary btn-sm mt-auto">
                    Riordina
                    </a>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}