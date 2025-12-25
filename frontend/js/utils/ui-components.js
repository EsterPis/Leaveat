// src/public/js/utils/ui-components.js

export function renderDishRow(dish, buttonText, onClick, isAdded = false) {
    const div = document.createElement('div');
    // Manteniamo lo stile coerente con la registrazione
    div.className = "list-group-item d-flex align-items-center p-3 mb-2 shadow-sm border rounded justify-content-between";

    div.innerHTML = `
        <div class="d-flex align-items-center flex-grow-1">
            <img src="${dish.imageUrl || dish.image || 'https://via.placeholder.com/80'}" 
                 class="rounded me-3" 
                 style="width: 80px; height: 80px; object-fit: cover;">
            
            <div class="flex-grow-1">
                <h6 class="mb-1 fw-bold">${dish.name}</h6>
                <div class="mb-1">
                    <span class="badge bg-info text-dark small">${dish.category}</span>
                    <span class="text-muted small ms-2">${dish.area || ''}</span>
                </div>
                <p class="mb-0 small text-muted text-truncate" style="max-width: 300px;">
                    ${dish.ingredients ? dish.ingredients.join(', ') : 'Nessun ingrediente'}
                </p>
            </div>
        </div>

        <div class="ms-3 text-end d-flex align-items-center gap-2">
            <a href="dish-details.html?id=${dish._id}" target="_blank" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-eye"></i> Dettagli
            </a>
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