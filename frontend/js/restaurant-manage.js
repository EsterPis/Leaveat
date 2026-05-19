// Import componenti UI riutilizzabili
import { renderDishRow } from "./utils/ui-components.js";

// Parametri URL e token
const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('id'); // id ristorante corrente
const token = localStorage.getItem('token');
let selectedDishId = null;

// Manipolazione DOM
document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

// FUnzione riepilogativa 
function initPage() {
    if (!checkAuth()) return; // blocca l'esecuzione se mancano token o id ristorante

    bindStaticEvents();
    bindCatalogFilters();
    bindAddDishForm();
    bindImportModal();

    loadInitialData();
}

/*------------------------------ UTILITY FUNCTIONS --------------------------------------------------- */
// Verifica la presenza di token e restaurantId
// Si controlla solo la presenza, se token non valido o scaduto viene segnalato dal backend.
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

function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
/*------------------------------ CARICAMENTO DATI INIZIALI --------------------------------------------------- */
// Collegamento di eventi statici a bottoni
function bindStaticEvents() {

    // Refresh ordini
    const refreshBtn = document.getElementById('btn-refresh-orders');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadOrders);
    }

    // Elimina ristorante
    const deleteBtn = document.getElementById('btn-delete-restaurant');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteRestaurant);
    }

    // Modifica info ristorante
    const btnEditInfo = document.getElementById('btn-edit-info');
    if (btnEditInfo) {
        btnEditInfo.addEventListener('click', () => {
            window.location.href = `edit-restaurant-info.html?id=${restaurantId}`;
        });
    }

    // Apertura modale aggiunta piatto
    const btnAddDish = document.getElementById('btn-add-dish');
    if (btnAddDish) {
        btnAddDish.addEventListener('click', openAddDishModal);
    }
}

// Funzione caricamento dati iniziali
function loadInitialData() {
    loadRestaurantDetails();
    loadOrders();
    loadStats();
}

// Caricamento dettagli ristorante
async function loadRestaurantDetails() {
    try {
        // richiesta al backend per ottenere i dettagli del ristorante
        const response = await fetch(`/api/lv/restaurants/${restaurantId}/manage`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();
        if (!json.success) throw new Error(json.message);

        const r = json.data;
        await setupCloneInsideModal();

        // popolamento sezione info ristorante
        document.getElementById('info-content').innerHTML = `
            <div class="col-md-6">
                <p><strong>Nome Legale:</strong> ${r.legalName}</p>
                <p><strong>Indirizzo:</strong> ${r.address.street} ${r.address.number}, ${r.address.city}</p>
            </div>
        `;

        renderMenu(r.menuId?.dishIds || []); // popolamento tabella menù

    } catch (err) {
        console.error(err);
        alert('Errore caricamento');
    }
}

/*------------------------------ GESTIONE MENU'--------------------------------------------------- */
// Funzione bottone apertura modale aggiunta piatto 
function openAddDishModal() {
    const modal = new bootstrap.Modal(document.getElementById('addDishModal'));
    loadCatalogList(''); // caricamento catalogo all'apertura modale
    modal.show();
}

// Aggiunta piatti personalizzati
function bindAddDishForm() {
    const addDishForm = document.getElementById('add-dish-form');
    if (!addDishForm) return;

    addDishForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Raccolta dati dal form
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

        // creazione payload per API
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
            // richiesta al backen
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

                addDishForm.reset(); // pulizia form
                loadRestaurantDetails(); // ricarica dettagli per mostrare il nuovo piatto
            } else {
                alert(json.message || 'Errore');
            }

        } catch (err) {
            console.error(err);
            alert('Errore di comunicazione');
        }
    });
}

// Filtri cataolgo
function bindCatalogFilters() {
    // ricerca per categoria
    const categorySelect = document.getElementById('catalog-category-filter');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            const query = document.getElementById('catalog-search-input').value;
            loadCatalogList(query);
        });
    }

    // ricerca per nome con debounce
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) {
        const debouncedSearch = debounce(() => { //evita fetch continuo ad ogni tasto, aspetta 300ms dopo l'ultimo input
            loadCatalogList(searchInput.value);
        }, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }

    // ricerca per ingrediente 
    const ingredientInput = document.getElementById('catalog-ingredient-filter');
    if (ingredientInput) {
        ingredientInput.addEventListener('input', () => {
            const query = document.getElementById('catalog-search-input').value;
            loadCatalogList(query);
        });
    }
}

