import { renderRestaurantForm, renderMenuSection, renderDishRow } from './utils/ui-components.js';

// Stato globale del wizard
let currentDishes = [];
let isScenarioB = false;
const token = localStorage.getItem('token');

export async function initRestaurantWizard(containerId, scenarioB = false) {
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
    
    // Avvia la logica dei tab
    setupMenuTabsHandlers();
    // Carica le categorie per il menu a tendina
    await loadCategories();
    
    updateSummaryUI();

    const searchBtn = document.getElementById('btn-search-catalog');
    searchBtn.click();
}

// --- NUOVA FUNZIONE: Caricamento Categorie ---
async function loadCategories() {
    const select = document.getElementById('custom-dish-category');
    if (!select) return;

    try {
        // Chiama la rotta backend (assicurati che esista in categories.js o dishes.js)
        const response = await fetch('/api/lv/categories'); // O l'endpoint corretto per le categorie
        // Se non hai un endpoint specifico, usa categories.js importato come array statico se preferisci, 
        // ma hai chiesto "chiamando la rotta".
        
        // Se l'endpoint non esiste ancora nel backend, metti qui un array fallback:
        // const categories = ['Pizza', 'Pasta', 'Dessert', ...]; 
        
        if (response.ok) {
            const json = await response.json();
            // Assumiamo che json.data sia un array di stringhe o oggetti
            // Se categories.js esporta un array semplice nel backend, il json sarà tipo ["Beef", "Chicken"...]
            const categories = json.data || json; 
            
            select.innerHTML = '<option value="">Seleziona una categoria...</option>' + 
                categories.map(c => `<option value="${c}">${c}</option>`).join('');
        } else {
            select.innerHTML = '<option value="">Errore caricamento</option>';
        }
    } catch (e) {
        console.error("Errore categorie:", e);
        // Fallback in caso di errore
        select.innerHTML = '<option value="Altro">Altro</option>';
    }
}

// ... setupScenarioB rimane invariato ...
function setupScenarioB(container) {
    const saveBtn = document.createElement('div');
    saveBtn.className = "text-end mt-4";
    saveBtn.innerHTML = `<button id="btn-save-new-res" class="btn btn-success btn-lg">Crea Ristorante</button>`;
    container.appendChild(saveBtn);
    document.getElementById('btn-save-new-res').onclick = handleDirectCreation;
    
    // ... codice modale clonazione (rimane uguale a prima) ...
     const modalElement = document.getElementById('cloneMenuModal');
    if (!modalElement) return;
    
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
        
        previewList.innerHTML = dishes.map(d => `<li class="list-group-item">${d.name} (€${d.price})</li>`).join('');
        confirmBtn.disabled = false;
        
        confirmBtn.onclick = () => {
            const cloned = dishes.map(({ _id, ...rest }) => ({ ...rest }));
            currentDishes = [...currentDishes, ...cloned];
            updateSummaryUI();
            modal.hide();
        };
    };
}

function setupMenuTabsHandlers() {
    // 1. RICERCA CATALOGO
    const searchBtn = document.getElementById('btn-search-catalog');
    const searchInput = document.getElementById('catalog-search-input');
    const resultsContainer = document.getElementById('catalog-results');

    if (searchBtn) {
        searchBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const query = searchInput.value;
            resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>';
            
            try {
                const url = query ? `/api/lv/dishes/catalog?name=${query}` : `/api/lv/dishes/catalog`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
                const json = await res.json();
                
                resultsContainer.innerHTML = '';
                if(!json.data || json.data.length === 0) {
                    resultsContainer.innerHTML = '<p class="text-muted text-center p-3">Nessun risultato</p>';
                    return;
                }

                json.data.forEach(dish => {
                    // Usa renderDishRow per visualizzare le righe come richiesto
                    const row = renderDishRow(dish, 'Aggiungi', (d) => {
                        const price = prompt(`Prezzo di vendita per "${d.name}"?`, d.price || 0);
                        if(price && !isNaN(parseFloat(price))) {
                            const newDish = { ...d, price: parseFloat(price) };
                            delete newDish._id; // Rimuovi ID catalogo per renderlo un nuovo inserimento
                            currentDishes.push(newDish);
                            updateSummaryUI();
                            // Feedback visivo (opzionale) o alert
                        }
                    });
                    resultsContainer.appendChild(row);
                });
            } catch(err) {
                console.error(err);
                resultsContainer.innerHTML = '<p class="text-danger text-center p-3">Errore ricerca</p>';
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
            const category = document.getElementById('custom-dish-category').value; // Ora prende dalla select
            const desc = document.getElementById('custom-dish-desc').value;

            if (!name || isNaN(price) || !category) {
                alert("Compila tutti i campi obbligatori (Nome, Prezzo, Categoria).");
                return;
            }

            // --- FIX MENU VUOTO ---
            // Il backend Dish.js richiede 'ingredients' come array.
            // Trasformiamo la descrizione in array separando per virgola.
            const ingredientsArray = desc 
                ? desc.split(',').map(s => s.trim()).filter(s => s.length > 0) 
                : []; 

            currentDishes.push({
                name, 
                price, 
                category, 
                description: desc, 
                ingredients: ingredientsArray, // IMPORTANTE: Ora inviamo un array
                source: 'restaurant'
            });
            
            // Reset form
            document.getElementById('custom-dish-name').value = '';
            document.getElementById('custom-dish-price').value = '';
            document.getElementById('custom-dish-desc').value = '';
            updateSummaryUI();
            
            // Passa al tab riepilogo per mostrare l'aggiunta
            const triggerEl = document.querySelector('#menuTabs button[data-bs-target="#summary-tab"]');
            if(triggerEl) bootstrap.Tab.getInstance(triggerEl)?.show() || new bootstrap.Tab(triggerEl).show();
        });
    }
}

