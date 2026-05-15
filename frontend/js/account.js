/* Controller pagina account */
const API_URL = '/api/lv';

// Variabili globali per gestione stato
let currentUser = null; //nome, email, ruolo
let currentProfile = null; //dati specifici per ruolo (es. preferenze cliente, dati fiscali ristoratore)
let currentCustomerPreferences = {};
document.addEventListener('DOMContentLoaded', initPage); // Inizializza pagina dopo caricamento DOM

/*------------------------- INIT PAGE -------------------------*/
// Controlla token, carica dati utente e profilo, renderizza UI
async function initPage() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const data = await fetchUserProfile(token); //fetch del profilo utente (dati base + dati specifici per ruolo)
        //salvataggio stato globale
        currentUser = data.user;
        currentProfile = data.profile || {};

        //render nel riepilogo e popolamento form di modifica
        renderUserData(currentUser);
        populateEditForm(currentUser);
        renderRoleSection(currentUser, currentProfile);
        //se cliente, carica preferenze per modale e variabili globali per gestione preferenze
        if (currentUser.role === "CUSTOMER") {
            currentCustomerPreferences = currentProfile.preferences || {};
            selectedCategories = [...(currentCustomerPreferences.favoriteCategories || [])] //clono array per evitare modifiche dirette finché non si salva
            selectedRestaurants = (currentCustomerPreferences.favoriteRestaurantIds || []) 
                .map(r => typeof r === "object" ? r : { _id: r }); //normalizzazione 
            const paymentSelect = document.getElementById("paymentMethodSelect");
            if (paymentSelect) {
                paymentSelect.value = currentProfile.paymentMethod || "CASH";
            }
            loadCategories();
            loadRestaurants();
            renderSelectedCategories(); //renderizza preferenze selezionate
            renderSelectedRestaurants(); //renderizza preferenze selezionate
        }
        const ibanInput = document.getElementById("editIban");

        if (ibanInput) {
            ibanInput.addEventListener("input", (e) => {
                let value = e.target.value.replace(/\s+/g, '').toUpperCase();
                e.target.value = value.match(/.{1,4}/g)?.join(' ') || value;
            });
        }


    } catch (err) {

        console.error(err);
        showAlert("Impossibile caricare il profilo", "danger");

    }
}

