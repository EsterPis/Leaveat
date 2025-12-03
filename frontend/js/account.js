// URL base delle API (modifica se necessario)
const API_URL = '/api/lv';

// Funzione eseguita al caricamento della pagina
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html'; // Se non loggato, via al login
        return;
    }

    try {
        await loadUserProfile(token);
    } catch (error) {
        console.error('Errore caricamento profilo:', error);
        showAlert('Impossibile caricare i dati del profilo.', 'danger');
    }
});

// Funzione per mostrare messaggi (successo/errore)
function showAlert(message, type) {
    const alertBox = document.getElementById('alertMessage');
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
    
    // Nascondi dopo 3 secondi
    setTimeout(() => {
        alertBox.classList.add('d-none');
    }, 5000);
}

// 1. CARICAMENTO DATI
async function loadUserProfile(token) {
    // Nota: Assumo che il backend /users/me restituisca un oggetto strutturato così:
    // { user: { ...datiUser }, profile: { ...datiSpecifici } }
    // Se il tuo backend attuale restituisce solo i dati User, dovrai fare una seconda chiamata
    // in base al ruolo. Qui ipotizzo una chiamata singola o aggregata per semplicità.
    
    const response = await fetch(`${API_URL}/users/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error('Errore fetch dati');

    const data = await response.json();
    
    // Popola i dati base (User.js)
    const user = data.user || data; // Adatta in base a come risponde il tuo backend
    const profile = data.profile || {}; // Dati specifici (Customer o Restaurateur)

    document.getElementById('lblFirstName').textContent = user.firstName;
    document.getElementById('lblLastName').textContent = user.lastName;
    document.getElementById('lblEmail').textContent = user.email;
    document.getElementById('lblPhone').textContent = user.phoneNumber;

    // Pre-popola anche i campi del modale di modifica
    document.getElementById('editFirstName').value = user.firstName;
    document.getElementById('editLastName').value = user.lastName;
    document.getElementById('editPhone').value = user.phoneNumber;

    // GESTIONE RUOLI
    // Se è un CLIENTE
    if (user.role === 'CUSTOMER') {
        const section = document.getElementById('customer-section');
        section.classList.remove('d-none'); // Mostra sezione cliente

        // Popola preferenze (Customer.js)
        if (profile.paymentMethod) {
            document.getElementById('lblPayment').textContent = profile.paymentMethod;
        }
        
        const prefList = document.getElementById('listPreferences');
        prefList.innerHTML = ''; // Pulisci
        
        // Se ci sono categorie preferite
        if (profile.preferences && profile.preferences.favoriteCategories) {
            profile.preferences.favoriteCategories.forEach(cat => {
                const li = document.createElement('li');
                li.textContent = cat;
                prefList.appendChild(li);
            });
        } else {
            prefList.innerHTML = '<li>Nessuna preferenza specificata</li>';
        }
    } 
    // Se è un RISTORATORE
    else if (user.role === 'RESTAURATEUR') {
        const section = document.getElementById('restaurateur-section');
        section.classList.remove('d-none'); // Mostra sezione ristoratore

        // Popola dati fiscali (Restaurateur.js)
        document.getElementById('lblVat').textContent = profile.VATNumber || 'N/D';
        document.getElementById('lblIban').textContent = profile.IBAN || 'N/D';

        // Modifica testo avviso eliminazione come da richiesta
        const warningText = document.getElementById('deleteWarningText');
        warningText.innerHTML = `
            <strong>ATTENZIONE:</strong> Sei un ristoratore.<br>
            Eliminando il tuo account, verranno eliminati anche 
            <strong>TUTTI i ristoranti</strong> e i menù associati.<br>
            Sei sicuro di voler procedere?
        `;
    }
}

// 2. AGGIORNAMENTO DATI (PUT)
async function updateUser() {
    const token = localStorage.getItem('token');
    
    const updatedData = {
        firstName: document.getElementById('editFirstName').value,
        lastName: document.getElementById('editLastName').value,
        phoneNumber: document.getElementById('editPhone').value
    };

    try {
        const response = await fetch(`${API_URL}/users/me`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            // Chiudi modale
            const modalEl = document.getElementById('editModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
            
            showAlert('Dati aggiornati con successo!', 'success');
            // Ricarica i dati a video
            loadUserProfile(token); 
        } else {
            const err = await response.json();
            alert('Errore aggiornamento: ' + (err.message || 'Sconosciuto'));
        }
    } catch (error) {
        console.error(error);
        alert('Errore di connessione');
    }
}

// 3. ELIMINAZIONE ACCOUNT (DELETE)
async function deleteAccount() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/users/me`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // Logout forzato
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            alert('Account eliminato correttamente. Verrai reindirizzato alla home.');
            window.location.href = 'index.html';
        } else {
            const err = await response.json();
            alert('Errore eliminazione: ' + (err.message || 'Sconosciuto'));
        }
    } catch (error) {
        console.error(error);
        alert('Errore di connessione durante eliminazione');
    }
}