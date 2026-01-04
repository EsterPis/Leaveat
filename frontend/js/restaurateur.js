import { initRestaurantWizard, gatherWizardData } from './restaurant-wizard-logic.js';

const API = '/api/lv';
const API_RESTAURATEURS = API + '/restaurateurs';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inizializza il Wizard modulare nello Step 2
    // Passiamo 'false' perché in fase di registrazione non vogliamo clonare menù
    const step2Container = document.getElementById('restaurant-form-container');
    initRestaurantWizard('restaurant-form-container', false);

    // 2. DOM MANIPULATION: Spostiamo la sezione Menù nello Step 3
    // Il wizard ha generato due card: Dati Ristorante (1) e Menù (2).
    // Spostiamo la seconda card nel contenitore dello Step 3 per rispettare il tuo stepper.
    const wizardContent = document.getElementById('wizard-content');
    if (wizardContent) {
        // La seconda card è quella del menù (basato su ui-components.js)
        const menuCard = wizardContent.querySelector('.card:nth-of-type(2)');
        const step3Container = document.getElementById('menu-builder-container');
        
        if (menuCard && step3Container) {
            step3Container.appendChild(menuCard);
        }
    }

    // 3. Avvia gestione eventi navigazione
    setupStepperEvents();
});


// --- HELPERS UI E VALIDAZIONI ---
// Regex per Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Regex per Telefono (10 cifre italiane)
const phoneRegex = /^[0-9]{10}$/;
// Regex base per Partita IVA italiana (11 cifre)
const vatRegex = /^[1-9]/;
// Regex base per IBAN Italiano (IT + 2 cifre controllo + 1 lettera + 22 alfanumerici)
const ibanRegex = /^[1-9]/;
// Regex per CAP (5 cifre)
const zipRegex = /^\d{5}$/;

function isEmpty(value) {
    return !value || !value.toString().trim().length === 0;
}

function isValidEmail(email) {
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    return phoneRegex.test(phone);
}

function isValidVAT(vat) {
    if (!vat) return false;
    const cleanVat = vat.toString().trim();
    return vatRegex.test(cleanVat);
}

function isValidIBAN(iban) {
   if (!iban) return false;
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    return ibanRegex.test(cleanIban);
}

// --- Modifica validateFiscalData (Step 1) ---

function validateFiscalData(d) {
    if (Object.values(d).some(isEmpty)) {
        showAlert('error', 'Compila tutti i campi dei dati fiscali.');
        return false;
    }

    if (!isValidEmail(d.adminEmail)) {
        showAlert('error', 'L\'email amministrativa non è valida.');
        return false;
    }

    if (!isValidVAT(d.vatNumber)) {
        showAlert('error', 'La Partita IVA deve essere composta da 11 cifre.');
        return false;
    }

    if (!isValidIBAN(d.iban)) {
        showAlert('error', 'Il codice IBAN non è valido (formato IT...).');
        return false;
    }

    return true;
}

// --- Modifica validateRestaurantData (Step 2) ---

function validateRestaurantData(r) {
    // Verifica campi vuoti
    if (
        isEmpty(r.legalName) || isEmpty(r.displayName) || isEmpty(r.phoneNumber) ||
        isEmpty(r.openingHours) || isEmpty(r.address.street) || isEmpty(r.address.number) ||
        isEmpty(r.address.zip) || isEmpty(r.address.city) || isEmpty(r.address.province)
    ) {
        showAlert('error', 'Compila tutti i campi obbligatori del ristorante.');
        return false;
    }

    // Validazioni Specifiche
    if (!isValidPhone(r.phoneNumber)) {
        showAlert('error', 'Il telefono deve essere composto da 10 cifre numeriche.');
        return false;
    }

    if (r.email && !isValidEmail(r.email)) {
        showAlert('error', 'L\'email del ristorante non è valida.');
        return false;
    }

    if (!zipRegex.test(r.address.zip)) {
        showAlert('error', 'Il CAP deve essere composto da 5 cifre.');
        return false;
    }

    if (r.address.province.length !== 2) {
        showAlert('error', 'La provincia deve essere di 2 lettere (es. MI, RM).');
        return false;
    }

    return true;
}

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
        if (i === n - 1) el.classList.add('fw-bold');
        else el.classList.remove('fw-bold');
    });
}