// Chiamata API per ottenere dati utente e profilo 
async function fetchUserProfile(token) {
    const response = await fetch(`${API_URL}/users/me`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    if (!response.ok)
        throw new Error("Errore caricamento profilo");

    const result = await response.json();

    console.log("API RESPONSE:", result);

    // CASO 1 → struttura { success, data }
    if (result.data) {
        return {
            user: result.data.user || result.data,
            profile: result.data.profile || null
        };
    }

    // CASO 2 → struttura { user, profile }
    if (result.user) {
        return {
            user: result.user,
            profile: result.profile || null
        };
    }

    // CASO 3 → solo user
    return {
        user: result,
        profile: null
    };
}

// Renderizza dati base utente (nome, email, telefono) nella sezione riepilogo
function renderUserData(user) {
    document.getElementById("lblFirstName").textContent = user.firstName;
    document.getElementById("lblLastName").textContent = user.lastName;
    document.getElementById("lblEmail").textContent = user.email;
    document.getElementById("lblPhone").textContent = user.phoneNumber;

}

// Popola form di modifica dati base utente
function populateEditForm(user) {
    document.getElementById("editFirstName").value = user.firstName;
    document.getElementById("editLastName").value = user.lastName;
    document.getElementById("editPhone").value = user.phoneNumber;
    document.getElementById("editEmail").value = user.email;

}

// Mostra messaggio di alert (successo o errore) con timeout per scomparsa
function showAlert(message, type) {
    const alertBox = document.getElementById("alertMessage");
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove("d-none");
    setTimeout(() => {
        alertBox.classList.add("d-none");
    }, 5000);

}

/*---------------------- GESTIONE SEZIONI PER RUOLO -------------------------*/
// Seleziona il tipo di render sulla base del ruolo
function renderRoleSection(user, profile) {
    if (user.role === "CUSTOMER")
        renderCustomerSection(profile);

    if (user.role === "RESTAURATEUR")
        renderRestaurateurSection(profile);
}

/*----------- RENDER SEZIONE CLIENTE -----------*/
// Mostra sezione preferenza cliente
function renderCustomerSection(profile) {
    const section = document.getElementById("customer-section");
    section.classList.remove("d-none");
    renderPaymentMethod(profile);
    renderFavoriteCategories(profile);
    renderFavoriteRestaurants(profile);
}

// Renderizza il metodo di pagamento preferito
function renderPaymentMethod(profile) {
    // Mapping user-friendly
    const paymentMap = {
        CASH: "Contanti",
        PREPAID_CARD: "Carta prepagata",
        CREDIT_CARD: "Carta di credito"
    };
    const payment = profile.paymentMethod
        ? paymentMap[profile.paymentMethod]
        : "Non specificato";

    document.getElementById("lblPayment").textContent = payment; //inserimento nel label
}

// Renderizza le categorie preferite del cliente
function renderFavoriteCategories(profile) {
    const list = document.getElementById("listPreferences");
    list.innerHTML = "";

    // Normalizzazione dati: se sono stringhe, le trasformo in oggetti per uniformità
    const categories = profile.preferences?.favoriteCategories || []; 

    if (categories.length === 0) {
        list.innerHTML = "<li>Nessuna preferenza specificata</li>";
        return;
    }

    // Costruzione elenco categorie preferite
    categories.forEach(cat => {
        const li = document.createElement("li");
        li.textContent = cat;
        list.appendChild(li);

    });

}

// Renderizza i ristoranti preferiti del cliente
async function renderFavoriteRestaurants(profile) {
    const list = document.getElementById("listRestaurants");
    list.innerHTML = "";

    // Normalizzazione dati: se sono stringhe, le trasformo in oggetti per uniformità
    const restaurants = profile.preferences?.favoriteRestaurantIds || [];

    if (restaurants.length === 0) {
        list.innerHTML = "<li>Nessun ristorante preferito</li>";
        return;
    }
    // Costruzione elenco ristoranti preferiti
    restaurants.forEach(r => {
        const li = document.createElement("li");
        li.textContent = r.displayName || r;
        list.appendChild(li);

    });
}

// Modifica preferenze cliente
async function updatePreferences() {
    const token = localStorage.getItem("token");

    const paymentMethod = document.getElementById("paymentMethodSelect").value;
    const body = {
        paymentMethod: paymentMethod,
        preferences: {
            favoriteCategories: selectedCategories,
            favoriteRestaurantIds: selectedRestaurants.map(r => r._id)
        }
    };

    try {
        // Chiamata backend
        const res = await fetch(`${API_URL}/customers/me`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const out = await res.json();

        if (!out.success)
            throw new Error(out.message);

        showAlert("Preferenze aggiornate", "success");

        // Chiusura modale
        bootstrap.Modal.getInstance(
            document.getElementById("preferencesModal")
        ).hide();

        initPage(); // Ricarica dati e UI per riflettere le modifiche

    } catch (err) {

        showAlert(err.message, "danger");

    }

}


/*----------- RENDER SEZIONE RISTORATORE -----------*/
// Mostra sezione dati fiscali ristoratore
function renderRestaurateurSection(profile) {
    const section = document.getElementById("restaurateur-section");
    section.classList.remove("d-none"); // Mostra sezione

    // Popola dati fiscali
    document.getElementById("lblVat").textContent = profile.VATNumber || "N/D";
    document.getElementById("lblIban").textContent = profile.IBAN || "N/D";

    const warningText = document.getElementById("deleteWarningText");

    warningText.innerHTML = `
        <strong>ATTENZIONE:</strong> Sei un ristoratore.<br>
        Eliminando il tuo account verranno eliminati anche 
        <strong>TUTTI i ristoranti</strong> e i menù associati.
    `;

}

// Popola form di modifica dati fiscali
const fiscalModal = document.getElementById('fiscalModal');
fiscalModal.addEventListener('show.bs.modal', () => {
    const currentVat = document.getElementById('lblVat').textContent.trim();
    const currentIban = document.getElementById('lblIban').textContent.trim();

    document.getElementById('editVat').value = currentVat;
    document.getElementById('editIban').value = currentIban;
});

// Modifica dati fiscali
async function updateFiscalData() {
    const vat = document.getElementById("editVat").value;
    let iban = document.getElementById("editIban").value;

    iban = iban.replace(/\s+/g, '').toUpperCase(); // Normalizza IBAN
    if (!isValidVAT(vat)) {
        showAlert("Partita IVA non valida (11 cifre)", "danger");
        return;
    }

    if (!isValidIBAN(iban)) {
        showAlert("IBAN non valido (formato IT...)", "danger");
        return;
    }

    try {
        // richiesta backend
        const res = await fetch("/api/lv/restaurateurs/me", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + getToken()
            },
            body: JSON.stringify({
                VATNumber: vat,
                IBAN: iban
            })
        });

        const data = await res.json();

        if (data.success) {
            showAlert("Dati fiscali aggiornati", "success");
            // aggiorna UI
            document.getElementById("lblVat").textContent = vat;
            document.getElementById("lblIban").textContent = iban;

            bootstrap.Modal.getInstance(document.getElementById("fiscalModal")).hide();
        } else {
            showAlert(data.message, "danger");
        }

    } catch (err) {
        showAlert("Errore aggiornamento dati fiscali", "danger");
    }
}

