//Preleva parametri URL
const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('id');
const token = localStorage.getItem('token');

import { renderDishRow } from "./utils/ui-components.js";

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    if (!restaurantId) {
        alert('Ristorante non specificato');
        window.location.href = 'restaurateur-dashboard.html';
        return;
    }

    const refreshBtn = document.getElementById('btn-refresh-orders');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadOrders();
        });
    }

    // Carica i dati iniziali
    loadRestaurantDetails();
    // Carica gli ordini
    loadOrders();
    loadStats();
});

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
        restaurants.map(r =>
            `<option value="${r._id}">${r.displayName}</option>`
        ).join('');

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
                `<li class="list-group-item">
                    ${d.name} (€${d.price})
                </li>`
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

// FUNZIONE 1: Carica Dettagli e Menù
async function loadRestaurantDetails() {
    try {
        // Chiama la rotta GET /api/lv/restaurants/:id/manage
        const response = await fetch(`/api/lv/restaurants/${restaurantId}/manage`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();
        if (!json.success) throw new Error(json.message);

        const r = json.data; // Oggetto Ristorante
        await setupCloneInsideModal();

        // 1. Popola Header e Info Tab
        document.getElementById('nav-restaurant-name').textContent = r.displayName;

        const infoHtml = `
            <div class="col-md-6">
                <p><strong>Nome Legale:</strong> ${r.legalName}</p>
                <p><strong>Indirizzo:</strong> ${r.address.street} ${r.address.number}, ${r.address.city} (${r.address.province})</p>
                <p><strong>Telefono:</strong> ${r.phoneNumber}</p>
                <p><strong>Email:</strong> ${r.email || 'N/D'}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Orari:</strong> ${r.openingHours}</p>
                <p><strong>Descrizione:</strong> ${r.description || '-'}</p>
                <p><strong>Stato:</strong> <span class="badge bg-${r.status === 'ACTIVE' ? 'success' : 'secondary'}">${r.status}</span></p>
            </div>
        `;
        document.getElementById('info-content').innerHTML = infoHtml;

        // 2. Popola Tab Menù
        const tbody = document.getElementById('menu-table-body');
        tbody.innerHTML = '';
        if (r.menuId && r.menuId.dishIds && r.menuId.dishIds.length > 0) {
            r.menuId.dishIds.forEach(dish => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dish.name}</td>
                    <td><span class="badge bg-light text-dark border">${dish.category}</span></td>
                    <td>€ ${dish.price.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-warning text-white btn-edit-dish me-2" data-dish-id="${dish._id}" title="Modifica Piatto">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-danger text-white btn-delete-dish" data-dish-id="${dish._id}" title="Elimina Piatto">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            // Dopo aver popolato la tabella, leghiamo gli eventi dinamici
            bindMenuEvents();
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nessun piatto nel menù.</td></tr>';
        }

    } catch (err) {
        console.error(err);
        alert('Errore caricamento dati ristorante: ' + err.message);
    }
}

// FUNZIONE 2: Carica e Gestisci Ordini
async function loadOrders() {
    const container = document.getElementById('orders-container');
    container.innerHTML = '<div class="spinner-border text-primary" role="status"></div>';

    try {
        // NOTA: Assicurati di avere questa rotta nel backend (es. in un file orders.js)
        // Se non esiste ancora, dovrai crearla seguendo le specifiche tecniche.
        const response = await fetch(`/api/lv/orders/restaurant/${restaurantId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Se la rotta non esiste ancora (404), gestiamo l'errore gentilmente per ora
        if (response.status === 404) {
            container.innerHTML = `<div class="alert alert-warning">
                API Ordini non trovata. Assicurati di aver implementato la rotta backend 
                <code>GET /api/lv/orders/restaurant/:id</code> o simile.
            </div>`;
            return;
        }

        const json = await response.json();
        const orders = json.data || [];

        container.innerHTML = ''; // Pulisci spinner

        if (orders.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Non ci sono ordini per questo ristorante.</div>';
            return;
        }

        // Genera Card Ordini
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

            // EVENT LISTENERS CORRETTI
            const detailsBtn = card.querySelector('.btn-details');
            detailsBtn.addEventListener('click', () => {
                showOrderDetails(order);
            });

            const updateBtn = card.querySelector('.btn-update');
            updateBtn.addEventListener('click', () => {

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
        container.innerHTML = `<div class="alert alert-danger">Errore caricamento ordini.</div>`;
    }
}

// FUNZIONE 3: Aggiorna Stato Ordine
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

//Modifica Dati Ristorante (pulsante grande in Info Tab)
const btnEditInfo = document.getElementById('btn-edit-info');
if (btnEditInfo) {
    btnEditInfo.addEventListener('click', () => {
        // Reindirizza a una pagina dedicata per la modifica dei dati del ristorante
        window.location.href = `edit-restaurant-info.html?id=${restaurantId}`;
    });
}

//Aggiungi Piatto (pulsante grande in Menù Tab)
// Questo pulsante ora apre il Modale (il codice del modale deve essere nell'HTML)
const btnAddDish = document.getElementById('btn-add-dish');
if (btnAddDish) {
    btnAddDish.addEventListener('click', () => {
        // Usa la classe Bootstrap per aprire il modale
        const addDishModal = new bootstrap.Modal(document.getElementById('addDishModal'));
        loadCatalogList(''); // Carica piatti catalog nel modale
        addDishModal.show();
    });
}


//Gestione invio form (POST /api/lv/dishes)
const addDishForm = document.getElementById('add-dish-form');

if (addDishForm) {
    addDishForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('dish-name').value;
        const category = document.getElementById('dish-category').value;
        const price = document.getElementById('dish-price').value;
        const ingredientsStr = document.getElementById('dish-ingredients').value;
        const description = document.getElementById('dish-description').value;

        // Converto la stringa di ingredienti in un array
        const ingredients = ingredientsStr.split(',').map(i => i.trim()).filter(i => i.length > 0);

        if (ingredients.length === 0) {
            alert('Inserisci almeno un ingrediente, separando con una virgola.');
            return;
        }

        const payload = {
            name: name,
            category: category,
            price: parseFloat(price),
            ingredients: ingredients,
            description: description,
            restaurantId: restaurantId // Variabile globale definita in cima al file
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

                // Chiudi il modale
                const modalElement = document.getElementById('addDishModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }

                addDishForm.reset();
                loadRestaurantDetails(); // Ricarica la tabella per mostrare il nuovo piatto
            } else {
                alert('Errore: ' + (json.message || 'Errore sconosciuto.'));
            }
        } catch (error) {
            console.error(error);
            alert('Errore di comunicazione col server.');
        }
    });
}



//Collega Eventi ai Pulsanti dei Piatti (chiamata da loadRestaurantDetails)
function bindMenuEvents() {
    // Gestione click per la modifica del singolo piatto
    document.querySelectorAll('.btn-edit-dish').forEach(button => {
        button.addEventListener('click', (e) => {
            const dishId = e.currentTarget.getAttribute('data-dish-id');
            // Reindirizza a una pagina di modifica piatto, passando l'ID del piatto
            // Dovrai creare la pagina edit-dish.html
            window.location.href = `edit-dish.html?id=${restaurantId}&dishId=${dishId}`;
        });
    });

    // Gestione click per l'eliminazione del singolo piatto
    document.querySelectorAll('.btn-delete-dish').forEach(button => {
        button.addEventListener('click', (e) => {
            const dishId = e.currentTarget.getAttribute('data-dish-id');
            if (confirm(`Sei sicuro di voler eliminare il piatto? (ID: ${dishId})`)) {
                deleteDish(dishId); // Chiama la funzione API
            }
        });
    });
}

//Eliminazione Piatto (Richiesta DELETE /api/lv/dishes/:id)
async function deleteDish(dishId) {
    try {
        const response = await fetch(`/api/lv/dishes/${dishId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Piatto eliminato con successo!');
            loadRestaurantDetails(); // Ricarica la tabella dopo l'eliminazione
        } else {
            const json = await response.json();
            alert('Errore nell\'eliminazione del piatto: ' + (json.message || 'Errore sconosciuto.'));
        }
    } catch (error) {
        console.error('Errore di comunicazione: ', error);
        alert('Errore di comunicazione col server.');
    }
}

// GESTIONE RICERCA CATALOGO
const btnSearchCatalog = document.getElementById('btn-search-catalog');
if (btnSearchCatalog) {
    btnSearchCatalog.addEventListener('click', async () => {
        const query = document.getElementById('catalog-search-input').value;
        const resultsContainer = document.getElementById('catalog-results');

        resultsContainer.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div> Caricamento...';

        try {
            // Chiama la rotta catalog esistente
            const res = await fetch(`/api/lv/dishes/catalog?name=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();

            resultsContainer.innerHTML = '';

            if (!json.data || json.data.length === 0) {
                resultsContainer.innerHTML = '<p class="text-center">Nessun risultato.</p>';
                return;
            }

            json.data.forEach(dish => {
                const dishRow = renderDishRow(dish, 'Importa', (d) => importDish(dish._id));
                resultsContainer.appendChild(dishRow);
            });
        } catch (err) {
            resultsContainer.innerHTML = '<p class="text-danger">Errore ricerca.</p>';
        }
    });
}

async function importDish(catalogDishId) {
    const price = prompt("Inserisci il prezzo di vendita per questo piatto (es. 12.50):");
    if (!price) return;

    const urlParams = new URLSearchParams(window.location.search);
    const currentRestaurantId = urlParams.get('id');

    console.log("DEBUG FRONTEND - Invio importazione per ristorante:", currentRestaurantId);

    try {
        const response = await fetch('/api/lv/dishes/import', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                catalogDishId: catalogDishId,
                restaurantId: currentRestaurantId, // Variabile globale dalla pagina
                price: parseFloat(price)
            })
        });

        const json = await response.json();
        if (json.success) {
            alert('Piatto importato!');
            loadRestaurantDetails(); // Ricarica la tabella
            // Opzionale: chiudi modale
        } else {
            alert('Errore: ' + json.message);
        }
    } catch (err) {
        alert('Errore di comunicazione');
    }
}

/**
 * Carica i piatti dal catalogo e li mostra nel modale.
 * Se nameQuery è vuota, mostra i piatti predefiniti.
 */
async function loadCatalogList(nameQuery = '') {
    const resultsContainer = document.getElementById('catalog-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm text-primary"></div> Caricamento...</div>';

    try {
        const url = nameQuery
            ? `/api/lv/dishes/catalog?name=${encodeURIComponent(nameQuery)}`
            : `/api/lv/dishes/catalog`;

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        resultsContainer.innerHTML = '';

        if (!json.success || !json.data || json.data.length === 0) {
            resultsContainer.innerHTML = '<p class="text-center text-muted p-3">Nessun piatto trovato.</p>';
            return;
        }

        json.data.forEach(dish => {
            // Utilizza la funzione renderDishRow importata dal modulo ui-components.js
            const dishRow = renderDishRow(dish, 'Importa', (d) => importDish(d._id));
            resultsContainer.appendChild(dishRow);
        });
    } catch (err) {
        resultsContainer.innerHTML = '<p class="text-danger text-center p-3">Errore nel caricamento.</p>';
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

async function loadStats() {

    try {

        const response = await fetch(`/api/lv/restaurants/${restaurantId}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();

        if (!json.success) throw new Error(json.message);

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

    document.getElementById('stat-total-orders').textContent =
        summary.totalOrders;

    document.getElementById('stat-completed-orders').textContent =
        summary.completedOrders;

    document.getElementById('stat-revenue').textContent =
        `€${summary.revenue.toFixed(2)}`;

    document.getElementById('stat-average').textContent =
        `€${summary.avgOrder.toFixed(2)}`;
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
                legend: {
                    display: false
                }
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