function showAlert(type, message) {
    const alert = document.getElementById('alert');
    // Creiamo un alert container se non esiste o usiamo quello presente se hai un div id="alert" nel layout
    // Se non c'è nel tuo HTML attuale (non era nel file completo fornito), usiamo window.alert come fallback o lo creiamo
    if (!alert) { 
        // Fallback semplice se non c'è il div nel DOM
        if(type === 'error') window.alert(message);
        return; 
    }

    alert.className = 'alert mt-3';
    alert.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
    alert.textContent = message;
    alert.classList.remove('d-none');
}

function clearAlert() {
    const alert = document.getElementById('alert');
    if (alert) alert.classList.add('d-none');
}

// --- LOGICA DATI FISCALI (Mantenuta dal tuo file originale) ---

function getFiscalData() {
    return {
        vatNumber: document.getElementById('vat').value.trim(),
        legalRepresentative: document.getElementById('legalRepresentativeName').value.trim(), // Corretto nome chiave per coerenza backend
        adminEmail: document.getElementById('adminEmail').value.trim(),
        bankAccountHolder: document.getElementById('bankHolder').value.trim(),
        iban: document.getElementById('iban').value.trim(),
    };
}
// --- GESTIONE EVENTI STEPPER ---

function setupStepperEvents() {

    // 1. Start Wizard
    const startBtn = document.getElementById('startWizard');
    if (startBtn) {
        startBtn.onclick = () => {
            const intro = document.getElementById('intro');
            if (intro) intro.classList.add('d-none');
            clearAlert();
            showStep(1);
        };
    }

    // 2. Step 1 -> Step 2 (Fiscal -> Restaurant)
    document.getElementById('toStep2').onclick = () => {
        clearAlert();
        const fiscalData = getFiscalData();
        if (validateFiscalData(fiscalData)) {
            showStep(2);
        }
    };

    // 3. Step 2 -> Step 3 (Restaurant -> Menu)
    document.getElementById('toStep3').onclick = () => {
        clearAlert();

        const wizardData = gatherWizardData();
        
        // Validazione minima Ristorante
        if (!validateRestaurantData(wizardData.restaurant)) {
            return;
        }

        showStep(3);
    };

    // 4. Back Buttons
    document.getElementById('back1').onclick = () => {
        clearAlert();
        showStep(1);
    };

    document.getElementById('back2').onclick = () => {
        clearAlert();
        showStep(2);
    };

    // 5. FINISH (Invio al Server)
    document.getElementById('finish').onclick = async () => {
        clearAlert();
        
        // Raccogli Dati Fiscali
        const fiscalData = getFiscalData();
        if (!validateFiscalData(fiscalData)) { showStep(1); return; }

        // Raccogli Dati Wizard (Ristorante + Menù)
        const wizardData = gatherWizardData();

        // Validazione Menù
        if (wizardData.menuDishes.length === 0) {
            showAlert('error', "Il menù è vuoto! Aggiungi almeno un piatto.");
            return;
        }

        // Costruzione Payload
        // Nota: inviamo 'menu' come array piatto. Il backend dovrà gestire la creazione.
        const payload = {
            ...fiscalData,
            restaurant: wizardData.restaurant,
            menu: wizardData.menuDishes // Array di oggetti piatto
        };

        try {
            const res = await fetch(`${API_RESTAURATEURS}/complete-registration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (res.ok && json.success) {
                // Successo!
                const alertBox = document.getElementById('alert');
                if(alertBox) {
                    alertBox.className = 'alert alert-success mt-3';
                    alertBox.textContent = 'Profilo completato! Reindirizzamento...';
                    alertBox.classList.remove('d-none');
                } else {
                    alert('Profilo completato! Reindirizzamento...');
                }
                
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
}