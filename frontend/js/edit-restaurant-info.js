/* Aggiornamento Informazioni Ristorante */
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(window.location.search); // recupero parametri
    const restaurantId = params.get('id');
    
    // Riferimenti al DOM
    const form = document.getElementById('edit-restaurant-form');
    const spinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');

    
    if (!token || !restaurantId) {
        alert('Accesso non autorizzato o ID ristorante mancante.');
        window.location.href = 'restaurateur-dashboard.html';
        return;
    }

    // Funzione per mostrare errori (arrow function)
    const displayError = (message) => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        spinner.style.display = 'none';
        form.style.display = 'none';
    };

    
    try {
        // Recupero dati ristorante
        const response = await fetch(`/api/lv/restaurants/${restaurantId}/manage`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const json = await response.json();

        if (!response.ok) {
            throw new Error(json.message || 'Errore durante il recupero dei dati.');
        }

        const restaurant = json.data;

        // Popolamento form con i dati ricevuti
        document.getElementById('legalName').value = restaurant.legalName;
        document.getElementById('displayName').value = restaurant.displayName;
        document.getElementById('phoneNumber').value = restaurant.phoneNumber;
        document.getElementById('email').value = restaurant.email || '';
        document.getElementById('openingHours').value = restaurant.openingHours;
        document.getElementById('description').value = restaurant.description || '';
        document.getElementById('websiteUrl').value = restaurant.websiteUrl || '';
        // Indirizzo
        document.getElementById('street').value = restaurant.address.street;
        document.getElementById('number').value = restaurant.address.number;
        document.getElementById('zip').value = restaurant.address.zip;
        document.getElementById('city').value = restaurant.address.city;
        document.getElementById('province').value = restaurant.address.province;
        
        // Nascondi spinner e mostra form
        spinner.style.display = 'none';
        form.style.display = 'block';

    } catch (error) {
        console.error(error);
        displayError(error.message || 'Impossibile caricare i dati del ristorante.');
        return;
    }

    // Invio form aggiornamento dati
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';
        
        // Lettura dati aggiornati dal form e creazione payload
        const updatedData = {
            legalName: document.getElementById('legalName').value,
            displayName: document.getElementById('displayName').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            email: document.getElementById('email').value,
            openingHours: document.getElementById('openingHours').value,
            description: document.getElementById('description').value,
            websiteUrl: document.getElementById('websiteUrl').value,
            address: {
                street: document.getElementById('street').value,
                number: document.getElementById('number').value,
                zip: document.getElementById('zip').value,
                city: document.getElementById('city').value,
                province: document.getElementById('province').value,
            }
        };

        try {
            // Invio richiesta di aggiornamento
            const response = await fetch(`/api/lv/restaurants/${restaurantId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            const json = await response.json();

            if (response.ok) {
                alert('Dati ristorante aggiornati con successo!');
                // Torna alla pagina di gestione ristorante
                window.location.href = `restaurant-manage.html?id=${restaurantId}`; 
            } else {
                displayError(json.message || 'Errore durante l\'aggiornamento.');
            }
        } catch (error) {
            console.error(error);
            displayError('Errore di comunicazione con il server.');
        }
    });
});