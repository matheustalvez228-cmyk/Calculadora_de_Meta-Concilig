const apiBase = '';

// Formata número para moeda brasileira: 3000000 -> 3.000.000,00
function formatCurrency(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

(async function initOp(){
  // check token
  const token = localStorage.getItem('token');
  if(!token) { location.href='/login.html'; return; }
  const uid = localStorage.getItem('user_id');
  // fetch user info by using token login endpoint not needed since token contains payload in server; we'll request entries to ensure auth
  // simple approach: request wallets list to find wallet then populate
  try{
    // fetch operator entries to detect existence
    const res = await fetch('/api/operators?wallet=BV_BOM',{headers:{'Authorization':'Bearer '+token}}); // just to ensure token works - may be adjusted
  }catch(e){
    // ignore
  }
  // get current user data from token payload OR fallback to localStorage
  const storedUser = JSON.parse(atob(token.split('.')[1] || '{}'));
  const wallet = storedUser.wallet || '';
  document.getElementById('opWallet').value = wallet;
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode'); // 'update' | 'new' | null
  if(mode === 'update'){
    document.getElementById('opMonthlyGoal').disabled = true;
    document.getElementById('btnOpSave').textContent = 'Atualizar';
  }
  if(mode === 'new'){
    document.getElementById('btnOpSave').textContent = 'Cadastrar';
  }
  document.getElementById('opRenegCount').addEventListener('input', ()=> generateRiskInputsFor(document.getElementById('opRenegCount').value, document.getElementById('opRisksContainer')));
  async function safeParseResponse(res){
    const ct = (res.headers.get && res.headers.get('content-type')) || '';
    if(ct.includes('application/json')){
      try { return await res.json(); } catch(e){ return { __parseError: e.message } }
    }
    // fallback to text
    try { const t = await res.text(); return { __text: t }; } catch(e){ return { __parseError: e.message } }
  }

  document.getElementById('btnOpSave').addEventListener('click', async ()=>{
    const monthlyGoal = parseFloat(document.getElementById('opMonthlyGoal').value) || 0;
    const receivedValue = parseFloat(document.getElementById('opReceivedValue').value) || 0;
    const n = parseInt(document.getElementById('opRenegCount').value) || 0;
    const risks = [];
    for(let i=0;i<n;i++){ const sel = document.getElementById('risk_new_'+i); if(!sel || !sel.value) return alert('Preencha riscos'); risks.push(parseFloat(sel.value)); }
    try{
      const uid = localStorage.getItem('user_id') || storedUser.id;
      if(mode === 'update'){
        // only add receivedValue and new risks
        const res = await fetch('/api/operators/'+uid+'/entries/last',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({ addReceivedValue: receivedValue, newRisks: risks })});
        const data = await safeParseResponse(res);
        if(res.ok){ alert('Atualizado'); location.href='/operator_data.html'; } else alert('Erro: '+(data.error || data.__text || data.__parseError || JSON.stringify(data)));
        return;
      }
      if(mode === 'new'){
        // delete last entry then create a new one with full data
        const del = await fetch('/api/operators/'+uid+'/entries/last',{method:'DELETE',headers:{'Authorization':'Bearer '+token}}).catch(()=>null);
        if(del){ const delBody = await safeParseResponse(del); if(!del.ok){ /* ignore deletion failure but log */ console.warn('delete last entry failed', delBody); } }
        const res = await fetch('/api/operators/'+uid+'/entries',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({monthlyGoal,receivedValue,risks})});
        const data = await safeParseResponse(res);
        if(res.ok){ alert('Cadastrado novamente'); location.href='/operator_data.html'; } else alert('Erro: '+(data.error || data.__text || data.__parseError || JSON.stringify(data)));
        return;
      }
      // default: create a new entry (existing behavior)
      const res = await fetch('/api/operators/'+uid+'/entries',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({monthlyGoal,receivedValue,risks})});
      const data = await safeParseResponse(res);
      if(res.ok){ alert('Salvo'); location.href='/operator.html'; } else alert('Erro: '+(data.error || data.__text || data.__parseError || JSON.stringify(data)));
    }catch(e){ alert('Erro: '+e.message); }
  });
  document.getElementById('btnOpLogout').addEventListener('click', ()=>{ localStorage.removeItem('token'); localStorage.removeItem('user_id'); location.href='/login.html'; });
})();

function generateRiskInputsFor(n, container){
  container.innerHTML='';
  n = parseInt(n)||0;
  const options = [{label:'Até R$ 10.000',value:15},{label:'20.001 a 40.000',value:15},{label:'40.001 a 60.000',value:15},{label:'60.001 a 80.000',value:20},{label:'80.001 a 100.000',value:20},{label:'Acima de 100.000',value:30}];
  for(let i=0;i<n;i++){
    const div = document.createElement('div'); div.className='form-group';
    const label = document.createElement('label'); label.textContent = 'Risco da Renegociação '+(i+1)+':';
    const sel = document.createElement('select'); sel.id = 'risk_new_'+i; sel.innerHTML = '<option disabled selected>Selecione</option>'+options.map(o=>`<option value="${o.value}">${o.label}</option>`).join('');
    div.appendChild(label); div.appendChild(sel); container.appendChild(div);
  }
}

function viewMyData() {
    window.location.href = "operator_data.html";
}

const express = require("express");
const router = express.Router();
const db = require("../db");  // ajuste caso seu arquivo seja diferente

// Retorna os dados do operador
router.get("/:id", (req, res) => {
    const id = req.params.id;

    db.get("SELECT * FROM operadores WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Operador não encontrado" });

        res.json({
            id: row.id,
            carteira: row.carteira,
            meta: row.meta_mensal,
            recebido: row.valor_recebido,
            renegs: row.renegociacoes,
            projecao: row.projecao_final
        });
    });
});

module.exports = router;
