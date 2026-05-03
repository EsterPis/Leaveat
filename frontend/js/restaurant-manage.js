// =============================
// IMPORT + GLOBAL STATE
// =============================
import { renderDishRow } from "./utils/ui-components.js";

const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('id');
const token = localStorage.getItem('token');
let selectedDishId = null;
// =============================
// INIT
// =============================
document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

function initPage() {
    if (!checkAuth()) return;

    bindStaticEvents();
    bindCatalogFilters();
    bindAddDishForm();
    bindImportModal();

    loadInitialData();
}

// =============================
// AUTH
// =============================
function checkAuth() {
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }

    if (!restaurantId) {
        alert('Ristorante non specificato');
        window.location.href = 'restaurateur-dashboard.html';
        return false;
    }

    return true;
}

// =============================
// EVENT BINDING
// =============================
function bindStaticEvents() {

    const refreshBtn = document.getElementById('btn-refresh-orders');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadOrders);
    }

    const deleteBtn = document.getElementById('btn-delete-restaurant');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteRestaurant);
    }

    const btnEditInfo = document.getElementById('btn-edit-info');
    if (btnEditInfo) {
        btnEditInfo.addEventListener('click', () => {
            window.location.href = `edit-restaurant-info.html?id=${restaurantId}`;
        });
    }

    const btnAddDish = document.getElementById('btn-add-dish');
    if (btnAddDish) {
        btnAddDish.addEventListener('click', openAddDishModal);
    }
}

// =============================
// INITIAL LOAD
// =============================
function loadInitialData() {
    loadRestaurantDetails();
    loadOrders();
    loadStats();
}

// =============================
// MODALI + FORM
// =============================
function openAddDishModal() {
    const modal = new bootstrap.Modal(document.getElementById('addDishModal'));
    loadCatalogList('');
    modal.show();
}

function bindAddDishForm() {

    const addDishForm = document.getElementById('add-dish-form');
    if (!addDishForm) return;

    addDishForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('dish-name').value;
        const category = document.getElementById('dish-category').value;
        const price = document.getElementById('dish-price').value;
        const ingredientsStr = document.getElementById('dish-ingredients').value;
        const description = document.getElementById('dish-description').value;
        const prepTimeInput = document.getElementById('dish-preptime').value;

        const ingredients = ingredientsStr
            .split(',')
            .map(i => i.trim())
            .filter(i => i.length > 0);

        if (!ingredients.length) {
            alert('Inserisci almeno un ingrediente');
            return;
        }

        const payload = {
            name,
            category,
            price: parseFloat(price),
            ingredients,
            description,
            restaurantId,
            prepTime: prepTimeInput ? parseInt(prepTimeInput) : 15
        };

        try {
            const response = await fetch('/api/lv/dishes', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const json = await response.json();

            if (response.ok) {
                alert('Piatto aggiunto con successo!');

                const modal = bootstrap.Modal.getInstance(document.getElementById('addDishModal'));
                modal?.hide();

                addDishForm.reset();
                loadRestaurantDetails();
            } else {
                alert(json.message || 'Errore');
            }

        } catch (err) {
            console.error(err);
            alert('Errore di comunicazione');
        }
    });
}

// =============================
// FILTRI CATALOGO
// =============================
function bindCatalogFilters() {

    const categorySelect = document.getElementById('catalog-category-filter');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            const query = document.getElementById('catalog-search-input').value;
            loadCatalogList(query);
        });
    }

    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) {
        const debouncedSearch = debounce(() => {
            loadCatalogList(searchInput.value);
        }, 300);

        searchInput.addEventListener('input', debouncedSearch);
    }

    const ingredientInput = document.getElementById('catalog-ingredient-filter');
    if (ingredientInput) {
        ingredientInput.addEventListener('input', () => {
            const query = document.getElementById('catalog-search-input').value;
            loadCatalogList(query);
        });
    }
}

