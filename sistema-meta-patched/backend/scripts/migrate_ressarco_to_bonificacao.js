const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'data.sqlite3'), (err) => {
  if(err) {
    console.error('Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  console.log('Conectado ao banco de dados');
});

// SQLite doesn't support ALTER COLUMN directly, so we need to:
// 1. Rename old table
// 2. Create new table with correct column name
// 3. Copy data
// 4. Drop old table

const migration = `
BEGIN TRANSACTION;

-- Rename old wallets table
ALTER TABLE wallets RENAME TO wallets_old;

-- Create new wallets table with bonificacao instead of ressarco
CREATE TABLE wallets (
  wallet TEXT PRIMARY KEY,
  bonificacao REAL DEFAULT 0,
  taxa REAL DEFAULT 0
);

-- Copy data from old table to new table
INSERT INTO wallets(wallet, bonificacao, taxa)
SELECT wallet, ressarco, taxa FROM wallets_old;

-- Drop old table
DROP TABLE wallets_old;

COMMIT;
`;

db.exec(migration, (err) => {
  if(err) {
    console.error('Erro na migração:', err);
    process.exit(1);
  }
  console.log('✅ Migração concluída com sucesso! Coluna ressarco renomeada para bonificacao');
  db.close();
});
