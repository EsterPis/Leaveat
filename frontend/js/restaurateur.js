const API = '/api/lv';
const API_DISHES = API + '/dishes';
const API_RESTAURATEURS = API + '/restaurateurs';
const token = localStorage.getItem('token'); // settato dopo login

if (!token) {
  window.location.href = '/login.html';
}

// --- Helpers UI --------------------------------------------------------

function showStep(n) {
  ['step1', 'step2', 'step3'].forEach((id, i) => {
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.toggle('d-none', i !== n - 1);
  });

  ['step1Crumb', 'step2Crumb', 'step3Crumb'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active', i === n - 1);
  });
}

function showAlert(type, message) {
  const alert = document.getElementById('alert');
  if (!alert) return;

  alert.className = 'alert mt-3';
  if (type === 'success') {
    alert.classList.add('alert-success');
  } else {
    alert.classList.add('alert-danger');
  }
  alert.textContent = message;
  alert.classList.remove('d-none');
}

function clearAlert() {
  const alert = document.getElementById('alert');
  if (!alert) return;
  alert.classList.add('d-none');
  alert.textContent = '';
}

// --- Lettura dati form Step 1 & 2 --------------------------------------

function getFiscalData() {
  return {
    VATNumber: document.getElementById('vat').value.trim(),
    legalRepresentativeName: document.getElementById('legalRepresentativeName').value.trim(),
    adminEmail: document.getElementById('adminEmail').value.trim(),
    bankAccountHolder: document.getElementById('bankHolder').value.trim(),
    IBAN: document.getElementById('iban').value.trim(),
  };
}

function isEmpty(value) {
  return !value || !value.toString().trim();
}

function validateFiscalData(d) {
  if (Object.values(d).some(isEmpty)) {
    showAlert('error', 'Compila tutti i campi dei dati fiscali.');
    return false;
  }
  return true;
}

function getRestaurantData() {
  return {
    legalName: document.getElementById('legalRestaurantName').value.trim(),
    displayName: document.getElementById('displayRestaurantName').value.trim(),
    phoneNumber: document.getElementById('restaurantPhone').value.trim(),
    email: document.getElementById('restaurantEmail').value.trim(),
    address: {
      street: document.getElementById('street').value.trim(),
      number: document.getElementById('streetNumber').value.trim(),
      zip: document.getElementById('zip').value.trim(),
      city: document.getElementById('city').value.trim(),
      province: document.getElementById('province').value.trim(),
    },
    openingHours: document.getElementById('openingHours').value.trim(),
    description: document.getElementById('description').value.trim(),
    websiteUrl: document.getElementById('websiteUrl').value.trim(),
    imageUrl: document.getElementById('imageUrl').value.trim(),
  };
}

function validateRestaurantData(r) {
  if (
    isEmpty(r.legalName) || isEmpty(r.displayName) || isEmpty(r.phoneNumber) ||
    isEmpty(r.openingHours) || isEmpty(r.address.street) || isEmpty(r.address.number) ||
    isEmpty(r.address.zip) || isEmpty(r.address.city) || isEmpty(r.address.province)
  ) {
    showAlert('error', 'Compila tutti i campi obbligatori del ristorante.');
    return false;
  }
  return true;
}

// --- Eventi stepper (Navigazione) --------------------------------------

document.getElementById('startWizard').onclick = () => {
  const intro = document.getElementById('intro');
  if (intro) intro.classList.add('d-none');
  clearAlert();
  showStep(1);
};

document.getElementById('toStep2').onclick = () => {
  clearAlert();
  const fiscalData = getFiscalData();
  if (validateFiscalData(fiscalData)) showStep(2);
};

document.getElementById('back1').onclick = () => {
  clearAlert();
  showStep(1);
};

document.getElementById('toStep3').onclick = () => {
  clearAlert();
  const restaurant = getRestaurantData();
  if (validateRestaurantData(restaurant)) {
    initStep3(); // Inizializza Step 3
    showStep(3);
  }
};

document.getElementById('back2').onclick = () => {
  clearAlert();
  showStep(2);
};


/* ===================================================================
 * LOGICA STEP 3 - GESTIONE MENU
 * =================================================================== */

const CATEGORIES_LIST = [
  "Beef", "Chicken", "Dessert", "Lamb", "Miscellaneous",
  "Pasta", "Pork", "Seafood", "Side", "Starter", "Vegan", "Vegetarian", "Breakfast", "Goat"
];

