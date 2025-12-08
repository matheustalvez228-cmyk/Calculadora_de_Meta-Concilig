(async function(){
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('user_id') || localStorage.getItem('userId') || null;
  if(!token || !userId) {
    localStorage.removeItem('token');
    location.href = '/login.html';
    return;
  }
  async function apiFetch(path, opts) {
    opts = opts || {};
    opts.method = opts.method || 'GET';
    opts.headers = Object.assign(opts.headers || {}, { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    if(opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
    const res = await fetch(path, opts);
    if(!res.ok) {
      if(res.status === 401 || res.status === 403) {
        localStorage.removeItem('token'); localStorage.removeItem('user_id'); location.href = '/login.html';
      }
      let errText = 'Erro';
      try { const j = await res.json(); errText = j.error || JSON.stringify(j); } catch(e){ errText = res.statusText; }
      throw new Error(errText);
    }
    return res.json();
  }
  let data;
  try { data = await apiFetch('/api/operator/' + userId); } catch(e) { alert('Erro ao obter dados: '+e.message); return; }
  const profileBox = document.getElementById('profileBox');
  const entryBox = document.getElementById('entryBox');
  const risksBox = document.getElementById('risksBox');
  profileBox.innerHTML = `<p><strong>ID:</strong> ${data.user.id}</p>
  <p><strong>Nome:</strong> ${data.user.name || '-'}</p>
  <p><strong>Carteira:</strong> ${data.user.wallet || '-'}</p>`;
  if(!data.entry) {
    entryBox.innerHTML = '<p>Nenhuma entrada registrada.</p>';
    risksBox.innerHTML = '';
  } else {
    entryBox.innerHTML = `<p><strong>Meta Mensal (R$):</strong> ${Number(data.entry.monthlyGoal||0).toFixed(2)}</p>
      <p><strong>Valor Recebido (R$):</strong> ${Number(data.entry.receivedValue||0).toFixed(2)}</p>
      <p><strong>Data:</strong> ${data.entry.timestamp || ''}</p>`;
    risksBox.innerHTML = data.risks.length === 0 ? '<div class="small">Sem renegociações registradas.</div>' : '';
    data.risks.forEach(r => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<div>Risco: ${r.riskPremium}</div><div class="small">ID:${r.id}</div>`;
      risksBox.appendChild(div);
    });
  }
  try {
    const wallet = data.user.wallet;
    if(wallet) {
      const w = await apiFetch('/api/wallets/' + wallet).catch(()=>null);
      if(w) {
        const totalGanho = (Number(w.bonificacao || 0) * (Number(w.taxa || 0) / 100));
        const detail = document.createElement('div');
        detail.className = 'muted';
        detail.innerHTML = `<p><strong>Total ganho pela carteira (R$):</strong> ${totalGanho.toFixed(2)}</p>`;
        if(w.allocations && Object.keys(w.allocations).length>0) {
          let out = '<ul>';
          Object.keys(w.allocations).forEach(op => {
            const pct = Number(w.allocations[op]);
            const share = totalGanho * (pct/100);
            out += `<li>${op}: ${pct}% → R$ ${share.toFixed(2)}</li>`;
          });
          out += '</ul>';
          detail.innerHTML += out;
        }
        entryBox.appendChild(detail);
      }
    }
  } catch(e){}
  document.getElementById('btnLogout').addEventListener('click', ()=>{ localStorage.removeItem('token'); localStorage.removeItem('user_id'); location.href = '/login.html'; });
  document.getElementById('btnRegisterAgain').addEventListener('click', async ()=>{
    if(!confirm('Confirma apagar o último registro para cadastrar novamente?')) return;
    try {
      await apiFetch('/api/operators/' + userId + '/entries/last', { method: 'DELETE' });
      location.href = '/operator.html?mode=new';
    } catch(e){ alert('Erro ao apagar: ' + e.message); }
  });
  document.getElementById('btnUpdateData').addEventListener('click', async ()=>{ location.href = '/operator.html?mode=update'; });
})();