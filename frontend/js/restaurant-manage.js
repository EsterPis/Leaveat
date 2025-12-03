//Preleva parametri URL
const urlParams = new URLSearchParams(window.location.search); 
const restaurantId = urlParams.get('id');
const token = localStorage.getItem('token');

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

    // Carica i dati iniziali
    loadRestaurantDetails();
    // Carica gli ordini
    loadOrders();
});

// FUNZIONE 1: Carica Dettagli e Menù
async function loadRestaurantDetails() {
    try {
        // Chiama la rotta GET /api/lv/restaurants/:id
        const response = await fetch(`/api/lv/restaurants/${restaurantId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();
        if (!json.success) throw new Error(json.message);

        const r = json.data; // Oggetto Ristorante

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
                        <button class="btn btn-sm btn-info text-white" title="Modifica Piatto">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
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
            // Calcolo colore badge stato
            let badgeClass = 'bg-secondary';
            if (order.status === 'ORDINATO') badgeClass = 'bg-warning text-dark';
            if (order.status === 'IN_PREPARAZIONE') badgeClass = 'bg-info text-dark';
            if (order.status === 'CONSEGNATO') badgeClass = 'bg-success';

            // HTML pulsanti azione (mostra solo se ha senso logico)
            let actionButtons = '';
            if (order.status === 'ORDINATO') {
                actionButtons = `<button class="btn btn-sm btn-primary" onclick="updateStatus('${order._id}', 'IN_PREPARAZIONE')">Inizia Preparazione</button>`;
            } else if (order.status === 'IN_PREPARAZIONE') {
                actionButtons = `<button class="btn btn-sm btn-success" onclick="updateStatus('${order._id}', 'CONSEGNATO')">Segna come Consegnato</button>`;
            }

            const card = document.createElement('div');
            card.className = 'card mb-3 border-start border-4 border-primary';
            card.innerHTML = `
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">Ordine #${order._id.slice(-6)}</h5> <p class="mb-1 text-muted">Totale: € ${order.totalPrice}</p>
                        <span class="badge ${badgeClass}">${order.status}</span>
                        <small class="text-muted ms-2">${new Date(order.createdAt).toLocaleString()}</small>
                    </div>
                    <div>
                        ${actionButtons}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="alert alert-danger">Errore caricamento ordini.</div>`;
    }
}

// FUNZIONE 3: Aggiorna Stato Ordine
async function updateStatus(orderId, newStatus) {
    if(!confirm(`Cambiare stato in ${newStatus}?`)) return;

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