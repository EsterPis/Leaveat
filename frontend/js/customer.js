const form = document.getElementById('customerForm');

/* A → UTILITY FUNCTIONS */
let selectedCategories = [];
let selectedRestaurants = [];
// Loads categories and restaurants to populate the select inputs
async function loadCategories() {
  const res = await fetch('/api/lv/categories');
  const out = await res.json();

  if (!out.success) return;

  const container = document.getElementById('categoriesList');
  container.innerHTML = '';

  out.data.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-secondary btn-sm';
    btn.textContent = cat;

    btn.addEventListener('click', () => toggleCategory(cat));

    container.appendChild(btn);
  });
}

function toggleCategory(cat) {
  if (selectedCategories.includes(cat)) {
    selectedCategories = selectedCategories.filter(c => c !== cat);
  } else {
    selectedCategories.push(cat);
  }

  renderSelectedCategories();
}

function renderSelectedCategories() {
  const container = document.getElementById('selectedCategories');
  container.innerHTML = '';

  selectedCategories.forEach(cat => {
    const badge = document.createElement('span');
    badge.className = 'badge bg-success me-1';

    badge.innerHTML = `
      ${cat}
      <button type="button" 
              class="btn-close btn-close-white btn-sm ms-2"
              onclick="removeCategory('${cat}')">
      </button>
    `;

    container.appendChild(badge);
  });
}

function removeCategory(cat) {
  selectedCategories = selectedCategories.filter(c => c !== cat);
  renderSelectedCategories();
}

// Loads categories and restaurants to populate the select inputs
async function loadRestaurants() {
  const res = await fetch('/api/lv/restaurants');
  const out = await res.json();

  if (!out.success) return;

  const container = document.getElementById('restaurantsList');
  container.innerHTML = '';

  out.data.forEach(r => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary btn-sm';
    btn.textContent = r.displayName;

    btn.addEventListener('click', () => toggleRestaurant(r));

    container.appendChild(btn);
  });
}

function toggleRestaurant(r) {
  const exists = selectedRestaurants.find(x => x._id === r._id);

  if (exists) {
    selectedRestaurants = selectedRestaurants.filter(x => x._id !== r._id);
  } else {
    selectedRestaurants.push(r);
  }

  renderSelectedRestaurants();
}

function renderSelectedRestaurants() {
  const container = document.getElementById('selectedRestaurants');
  container.innerHTML = '';

  selectedRestaurants.forEach(r => {
    const badge = document.createElement('span');
    badge.className = 'badge bg-primary me-1';

    badge.innerHTML = `
      ${r.displayName}
      <button type="button" 
              class="btn-close btn-close-white btn-sm ms-2"
              onclick="removeRestaurant('${r._id}')">
      </button>
    `;

    container.appendChild(badge);
  });
}

function removeRestaurant(id) {
  selectedRestaurants = selectedRestaurants.filter(r => r._id !== id);
  renderSelectedRestaurants();
}


/* B → MAIN LOGIC */
if (form) {
  const API_BASE = '/api/lv/customers/me';
  document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadRestaurants();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const msg = document.getElementById('msg');
    msg.innerHTML = '';

    const token = localStorage.getItem('token');

    if (!token) {
      msg.innerHTML = '<div class="alert alert-danger">Utente non autenticato.</div>';
      return;
    }

    const formData = new FormData(e.target);
    const paymentMethod = formData.get('paymentMethod');

    const body = {
      preferences: {
        favoriteCategories: selectedCategories,
        favoriteRestaurantIds: selectedRestaurants.map(r => r._id),
      },
      paymentMethod
    };

    try {
      const res = await fetch(API_BASE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const out = await res.json();

      if (!out.success)
        throw new Error(out.message || 'Errore durante il salvataggio');

      msg.innerHTML = '<div class="alert alert-success">Profilo aggiornato con successo!</div>';

      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1500);

    } catch (err) {
      msg.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  });

}