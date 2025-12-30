import { renderRestaurantForm, renderMenuSection, renderDishRow } from './utils/ui-components.js';

// Stato globale del wizard
let currentDishes = [];
let isScenarioB = false;
const token = localStorage.getItem('token');

export function initRestaurantWizard(containerId, scenarioB = false) {
    isScenarioB = scenarioB;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Iniezione HTML
    container.innerHTML = `
        <div id="wizard-content">
            ${renderRestaurantForm()}
            ${renderMenuSection(isScenarioB)}
        </div>
    `;

    if (isScenarioB) {
        setupScenarioB(container);
    }
    
    // IMPORTANTE: Avviamo la logica dei tab
    setupMenuTabsHandlers();
    updateSummaryUI();
}

/**
 * LOGICA SCENARIO B (Clonazione e Salvataggio)
 */
function setupScenarioB(container) {
    // Tasto Salvataggio
    const saveBtn = document.createElement('div');
    saveBtn.className = "text-end mt-4";
    saveBtn.innerHTML = `<button id="btn-save-new-res" class="btn btn-success btn-lg">Crea Ristorante</button>`;
    container.appendChild(saveBtn);
    document.getElementById('btn-save-new-res').onclick = handleDirectCreation;

    // Gestione Modale Clonazione
    const modalElement = document.getElementById('cloneMenuModal');
    if (!modalElement) return; // Se non c'è il modale nell'HTML (es. Scenario A), esci
    
    const modal = new bootstrap.Modal(modalElement);
    const select = document.getElementById('select-source-res');
    const previewList = document.getElementById('preview-list');
    const confirmBtn = document.getElementById('btn-confirm-clone');

    document.getElementById('btn-open-clone-modal').onclick = async () => {
        try {
            const res = await fetch('/api/lv/restaurants/my-restaurants', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            select.innerHTML = '<option value="">Scegli...</option>' + 
                json.data.map(r => `<option value="${r._id}">${r.displayName}</option>`).join('');
            modal.show();
        } catch(e) { console.error(e); }
    };

    select.onchange = async () => {
        const resId = select.value;
        if (!resId) return;
        const res = await fetch(`/api/lv/restaurants/${resId}`, { headers: { 'Authorization': `Bearer ${token}` }});
        const json = await res.json();
        const dishes = json.data.menuId?.dishIds || [];
        
        // Anteprima nel modale
        previewList.innerHTML = dishes.map(d => `<li class="list-group-item">${d.name} (€${d.price})</li>`).join('');
        confirmBtn.disabled = false;
        
        confirmBtn.onclick = () => {
            // Clona: rimuove _id per renderli nuovi
            const cloned = dishes.map(({ _id, ...rest }) => ({ ...rest }));
            currentDishes = [...currentDishes, ...cloned];
            updateSummaryUI();
            modal.hide();
        };
    };
}

/**
 * LOGICA TAB MENU (Ricerca e Aggiunta)
 */
function setupMenuTabsHandlers() {
    // 1. RICERCA CATALOGO
    const searchBtn = document.getElementById('btn-search-catalog');
    const searchInput = document.getElementById('catalog-search-input');
    const resultsContainer = document.getElementById('catalog-results');

    if (searchBtn) {
        searchBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Evita refresh form
            const query = searchInput.value;
            resultsContainer.innerHTML = '<div class="spinner-border spinner-border-sm"></div>';
            
            try {
                // Se query vuota carica tutto, altrimenti filtra
                const url = query ? `/api/lv/dishes/catalog?name=${query}` : `/api/lv/dishes/catalog`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
                const json = await res.json();
                
                resultsContainer.innerHTML = '';
                if(!json.data || json.data.length === 0) {
                    resultsContainer.innerHTML = '<p class="text-muted text-center p-2">Nessun risultato</p>';
                    return;
                }

                json.data.forEach(dish => {
                    const row = renderDishRow(dish, 'Aggiungi', (d) => {
                        // Quando clicca "Aggiungi" dal catalogo
                        // Chiediamo il prezzo di vendita personalizzato
                        const price = prompt(`Prezzo di vendita per "${d.name}"?`, d.price || 0);
                        if(price) {
                            const newDish = { ...d, price: parseFloat(price) };
                            delete newDish._id; // Rimuovi ID catalogo
                            currentDishes.push(newDish);
                            updateSummaryUI();
                            alert("Piatto aggiunto al riepilogo");
                        }
                    });
                    resultsContainer.appendChild(row);
                });
            } catch(err) {
                resultsContainer.innerHTML = '<p class="text-danger">Errore ricerca</p>';
            }
        });
    }

    // 2. AGGIUNTA PIATTO CUSTOM
    const addCustomBtn = document.getElementById('btn-add-custom-dish');
    if (addCustomBtn) {
        addCustomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const name = document.getElementById('custom-dish-name').value;
            const price = parseFloat(document.getElementById('custom-dish-price').value);
            const category = document.getElementById('custom-dish-category').value;
            const desc = document.getElementById('custom-dish-desc').value;

            if (!name || isNaN(price)) {
                alert("Nome e Prezzo sono obbligatori");
                return;
            }

            currentDishes.push({
                name, price, category, description: desc, ingredients: [] // Array vuoto per ora
            });
            
            // Reset form
            document.getElementById('custom-dish-name').value = '';
            document.getElementById('custom-dish-price').value = '';
            updateSummaryUI();
            alert("Piatto personalizzato aggiunto!");
        });
    }
}