// STATO GLOBALE STEP 3
let catalogDishes = [];
let myMenu = [];
let hasUnseenChanges = false;
const PAGE_SIZE = 20;
let visibleLimit = PAGE_SIZE;

// --- Inizializzazione ---

function initStep3() {
  loadCatalog();
  renderCategoryFilterOptions(); // Carica la select delle categorie
  renderCategorySelect();        // Carica la select per "Nuovo Piatto"
  updateSummaryTab();
  
  hasUnseenChanges = false;
  updateBadge();
}

// --- Funzioni di supporto UI ---

const tabSummaryBtn = document.getElementById('tab-summary-btn');
if (tabSummaryBtn) {
  tabSummaryBtn.addEventListener('shown.bs.tab', () => {
    hasUnseenChanges = false;
    updateBadge();
    renderSummary();
  });
}

function updateBadge() {
  const badge = document.getElementById('summary-badge');
  if (badge) {
    if (hasUnseenChanges) badge.classList.remove('d-none');
    else badge.classList.add('d-none');
  }
}

function showToastMessage() {
  const toastEl = document.getElementById('liveToast');
  if (toastEl) {
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }
}

// --- 1. CATALOGO (Caricamento, Filtri, Paginazione) ---

async function loadCatalog() {
  try {
    const res = await fetch(`${API_DISHES}/catalog`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    
    const json = await res.json();
    
    if (json.success) {
      catalogDishes = json.data || [];
      visibleLimit = PAGE_SIZE;
      renderCatalogList();
    } else {
      if(res.status === 401 || res.status === 403) {
          alert("Sessione scaduta.");
          window.location.href = '/login.html';
          return;
      }
      showAlert('error', json.message);
    }
  } catch (err) {
    console.error("Err loading catalog", err);
    showAlert('error', 'Errore di comunicazione col server.');
  }
}

function renderCategoryFilterOptions() {
  const select = document.getElementById('catFilterCategory');
  if(!select) return;
  select.innerHTML = '<option value="">Tutte le categorie</option>';
  CATEGORIES_LIST.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.text = cat;
    select.appendChild(opt);
  });
}

// Bottoni Filtri e Load More
const btnLoadMore = document.getElementById('btnLoadMore');
if(btnLoadMore) {
    btnLoadMore.onclick = () => {
        visibleLimit += PAGE_SIZE;
        renderCatalogList();
    };
}

const applyBtn = document.getElementById('applyCatalogFilters');
if(applyBtn) {
    applyBtn.onclick = () => {
        visibleLimit = PAGE_SIZE; // Reset paginazione su nuovi filtri
        renderCatalogList();
    };
}

function renderCatalogList() {
  const listContainer = document.getElementById('catalog-list');
  const emptyMsg = document.getElementById('catalog-empty');
  const loadMoreContainer = document.getElementById('load-more-container');
  const resultsCount = document.getElementById('results-count');

  if(!listContainer) return;
  
  listContainer.innerHTML = '';

  // 1. Leggi Filtri
  const nameVal = (document.getElementById('catFilterName').value || '').toLowerCase().trim();
  const ingrVal = (document.getElementById('catFilterIngr').value || '').toLowerCase().trim();
  const catVal = (document.getElementById('catFilterCategory').value || '').toLowerCase().trim();
  
  // 2. Filtra (Logica Indipendente)
  const filtered = catalogDishes.filter(dish => {
    const dName = (dish.name || '').toLowerCase();
    const dIngr = Array.isArray(dish.ingredients) ? dish.ingredients.join(' ') : (dish.ingredients || '');
    const dCat = (dish.category || '').toLowerCase();

    if (nameVal) return dName.includes(nameVal);
    if (ingrVal) return dIngr.toLowerCase().includes(ingrVal);
    if (catVal) return dCat === catVal;
    
    return true; // Se nessun filtro attivo, mostra tutto
  });

  // 3. Paginazione
  const resultsToShow = filtered.slice(0, visibleLimit);

  // 4. Render
  if (filtered.length === 0) {
    if(emptyMsg) emptyMsg.classList.remove('d-none');
    if(loadMoreContainer) loadMoreContainer.classList.add('d-none');
  } else {
    if(emptyMsg) emptyMsg.classList.add('d-none');
    
    resultsToShow.forEach(dish => {
      const item = document.createElement('div');
      item.className = "list-group-item d-flex justify-content-between align-items-center";
      
      const isAdded = myMenu.some(m => m.source === 'catalog' && m.catalogId === dish._id);

      item.innerHTML = `
        <div class="d-flex align-items-center gap-3">
            <img src="${dish.imageUrl || dish.image || 'https://via.placeholder.com/50'}" 
                 style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">
            <div>
                <h6 class="mb-1 text-truncate" style="max-width: 300px;">${dish.name}</h6>
                <div class="text-muted small">
                  <span class="badge bg-light text-dark border">${dish.category}</span>
                </div>
            </div>
        </div>
        <div class="d-flex align-items-center gap-2">
            <a href="dish-details.html?id=${dish._id}" target="_blank" class="btn btn-sm btn-outline-secondary">
               <i class="bi bi-eye"></i> Dettagli
            </a>
            <button class="btn btn-sm btn-primary btn-add-cat" data-id="${dish._id}" ${isAdded ? 'disabled' : ''}>
               <i class="bi bi-plus-lg"></i> ${isAdded ? 'Aggiunto' : 'Aggiungi'}
            </button>
        </div>
      `;
      listContainer.appendChild(item);
    });

    // Gestione bottone Load More
    if (loadMoreContainer) {
        if (visibleLimit < filtered.length) {
            loadMoreContainer.classList.remove('d-none');
            if(resultsCount) resultsCount.textContent = `Mostrati ${resultsToShow.length} di ${filtered.length} risultati`;
        } else {
            loadMoreContainer.classList.add('d-none');
        }
    }

    // Event Listener per "Aggiungi"
    document.querySelectorAll('.btn-add-cat').forEach(b => {
      b.addEventListener('click', (e) => addCatalogDishToMenu(e.currentTarget.dataset.id));
    });
  }
}