// clonazione menù da ristoranti, popolamento modale
async function setupCloneInsideModal() {
    try {
        // recupera lista ristoranti di proprietà per clonazione
        const response = await fetch('/api/lv/restaurants/my-restaurants', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();
        const others = json.data.filter(r => r._id !== restaurantId); //esclusione ristorante corrente

        const btn = document.getElementById('btn-open-clone-modal');
        if (!btn) return;

        if (others.length > 0) {
            btn.classList.remove('d-none');
            btn.onclick = () => {
                bootstrap.Modal.getInstance(document.getElementById('addDishModal'))?.hide(); //chiusura modale aggiunta piatto
                openCloneModal(others); //modale per clonazione
            };
        }

    } catch (err) {
        console.error(err);
    }
}

// clonazione menù da ristoranti, logica modale
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
        const sourceId = select.value; // id ristorante da cui clonare
        confirmBtn.disabled = true;
        previewContainer.style.display = 'none';
        if (!sourceId) return;

        try {
            // richiesta per ottenere i piatti del ristorante selezionato
            const res = await fetch(`/api/lv/restaurants/${sourceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const json = await res.json();
            const dishes = json.data.menuId?.dishIds || [];
            // popolamento lista di anteprima piatti da clonare
            previewList.innerHTML = dishes.map(d =>
                `<li class="list-group-item">${d.name} (€${d.price})</li>`
            ).join('');

            previewContainer.style.display = 'block';
            confirmBtn.disabled = false; //abilitazzione bottone di conferma
            confirmBtn.classList.remove('disabled');

            confirmBtn.onclick = async () => {
                // richiesta di clonazione al backend
                await fetch(`/api/lv/restaurants/${restaurantId}/clone-menu`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sourceRestaurantId: sourceId })
                });

                const json = await response.json();

                modal.hide(); //chiusura modale
                loadRestaurantDetails(); //ricarica dettagli per mostrare i piatti clonati
            };

        } catch (err) {
            console.error(err);
        }
    };

    modal.show();
}

// Renderizzazione tabella menù
function renderMenu(dishes) {
    const tbody = document.getElementById('menu-table-body');
    tbody.innerHTML = '';

    if (!dishes.length) {
        tbody.innerHTML = '<tr><td colspan="5">Nessun piatto</td></tr>';
        return;
    }

    // creazione righe tabella - bottoni di modifica ed eliminazione
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

    bindMenuEvents(); // collegamento eventi ai nuovi bottoni
}

// Eventi bottoni modifica ed eliminazione piatti
function bindMenuEvents() {
    //bottoni modifica - reindirizzamento alla pagina di modifica con id piatto e ristorante
    document.querySelectorAll('.btn-edit-dish').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dishId = e.currentTarget.dataset.dishId;
            window.location.href = `edit-dish.html?id=${restaurantId}&dishId=${dishId}`;
        });
    });

    //bottoni eliminazione
    document.querySelectorAll('.btn-delete-dish').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dishId = e.currentTarget.dataset.dishId;
            //Richiesta di conferma (con dialogo nativo per semplicità)
            if (confirm('Eliminare?')) {
                deleteDish(dishId);
            }
        });
    });
}

// Eliminazione piatto - chiamata al backend
async function deleteDish(dishId) {
    try {
        // richiesta al backend
        const response = await fetch(`/api/lv/dishes/${dishId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadRestaurantDetails(); //ricarica dettagli
        }

    } catch (err) {
        console.error(err);
    }
}

// Caricamento catalogo piatti per importazione + filtri ricerca
async function loadCatalogList(nameQuery = '') {

    const container = document.getElementById('catalog-results');
    if (!container) return;

    container.innerHTML = 'Loading...';

    try {

        const category = document.getElementById('catalog-category-filter')?.value || '';
        const ingredient = document.getElementById('catalog-ingredient-filter')?.value || '';

        const params = new URLSearchParams();
        //append dei parametri di ricerca se presenti
        if (nameQuery) params.append('name', nameQuery);
        if (category) params.append('category', category);
        if (ingredient) params.append('ingredient', ingredient);

        //richiesta al backend
        const res = await fetch(`/api/lv/dishes?${params.toString()}`);
        const json = await res.json();

        container.innerHTML = '';
        //render risultati con bottoni di importazione
        json.data.forEach(d => {
            container.appendChild(
                renderDishRow(d, 'Importa', () => importDish(d._id)) //salvataggio stato piatto selezionato
            );
        });

    } catch (err) {
        console.error(err);
    }
}

// Apertura modale importazione piatto da catalogo
async function importDish(id) {
    selectedDishId = id; //salvataggio id piatto per importazione
    const modal = new bootstrap.Modal(
        document.getElementById('importDishModal')
    );

    modal.show();//apertura modale
}

// Conferma importazione piatto da catalogo, chiamata al backend
function bindImportModal() {
    const btn = document.getElementById('confirm-import-btn');
    if (!btn) return;

    // conferma importazione
    btn.addEventListener('click', async () => {
        const price = document.getElementById('import-price').value;
        const prepTime = document.getElementById('import-preptime').value;
        if (!price) {
            alert("Inserisci il prezzo");
            return;
        }

        try {
            //richiesta al backend
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
                selectedDishId = null; //reset stato piatto selezionato
                loadRestaurantDetails();
            } else {
                alert("Errore import");
            }

        } catch (err) {
            console.error(err);
        }
    });
}

