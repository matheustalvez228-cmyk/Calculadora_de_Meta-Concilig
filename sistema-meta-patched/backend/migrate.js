const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const DB_FILE = path.join(__dirname,'data.sqlite3');
const migrateSql = fs.readFileSync(path.join(__dirname,'migrate.sql'),'utf8');
const db = new sqlite3.Database(DB_FILE);
db.exec(migrateSql, (err)=>{ if(err) console.error('migrate error',err); else console.log('migrations applied'); db.close(); });