const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data.sqlite3');
const db = new sqlite3.Database(dbPath);

function run(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err) {
    if(err) rej(err); else res(this);
  }));
}
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
router.get('/operator/:id', async (req, res) => {
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

// DELETE /api/operators/:id/entries/last
router.delete('/operators/:id/entries/last', async (req, res) => {
  try {
    const id = req.params.id;
    const last = await get('SELECT id FROM entries WHERE operatorId=? ORDER BY id DESC LIMIT 1', [id]);
    if(!last) return res.status(404).json({ error: 'Nenhuma entrada para apagar' });
    await run('DELETE FROM risks WHERE entryId=?', [last.id]);
    await run('DELETE FROM entries WHERE id=?', [last.id]);
    return res.json({ ok: true, deletedEntryId: last.id });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /api/operators/:id/entries/last
router.patch('/operators/:id/entries/last', async (req, res) => {
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
    return res.json({ ok: true, entry: updatedEntry, risks });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
