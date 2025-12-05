const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'data.sqlite3'));

function get(sql, params=[]) {
  return new Promise((res, rej) => db.get(sql, params, (err, row) => {
    if(err) rej(err); else res(row);
  }));
}

function all(sql, params=[]) {
  return new Promise((res, rej) => db.all(sql, params, (err, rows) => {
    if(err) rej(err); else res(rows);
  }));
}

// GET /api/operator/:id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const user = await get('SELECT id, name, wallet, isMaster FROM users WHERE id=?', [id]);
    if(!user) return res.status(404).json({ error: 'Operador não encontrado' });

    const entry = await get('SELECT id, monthlyGoal, receivedValue, timestamp FROM entries WHERE operatorId=? ORDER BY id DESC LIMIT 1', [id]);
    if(!entry) return res.json({ user, entry: null, risks: [] });

    const risks = await all('SELECT id, riskPremium FROM risks WHERE entryId=?', [entry.id]);
    return res.json({ user, entry, risks });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
