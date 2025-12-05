Sistema Meta - Concilig (Node + SQLite)
======================================

Instruções rápidas (local):
1) Abra um terminal e vá para backend:
   cd backend
2) Instale dependências:
   npm install
3) Rode o servidor (irá create DB and initialize):
   node server.js
   The server will run on http://localhost:3000
4) Abra o frontend pages by opening in browser:
   http://localhost:3000/login.html
   or open file frontend/login.html directly (but API endpoints require server).

Default master accounts (password '000000'):
  00001 - BV Bom Pagador
  00002 - BV ADM Tradicional
  00003 - BV ADM Reneg
  00004 - BV Contencioso
  00005 - BV WO

Notes:
- Passwords for masters were pre-hashed in migrate.sql.
- For production, change JWT_SECRET environment variable.