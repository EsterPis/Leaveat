import { renderRestaurantForm, renderMenuSection, renderDishRow } from './utils/ui-components.js';

let currentDishes = []; // menù lato frontend
let isScenarioB = false; //modalità di lavoro del wizard
const token = localStorage.getItem('token');

// Inizializzazione wizard di creazione ristorante
export async function initRestaurantWizard(containerId, scenarioB = false) {
    isScenarioB = scenarioB;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Iniezione HTML nel DOM
    container.innerHTML = `
        <div id="wizard-content">
            ${renderRestaurantForm()} <!--Restituisce html sotto forma di stringa-->
            ${renderMenuSection(isScenarioB)}
        </div>
    `;

    // Piatti personalizzati
    const addCustomBtn = document.getElementById('btn-add-custom-dish'); //generato dinamicamente da renderMenuSection()
    if (addCustomBtn) {
        addCustomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            //lettura degli input
            const name = document.getElementById('custom-dish-name').value;
            const price = parseFloat(document.getElementById('custom-dish-price').value);
            const prepTimeInput = document.getElementById('custom-dish-preptime').value;
            const category = document.getElementById('custom-dish-category').value;
            const desc = document.getElementById('custom-dish-desc').value;
            //validazione - nome vuoto, prezzo non numerico, categoria non selezionata
            if (!name || isNaN(price) || !category) {
                alert("Compila tutti i campi obbligatori (Nome, Prezzo, Categoria).");
                return;
            }
            // formattazione ingredienti
            const ingredientsArray = desc
                ? desc.split(',').map(s => s.trim()).filter(s => s.length > 0)
                : [];
            
            // aggiunta al menù corrente (frontend)
            currentDishes.push({
                name,
                price,
                category,
                description: desc,
                ingredients: ingredientsArray,
                source: 'restaurant',
                prepTime: prepTimeInput ? parseInt(prepTimeInput) : 15
            });

            // Reset form
            document.getElementById('custom-dish-name').value = '';
            document.getElementById('custom-dish-price').value = '';
            document.getElementById('custom-dish-desc').value = '';
            
            // Aggiorna UI riepilogo
            updateSummaryUI();

            // Passa al tab riepilogo per mostrare l'aggiunta
            const triggerEl = document.querySelector('#menuTabs button[data-bs-target="#summary-tab"]');
            if (triggerEl) bootstrap.Tab.getInstance(triggerEl)?.show() || new bootstrap.Tab(triggerEl).show();
        });
    }

    if (isScenarioB) {
        setupScenarioB(container);
    }

    setupMenuTabsHandlers(); // ricerca in catalogo
    await loadCategories(); // caricamento categorie
    // trigger iniziale ricerca
    document.getElementById('catalog-search-name')?.dispatchEvent(new Event('input'));

    updateSummaryUI();
}

// Caricamento categorie dal backend e popolamento dei select
async function loadCategories() {
    const select = document.getElementById('custom-dish-category'); //select piatto custom
    const catalogSelect = document.getElementById('catalog-search-category'); //select filtro catalogo
    if (!select && !catalogSelect) return; //and per rendere la funzione riutilizzabile 

    try {
        const response = await fetch('/api/lv/categories');
        if (response.ok) {
            const json = await response.json();
            const categories = json.data || json;

            // Popola i select, trasforma un array di stringhe in options HTML
            if (select) {
                select.innerHTML = '<option value="">Seleziona una categoria...</option>' +
                    categories.map(c => `<option value="${c}">${c}</option>`).join('');
            }
            if (catalogSelect) {
                catalogSelect.innerHTML = '<option value="">Tutte le categorie</option>' +
                    categories.map(c => `<option value="${c}">${c}</option>`).join('');
            }
        } else {
            select.innerHTML = '<option value="">Errore caricamento</option>';
        }
    } catch (e) {
        //console.error("Errore categorie:", e);
        // Fallback in caso di errore
        select.innerHTML = '<option value="Altro">Altro</option>';
    }
}