// Validazione partita iva
function isValidVAT(vat) {
    return /^[0-9]{11}$/.test(vat);
}

// validazione IBAN
function isValidIBAN(iban) {
    if (!iban) return false;

    const cleaned = iban.replace(/\s+/g, '').toUpperCase();

    return /^IT\d{2}[A-Z]\d{10}[0-9A-Z]{12}$/.test(cleaned);
}

// Modifica dati base utente (nome, email, telefono)
async function updateUser() {
    const token = localStorage.getItem("token");

    const updatedData = {
        firstName: document.getElementById("editFirstName").value,
        lastName: document.getElementById("editLastName").value,
        phoneNumber: document.getElementById("editPhone").value
    };

    const newEmail = document.getElementById("editEmail").value;

    try {
        // richiesta backend
        const res = await fetch(`${API_URL}/users/me`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) {
            const err = await res.json();
            showAlert(err.message, "danger");
            return;
        }

        // Se l'email è stata modificata, aggiorna anche quella
        const emailRes = await fetch(`${API_URL}/users/me/email`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: newEmail })
        });

        if (!emailRes.ok) {
            const err = await emailRes.json();
            showAlert(err.message, "danger");
            return;
        }

        localStorage.setItem("email", newEmail); //modifica email in localStorage

        // chiusura modale
        bootstrap.Modal.getInstance(
            document.getElementById("editModal")
        ).hide();

        showAlert("Dati aggiornati!", "success");

        initPage(); //ricarica pagina per aggiornare dati e UI

    } catch (err) {

        console.error(err);
        showAlert("Errore aggiornamento", "danger");

    }

}

// Modifica password utente
async function updatePassword() {
    const token = localStorage.getItem("token");

    const body = {
        currentPassword: document.getElementById("currentPassword").value,
        newPassword: document.getElementById("newPassword").value
    };

    // richiesta backend
    const res = await fetch(`${API_URL}/users/me/password`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        showAlert("Password aggiornata", "success");

    }
    else {
        const err = await res.json();
        showAlert(err.message, "danger");
    }

    // chiusura modale
    bootstrap.Modal.getInstance(
        document.getElementById("passwordModal")
    ).hide();

}

// Eliminazione definitiva account
async function deleteAccount() {
    const token = localStorage.getItem("token");
    try {
        // richiesta backend
        const res = await fetch(`${API_URL}/users/me`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message);
        }

        localStorage.clear(); //pulizia local storage - logout forzato

        alert("Account eliminato");
        window.location.href = "index.html"; //reindirizzamento ad homepage

    } catch (err) {
        alert("Errore eliminazione: " + err.message); 
    }
}

