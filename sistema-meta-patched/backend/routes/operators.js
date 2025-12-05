const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'data.sqlite3'));

function run(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err) { if(err) rej(err); else res(this); }));
}
function get(sql, params=[]) {
  return new Promise((res, rej) => db.get(sql, params, (err, row) => { if(err) rej(err); else res(row); }));
}
function all(sql, params=[]) {
  return new Promise((res, rej) => db.all(sql, params, (err, rows) => { if(err) rej(err); else res(rows); }));
}

// POST /api/operators/:id/entries  -> create new entry
router.post('/:id/entries', async (req, res) => {
  try {
    const id = req.params.id;
    const { monthlyGoal, receivedValue, risks } = req.body;
    const now = new Date().toLocaleString();
    const r = await run('INSERT INTO entries(operatorId,monthlyGoal,receivedValue,timestamp) VALUES (?,?,?,?)', [id, monthlyGoal || 0, receivedValue || 0, now]);
    const entryId = r.lastID;
    if(Array.isArray(risks) && risks.length>0) {
      const stmt = db.prepare('INSERT INTO risks(entryId,riskPremium) VALUES (?,?)');
      for(const rr of risks) stmt.run(entryId, Number(rr));
      stmt.finalize();
    }
    const entry = await get('SELECT id, monthlyGoal, receivedValue, timestamp FROM entries WHERE id=?', [entryId]);
    const allRisks = await all('SELECT id, riskPremium FROM risks WHERE entryId=?', [entryId]);
    res.json({ ok: true, entry, risks: allRisks });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/operators?wallet=WALLET -> list users for a wallet
router.get('/', async (req, res) => {
  try {
    const wallet = req.query.wallet;
    if(!wallet) return res.status(400).json({ error: 'wallet query required' });
    const rows = await all('SELECT id, name, wallet FROM users WHERE wallet=?', [wallet]);
    return res.json(rows || []);
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/operators/:id/entries/last -> delete last entry
router.delete('/:id/entries/last', async (req, res) => {
  try {
    const id = req.params.id;
    const last = await get('SELECT id FROM entries WHERE operatorId=? ORDER BY id DESC LIMIT 1', [id]);
    if(!last) return res.status(404).json({ error: 'Nenhuma entrada para apagar' });
    await run('DELETE FROM risks WHERE entryId=?', [last.id]);
    await run('DELETE FROM entries WHERE id=?', [last.id]);
    res.json({ ok: true, deletedEntryId: last.id });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /api/operators/:id/entries/last -> patch last entry (add receivedValue, add risks)
router.patch('/:id/entries/last', async (req, res) => {
  try {
    const id = req.params.id;
    const { addReceivedValue, newRisks } = req.body;
    const last = await get('SELECT id, receivedValue FROM entries WHERE operatorId=? ORDER BY id DESC LIMIT 1', [id]);
    if(!last) return res.status(404).json({ error: 'Nenhuma entrada para atualizar' });
    const newValue = (Number(last.receivedValue) || 0) + (Number(addReceivedValue) || 0);
    await run('UPDATE entries SET receivedValue=?, timestamp=? WHERE id=?', [newValue, new Date().toLocaleString(), last.id]);
    if(Array.isArray(newRisks) && newRisks.length>0) {
      const stmt = db.prepare('INSERT INTO risks(entryId,riskPremium) VALUES (?,?)');
      for(const r of newRisks) stmt.run(last.id, Number(r));
      stmt.finalize();
    }
    const updatedEntry = await get('SELECT id, monthlyGoal, receivedValue, timestamp FROM entries WHERE id=?', [last.id]);
    const risks = await all('SELECT id, riskPremium FROM risks WHERE entryId=?', [last.id]);
    res.json({ ok: true, entry: updatedEntry, risks });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
