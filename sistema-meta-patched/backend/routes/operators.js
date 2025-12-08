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

// Helper: recalculate receivedValue for an operator based on wallet settings
async function recalculateReceivedValue(operatorId, entryId) {
  try {
    // get operator's user info to find wallet
    const user = await get('SELECT wallet FROM users WHERE id=?', [operatorId]);
    if(!user) return;
    
    const wallet = user.wallet;
    
    // get wallet settings
    const walletSettings = await get('SELECT bonificacao, taxa FROM wallets WHERE wallet=?', [wallet]);
    if(!walletSettings) return;
    
    // calculate total bonus pool
    const B = (Number(walletSettings.bonificacao) || 0) * ((Number(walletSettings.taxa) || 0) / 100);
    
    // get all operators in this wallet with their latest entries
    const operators = await all(`
      SELECT DISTINCT u.id FROM users u 
      WHERE u.wallet=? AND u.isMaster=0
    `, [wallet]);
    
    // collect all operators' data and calculate total weight
    let totalWeight = 0;
    const operatorDataMap = {};
    
    for(const op of operators) {
      const entry = await get(
        'SELECT id, monthlyGoal, actualValue FROM entries WHERE operatorId=? ORDER BY id DESC LIMIT 1',
        [op.id]
      );
      if(entry) {
        const monthlyGoal = Number(entry.monthlyGoal) || 0;
        const actualValue = Number(entry.actualValue) || 0;
        const percentualAtingido = monthlyGoal > 0 ? (actualValue / monthlyGoal) * 100 : 0;
        const weight = Math.max(0, percentualAtingido - 100);
        
        operatorDataMap[op.id] = {
          entryId: entry.id,
          weight,
          actualValue,
          monthlyGoal,
          percentualAtingido
        };
        
        totalWeight += weight;
      }
    }
    
    // now recalculate receivedValue for all operators
    for(const opId in operatorDataMap) {
      const opData = operatorDataMap[opId];
      
      // get risks for this operator
      const risksResult = await get('SELECT SUM(riskPremium) as totalRisks FROM risks WHERE entryId=?', [opData.entryId]);
      const riskValue = (risksResult && risksResult.totalRisks) ? Number(risksResult.totalRisks) : 0;
      
      // calculate base value
      let baseValue = 0;
      if(totalWeight > 0 && opData.weight > 0) {
        baseValue = B * (opData.weight / totalWeight);
      }
      
      const newReceivedValue = baseValue + riskValue;
      
      console.log(`[RECALC] Op ${opId}: pct=${opData.percentualAtingido.toFixed(2)}%, weight=${opData.weight.toFixed(2)}, baseValue=${baseValue.toFixed(2)}, risks=${riskValue}, total=${newReceivedValue.toFixed(2)}`);
      
      await run('UPDATE entries SET receivedValue=? WHERE id=?', [newReceivedValue, opData.entryId]);
    }
  } catch(err) {
    console.error('[RECALC ERROR]', err);
  }
}

// POST /api/operators/:id/entries  -> create new entry
router.post('/:id/entries', async (req, res) => {
  try {
    const id = req.params.id;
    const { monthlyGoal, receivedValue, risks } = req.body;
    const now = new Date().toLocaleString();
    // Store receivedValue as actualValue (what operator reports as faturamento)
    const r = await run('INSERT INTO entries(operatorId,monthlyGoal,actualValue,receivedValue,timestamp) VALUES (?,?,?,?,?)', [id, monthlyGoal || 0, receivedValue || 0, 0, now]);
    const entryId = r.lastID;
    if(Array.isArray(risks) && risks.length>0) {
      const stmt = db.prepare('INSERT INTO risks(entryId,riskPremium) VALUES (?,?)');
      for(const rr of risks) stmt.run(entryId, Number(rr));
      stmt.finalize();
    }
    // Recalculate receivedValue for all operators in wallet
    await recalculateReceivedValue(id, entryId);
    
    const entry = await get('SELECT id, monthlyGoal, actualValue, receivedValue, timestamp FROM entries WHERE id=?', [entryId]);
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

// PATCH /api/operators/:id/entries/last -> patch last entry (add actualValue, add risks)
router.patch('/:id/entries/last', async (req, res) => {
  try {
    const id = req.params.id;
    const { addReceivedValue, newRisks } = req.body;
    const last = await get('SELECT id, actualValue FROM entries WHERE operatorId=? ORDER BY id DESC LIMIT 1', [id]);
    if(!last) return res.status(404).json({ error: 'Nenhuma entrada para atualizar' });
    // Add to actualValue (real faturamento), NOT receivedValue
    const newValue = (Number(last.actualValue) || 0) + (Number(addReceivedValue) || 0);
    await run('UPDATE entries SET actualValue=?, timestamp=? WHERE id=?', [newValue, new Date().toLocaleString(), last.id]);
    if(Array.isArray(newRisks) && newRisks.length>0) {
      const stmt = db.prepare('INSERT INTO risks(entryId,riskPremium) VALUES (?,?)');
      for(const r of newRisks) stmt.run(last.id, Number(r));
      stmt.finalize();
    }
    // Recalculate receivedValue for all operators in wallet
    await recalculateReceivedValue(id, last.id);
    
    const updatedEntry = await get('SELECT id, monthlyGoal, actualValue, receivedValue, timestamp FROM entries WHERE id=?', [last.id]);
    const risks = await all('SELECT id, riskPremium FROM risks WHERE entryId=?', [last.id]);
    res.json({ ok: true, entry: updatedEntry, risks });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
