document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(window.location.search);
    const dishId = params.get('dishId');
    const restaurantId = params.get('id'); // ID del ristorante per il reindirizzamento

    const form = document.getElementById('edit-dish-form');
    const spinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const dishTitle = document.getElementById('dish-title');

    // Funzione per mostrare un messaggio di errore
    const displayError = (message) => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        spinner.style.display = 'none';
        form.style.display = 'none';
    };

    // 1. Controllo di sicurezza e ID
    if (!token || !dishId || !restaurantId) {
        alert('Accesso non autorizzato o ID mancante.');
        window.location.href = 'restaurateur-dashboard.html';
        return;
    }

    // 2. Caricamento Dati Piatto Esistente (GET /api/lv/dishes/:id)
    try {
        const response = await fetch(`/api/lv/dishes/${dishId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();
        if (!response.ok) {
            throw new Error(json.message || 'Errore durante il recupero del piatto.');
        }

        const dish = json.data;

        await populateCategories(dish.category);
        // Popola il form con i dati ricevuti
        document.getElementById('dish-name').value = dish.name;
        document.getElementById('dish-price').value = dish.price.toFixed(2);
        document.getElementById('dish-category').value = dish.category;
        document.getElementById('dish-description').value = dish.description || '';

        // Converti l'array di ingredienti in una stringa separata da virgole
        document.getElementById('dish-ingredients').value = dish.ingredients ? dish.ingredients.join(', ') : '';

        // Aggiorna il titolo della pagina
        dishTitle.textContent = `Modifica Piatto: ${dish.name}`;

        // Nascondi spinner e mostra form
        spinner.style.display = 'none';
        form.style.display = 'block';

    } catch (error) {
        console.error(error);
        displayError(error.message || 'Impossibile caricare i dati del piatto.');
        return;
    }

    // 3. Gestione Sottomissione Form (PUT /api/lv/dishes/:id)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';

        const ingredientsStr = document.getElementById('dish-ingredients').value;
        const ingredients = ingredientsStr.split(',').map(i => i.trim()).filter(i => i.length > 0);

        // Raccogli i dati aggiornati dal form
        const updatedData = {
            name: document.getElementById('dish-name').value,
            price: parseFloat(document.getElementById('dish-price').value),
            category: document.getElementById('dish-category').value,
            description: document.getElementById('dish-description').value,
            ingredients: ingredients
        };

        try {
            const response = await fetch(`/api/lv/dishes/${dishId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            const json = await response.json();

            if (response.ok) {
                alert('Piatto aggiornato con successo!');
                // Torna alla pagina di gestione del ristorante
                window.location.href = `restaurant-manage.html?id=${restaurantId}`;
            } else {
                displayError(json.message || 'Errore durante l\'aggiornamento.');
            }
        } catch (error) {
            console.error(error);
            displayError('Errore di comunicazione con il server.');
        }
    });

    // 4. Bottone Annulla
    document.getElementById('btn-cancel').addEventListener('click', () => {
        // Torna alla pagina di gestione del ristorante (Menù)
        window.location.href = `restaurant-manage.html?id=${restaurantId}&tab=menu`;
    });

    async function populateCategories(selectedCategory = null) {
        const categorySelect = document.getElementById('dish-category');
        // Pulizia iniziale
        categorySelect.innerHTML = '<option value="" selected disabled>Caricamento...</option>';

        try {
            const response = await fetch('/api/lv/categories');
            const json = await response.json();

            if (json.success && Array.isArray(json.data)) {
                categorySelect.innerHTML = '<option value="" disabled>Seleziona una categoria</option>';
                json.data.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
                    if (selectedCategory && cat === selectedCategory) option.selected = true;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Errore popolamento categorie:", error);
        }
    }
});