// ui-components.js

export function renderDishRow(dish, buttonText, onClick, isAdded = false) {
    const div = document.createElement('div');
    // Stile coerente per righe catalogo e riepilogo
    div.className = "list-group-item d-flex align-items-center p-2 mb-2 shadow-sm border rounded justify-content-between bg-white";
    const imgUrl = dish.imageUrl || dish.image || '../assets/logo-default.jpg';

    // Gestione ingredienti: se è array unisci, se stringa usa quella, se null metti trattino
    const ingredientsText = Array.isArray(dish.ingredients)
        ? dish.ingredients.join(', ')
        : (dish.ingredients || '-');

    div.innerHTML = `
        <div class="d-flex align-items-center flex-grow-1 overflow-hidden">
            <img src="${imgUrl}" class="rounded me-3 flex-shrink-0" style="width: 60px; height: 60px; object-fit: cover;">
            
            <div class="flex-grow-1 min-w-0">
                <h6 class="mb-0 fw-bold text-truncate">${dish.name}</h6>
                <div class="small text-muted text-truncate">${dish.category || 'Generico'}</div>
                <div class="small text-muted text-truncate" style="font-size: 0.8rem;">${ingredientsText}</div>
            </div>
        </div>

        <div class="ms-3 text-end flex-shrink-0">
            <div class="fw-bold mb-1">€ ${dish.price ? parseFloat(dish.price).toFixed(2) : '0.00'}</div>
            <button class="btn btn-sm ${isAdded ? 'btn-secondary' : 'btn-primary'} action-btn" ${isAdded ? 'disabled' : ''}>
                ${isAdded ? '<i class="bi bi-check"></i>' : '<i class="bi bi-plus"></i> ' + buttonText}
            </button>
        </div>
    `;

    const btn = div.querySelector('.action-btn');
    if (!isAdded && btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            onClick(dish);
        });
    }

    return div;
}

export function renderRestaurantForm() {
    // ... (Tutto il codice precedente del form ristorante rimane identico) ...
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
                        <div class="row g-2 mb-3">
                            <div class="col-md-4">
                                <input type="text" id="catalog-search-name" class="form-control" placeholder="Nome piatto...">
                            </div>
                            <div class="col-md-4">
                                <select id="catalog-search-category" class="form-select">
                                    <option value="">Tutte le categorie</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <input type="text" id="catalog-search-ingredients" class="form-control" placeholder="Ingredienti (es. pollo, riso)">
                            </div>
                        </div>
                        <div id="catalog-results" class="list-group" style="max-height: 400px; overflow-y: auto;"></div>
                    </div>

                    <div class="tab-pane fade" id="custom-tab">
                        <div class="row g-2">
                            <div class="col-md-8">
                                <label class="small fw-bold">Nome Piatto <span class="text-danger">*</span></label>
                                <input type="text" id="custom-dish-name" class="form-control" placeholder="Es. Pizza Speciale">
                            </div>
                            <div class="col-md-4">
                                <label class="small fw-bold">Prezzo (€) <span class="text-danger">*</span></label>
                                <input type="number" id="custom-dish-price" class="form-control" placeholder="0.00" step="0.50">
                            </div>
                            <div class="col-md-4">
                                <label class="small fw-bold">Tempo di preparazione (minuti)</label>
                                <input type="number" id="custom-dish-preptime" class="form-control" placeholder="Es. 15" min="1">
                            </div>
                            <div class="col-md-12">
                                <label class="small fw-bold">Categoria <span class="text-danger">*</span></label>
                                <select id="custom-dish-category" class="form-select">
                                    <option value="">Caricamento categorie...</option>
                                </select>
                            </div>
                            <div class="col-md-12">
                                <label class="small fw-bold">Ingredienti / Descrizione (Separa ingredienti con virgola)</label>
                                <textarea id="custom-dish-desc" class="form-control" placeholder="Es. Pomodoro, Mozzarella, Basilico" rows="2"></textarea>
                                <div class="form-text small">Importante: gli ingredienti verranno salvati separando il testo con le virgole.</div>
                            </div>
                            <div class="col-12 text-end mt-2">
                                <button class="btn btn-success" id="btn-add-custom-dish"><i class="bi bi-plus-circle"></i> Aggiungi al Menù</button>
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