function updateSummaryUI() {
    const badge = document.getElementById('dish-count');
    if (badge) badge.textContent = currentDishes.length;
    
    const summaryList = document.getElementById('summary-list');
    if (!summaryList) return;

    if (currentDishes.length === 0) {
        summaryList.innerHTML = '<p class="text-center text-muted my-3">Nessun piatto aggiunto.</p>';
        return;
    }

    summaryList.innerHTML = '';
    currentDishes.forEach((dish, index) => {
        // Riutilizziamo renderDishRow anche per il riepilogo, ma con tasto Rimuovi
        const row = renderDishRow(dish, 'Rimuovi', () => {
             currentDishes.splice(index, 1);
             updateSummaryUI();
        }, false); // false = non disabilitato
        
        // Cambio stile bottone per la rimozione
        const btn = row.querySelector('.btn');
        btn.className = 'btn btn-sm btn-danger';
        btn.innerHTML = '<i class="bi bi-trash"></i>';
        
        summaryList.appendChild(row);
    });

}

// --- VALIDAZIONE ---
export function validateRestaurantData(r) {
    if (!r.legalName || !r.displayName || !r.phoneNumber || !r.address.street) return false;
    return true; // Aggiungi qui le regex se vuoi validazione stretta anche in Scenario B
}

export function gatherWizardData() {
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };

    const data = {
        restaurant: {
            legalName: getVal('legalRestaurantName'),
            displayName: getVal('displayRestaurantName'),
            phoneNumber: getVal('restaurantPhone'),
            email: getVal('restaurantEmail'),
            address: {
                street: getVal('res-street'),
                number: getVal('res-number'),
                zip: getVal('res-zip'),
                city: getVal('res-city'),
                province: getVal('res-province')
            },
            openingHours: getVal('openingHours'),
            description: getVal('description'),
            websiteUrl: getVal('websiteUrl'),
            imageUrl: getVal('imageUrl'),
            status: 'ACTIVE' // --- FIX PUNTO 1: Active automatico ---
        },
        menuDishes: typeof currentDishes !== 'undefined' ? currentDishes : []
    };
    return data;
}

// --- LOGICA SALVATAGGIO DIRETTO (Scenario B) ---
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
        if (!rRes.ok) throw new Error(rJson.message || 'Errore creazione ristorante');

        const restaurantId = rJson.data._id; // ID del nuovo ristorante

        // 2. Crea Piatti
        // --- FIX MENU VUOTO ---
        // Iteriamo e inviamo i piatti uno ad uno. 
        // IMPORTANTE: Assicurati che il backend 'POST /dishes' colleghi il piatto al ristorante
        // E che aggiorni l'array dishIds dentro Menu.
        for (const dish of data.menuDishes) {
            // Pulizia dati prima dell'invio
            const dishPayload = {
                ...dish,
                restaurantId: restaurantId,
                // Assicuriamoci che ingredients sia un array valido
                ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : []
            };

            await fetch('/api/lv/dishes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(dishPayload)
            });
        }
        
        alert("Ristorante creato con successo!");
        window.location.href = 'restaurateur-dashboard.html';
    } catch (err) {
        console.error(err);
        alert("Errore durante il salvataggio: " + err.message);
    }

}