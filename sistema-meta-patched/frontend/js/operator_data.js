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
        const projecao = 0; // unknown here, backend may calculate
        out = `
        <p><strong>ID:</strong> ${u.id}</p>
        <p><strong>Carteira:</strong> ${u.wallet || u.carteira || ''}</p>
        <p><strong>Meta Mensal:</strong> R$ ${Number(e.monthlyGoal||0).toFixed(2)}</p>
        <p><strong>Valor Recebido:</strong> R$ ${Number(e.receivedValue||0).toFixed(2)}</p>
        <p><strong>Renegociações:</strong> ${renegs.length}</p>
        <p><strong>Projeção de Pagamento:</strong> R$ ${projecao.toFixed ? projecao.toFixed(2) : projecao}</p>
        `;
    } else {
        out = `
        <p><strong>ID:</strong> ${data.id}</p>
        <p><strong>Carteira:</strong> ${data.carteira || data.wallet}</p>
        <p><strong>Meta Mensal:</strong> R$ ${data.meta || data.monthlyGoal || ''}</p>
        <p><strong>Valor Recebido:</strong> R$ ${data.recebido || data.receivedValue || ''}</p>
        <p><strong>Renegociações:</strong> ${data.renegs || ''}</p>
        <p><strong>Projeção de Pagamento:</strong> R$ ${data.projecao || ''}</p>
        `;
    }

    document.getElementById("dados").innerHTML = out;
}
