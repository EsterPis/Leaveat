const API = '/api/lv';
const token = localStorage.getItem('lv_token'); // settato dopo login
if(!token){ window.location.href='/login.html'; }

// UI helpers
function showStep(n){
  ['step1','step2','step3'].forEach((id,i)=>{
    document.getElementById(id).classList.toggle('d-none', i!==n-1);
  });
  ['step1Crumb','step2Crumb','step3Crumb'].forEach((id,i)=>{
    document.getElementById(id).classList.toggle('active', i===n-1);
  });
}

// Step nav
document.getElementById('toStep2').onclick=()=>showStep(2);
document.getElementById('back1').onclick=()=>showStep(1);
document.getElementById('toStep3').onclick=()=>{ loadCatalog(); loadMyMenus(); showStep(3); }
document.getElementById('back2').onclick=()=>showStep(2);

// Mode toggle
document.getElementById('menuMode').onchange=(e)=>{
  const mode=e.target.value;
  document.getElementById('newMenuBox').classList.toggle('d-none', mode!=='new');
  document.getElementById('importBox').classList.toggle('d-none', mode!=='import');
};

// Carica piatti catalogo
async function loadCatalog(){
  const res = await fetch(`${API}/dishes/catalog`);
  const json = await res.json();
  const cont = document.getElementById('catalog');
  cont.innerHTML = '';
  (json.data || []).forEach(d=>{
    const card = document.createElement('div');
    card.className='col-6 col-md-4';
    card.innerHTML=`
      <div class="form-check border rounded p-2 h-100">
        <input class="form-check-input" type="checkbox" value="${d._id}" id="dish-${d._id}">
        <label class="form-check-label" for="dish-${d._id}">
          <strong>${d.name}</strong><br><small>${d.category||''}</small>
        </label>
      </div>`;
    cont.appendChild(card);
  });
}

// Carica miei menù (per import)
async function loadMyMenus(){
  // end-point semplice che elenca i menù dell’utente (puoi implementarlo in /menu?mine=1)
  const res = await fetch(`${API}/menu?mine=1`, { headers: { Authorization:`Bearer ${token}` }});
  const json = await res.json();
  const sel = document.getElementById('fromMenuId');
  sel.innerHTML = '';
  (json.data || []).forEach(m=>{
    const opt = document.createElement('option');
    opt.value = m._id;
    opt.textContent = `Menu ${m._id} – ${m.restaurantIds?.length||0} ristoranti`;
    sel.appendChild(opt);
  });
}

document.getElementById('finish').onclick = async () => {
  const VATNumber = document.getElementById('vat').value.trim();
  const restaurant = {
    name: document.getElementById('name').value.trim(),
    phoneNumber: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim()
  };
  const mode = document.getElementById('menuMode').value;

  const menu = { mode };
  if (mode==='new'){
    const ids = Array.from(document.querySelectorAll('#catalog input[type=checkbox]:checked')).map(i=>i.value);
    menu.dishIds = ids;
  } else {
    menu.fromMenuId = document.getElementById('fromMenuId').value;
  }

  const res = await fetch(`${API}/restaurateurs/complete-registration`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ VATNumber, restaurant, menu })
  });
  const json = await res.json();
  const alert = document.getElementById('alert');
  if(json.success){
    alert.className='alert alert-success'; 
    alert.textContent='Profilo completato! Verrai reindirizzata alla dashboard.';
    alert.classList.remove('d-none');
    setTimeout(()=>window.location.href='/dashboard/restaurateur.html', 1200);
  }else{
    alert.className='alert alert-danger';
    alert.textContent = json.message || 'Errore nella procedura';
    alert.classList.remove('d-none');
  }
};