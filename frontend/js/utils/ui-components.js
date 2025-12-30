export function renderDishRow(dish, buttonText, onClick, isAdded = false) {
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
}

export function renderRestaurantForm() {
    return `
        <div class="card p-4 mb-4 shadow-sm border-0">
            <h3 class="h5 mb-3 text-primary"><i class="bi bi-shop me-2"></i>Dati del Ristorante</h3>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-bold">Nome Visualizzato</label>
                    <input type="text" id="res-displayName" class="form-control" required placeholder="Es. Pizzeria Da Mario">
                </div>
                <div class="col-md-6">
                    <label class="form-label small fw-bold">Ragione Sociale</label>
                    <input type="text" id="res-legalName" class="form-control" required>
                </div>
                <div class="col-md-12">
                    <label class="form-label small fw-bold">Indirizzo Completo</label>
                    <input type="text" id="res-address" class="form-control" placeholder="Via Roma 1, Milano">
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