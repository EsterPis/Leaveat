const form = document.getElementById('customerForm');

if (form) {
  const API_BASE = '/api/lv/customers/me';
  async function loadCategories() {
    try {
      const res = await fetch('/api/lv/categories');
      const out = await res.json();
      if (!out.success) throw new Error('Errore nel caricamento categorie');

      const categories = out.data;
      const categoriesList = document.getElementById('categoriesList');

      categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
        <input class="form-check-input" type="checkbox" name="favoriteCategories" value="${cat}">
        <label class="form-check-label">${cat}</label>
      `;
        categoriesList.appendChild(div);
      });
    } catch (err) {
      console.error('Errore caricamento categorie:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', loadCategories);

  // -----------------------------
  // 2. Ricerca ristoranti (mock per ora)
  // -----------------------------
 const mockRestaurants = [
  { _id: '674d31b1a320c5185f97c101', name: 'Pizzeria Bella Napoli' },
  { _id: '674d31b1a320c5185f97c102', name: 'Sushi Garden' },
  { _id: '674d31b1a320c5185f97c103', name: 'La Griglia di Mare' },
  { _id: '674d31b1a320c5185f97c104', name: 'Trattoria Romana' },
  { _id: '674d31b1a320c5185f97c105', name: 'Burger House' },
];

  const searchInput = document.getElementById('restaurantSearch');
  const suggestionsBox = document.getElementById('restaurantSuggestions');
  const selectedBox = document.getElementById('selectedRestaurants');
  let selectedRestaurants = [];

  function showSuggestions(query) {
    const filtered = mockRestaurants.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase())
    );

    suggestionsBox.innerHTML = '';
    if (filtered.length === 0) {
      suggestionsBox.style.display = 'none';
      return;
    }

    filtered.forEach(r => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-group-item list-group-item-action';
      item.textContent = r.name;
      item.addEventListener('click', () => selectRestaurant(r));
      suggestionsBox.appendChild(item);
    });

    suggestionsBox.style.display = 'block';
  }

  function selectRestaurant(r) {
    if (selectedRestaurants.find(x => x._id === r._id)) return;
    selectedRestaurants.push(r);
    renderSelectedRestaurants();
    suggestionsBox.style.display = 'none';
    searchInput.value = '';
  }

  function renderSelectedRestaurants() {
    selectedBox.innerHTML = '';
    selectedRestaurants.forEach(r => {
      const badge = document.createElement('span');
      badge.className = 'badge bg-primary me-1 mb-1';
      badge.textContent = r.name;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-close btn-close-white btn-sm ms-2';
      removeBtn.addEventListener('click', () => {
        selectedRestaurants = selectedRestaurants.filter(x => x._id !== r._id);
        renderSelectedRestaurants();
      });

      badge.appendChild(removeBtn);
      selectedBox.appendChild(badge);
    });
  }

  searchInput.addEventListener('input', e => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      suggestionsBox.style.display = 'none';
      return;
    }
    showSuggestions(query);
  });

  document.addEventListener('click', e => {
    if (!suggestionsBox.contains(e.target) && e.target !== searchInput) {
      suggestionsBox.style.display = 'none';
    }
  });

  // -----------------------------
  // 3. Invio form
  // -----------------------------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('msg');
    msg.innerHTML = '';

    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!userId || !token) {
      msg.innerHTML = '<div class="alert alert-danger">Utente non autenticato.</div>';
      return;
    }

    const formData = new FormData(e.target);
    const favoriteCategories = formData.getAll('favoriteCategories');
    const paymentMethod = formData.get('paymentMethod');

    const body = {
      preferences: {
        favoriteCategories,
        favoriteRestaurantIds: selectedRestaurants.map(r => r._id),
      },
      paymentMethod,
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
      if (!out.success) throw new Error(out.message || 'Errore durante il salvataggio');
      msg.innerHTML = '<div class="alert alert-success">Profilo completato con successo!</div>';
      setTimeout(() => (window.location.href = '/index.html'), 1500);
      localStorage.setItem('firstName', formData.firstName);
      localStorage.setItem('role', out.data.role);
    } catch (err) {
      msg.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  });
}