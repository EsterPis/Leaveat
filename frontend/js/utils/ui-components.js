/*export function renderDishRow(dish, buttonText, onClick, isAdded = false) {
    const div = document.createElement('div');
    div.className = "list-group-item d-flex align-items-center p-2 mb-2 shadow-sm border rounded justify-content-between";

    div.innerHTML = `
        <div class="d-flex align-items-center flex-grow-1">
            <div class="flex-grow-1">
                <h6 class="mb-0 fw-bold">${dish.name}</h6>
                <small class="text-muted">${dish.category} - €${dish.price.toFixed(2)}</small>
            </div>
        </div>
        <button class="btn btn-sm ${isAdded ? 'btn-secondary' : 'btn-primary'} action-btn" ${isAdded ? 'disabled' : ''}>
            ${isAdded ? 'Aggiunto' : buttonText}
        </button>
    `;

    if (!isAdded) {
        div.querySelector('.action-btn').addEventListener('click', (e) => {
            e.preventDefault();
            onClick(dish);
        });
    }
    return div;
}*/

export function renderDishRow(dish, buttonText, onClick, isAdded = false) {
    // ... (Il codice di questa funzione rimane invariato come concordato prima) ...
    const div = document.createElement('div');
    div.className = "list-group-item d-flex align-items-center p-3 mb-2 shadow-sm border rounded justify-content-between bg-white";

    div.innerHTML = `
        <div class="d-flex align-items-center flex-grow-1">
            <img src="${dish.imageUrl || dish.image || 'https://via.placeholder.com/80'}" 
                 class="rounded me-3" 
                 style="width: 70px; height: 70px; object-fit: cover; border: 1px solid #dee2e6;">
            
            <div class="flex-grow-1">
                <h6 class="mb-1 fw-bold">${dish.name}</h6>
                <div class="mb-1">
                    <span class="badge bg-info text-dark small">${dish.category}</span>
                    <span class="text-muted small ms-2">${dish.area || ''}</span>
                </div>
                <p class="mb-0 small text-muted text-truncate" style="max-width: 250px;">
                    ${Array.isArray(dish.ingredients) ? dish.ingredients.join(', ') : 'Nessun ingrediente'}
                </p>
            </div>
        </div>

        <div class="ms-3 text-end d-flex flex-column align-items-end">
            <div class="fw-bold mb-2">€ ${dish.price ? dish.price.toFixed(2) : '0.00'}</div>
            <button class="btn btn-sm btn-primary action-btn" ${isAdded ? 'disabled' : ''}>
                <i class="bi bi-plus-lg"></i> ${isAdded ? 'Aggiunto' : buttonText}
            </button>
        </div>
    `;

    const btn = div.querySelector('.action-btn');
    if (!isAdded) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            onClick(dish);
        });
    }

    return div;
}

export function renderRestaurantForm() {
    return `
        <div class="card p-4 mb-4 shadow-sm border-0">
            <h3 class="h5 mb-3 text-primary"><i class="bi bi-shop me-2"></i>Dati del Ristorante</h3>
            
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-bold">Nome legale del ristorante <span class="text-danger">*</span></label>
                    <input id="legalRestaurantName" class="form-control" placeholder="Es. Ristorante Rossi S.r.l." required>
                </div>
                <div class="col-md-6">
                    <label class="form-label small fw-bold">Nome commerciale (mostrato ai clienti) <span class="text-danger">*</span></label>
                    <input id="displayRestaurantName" class="form-control" placeholder="Es. Trattoria da Rossi" required>
                </div>
            </div>

            <hr class="my-3">

            <h5 class="h6 text-muted mb-3">Indirizzo</h5>
            <div class="row g-3">
                <div class="col-md-8">
                    <label class="form-label small fw-bold">Via/Piazza <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="res-street" placeholder="Es. Via Roma" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Civico <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="res-number" placeholder="10" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">CAP <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="res-zip" placeholder="00100" required>
                </div>
                <div class="col-md-5">
                    <label class="form-label small fw-bold">Città <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="res-city" placeholder="Milano" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold">Prov. <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="res-province" placeholder="MI" maxlength="2" required>
                </div>
            </div>

            <hr class="my-3">

            <h5 class="h6 text-muted mb-3">Contatti e Info</h5>
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Telefono Ristorante <span class="text-danger">*</span></label>
                    <input id="restaurantPhone" class="form-control" placeholder="3331234567" maxlength="10" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Email Ristorante</label>
                    <input id="restaurantEmail" type="email" class="form-control" placeholder="info@tuoristorante.it">
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Orari di apertura <span class="text-danger">*</span></label>
                    <input id="openingHours" class="form-control" placeholder="Es. Lun-Dom 12:00 - 23:00" required>
                </div>
            </div>

            <div class="row g-3 mt-1">
                <div class="col-md-6">
                    <label class="form-label small fw-bold">Breve descrizione</label>
                    <textarea id="description" rows="3" class="form-control" placeholder="Es. Cucina tradizionale..."></textarea>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold">Sito Web</label>
                    <input id="websiteUrl" class="form-control" placeholder="https://...">
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold">URL Logo/Immagine</label>
                    <input id="imageUrl" class="form-control" placeholder="https://...">
                </div>
            </div>
        </div>`;
}

export function renderMenuSection(showCloneButton = false) {
    return `
        <div class="card p-4 shadow-sm border-0">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="h5 mb-0 text-primary"><i class="bi bi-journal-richtext me-2"></i>Configurazione Menù</h3>
                ${showCloneButton ? `
                <button type="button" class="btn btn-outline-primary btn-sm" id="btn-open-clone-modal">
                    <i class="bi bi-copy me-1"></i> Copia da altro ristorante
                </button>` : ''}
            </div>
            
            <div id="menu-builder-tabs">
                <ul class="nav nav-tabs mb-3" id="menuTabs" role="tablist">
                    <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#catalog-tab">Catalogo</button></li>
                    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#custom-tab">Piatto Custom</button></li>
                    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#summary-tab">Riepilogo (<span id="dish-count">0</span>)</button></li>
                </ul>
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="catalog-tab">
                        <div class="input-group mb-3">
                            <input type="text" id="catalog-search-input" class="form-control" placeholder="Cerca piatto (es. Margherita)...">
                            <button class="btn btn-primary" id="btn-search-catalog">Cerca</button>
                        </div>
                        <div id="catalog-results" class="list-group" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>

                    <div class="tab-pane fade" id="custom-tab">
                        <div class="row g-2">
                            <div class="col-md-8">
                                <input type="text" id="custom-dish-name" class="form-control" placeholder="Nome Piatto">
                            </div>
                            <div class="col-md-4">
                                <input type="number" id="custom-dish-price" class="form-control" placeholder="Prezzo (€)" step="0.50">
                            </div>
                            <div class="col-md-12">
                                <input type="text" id="custom-dish-category" class="form-control" placeholder="Categoria (es. Primi, Pizze)">
                            </div>
                            <div class="col-md-12">
                                <textarea id="custom-dish-desc" class="form-control" placeholder="Descrizione / Ingredienti" rows="2"></textarea>
                            </div>
                            <div class="col-12 text-end mt-2">
                                <button class="btn btn-success btn-sm" id="btn-add-custom-dish">Aggiungi al Menù</button>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="summary-tab">
                        <div id="summary-list" class="list-group">
                            <p class="text-center text-muted my-3">Nessun piatto aggiunto.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}