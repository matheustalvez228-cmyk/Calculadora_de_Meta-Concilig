(async function initMaster(){
  const token = localStorage.getItem('token');
  if(!token){ location.href='/login.html'; return; }
  const payload = JSON.parse(atob(token.split('.')[1]||'{}'));
  document.getElementById('masterWallet').value = payload.wallet || '';
  document.getElementById('btnMasterLogout').addEventListener('click', ()=>{ localStorage.removeItem('token'); location.href='/login.html'; });
  // load operators list
  async function load(){
    const res = await fetch('/api/operators?wallet='+payload.wallet, {headers:{'Authorization':'Bearer '+token}});
    const data = await res.json();
    const list = document.getElementById('masterOperatorsList'); list.innerHTML='';
    const sel = document.getElementById('masterSelection'); sel.innerHTML='';
    data.forEach(u=>{
      const it = document.createElement('div'); it.className='item'; it.innerHTML = `<div>${u.name} (${u.id})</div><div class="small">Operador</div>`; list.appendChild(it);
      const selIt = document.createElement('div'); selIt.className='item'; selIt.innerHTML = `<input type="checkbox" data-id="${u.id}"><div>${u.name} (${u.id})</div><input type="number" data-id="${u.id}" value="0" style="width:80px">`; sel.appendChild(selIt);
    });
  }
  await load();
  document.getElementById('btnSaveWalletSettings').addEventListener('click', async ()=>{
    const ress = parseFloat(document.getElementById('masterRessarco').value)||0;
    const taxa = parseFloat(document.getElementById('masterTax').value)||0;
    const selItems = Array.from(document.querySelectorAll('#masterSelection .item'));
    const allocations = {};
    selItems.forEach(it=>{ const id = it.querySelector('input[type="checkbox"]').dataset.id; const pct = parseFloat(it.querySelector('input[type="number"]').value)||0; if(pct>0) allocations[id]=pct; });
    const res = await fetch('/api/wallets/'+payload.wallet,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({ressarco:ress,taxa,allocations})});
    const data = await res.json();
    if(res.ok) alert('Configurações salvas'); else alert('Erro: '+data.error);
  });
  document.getElementById('btnAutoSplit').addEventListener('click', ()=>{
    const checks = Array.from(document.querySelectorAll('#masterSelection input[type="checkbox"]')).filter(c=>c.checked);
    if(checks.length===0) return alert('Marque ao menos 1'); const pct = Math.floor((100/checks.length)*100)/100; checks.forEach(c=>{ const id=c.dataset.id; const inp = document.querySelector(`#masterSelection input[type="number"][data-id="${id}"]`); if(inp) inp.value=pct; });
  });
  document.getElementById('btnComputeShare').addEventListener('click', async ()=>{
    // just compute preview from wallet settings stored
    const res = await fetch('/api/wallets/'+payload.wallet,{headers:{'Authorization':'Bearer '+token}});
    const data = await res.json();
    const totalGanho = (parseFloat(data.ressarco)||0) * ((parseFloat(data.taxa)||0)/100);
    const shareList = document.getElementById('masterResult');
    let out = `<p><strong>Total ganho:</strong> R$ ${totalGanho.toFixed(2)}</p><ul>`;
    Object.keys(data.allocations||{}).forEach(id=>{ const pct = data.allocations[id]; const s = totalGanho*(pct/100); out+=`<li>${id}: ${pct}% → R$ ${s.toFixed(2)}</li>`; });
    out += '</ul>';
    shareList.innerHTML = out;
  });
})();