/*------------------------------ GESTIONE ORDINI--------------------------------------------------- */
//Recupera gli ordini, renderizza le card e collega ai bottoni eventi di dettaglio e aggiornamento stato
async function loadOrders() {
    const container = document.getElementById('orders-container');
    container.innerHTML = '<div class="spinner-border text-primary"></div>';

    try {
        // recupero ordini dal backend
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

        // creazione card per ogni ordine con badge di stato colorato
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
                        <h5>Ordine #${order._id.slice(-6)}</h5> <!-- mostra solo ultime 6 cifre id per semplicità -->
                        <p class="mb-1">Totale: € ${order.totalPrice.toFixed(2)}</p>
                        <span class="badge ${badgeClass}">${order.status}</span>
                        <small class="text-muted ms-2">
                            ${new Date(order.createdAt).toLocaleString()} <!-- data e ora dell'ordine da ISO a formato leggibile -->
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

            // eventi dinamici
            // dettagli ordine - apertura modale con informazioni dettagliate
            card.querySelector('.btn-details').addEventListener('click', () => {
                showOrderDetails(order);
            });

            // aggiornamento stato ordine - avanzamento al passo successivo (ordinato -> in preparazione -> consegnato)
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

//Modale dettagli ordine
function showOrderDetails(order) {
    const modal = new bootstrap.Modal(
        document.getElementById('orderDetailsModal')
    );

    let itemsHtml = '';
    // creazione tabella dei piatti ordinati con nome, quantità e subtotale
    order.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td>${item.dishId.name}</td>
                <td>${item.quantity}</td>
                <td>
                    € ${item.dishId?.price
                    ? (item.dishId.price * item.quantity).toFixed(2)
                    : '0.00'}
                </td>
            </tr>
        `;
    });

    // contenuto modale con informazioni cliente, stato ordine, data e tabella dei piatti ordinati
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

    document.getElementById('order-details-body').innerHTML = html; // inserimento contenuto modale

    modal.show();
}

// Aggiornamento stato ordine
async function updateStatus(orderId, newStatus) {
    //richiesta di conferma
    if (!confirm(`Cambiare stato in ${newStatus}?`)) return;

    try {
        // richiesta al backend per aggiornamento stato ordine
        const response = await fetch(`/api/lv/orders/${orderId}/status`, {
            method: 'PATCH', 
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            loadOrders(); // Ricarica la lista
            loadStats(); // Aggiorna le statistiche
        } else {
            alert('Errore aggiornamento stato');
        }
    } catch (err) {
        console.error(err);
        alert('Errore di rete');
    }
}

/*------------------------------ GESTIONE RISTORANTE --------------------------------------------------- */
// Eliminazione definitiva ristorante
async function deleteRestaurant() {
    //richiesta di conferma con dialogo nativo
    if (!confirm("Sei sicuro?")) return;

    try {
        // richiesta al backend
        const response = await fetch(`/api/lv/restaurants/${restaurantId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            window.location.href = "restaurateur-dashboard.html"; //reindirizzamento alla dashboard
        }

    } catch (err) {
        console.error(err);
    }
}

/*------------------------------ STATISTICHE --------------------------------------------------- */
// Caricamento statistiche da backend e aggiornamento grafici
async function loadStats() {
    try {
        const res = await fetch(`/api/lv/restaurants/${restaurantId}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await res.json();
        if (!json.success) throw new Error();

        const stats = json.data;

        // delegazione rendering
        renderSummary(stats.summary);
        renderOrdersChart(stats.ordersByDay);
        renderTopDishesChart(stats.topDishes);

    } catch (err) {
        console.error(err);
        document.getElementById('stats-pane').innerHTML =
            `<div class="alert alert-danger">Errore caricamento statistiche</div>`;
    }
}

// Aggiornamento riepilogo statistiche (totale ordini, ordini completati, ricavi, prezzo medio)
function renderSummary(summary) {
    document.getElementById('stat-total-orders').textContent = summary.totalOrders;
    document.getElementById('stat-completed-orders').textContent = summary.completedOrders;
    document.getElementById('stat-revenue').textContent = `€${summary.revenue.toFixed(2) || '0.00'}`; // formattazione a 2 decimali
    document.getElementById('stat-average').textContent = `€${summary.avgOrder.toFixed(2) || '0.00'}`;
}

// Costruzione grafico andamento ordini nel tempo con Chart.js
function renderOrdersChart(data) {
    //trasformazione di array in coorinate per grafico
    const labels = data.map(d => d._id); // asse x (data)
    const values = data.map(d => d.count); // asse y (numero ordini)

    const ctx = document.getElementById('ordersChart'); //canvas per grafico
    Chart.getChart(ctx)?.destroy(); // distrugge grafico precedente se esiste 
    // creazione grafico a linee con Chart.js
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ordini',
                data: values,
                tension: 0.3 //linee grafico più morbide
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false } // nasconde legenda 
            }
        }
    });
}

// Costruzione grafico top 5 piatti più venduti con Chart.js
function renderTopDishesChart(data) {
    // trasformazione di array in coorinate per grafico
    const labels = data.map(d => d.name); // nomi piatti per asse y
    const values = data.map(d => d.totalSold); // quantità venduta per asse x

    const ctx = document.getElementById('topDishesChart');
    Chart.getChart(ctx)?.destroy();
    new Chart(ctx, {
        type: 'bar', //grafico a barre orizzontali
        data: {
            labels: labels,
            datasets: [{
                label: 'Venduti',
                data: values
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y' // asse y per grafico a barre orizzontali
        }
    });
}