// Funzione Aggiunta Piatto (che mancava!)
function addCatalogDishToMenu(id) {
  const dish = catalogDishes.find(d => d._id === id);
  if(!dish) return;

  const priceStr = prompt(`A che prezzo vuoi vendere "${dish.name}"?`);
  if(priceStr === null) return; 
  
  const price = parseFloat(priceStr.replace(',', '.'));

  if(isNaN(price) || price <= 0) {
    alert("Prezzo non valido.");
    return;
  }

  myMenu.push({
    source: 'catalog',
    catalogId: dish._id,
    name: dish.name,
    category: dish.category,
    price: price,
    ingredients: dish.ingredients,
    image: dish.imageUrl || dish.image,
    description: dish.description
  });

  hasUnseenChanges = true;
  updateBadge();
  showToastMessage();
  renderCatalogList(); 
}


// --- 2. AGGIUNTA PIATTO PERSONALIZZATO ---

function renderCategorySelect() {
  const sel = document.getElementById('newDishCategory');
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleziona...</option>';
  CATEGORIES_LIST.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.text = c;
    sel.appendChild(opt);
  });
}

const saveDishBtn = document.getElementById('saveNewDishBtn');
if (saveDishBtn) {
  saveDishBtn.onclick = () => {
    const name = document.getElementById('newDishName').value.trim();
    const cat = document.getElementById('newDishCategory').value;
    const priceVal = document.getElementById('newDishPrice').value;
    const ingr = document.getElementById('newDishIngredients').value.trim();
    const desc = document.getElementById('newDishDescription').value.trim();
    const img = document.getElementById('newDishImageUrl').value.trim();

    const price = parseFloat(priceVal.replace(',', '.'));

    if (!name || isNaN(price) || price <= 0) {
      alert("Nome e Prezzo sono obbligatori.");
      return;
    }

    myMenu.push({
      source: 'custom',
      name: name,
      category: cat,
      price: price,
      ingredients: ingr ? ingr.split(',').map(s => s.trim()) : [],
      description: desc,
      image: img
    });

    hasUnseenChanges = true;
    updateBadge();
    showToastMessage();

    // Reset Form
    document.getElementById('newDishName').value = '';
    document.getElementById('newDishPrice').value = '';
    document.getElementById('newDishIngredients').value = '';
    document.getElementById('newDishDescription').value = '';
    document.getElementById('newDishImageUrl').value = '';
  };
}


// --- 3. RIEPILOGO E INVIO ---

const sumSearch = document.getElementById('summarySearch');
if (sumSearch) sumSearch.addEventListener('input', renderSummary);

function updateSummaryTab() {
  renderSummary();
}

