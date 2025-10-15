function setMessage(el, text, type='success') {
  el.innerHTML = `<div class="alert alert-${type}" role="alert">${text}</div>`;
}

function setupRegister() {
  const form = document.getElementById('regForm');
  const msg = document.getElementById('msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json();
      if (!out.success) throw new Error(out.message || 'Errore registrazione');
      localStorage.setItem('token', out.data.token);
      setMessage(msg, 'Registrazione completata! Verifica il tuo profilo nella home.');
      setTimeout(() => window.location.href = '/', 700);
    } catch (err) {
      setMessage(msg, err.message, 'danger');
    }
  });
}

function setupLogin() {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json();
      if (!out.success) throw new Error(out.message || 'Errore login');
      localStorage.setItem('token', out.data.token);
      setMessage(msg, 'Login ok! Reindirizzo...', 'success');
      setTimeout(() => window.location.href = '/', 700);
    } catch (err) {
      setMessage(msg, err.message, 'danger');
    }
  });
}
