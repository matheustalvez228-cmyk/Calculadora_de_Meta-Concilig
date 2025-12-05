(async function(){
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('user_id') || localStorage.getItem('userId');
  if(!token || !userId) { location.href = '/login.html'; return; }
  async function apiFetch(path, opts) {
    opts = opts || {};
    opts.method = opts.method || 'GET';
    opts.headers = Object.assign(opts.headers || {}, { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    if(opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
    const res = await fetch(path, opts);
    if(!res.ok) {
      const j = await res.json().catch(()=>({error:res.statusText}));
      throw new Error(j.error || res.statusText);
    }
    return res.json();
  }
  const qs = new URLSearchParams(window.location.search);
  const mode = qs.get('mode') || 'new';
  const monthlyInput = document.getElementById('opMonthlyGoal');
  const receivedInput = document.getElementById('opReceivedValue');
  const renegCount = document.getElementById('opRenegCount');
  const risksContainer = document.getElementById('opRisksContainer');
  const btnSave = document.getElementById('btnOpSave');
  function generateRiskInputs(n){
    risksContainer.innerHTML = '';
    n = parseInt(n)||0;
    const options = [{label:'Até R$ 10.000',value:15},{label:'20.001 a 40.000',value:15},{label:'40.001 a 60.000',value:15},{label:'60.001 a 80.000',value:20},{label:'80.001 a 100.000',value:20},{label:'Acima de 100.000',value:30}];
    for(let i=0;i<n;i++){
      const div = document.createElement('div'); div.className='form-group';
      const label = document.createElement('label'); label.textContent = 'Renegociação '+(i+1)+':';
      const sel = document.createElement('select'); sel.id = 'risk_new_'+i;
      sel.innerHTML = '<option disabled selected>Selecione a faixa</option>' + options.map(o=>`<option value="${o.value}">${o.label}</option>`).join('');
      div.appendChild(label); div.appendChild(sel); risksContainer.appendChild(div);
    }
  }
  renegCount.addEventListener('input', ()=> generateRiskInputs(renegCount.value));
  let lastEntry = null;
  if(mode === 'update') {
    try {
      const data = await apiFetch('/api/operator/' + userId);
      if(data.entry) {
        lastEntry = data.entry;
        monthlyInput.value = Number(data.entry.monthlyGoal||0);
        monthlyInput.readOnly = true;
        receivedInput.value = 0;
        renegCount.value = 0;
        generateRiskInputs(0);
        const info = document.createElement('div'); info.className='muted';
        info.innerHTML = `<p>Último valor recebido atual: R$ ${Number(data.entry.receivedValue||0).toFixed(2)}</p>`;
        document.getElementById('mainContainer')?.insertBefore(info, risksContainer);
      }
    } catch(e){ alert('Erro ao carregar último registro: '+e.message); }
  }
  btnSave.addEventListener('click', async ()=>{
    try {
      if(mode === 'new') {
        const monthlyGoal = Number(monthlyInput.value) || 0;
        const receivedValue = Number(receivedInput.value) || 0;
        const n = parseInt(renegCount.value)||0;
        const risks = [];
        for(let i=0;i<n;i++){ const el=document.getElementById('risk_new_'+i); if(!el || !el.value) return alert('Preencha as renegociações'); risks.push(Number(el.value)); }
        await apiFetch('/api/operators/' + userId + '/entries', { method: 'POST', body: { monthlyGoal, receivedValue, risks } });
        alert('Salvo com sucesso.'); location.href = '/operator_data.html';
      } else if(mode === 'update') {
        const addReceived = Number(receivedInput.value) || 0;
        const n = parseInt(renegCount.value)||0;
        const newRisks = [];
        for(let i=0;i<n;i++){ const el=document.getElementById('risk_new_'+i); if(!el || !el.value) return alert('Preencha as renegociações'); newRisks.push(Number(el.value)); }
        await apiFetch('/api/operators/' + userId + '/entries/last', { method: 'PATCH', body: { addReceivedValue: addReceived, newRisks } });
        alert('Atualizado com sucesso.'); location.href = '/operator_data.html';
      }
    } catch(e) { alert('Erro ao salvar: '+e.message); }
  });
})();