function renderSummary() {
  const container = document.getElementById('summary-list');
  const empty = document.getElementById('summary-empty-msg');
  if (!container) return;

  container.innerHTML = '';

  if (myMenu.length === 0) {
    if (empty) empty.classList.remove('d-none');
    return;
  }
  if (empty) empty.classList.add('d-none');

  const filter = sumSearch ? sumSearch.value.toLowerCase() : '';

  myMenu.forEach((dish, index) => {
    if (filter && !dish.name.toLowerCase().includes(filter)) return;

    const item = document.createElement('div');
    item.className = "list-group-item d-flex justify-content-between align-items-center";

    const typeBadge = dish.source === 'catalog'
      ? '<span class="badge bg-info text-dark me-2">Catalogo</span>'
      : '<span class="badge bg-warning text-dark me-2">Custom</span>';

    item.innerHTML = `
      <div class="d-flex align-items-center">
         <div class="d-flex flex-column align-items-center me-3 text-secondary">
            <i class="bi bi-caret-up-fill cursor-pointer btn-move-up" data-idx="${index}" style="cursor: pointer;"></i>
            <i class="bi bi-caret-down-fill cursor-pointer btn-move-down" data-idx="${index}" style="cursor: pointer;"></i>
         </div>
         <div>
            <h6 class="mb-0">${typeBadge}${dish.name}</h6>
            <small>€ ${dish.price.toFixed(2)} - ${dish.category || 'No Cat'}</small>
         </div>
      </div>
      <div>
         <button class="btn btn-sm btn-outline-secondary btn-edit-price" data-idx="${index}"><i class="bi bi-pencil"></i> €</button>
         <button class="btn btn-sm btn-outline-danger btn-remove" data-idx="${index}"><i class="bi bi-trash"></i></button>
      </div>
    `;
    container.appendChild(item);
  });

  // Handlers Riepilogo
  document.querySelectorAll('.btn-remove').forEach(b => {
    b.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      myMenu.splice(idx, 1);
      renderSummary();
      renderCatalogList();
    });
  });

  document.querySelectorAll('.btn-edit-price').forEach(b => {
    b.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      const oldPrice = myMenu[idx].price;
      const newP = prompt("Nuovo prezzo:", oldPrice);
      if (newP) {
        const p = parseFloat(newP.replace(',', '.'));
        if (!isNaN(p) && p > 0) {
          myMenu[idx].price = p;
          renderSummary();
        }
      }
    });
  });

  document.querySelectorAll('.btn-move-up').forEach(b => {
    b.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      if (idx > 0) {
        [myMenu[idx], myMenu[idx - 1]] = [myMenu[idx - 1], myMenu[idx]];
        renderSummary();
      }
    });
  });

  document.querySelectorAll('.btn-move-down').forEach(b => {
    b.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      if (idx < myMenu.length - 1) {
        [myMenu[idx], myMenu[idx + 1]] = [myMenu[idx + 1], myMenu[idx]];
        renderSummary();
      }
    });
  });
}

// --- INVIO DATI AL SERVER ---

document.getElementById('finish').onclick = async () => {
  clearAlert();
  const fiscalData = getFiscalData();
  if (!validateFiscalData(fiscalData)) { showStep(1); return; }
  const restaurant = getRestaurantData();
  if (!validateRestaurantData(restaurant)) { showStep(2); return; }

  if (myMenu.length === 0) {
    showAlert('error', "Il menù è vuoto! Aggiungi almeno un piatto.");
    return;
  }

  // Prepara payload
  const fromCatalog = myMenu
    .filter(m => m.source === 'catalog')
    .map(m => ({ dishId: m.catalogId, price: m.price }));

  const customDishes = myMenu
    .filter(m => m.source === 'custom')
    .map(m => ({
      name: m.name,
      category: m.category,
      ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
      price: m.price,
      imageUrl: m.image,
      description: m.description
    }));

  const menuPayload = {
    mode: 'new',
    fromCatalog: fromCatalog,
    customDishes: customDishes
  };

  try {
    // Nota: API_RESTAURATEURS è definita in alto come /api/lv/restaurateurs
    const res = await fetch(`${API_RESTAURATEURS}/complete-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...fiscalData,
        restaurant,
        menu: menuPayload,
      }),
    });

    const json = await res.json();

    if (res.ok && json.success) {
      showAlert('success', 'Profilo completato! Reindirizzamento...');
      setTimeout(() => {
        window.location.href = './restaurateur-dashboard.html';
      }, 1500);
    } else {
      showAlert('error', json.message || 'Errore nella procedura.');
    }
  } catch (err) {
    console.error(err);
    showAlert('error', 'Errore di comunicazione con il server.');
  }
};