// Setup per lo scenario B (creazione diretta)
// Aggiunge bottone crea ristorante, clonazione menù e modale
function setupScenarioB(container) {
    // Bottone crea ristorante
    const saveBtn = document.createElement('div');
    saveBtn.className = "text-end mt-4";
    saveBtn.innerHTML = `<button id="btn-save-new-res" class="btn btn-success btn-lg">Crea Ristorante</button>`;
    container.appendChild(saveBtn); //inserimento nel DOM
    document.getElementById('btn-save-new-res').onclick = handleDirectCreation; //riferimento a funzione

    // modale di clonazione menù da ristorante esistente
    const modalElement = document.getElementById('cloneMenuModal');
    if (!modalElement) return;

    const modal = new bootstrap.Modal(modalElement);
    const select = document.getElementById('select-source-res');
    const previewList = document.getElementById('preview-list');
    const confirmBtn = document.getElementById('btn-confirm-clone');
    //composizione ed apertura modale
    document.getElementById('btn-open-clone-modal').onclick = async () => {
        try {
            // Carica i ristoranti del restaurateur per popolare il select
            const res = await fetch('/api/lv/restaurants/my-restaurants', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            // Popola il select con i ristoranti
            select.innerHTML = '<option value="">Scegli...</option>' +
                json.data.map(r => `<option value="${r._id}">${r.displayName}</option>`).join('');
            modal.show(); // mostra il modale
        } catch (e) { console.error(e); }
    };

    select.onchange = async () => {
        const resId = select.value;
        if (!resId) return;
        // Carica i piatti del ristorante selezionato per mostrare l'anteprima
        const res = await fetch(`/api/lv/restaurants/${resId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        const dishes = json.data.menuId?.dishIds || [];

        previewList.innerHTML = dishes.map(d => `<li class="list-group-item">${d.name} (€${d.price})</li>`).join('');
        confirmBtn.disabled = false; // abilitazione bottone conferma clonazione

        confirmBtn.onclick = () => {
            const cloned = dishes.map(({ _id, ...rest }) => ({ ...rest })); //clonazione con rimozione id
            currentDishes = [...currentDishes, ...cloned]; //fusione di due array
            updateSummaryUI(); // aggiornamento UI con i piatti clonati
            modal.hide(); // chiusura modale
        };
    };
}

// Logica di ricerca e filtraggio dei piatti del catalogo
function setupMenuTabsHandlers() {
    // recupero elementi DOM (filtri e container risultati)
    const nameInput = document.getElementById('catalog-search-name');
    const categorySelect = document.getElementById('catalog-search-category');
    const ingredientsInput = document.getElementById('catalog-search-ingredients');
    const resultsContainer = document.getElementById('catalog-results');

    // funzione che verrà collegata agli eventi
    // esegue la chiamata al backend con i filtri correnti e aggiorna la UI
    async function performSearch() {
        const filters = {
            name: nameInput.value.trim(),
            category: categorySelect.value,
            ingredients: ingredientsInput.value.trim()
        };

        showLoading(resultsContainer); // mostra spinner durante la ricerca

        try {
            const dishes = await fetchCatalogDishes(filters);  // richiesta al backend
            renderCatalogResults(dishes, resultsContainer); // render risultati
        } catch (err) {
            console.error(err);
            resultsContainer.innerHTML = '<p class="text-danger text-center p-3">Errore ricerca</p>';
        }
    }

    // ogni evento di input o change sui filtri scatena la ricerca
    [nameInput, categorySelect, ingredientsInput].forEach(el => {
        el?.addEventListener('input', performSearch);
        el?.addEventListener('change', performSearch);
    });
}

// Sincronizzazione stato frontend (currentDishes) con DOM del riepilogo (tab Summary)
// Aggiorna il tab di riepilogo del menù
function updateSummaryUI() {
    const badge = document.getElementById('dish-count'); //badge numero piatti menù
    if (badge) badge.textContent = currentDishes.length; //aggiornamento

    const summaryList = document.getElementById('summary-list'); //container dove mostrare i piatti aggiunti
    if (!summaryList) return;

    if (currentDishes.length === 0) {
        summaryList.innerHTML = '<p class="text-center text-muted my-3">Nessun piatto aggiunto.</p>';
        return;
    }

    summaryList.innerHTML = ''; // reset lista - full re-render
    // Per ogni piatto aggiunto, genera una riga con possibilità di rimozione
    currentDishes.forEach((dish, index) => {
        const row = renderDishRow(dish, 'Rimuovi', () => { //la clousure mantiene il riferimento all'index
            currentDishes.splice(index, 1); // rimuove il piatto dall'array
            updateSummaryUI(); //aggiorna la UI dopo la rimozione
        }, false); // non disabilita il pulsante rimuovi

        // Modifoca il bottone generato da renderDishRow per adattarlo alla funzione di rimozione
        const btn = row.querySelector('.btn');
        btn.className = 'btn btn-sm btn-danger';
        btn.innerHTML = '<i class="bi bi-trash"></i>';

        summaryList.appendChild(row); //aggiungi nodo DOM nella lista
    });

}

// Costruzione playload
export function gatherWizardData() {
    // Funzione di utilità per estrarre i valori dai campi del form
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
            //status aggiornato in backend
        },
        menuDishes: currentDishes
    };
    return data;
}

// Gestione creazione diretta (scenario B) - invio dati al backend
async function handleDirectCreation() {
    // raccolta dati da form e validazione minima
    const data = gatherWizardData();
    if (!data.restaurant.displayName || data.menuDishes.length === 0) {
        alert("Inserisci nome ristorante e almeno un piatto.");
        return;
    }

    try {
        // Creazione ristorante
        const rRes = await fetch('/api/lv/restaurants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data.restaurant) //da oggetto js a stringa JSON
        });
        const rJson = await rRes.json();
        if (!rRes.ok) throw new Error(rJson.message || 'Errore creazione ristorante');

        const restaurantId = rJson.data._id; // ID del nuovo ristorante

        // Creazione piatti (i piatti necessitano del restaurantId)
        for (const dish of data.menuDishes) { //foreach non rispetta le promises, quindi usiamo for...of per garantire l'ordine e la gestione asincrona
            const { _id, __v, createdAt, updatedAt, ...cleanDish } = dish; // rimozione campi non necessari o generati automaticamente dal backend

            const dishPayload = {
                ...cleanDish,
                restaurantId: restaurantId,
                ingredients: Array.isArray(cleanDish.ingredients) ? cleanDish.ingredients : []
            };
            //console.log("PAYLOAD DISH:", dishPayload);
            // chiamata al backend
            await fetch('/api/lv/dishes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(dishPayload)
            });
        }
        // successo - notifica e reindirizzamento
        alert("Ristorante creato con successo!");
        window.location.href = 'restaurateur-dashboard.html';
    } catch (err) {
        console.error(err);
        alert("Errore durante il salvataggio: " + err.message);
    }

}

/* UTILITY FUNCTIONS */
// Chiama il backend per applicare i filtri di ricerca sui piatti del catalogo
async function fetchCatalogDishes({ name, category, ingredients }) {
    let url = `/api/lv/dishes?source=catalog`;
    // composizione query string 
    if (name) url += `&name=${name}`;
    if (category) url += `&category=${category}`;
    if (ingredients) url += `&ingredient=${ingredients}`;

    // fetch backend
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const json = await res.json(); //attesa risposta
    return json.data || []; //ritorna array di piatti o array vuoto
}

// Renderizza i risultati della ricerca nel tab Catalogo
function renderCatalogResults(dishes, container) {
    container.innerHTML = '';
    // messaggio nessun risultato
    if (dishes.length === 0) {
        container.innerHTML = '<p class="text-muted text-center p-3">Nessun risultato</p>';
        return;
    }
    // renderizza ogni piatto restituito 
    dishes.forEach(dish => {
        const row = createDishRow(dish);
        container.appendChild(row);
    });
}

// renderizza riga piatto + bottone agggiunta
function createDishRow(dish) {
    return renderDishRow(dish, 'Aggiungi', () => {
        openImportModal(dish); //apertura modale prezzo e tempo preparazione
    });
}

// Modale prezzo e tempo preparazione per piatti importati
function openImportModal(dish) {
    // estrazuione elementi DOM modale
    const modal = new bootstrap.Modal(document.getElementById('wizardImportModal'));
    const priceInput = document.getElementById('wizard-price');
    const prepTimeInput = document.getElementById('wizard-preptime');
    const confirmBtn = document.getElementById('wizard-confirm-btn');

    // reset valori input
    priceInput.value = dish.price || '';
    prepTimeInput.value = '';

    modal.show(); // apertura modale

    confirmBtn.onclick = () => {
        const newDish = buildDishFromModal(dish, priceInput.value, prepTimeInput.value); // costruzione oggetto piatto con i nuovi valori
        if (!newDish) return;

        currentDishes.push(newDish); //aggiunta al menù provvisorio (frontend)
        updateSummaryUI(); //aggiornamento UI riepilogo
        modal.hide(); //chiusura modale
    };
}

// Mostra spinner di caricamento durante le operazioni asincrone
function showLoading(container) {
    container.innerHTML = `
        <div class="text-center p-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
        </div>
    `;
}

// Costruzione oggetto piatto (copia catalogo + prezzo e tempo personalizzati)
function buildDishFromModal(dish, price, prepTime) {
    if (!price || isNaN(parseFloat(price))) {
        alert("Prezzo non valido");
        return null;
    }

    return {
        ...dish, //operator spread (di diffusione)
        price: parseFloat(price),
        prepTime: prepTime && !isNaN(parseInt(prepTime))
            ? parseInt(prepTime)
            : 15
    };
}