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
const ibanRegex = /^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/;
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
    const alertContainer = document.getElementById('alertMessage');
    if (!alertContainer) {
        alert(message);
        return;
    }
    alertContainer.className = 'alert mt-3';
    alertContainer.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
    alertContainer.textContent = message;
    alertContainer.classList.remove('d-none');
}

function clearAlert() {
    const alertContainer = document.getElementById('alertMessage');
    if (alertContainer) alertContainer.classList.add('d-none');
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

function setupStepperEvents() {

    const startBtn = document.getElementById('startWizard');
    if (startBtn) {
        startBtn.onclick = () => {
            document.getElementById('intro')?.classList.add('d-none');
            clearAlert();
            showStep(1);
        };
    }

    const finishBtn = document.getElementById('finish');
    if (finishBtn) {
        finishBtn.onclick = async () => {
            clearAlert();

            const fData = getFiscalData();

            if (!validateFiscalData(fData)) return;

            try {
                const payload = {
                    VATNumber: fData.vatNumber,
                    legalRepresentativeName: fData.legalRepresentative,
                    adminEmail: fData.adminEmail,
                    bankAccountHolder: fData.bankAccountHolder,
                    IBAN: fData.iban
                };

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
                    window.location.href = 'create-restaurant.html';
                } else {
                    showAlert('error', json.message || 'Errore salvataggio dati fiscali.');
                }

            } catch (err) {
                console.error(err);
                showAlert('error', 'Errore di comunicazione con il server.');
            }
        };
    }
}