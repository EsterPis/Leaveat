/*Gestione prima fase di registrazione ristoratore (dati fiscali), poi rendirizza alla pagina di creazione ristorante. */
import { initRestaurantWizard } from './restaurant-wizard-logic.js'; //logica delegata al wizard

const API = '/api/lv';
const API_RESTAURATEURS = API + '/restaurateurs';
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza il wizard di creazione ristorante (logica e UI)
    initRestaurantWizard('restaurant-form-container', false); //scenario standard

    // Spostamento dinamico della card menu nello step finale del wizard
    const wizardContent = document.getElementById('wizard-content');
    if (wizardContent) {
        const menuCard = wizardContent.querySelector('.card:nth-of-type(2)');
        const step3Container = document.getElementById('menu-builder-container');
        if (menuCard && step3Container) {
            step3Container.appendChild(menuCard); // Sposta la card del menù nello Step 3
        }
    }

    setupStepperEvents();
});

// --- HELPERS UI E VALIDAZIONI ---
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10}$/;
const vatRegex = /^[0-9]{11}$/; // 11 numeri
const ibanRegex = /^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/; // IBAN italiano: IT + 2 cifre + 1 lettera + 10 cifre + 12 alfanumerici

// Controlla se un valore è vuoto (null, undefined, stringa vuota o solo spazi)
function isEmpty(value) {
    return !value || value.toString().trim().length === 0;
}

// Funzioni di validazione specifiche per ogni campo
function isValidEmail(email) { return emailRegex.test(email); }
function isValidPhone(phone) { return phoneRegex.test(phone); }
function isValidVAT(vat) { return vatRegex.test(vat); }
function isValidIBAN(iban) {
    if (!iban) return false;
    // Rimuove spazi e tutto maiuscolo
    return ibanRegex.test(iban.replace(/\s+/g, '').toUpperCase());
}

// Validazione completa dei dati fiscali prima dell'invio al server
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

// Funzione per mostrare un messaggio di alert (successo o errore) 
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

// Nasconde l'alert
function clearAlert() {
    const alertContainer = document.getElementById('alertMessage');
    if (alertContainer) alertContainer.classList.add('d-none');
}

// Raccoglie i dati fiscali dai campi del form
function getFiscalData() {
    return {
        vatNumber: document.getElementById('vat').value.trim(),
        legalRepresentative: document.getElementById('legalRepresentativeName').value.trim(),
        adminEmail: document.getElementById('adminEmail').value.trim(),
        bankAccountHolder: document.getElementById('bankHolder').value.trim(),
        iban: document.getElementById('iban').value.replace(/\s+/g, '').toUpperCase(), // Pulizia IBAN
    };
}

function setupStepperEvents() {
    const startBtn = document.getElementById('startWizard');
    // Avvio del wizard: mostra il primo step e nasconde l'intro
    if (startBtn) {
        startBtn.onclick = () => {
            document.getElementById('intro')?.classList.add('d-none');
            clearAlert();
            document.getElementById('step1')?.classList.remove('d-none');
        };
    }

    // Salvataggio dei dati fiscali al click del bottone "Finish" nel form creazione ristorante
    const finishBtn = document.getElementById('finish');
    if (finishBtn) {
        finishBtn.onclick = async () => {
            clearAlert(); // Pulisce eventuali messaggi precedenti
            const fData = getFiscalData(); // Raccoglie i dati fiscali dal form

            if (!validateFiscalData(fData)) return; //Validazione dati

            try {
                //Costruzione playload
                const payload = {
                    VATNumber: fData.vatNumber,
                    legalRepresentativeName: fData.legalRepresentative,
                    adminEmail: fData.adminEmail,
                    bankAccountHolder: fData.bankAccountHolder,
                    IBAN: fData.iban
                };

                //Richiesta completamento registrazione
                const res = await fetch(`${API_RESTAURATEURS}/complete-registration`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });

                const json = await res.json();
                // Se la risposta è positiva, reindirizza alla pagina di creazione ristorante
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