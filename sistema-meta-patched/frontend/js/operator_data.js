document.addEventListener("DOMContentLoaded", loadData);

async function loadData() {
    const token = localStorage.getItem("token");
    const id = localStorage.getItem("user_id") || localStorage.getItem("userId");

    if (!token || !id) {
        window.location.href = "login.html";
        return;
    }

    const res = await fetch(`/api/operator/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
        const err = await res.json().catch(()=>({error:res.statusText}));
        alert('Erro ao obter dados: ' + (err.error || JSON.stringify(err)));
        if(res.status===401) window.location.href='login.html';
        return;
    }

    const data = await res.json();

    // support both API shapes: { user, entry, risks } or a flat object
    let out = '';
    if (data.user) {
        const u = data.user;
        const e = data.entry || {};
        const renegs = (data.risks || []);
        const realFaturamento = Number(e.realFaturamento || 0);
        const baseValue = Number(e.baseValue || 0);
        const riskValue = Number(e.riskValue || 0);
        const totalValue = Number(e.receivedValue || 0);
        const percentualAtingido = Number(e.percentualAtingido || 0);
        const monthlyGoal = Number(e.monthlyGoal || 0);
        
        out = `
        <p><strong>ID:</strong> ${u.id}</p>
        <p><strong>Carteira:</strong> ${u.wallet || u.carteira || ''}</p>
        <p><strong>Meta Mensal:</strong> R$ ${monthlyGoal.toFixed(2)}</p>
        <p><strong>Faturamento Realizado:</strong> R$ ${realFaturamento.toFixed(2)}</p>
        <p><strong>% da Meta Atingida:</strong> ${percentualAtingido.toFixed(2)}%</p>
        <hr style="margin: 15px 0;">
        <p style="font-size: 1.2em;"><strong>VALOR TOTAL A SER RECEBIDO: R$ ${totalValue.toFixed(2)}</strong></p>
        <ul style="margin-left: 20px; margin-top: 5px;">
          <li><strong>Valor Base (Rateio proporcional):</strong> R$ ${baseValue.toFixed(2)}</li>
          <li><strong>Valor Renegociações:</strong> R$ ${riskValue.toFixed(2)}</li>
        </ul>
        <p><strong>Renegociações Realizadas:</strong> ${renegs.length}</p>
        `;
        if(renegs.length > 0) {
          out += '<ul style="margin-left: 20px;">';
          renegs.forEach((r, idx) => {
            out += `<li>Renegociação ${idx+1}: R$ ${Number(r.riskPremium).toFixed(2)}</li>`;
          });
          out += '</ul>';
        }
    } else {
        out = `
        <p><strong>ID:</strong> ${data.id}</p>
        <p><strong>Carteira:</strong> ${data.carteira || data.wallet}</p>
        <p><strong>Meta Mensal:</strong> R$ ${data.meta || data.monthlyGoal || ''}</p>
        <p><strong>Valor Recebido:</strong> R$ ${data.recebido || data.receivedValue || ''}</p>
        <p><strong>Renegociações:</strong> ${data.renegs || ''}</p>
        `;
    }

    document.getElementById("dados").innerHTML = out;
}
