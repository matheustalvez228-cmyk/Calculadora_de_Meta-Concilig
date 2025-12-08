PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  wallet TEXT,
  name TEXT,
  isMaster INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wallets (
  wallet TEXT PRIMARY KEY,
  bonificacao REAL DEFAULT 0,
  taxa REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS allocations (
  wallet TEXT,
  operatorId TEXT,
  percent REAL,
  FOREIGN KEY(wallet) REFERENCES wallets(wallet)
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operatorId TEXT,
  monthlyGoal REAL,
  actualValue REAL DEFAULT 0,
  receivedValue REAL,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS risks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entryId INTEGER,
  riskPremium REAL,
  FOREIGN KEY(entryId) REFERENCES entries(id)
);

-- insert master users (passwords hashed with bcrypt - pre-hashed for default '000000')
-- Pre-hashed bcrypt for '000000' with cost 10 (may differ per environment). We'll store password as plain if absent and allow setup script to hash.
INSERT OR IGNORE INTO users(id,password,wallet,name,isMaster) VALUES('00001','$2b$10$KIXQJmZKqFf3m9qGJh6G8uJHn8pD1jFZpG6Jk8v1yHjX3q9p1Qe6W','BV_BOM','BV Bom Pagador',1);
INSERT OR IGNORE INTO users(id,password,wallet,name,isMaster) VALUES('00002','$2b$10$KIXQJmZKqFf3m9qGJh6G8uJHn8pD1jFZpG6Jk8v1yHjX3q9p1Qe6W','BV_ADM','BV ADM Tradicional',1);
INSERT OR IGNORE INTO users(id,password,wallet,name,isMaster) VALUES('00003','$2b$10$KIXQJmZKqFf3m9qGJh6G8uJHn8pD1jFZpG6Jk8v1yHjX3q9p1Qe6W','BV_ADM_RENEG','BV ADM Reneg',1);
INSERT OR IGNORE INTO users(id,password,wallet,name,isMaster) VALUES('00004','$2b$10$KIXQJmZKqFf3m9qGJh6G8uJHn8pD1jFZpG6Jk8v1yHjX3q9p1Qe6W','BV_CONT','BV Contencioso',1);
INSERT OR IGNORE INTO users(id,password,wallet,name,isMaster) VALUES('00005','$2b$10$KIXQJmZKqFf3m9qGJh6G8uJHn8pD1jFZpG6Jk8v1yHjX3q9p1Qe6W','BV_WO','BV WO',1);

-- ensure wallets rows exist
INSERT OR IGNORE INTO wallets(wallet,bonificacao,taxa) VALUES('BV_BOM',0,0);
INSERT OR IGNORE INTO wallets(wallet,bonificacao,taxa) VALUES('BV_ADM',0,0);
INSERT OR IGNORE INTO wallets(wallet,bonificacao,taxa) VALUES('BV_ADM_RENEG',0,0);
INSERT OR IGNORE INTO wallets(wallet,bonificacao,taxa) VALUES('BV_CONT',0,0);
INSERT OR IGNORE INTO wallets(wallet,bonificacao,taxa) VALUES('BV_WO',0,0);