/**
 * AGGIORNAMENTO UI RIEPILOGO
 */
function updateSummaryUI() {
    // 1. Badge Contatore
    const badge = document.getElementById('dish-count');
    if (badge) badge.textContent = currentDishes.length;
    
    // 2. Lista Riepilogo
    const summaryList = document.getElementById('summary-list');
    if (!summaryList) return;

    if (currentDishes.length === 0) {
        summaryList.innerHTML = '<p class="text-center text-muted my-3">Nessun piatto aggiunto.</p>';
        return;
    }

    summaryList.innerHTML = '';
    currentDishes.forEach((dish, index) => {
        const div = document.createElement('div');
        div.className = "list-group-item d-flex justify-content-between align-items-center";
        div.innerHTML = `
            <div>
                <strong>${dish.name}</strong> <span class="badge bg-secondary">€${dish.price.toFixed(2)}</span>
                <div class="small text-muted">${dish.category || 'Generico'}</div>
            </div>
            <button class="btn btn-sm btn-danger remove-btn" data-idx="${index}"><i class="bi bi-trash"></i></button>
        `;
        summaryList.appendChild(div);
    });

    // Event listeners per rimozione
    summaryList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            currentDishes.splice(idx, 1);
            updateSummaryUI();
        });
    });
}

/**
 * EXPORT DATI PER ESTERNO (Scenario A)
 */
export function gatherWizardData() {
    return {
        restaurant: {
            displayName: document.getElementById('res-displayName').value,
            legalName: document.getElementById('res-legalName').value,
            address: {
                // Per semplicità mandiamo tutto come stringa su 'street', 
                // il backend dovrà essere adattato o il frontend più specifico.
                street: document.getElementById('res-address').value, 
                number: '', city: '', province: '' 
            },
        },
        menuDishes: currentDishes
    };
}

// LOGICA SALVATAGGIO DIRETTO (Scenario B)
async function handleDirectCreation() {
    const data = gatherWizardData();
    if (!data.restaurant.displayName || data.menuDishes.length === 0) {
        alert("Inserisci nome ristorante e almeno un piatto.");
        return;
    }

    try {
        // 1. Crea Ristorante
        const rRes = await fetch('/api/lv/restaurants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data.restaurant)
        });
        const rJson = await rRes.json();
        if (!rJson.success) throw new Error(rJson.message);

        // 2. Crea Piatti
        const restaurantId = rJson.data._id;
        for (const dish of data.menuDishes) {
            await fetch('/api/lv/dishes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...dish, restaurantId })
            });
        }
        
        alert("Ristorante creato!");
        window.location.href = 'restaurateur-dashboard.html';
    } catch (err) {
        alert("Errore: " + err.message);
    }
}