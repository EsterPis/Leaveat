const API = '/api/lv';
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

// --- Lettura dati form -------------------------------------------------

function getFiscalData() {
  const VATNumber = document.getElementById('vat').value.trim();
  const legalRepresentativeName = document.getElementById('legalRepresentativeName').value.trim();
  const adminEmail = document.getElementById('adminEmail').value.trim();
  const bankAccountHolder = document.getElementById('bankHolder').value.trim();
  const IBAN = document.getElementById('iban').value.trim();

  return {
    VATNumber,
    legalRepresentativeName,
    adminEmail,
    bankAccountHolder,
    IBAN,
  };
}

function isEmpty(value) {
  return !value || !value.toString().trim();
}

function validateFiscalData(d) {
  if (
    isEmpty(d.VATNumber) ||
    isEmpty(d.legalRepresentativeName) ||
    isEmpty(d.adminEmail) ||
    isEmpty(d.bankAccountHolder) ||
    isEmpty(d.IBAN)
  ) {
    showAlert('error', 'Compila tutti i campi dei dati fiscali.');
    return false;
  }
  return true;
}

function getRestaurantData() {
  const restaurant = {
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

  return restaurant;
}

function validateRestaurantData(r) {
  if (
    isEmpty(r.legalName) ||
    isEmpty(r.displayName) ||
    isEmpty(r.phoneNumber) ||
    isEmpty(r.openingHours) ||
    isEmpty(r.address.street) ||
    isEmpty(r.address.number) ||
    isEmpty(r.address.zip) ||
    isEmpty(r.address.city) ||
    isEmpty(r.address.province)
  ) {
    showAlert('error', 'Compila tutti i campi obbligatori del ristorante.');
    return false;
  }
  return true;
}

function getMenuData() {
  const mode = document.getElementById('menuMode').value;
  const menu = { mode };

  if (mode === 'new') {
    const ids = Array.from(
      document.querySelectorAll('#catalog input[type=checkbox]:checked')
    ).map((i) => i.value);
    menu.dishIds = ids;
  } else {
    menu.fromMenuId = document.getElementById('fromMenuId').value;
  }

  return menu;
}

// --- Eventi stepper ----------------------------------------------------

document.getElementById('startWizard').onclick = () => {
  const intro = document.getElementById('intro');
  if (intro) intro.classList.add('d-none');
  clearAlert();
  showStep(1);
};

document.getElementById('toStep2').onclick = () => {
  clearAlert();
  const fiscalData = getFiscalData();
  if (!validateFiscalData(fiscalData)) return;
  showStep(2);
};

document.getElementById('back1').onclick = () => {
  clearAlert();
  showStep(1);
};

document.getElementById('toStep3').onclick = () => {
  clearAlert();
  const restaurant = getRestaurantData();
  if (!validateRestaurantData(restaurant)) return;
  loadCatalog();
  loadMyMenus();
  showStep(3);
};

document.getElementById('back2').onclick = () => {
  clearAlert();
  showStep(2);
};

document.getElementById('menuMode').onchange = (e) => {
  const mode = e.target.value;
  document
    .getElementById('newMenuBox')
    .classList.toggle('d-none', mode !== 'new');
  document
    .getElementById('importBox')
    .classList.toggle('d-none', mode !== 'import');
};

// --- Caricamento catalogo piatti e menu esistenti ----------------------

async function loadCatalog() {
  try {
    const res = await fetch(`${API}/dishes/catalog`);
    const json = await res.json();
    const cont = document.getElementById('catalog');
    cont.innerHTML = '';

    (json.data || []).forEach((d) => {
      const card = document.createElement('div');
      card.className = 'col-6 col-md-4';
      card.innerHTML = `
        <div class="form-check border rounded p-2 h-100">
          <input class="form-check-input" type="checkbox" value="${d._id}" id="dish-${d._id}">
          <label class="form-check-label" for="dish-${d._id}">
            <strong>${d.name}</strong><br><small>${d.category || ''}</small>
          </label>
        </div>`;
      cont.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    showAlert('error', 'Errore nel caricamento del catalogo piatti.');
  }
}

async function loadMyMenus() {
  try {
    const res = await fetch(`${API}/menu?mine=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const sel = document.getElementById('fromMenuId');
    sel.innerHTML = '';

    (json.data || []).forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m._id;
      opt.textContent = `Menu ${m._id} – ${m.restaurantIds?.length || 0} ristoranti`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    showAlert('error', 'Errore nel caricamento dei tuoi menù.');
  }
}

// --- Invio finale ------------------------------------------------------

document.getElementById('finish').onclick = async () => {
  clearAlert();

  const fiscalData = getFiscalData();
  if (!validateFiscalData(fiscalData)) {
    showStep(1);
    return;
  }

  const restaurant = getRestaurantData();
  if (!validateRestaurantData(restaurant)) {
    showStep(2);
    return;
  }

  const menu = getMenuData();

  try {
    const res = await fetch(`${API}/restaurateurs/complete-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...fiscalData,
        restaurant,
        menu,
      }),
    });

    const json = await res.json();

    if (json.success) {
      showAlert(
        'success',
        'Profilo completato! Verrai reindirizzato alla dashboard.'
      );
      setTimeout(() => {
        window.location.href = '/dashboard/restaurateur.html';
      }, 1200);
    } else {
      showAlert('error', json.message || 'Errore nella procedura.');
    }
  } catch (err) {
    console.error(err);
    showAlert('error', 'Errore di comunicazione con il server.');
  }
};
