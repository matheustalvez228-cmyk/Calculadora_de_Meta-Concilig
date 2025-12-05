const apiBase = '';
document.getElementById('btnShowRegister')?.addEventListener('click',()=> location.href='/register.html');
document.getElementById('btnBack')?.addEventListener('click',()=> location.href='/login.html');

async function api(path, opts){
  const headers = {'Content-Type':'application/json'};
  const token = localStorage.getItem('token');
  if(token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch('/api'+path, Object.assign({headers}, opts));
  const data = await res.json();
  if(!res.ok) throw new Error(data.error||JSON.stringify(data));
  return data;
}

document.getElementById('btnRegister')?.addEventListener('click', async ()=>{
  try{
    const id=document.getElementById('regId').value.trim();
    const pwd=document.getElementById('regPwd').value.trim();
    const wallet=document.getElementById('regWallet').value;
    const name=document.getElementById('regName').value.trim();
    const res = await api('/register',{method:'POST',body:JSON.stringify({id,password:pwd,wallet,name})});
    alert('Conta criada. Faça login.');
    location.href='/login.html';
  }catch(e){ alert('Erro: '+e.message); }
});

document.getElementById('btnLogin')?.addEventListener('click', async ()=>{
  try{
    const id=document.getElementById('loginId').value.trim();
    const pwd=document.getElementById('loginPwd').value.trim();
    const res = await (await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,password:pwd})})).json();
    if(res.error) throw new Error(res.error);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user_id', res.user.id);
    if(res.user.isMaster) location.href='/master.html'; else location.href='/operator.html';
  }catch(e){ alert('Login falhou: '+e.message); }
});