// =============================
// CLONE MENU
// =============================
async function setupCloneInsideModal() {
    try {
        const response = await fetch('/api/lv/restaurants/my-restaurants', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();
        const others = json.data.filter(r => r._id !== restaurantId);

        const btn = document.getElementById('btn-open-clone-modal');

        if (others.length > 0) {
            btn.classList.remove('d-none');
            btn.onclick = () => openCloneModal(others);
        }

    } catch (err) {
        console.error(err);
    }
}

function openCloneModal(restaurants) {
    const modal = new bootstrap.Modal(document.getElementById('cloneMenuModal'));
    const select = document.getElementById('select-source-res');
    const previewContainer = document.getElementById('preview-menu-container');
    const previewList = document.getElementById('preview-list');
    const confirmBtn = document.getElementById('btn-confirm-clone');

    confirmBtn.disabled = true;
    previewContainer.style.display = 'none';

    select.innerHTML = '<option value="">Scegli...</option>' +
        restaurants.map(r => `<option value="${r._id}">${r.displayName}</option>`).join('');

    select.onchange = async () => {

        const sourceId = select.value;

        confirmBtn.disabled = true;
        previewContainer.style.display = 'none';

        if (!sourceId) return;

        try {
            const res = await fetch(`/api/lv/restaurants/${sourceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const json = await res.json();
            const dishes = json.data.menuId?.dishIds || [];

            previewList.innerHTML = dishes.map(d =>
                `<li class="list-group-item">${d.name} (€${d.price})</li>`
            ).join('');

            previewContainer.style.display = 'block';
            confirmBtn.disabled = false;

            confirmBtn.onclick = async () => {
                await fetch(`/api/lv/restaurants/${restaurantId}/clone-menu`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sourceRestaurantId: sourceId })
                });

                modal.hide();
                loadRestaurantDetails();
            };

        } catch (err) {
            console.error(err);
        }
    };

    modal.show();
}

// =============================
// RESTAURANT DETAILS
// =============================
async function loadRestaurantDetails() {
    try {
        const response = await fetch(`/api/lv/restaurants/${restaurantId}/manage`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();
        if (!json.success) throw new Error(json.message);

        const r = json.data;

        await setupCloneInsideModal();

        const nameEl = document.getElementById('nav-restaurant-name');

        if (nameEl) {
            nameEl.textContent = r.displayName;
        }

        document.getElementById('info-content').innerHTML = `
            <div class="col-md-6">
                <p><strong>Nome Legale:</strong> ${r.legalName}</p>
                <p><strong>Indirizzo:</strong> ${r.address.street} ${r.address.number}, ${r.address.city}</p>
            </div>
        `;

        renderMenu(r.menuId?.dishIds || []);

    } catch (err) {
        console.error(err);
        alert('Errore caricamento');
    }
}

function renderMenu(dishes) {
    const tbody = document.getElementById('menu-table-body');
    tbody.innerHTML = '';

    if (!dishes.length) {
        tbody.innerHTML = '<tr><td colspan="5">Nessun piatto</td></tr>';
        return;
    }

    dishes.forEach(dish => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${dish.name}</td>
            <td>€ ${dish.price.toFixed(2)}</td>
            <td>
                <span class="badge bg-info text-dark">
                    ${dish.prepTime || 15} min
                </span>
            </td>
            <td>
                <span class="badge bg-light text-dark border">
                    ${dish.category}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-warning text-white btn-edit-dish me-2"
                    data-dish-id="${dish._id}">
                    <i class="fas fa-pencil-alt"></i>
                </button>

                <button class="btn btn-sm btn-danger text-white btn-delete-dish"
                    data-dish-id="${dish._id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    bindMenuEvents();
}

// =============================
// MENU EVENTS
// =============================
function bindMenuEvents() {

    document.querySelectorAll('.btn-edit-dish').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dishId = e.currentTarget.dataset.dishId;
            window.location.href = `edit-dish.html?id=${restaurantId}&dishId=${dishId}`;
        });
    });

    document.querySelectorAll('.btn-delete-dish').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dishId = e.currentTarget.dataset.dishId;

            if (confirm('Eliminare?')) {
                deleteDish(dishId);
            }
        });
    });
}

// =============================
// DELETE DISH
// =============================
async function deleteDish(dishId) {
    try {
        const response = await fetch(`/api/lv/dishes/${dishId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadRestaurantDetails();
        }

    } catch (err) {
        console.error(err);
    }
}

// =============================
// ORDERS
// =============================
async function loadOrders() {

    const container = document.getElementById('orders-container');
    container.innerHTML = '<div class="spinner-border text-primary"></div>';

    try {
        const response = await fetch(`/api/lv/orders/restaurant/${restaurantId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();
        const orders = json.data || [];

        container.innerHTML = '';

        if (!orders.length) {
            container.innerHTML = '<div class="alert alert-info">Nessun ordine</div>';
            return;
        }

        orders.forEach(order => {

            let badgeClass = 'bg-secondary';
            if (order.status === 'ORDINATO') badgeClass = 'bg-warning text-dark';
            if (order.status === 'IN_PREPARAZIONE') badgeClass = 'bg-info text-dark';
            if (order.status === 'CONSEGNATO') badgeClass = 'bg-success';
            if (order.status === 'ANNULLATO') badgeClass = 'bg-danger';

            const card = document.createElement('div');
            card.className = 'card mb-3 shadow-sm';

            card.innerHTML = `
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5>Ordine #${order._id.slice(-6)}</h5>
                        <p class="mb-1">Totale: € ${order.totalPrice.toFixed(2)}</p>
                        <span class="badge ${badgeClass}">${order.status}</span>
                        <small class="text-muted ms-2">
                            ${new Date(order.createdAt).toLocaleString()}
                        </small>
                    </div>
                    <div class="text-end">
                        <button class="btn btn-outline-secondary btn-sm mb-2 btn-details">
                            Dettagli
                        </button>
                        <br>
                        <button class="btn btn-sm btn-primary btn-update">
                            Aggiorna Stato
                        </button>
                    </div>
                </div>
            `;

            // eventi
            card.querySelector('.btn-details').addEventListener('click', () => {
                showOrderDetails(order);
            });

            card.querySelector('.btn-update').addEventListener('click', () => {

                if (order.status === 'ORDINATO') {
                    updateStatus(order._id, 'IN_PREPARAZIONE');
                } else if (order.status === 'IN_PREPARAZIONE') {
                    updateStatus(order._id, 'CONSEGNATO');
                }
            });

            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="alert alert-danger">Errore caricamento ordini</div>`;
    }
}

function showOrderDetails(order) {

    const modal = new bootstrap.Modal(
        document.getElementById('orderDetailsModal')
    );

    let itemsHtml = '';

    order.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td>${item.dishId.name}</td>
                <td>${item.quantity}</td>
                <td>€ ${(item.dishId.price * item.quantity).toFixed(2)}</td>
            </tr>
        `;
    });

    const html = `
        <p><strong>Cliente:</strong> ${order.customerId?.firstName || ''} ${order.customerId?.lastName || ''}</p>
        <p><strong>Stato:</strong> ${order.status}</p>
        <p><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString()}</p>

        <hr>

        <table class="table">
            <thead>
                <tr>
                    <th>Piatto</th>
                    <th>Quantità</th>
                    <th>Subtotale</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <h5 class="text-end">
            Totale: € ${order.totalPrice.toFixed(2)}
        </h5>
    `;

    document.getElementById('order-details-body').innerHTML = html;

    modal.show();
}

async function updateStatus(orderId, newStatus) {
    if (!confirm(`Cambiare stato in ${newStatus}?`)) return;

    try {
        const response = await fetch(`/api/lv/orders/${orderId}/status`, {
            method: 'PATCH', // Come da specifiche [cite: 482]
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            loadOrders(); // Ricarica la lista
        } else {
            alert('Errore aggiornamento stato');
        }
    } catch (err) {
        console.error(err);
        alert('Errore di rete');
    }
}

// =============================
// DELETE RESTAURANT
// =============================
async function deleteRestaurant() {

    if (!confirm("Sei sicuro?")) return;

    try {
        const response = await fetch(`/api/lv/restaurants/${restaurantId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            window.location.href = "restaurateur-dashboard.html";
        }

    } catch (err) {
        console.error(err);
    }
}

// =============================
// STATS
// =============================
async function loadStats() {
    try {
        const res = await fetch(`/api/lv/restaurants/${restaurantId}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await res.json();
        if (!json.success) throw new Error();

        const stats = json.data;

        renderSummary(stats.summary);
        renderOrdersChart(stats.ordersByDay);
        renderTopDishesChart(stats.topDishes);

    } catch (err) {
        console.error(err);
        document.getElementById('stats-pane').innerHTML =
            `<div class="alert alert-danger">Errore caricamento statistiche</div>`;
    }
}

function renderSummary(summary) {
    document.getElementById('stat-total-orders').textContent = summary.totalOrders;
    document.getElementById('stat-completed-orders').textContent = summary.completedOrders;
    document.getElementById('stat-revenue').textContent = `€${summary.revenue.toFixed(2)}`;
    document.getElementById('stat-average').textContent = `€${summary.avgOrder.toFixed(2)}`;
}

// =============================
// CATALOGO
// =============================
async function loadCatalogList(nameQuery = '') {

    const container = document.getElementById('catalog-results');
    if (!container) return;

    container.innerHTML = 'Loading...';

    try {
        const res = await fetch(`/api/lv/dishes?name=${nameQuery}`);
        const json = await res.json();

        container.innerHTML = '';

        json.data.forEach(d => {
            container.appendChild(
                renderDishRow(d, 'Importa', () => importDish(d._id))
            );
        });

    } catch (err) {
        console.error(err);
    }
}

// =============================
// IMPORT DISH
// =============================
async function importDish(id) {
    console.log("Import dish", id);
        selectedDishId = id;

    const modal = new bootstrap.Modal(
        document.getElementById('importDishModal')
    );

    modal.show();
}

function bindImportModal() {
    const btn = document.getElementById('confirm-import-btn');

    if (!btn) return;

    btn.addEventListener('click', async () => {

        const price = document.getElementById('import-price').value;
        const prepTime = document.getElementById('import-preptime').value;

        if (!price) {
            alert("Inserisci il prezzo");
            return;
        }

        try {
            const response = await fetch(`/api/lv/dishes/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    catalogDishId: selectedDishId,
                    restaurantId,
                    price: parseFloat(price),
                    prepTime: prepTime ? parseInt(prepTime) : 15
                })
            });

            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(
                    document.getElementById('importDishModal')
                );

                modal.hide();

                loadRestaurantDetails();
            } else {
                alert("Errore import");
            }

        } catch (err) {
            console.error(err);
        }
    });
}

// =============================
// UTILS
// =============================
function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

function renderOrdersChart(data) {

    const labels = data.map(d => d._id);
    const values = data.map(d => d.count);

    const ctx = document.getElementById('ordersChart');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ordini',
                data: values,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderTopDishesChart(data) {

    const labels = data.map(d => d.name);
    const values = data.map(d => d.totalSold);

    const ctx = document.getElementById('topDishesChart');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Venduti',
                data: values
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y'
        }
    });
}