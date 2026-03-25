const API_URL = '/api/lv';

let currentUser = null;
let currentProfile = null;
let currentCustomerPreferences = {};

//let selectedCategories = [];
//let selectedRestaurants = [];

document.addEventListener('DOMContentLoaded', initPage);

/* A → PAGE INIT */

async function initPage() {

    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {

        const data = await fetchUserProfile(token);

        currentUser = data.user;
        currentProfile = data.profile || {};

        renderUserData(currentUser);
        populateEditForm(currentUser);
        renderRoleSection(currentUser, currentProfile);

        if (currentUser.role === "CUSTOMER") {
            currentCustomerPreferences = currentProfile.preferences || {};
            selectedCategories = [...(currentCustomerPreferences.favoriteCategories || [])]
            selectedRestaurants = (currentCustomerPreferences.favoriteRestaurantIds || [])
                .map(r => typeof r === "object" ? r : { _id: r });
            const paymentSelect = document.getElementById("paymentMethodSelect");
            if (paymentSelect) {
                paymentSelect.value = currentProfile.paymentMethod || "CASH";
            }
            loadCategories();
            loadRestaurants();
            renderSelectedCategories();
            renderSelectedRestaurants();
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


/* B → API CALLS */

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


/* C → UI RENDER */

function renderUserData(user) {

    document.getElementById("lblFirstName").textContent = user.firstName;
    document.getElementById("lblLastName").textContent = user.lastName;
    document.getElementById("lblEmail").textContent = user.email;
    document.getElementById("lblPhone").textContent = user.phoneNumber;

}


function populateEditForm(user) {

    document.getElementById("editFirstName").value = user.firstName;
    document.getElementById("editLastName").value = user.lastName;
    document.getElementById("editPhone").value = user.phoneNumber;
    document.getElementById("editEmail").value = user.email;

}

function showAlert(message, type) {

    const alertBox = document.getElementById("alertMessage");

    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove("d-none");

    setTimeout(() => {
        alertBox.classList.add("d-none");
    }, 5000);

}


/* D → ROLE MANAGEMENT */

function renderRoleSection(user, profile) {

    if (user.role === "CUSTOMER")
        renderCustomerSection(profile);

    if (user.role === "RESTAURATEUR")
        renderRestaurateurSection(profile);

}


/* E → CUSTOMER SECTION */

function renderCustomerSection(profile) {

    const section = document.getElementById("customer-section");
    section.classList.remove("d-none");

    renderPaymentMethod(profile);
    renderFavoriteCategories(profile);
    renderFavoriteRestaurants(profile);

}


function renderPaymentMethod(profile) {

    const paymentMap = {
        CASH: "Contanti",
        PREPAID_CARD: "Carta prepagata",
        CREDIT_CARD: "Carta di credito"
    };

    const payment = profile.paymentMethod
        ? paymentMap[profile.paymentMethod]
        : "Non specificato";

    document.getElementById("lblPayment").textContent = payment;

}


function renderFavoriteCategories(profile) {

    const list = document.getElementById("listPreferences");
    list.innerHTML = "";

    const categories = profile.preferences?.favoriteCategories || [];

    if (categories.length === 0) {
        list.innerHTML = "<li>Nessuna preferenza specificata</li>";
        return;
    }

    categories.forEach(cat => {

        const li = document.createElement("li");
        li.textContent = cat;
        list.appendChild(li);

    });

}


async function renderFavoriteRestaurants(profile) {

    const list = document.getElementById("listRestaurants");
    list.innerHTML = "";

    const restaurants = profile.preferences?.favoriteRestaurantIds || [];

    if (restaurants.length === 0) {
        list.innerHTML = "<li>Nessun ristorante preferito</li>";
        return;
    }
    restaurants.forEach(r => {
        const li = document.createElement("li");
        li.textContent = r.displayName || r;
        list.appendChild(li);

    });
}

//Update customer preferences (payment method, favorite categories, favorite restaurants)
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

        bootstrap.Modal.getInstance(
            document.getElementById("preferencesModal")
        ).hide();

        initPage();

    } catch (err) {

        showAlert(err.message, "danger");

    }

}


/* F → RESTAURATEUR SECTION */

function renderRestaurateurSection(profile) {

    const section = document.getElementById("restaurateur-section");
    section.classList.remove("d-none");

    document.getElementById("lblVat").textContent = profile.VATNumber || "N/D";
    document.getElementById("lblIban").textContent = profile.IBAN || "N/D";

    const warningText = document.getElementById("deleteWarningText");

    warningText.innerHTML = `
        <strong>ATTENZIONE:</strong> Sei un ristoratore.<br>
        Eliminando il tuo account verranno eliminati anche 
        <strong>TUTTI i ristoranti</strong> e i menù associati.
    `;

}

//Render modal with current fiscal data
const fiscalModal = document.getElementById('fiscalModal');

fiscalModal.addEventListener('show.bs.modal', () => {
    const currentVat = document.getElementById('lblVat').textContent.trim();
    const currentIban = document.getElementById('lblIban').textContent.trim();

    document.getElementById('editVat').value = currentVat;
    document.getElementById('editIban').value = currentIban;
});

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

function isValidVAT(vat) {
    return /^[0-9]{11}$/.test(vat);
}

function isValidIBAN(iban) {
    if (!iban) return false;

    const cleaned = iban.replace(/\s+/g, '').toUpperCase();

    return /^IT\d{2}[A-Z]\d{10}[0-9A-Z]{12}$/.test(cleaned);
}


/* G → USER SECTION*/

//Update user data (name, phone, email)
async function updateUser() {

    const token = localStorage.getItem("token");

    const updatedData = {
        firstName: document.getElementById("editFirstName").value,
        lastName: document.getElementById("editLastName").value,
        phoneNumber: document.getElementById("editPhone").value
    };

    const newEmail = document.getElementById("editEmail").value;

    try {

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

        localStorage.setItem("email", newEmail);

        bootstrap.Modal.getInstance(
            document.getElementById("editModal")
        ).hide();

        showAlert("Dati aggiornati!", "success");

        initPage();

    } catch (err) {

        console.error(err);
        showAlert("Errore aggiornamento", "danger");

    }

}

//Update user password
async function updatePassword() {
    const token = localStorage.getItem("token");

    const body = {
        currentPassword: document.getElementById("currentPassword").value,
        newPassword: document.getElementById("newPassword").value
    };

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

    bootstrap.Modal.getInstance(
        document.getElementById("passwordModal")
    ).hide();

}

//Delete user account (with confirmation)
async function deleteAccount() {

    const token = localStorage.getItem("token");

    try {

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

        localStorage.clear();

        alert("Account eliminato");

        window.location.href = "index.html";

    } catch (err) {

        alert("Errore eliminazione: " + err.message);

    }

}

