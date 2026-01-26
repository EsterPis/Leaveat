import { initRestaurantWizard, gatherWizardData, validateRestaurantData } from './restaurant-wizard-logic.js';

const API = '/api/lv';
const API_RESTAURATEURS = API + '/restaurateurs';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza il Wizard
    const step2Container = document.getElementById('restaurant-form-container');
    initRestaurantWizard('restaurant-form-container', false);

    // Sposta la card del menù nello Step 3
    const wizardContent = document.getElementById('wizard-content');
    if (wizardContent) {
        const menuCard = wizardContent.querySelector('.card:nth-of-type(2)');
        const step3Container = document.getElementById('menu-builder-container');
        if (menuCard && step3Container) {
            step3Container.appendChild(menuCard);
        }
    }

    setupStepperEvents();
});

// --- HELPERS UI E VALIDAZIONI ---
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10}$/;
const vatRegex = /^[0-9]{11}$/; // Corretta regex P.IVA (11 numeri)
const ibanRegex = /^IT[0-9]{2}[a-zA-Z][0-9a-zA-Z]{22}$/; // Regex IBAN IT
const zipRegex = /^\d{5}$/;

function isEmpty(value) {
    return !value || value.toString().trim().length === 0;
}

function isValidEmail(email) { return emailRegex.test(email); }
function isValidPhone(phone) { return phoneRegex.test(phone); }
function isValidVAT(vat) { return vatRegex.test(vat); }
function isValidIBAN(iban) { 
    if (!iban) return false;
    // Rimuovi spazi e metti maiuscolo
    return ibanRegex.test(iban.replace(/\s+/g, '').toUpperCase()); 
}

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
        showAlert('error', 'La Partita IVA deve essere composta da 11 cifre numeriche.');
        return false;
    }
    if (!isValidIBAN(d.iban)) {
        showAlert('error', 'Il codice IBAN non è valido (formato IT...).');
        return false;
    }
    return true;
}

function showStep(n) {
    ['step1', 'step2', 'step3'].forEach((id, i) => {
        const section = document.getElementById(id);
        if (section) section.classList.toggle('d-none', i !== n - 1);
    });

    ['step1Crumb', 'step2Crumb', 'step3Crumb'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('active', i === n - 1);
            if (i === n - 1) el.classList.add('fw-bold');
            else el.classList.remove('fw-bold');
        }
    });
}

function showAlert(type, message) {
    const alert = document.getElementById('alert');
    if (!alert) { 
        alert(message);
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

// --- LOGICA DATI FISCALI ---
function getFiscalData() {
    return {
        // Qui usiamo i nomi interni al form
        vatNumber: document.getElementById('vat').value.trim(),
        legalRepresentative: document.getElementById('legalRepresentativeName').value.trim(),
        adminEmail: document.getElementById('adminEmail').value.trim(),
        bankAccountHolder: document.getElementById('bankHolder').value.trim(),
        iban: document.getElementById('iban').value.replace(/\s+/g, '').toUpperCase(), // Pulizia IBAN
    };
}

// --- GESTIONE EVENTI STEPPER ---
function setupStepperEvents() {
    const startBtn = document.getElementById('startWizard');
    if (startBtn) {
        startBtn.onclick = () => {
            document.getElementById('intro')?.classList.add('d-none');
            clearAlert();
            showStep(1);
        };
    }

    document.getElementById('toStep2').onclick = () => {
        clearAlert();
        const fiscalData = getFiscalData();
        if (validateFiscalData(fiscalData)) {
            showStep(2);
        }
    };

    document.getElementById('toStep3').onclick = () => {
        clearAlert();
        const wizardData = gatherWizardData();
        
        // Validazione Ristorante (importata da logic)
        if (!validateRestaurantData(wizardData.restaurant)) {
            showAlert('error', 'Compila correttamente tutti i campi del ristorante.');
            return;
        }
        showStep(3);
    };

    document.getElementById('back1').onclick = () => { clearAlert(); showStep(1); };
    document.getElementById('back2').onclick = () => { clearAlert(); showStep(2); };

    // FINISH (Invio al Server)
    document.getElementById('finish').onclick = async () => {
        clearAlert();
        
        const fData = getFiscalData();
        if (!validateFiscalData(fData)) { showStep(1); return; }

        const wizardData = gatherWizardData(); // Prende active status e dati
        if (wizardData.menuDishes.length === 0) {
            showAlert('error', "Il menù è vuoto! Aggiungi almeno un piatto.");
            return;
        }

        // --- FIX ERRORE 400: MAPPING DEI CAMPI ---
        // Il backend (Restaurateur.js) vuole: VATNumber, legalRepresentativeName, IBAN
        const payload = {
            VATNumber: fData.vatNumber,               // Mapping corretto
            legalRepresentativeName: fData.legalRepresentative, // Mapping corretto
            adminEmail: fData.adminEmail,
            bankAccountHolder: fData.bankAccountHolder,
            IBAN: fData.iban,
            // Ristorante e Menu
            restaurant: wizardData.restaurant,
            menu: wizardData.menuDishes 
        };

        console.log("Invio payload:", payload); // Debug per vedere cosa invii

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
                const alertBox = document.getElementById('alert');
                if(alertBox) {
                    alertBox.className = 'alert alert-success mt-3';
                    alertBox.textContent = 'Profilo completato! Reindirizzamento...';
                    alertBox.classList.remove('d-none');
                }
                setTimeout(() => window.location.href = './restaurateur-dashboard.html', 1500);
            } else {
                showAlert('error', json.message || 'Errore nella procedura (400/500).');
            }
        } catch (err) {
            console.error(err);
            showAlert('error', 'Errore di comunicazione con il server.');
        }
    };
}