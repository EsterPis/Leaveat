/* Renderizza, in maniera dinamica, le card relative ai ristoranti di proprtà all'interno della dashboard */
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token'); 
    const container = document.getElementById('restaurants-container');
    if (!token) {
        alert('Devi effettuare il login per accedere qui.');
        window.location.href = 'login.html'; 
        return;
    }

    try {
        // recupero ristoranti di proprietà
        const response = await fetch('/api/lv/restaurants/my-restaurants', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Header fondamentale per authMiddleware
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel caricamento dei ristoranti');
        }

        const json = await response.json();
        const restaurants = json.data; // Array dei ristoranti

        // pulizia del container
        container.innerHTML = '';

        // messaggio di errore
        if (restaurants.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="alert alert-info">Non hai ancora inserito nessun ristorante.</p></div>';
            return;
        }

        // Renderizzazione card ristoranti
        restaurants.forEach(restaurant => {
            // colonne
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-4';

            // costruzione card HTML
            col.innerHTML = `
                <div class="card restaurant-card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title fw-bold">${restaurant.displayName}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${restaurant.address.city} (${restaurant.address.province})</h6>
                        <p class="card-text text-truncate">
                            ${restaurant.description || 'Nessuna descrizione inserita.'}
                        </p>
                        
                        <hr>
                        
                        <div class="d-grid gap-2">
                            <a href="restaurant-manage.html?id=${restaurant._id}" class="btn btn-primary">
                                <i class="fas fa-store-alt"></i> Gestisci Ristorante
                            </a>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-top-0">
                         <small class="text-muted">Stato: 
                            <span class="badge ${restaurant.status === 'ACTIVE' ? 'bg-success' : 'bg-warning'}">
                                ${restaurant.status}
                            </span>
                         </small>
                    </div>
                </div>
            `;
            
            container.appendChild(col);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="alert alert-danger">Impossibile caricare i dati: ${error.message}</div>`;
    }
});