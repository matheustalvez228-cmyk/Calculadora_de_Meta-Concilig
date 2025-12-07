const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB = path.join(__dirname, '..', 'data.sqlite3');
const db = new sqlite3.Database(DB);

// Try to add actualValue column if it doesn't exist
db.run(`ALTER TABLE entries ADD COLUMN actualValue REAL DEFAULT 0`, (err) => {
  if(err && err.message.includes('duplicate column')) {
    console.log('Column actualValue already exists');
  } else if(err) {
    console.error('Error adding column:', err.message);
  } else {
    console.log('Column actualValue added successfully');
  }
  
  // Initialize actualValue = receivedValue for existing entries
  db.run(`UPDATE entries SET actualValue = receivedValue WHERE actualValue = 0 AND receivedValue > 0`, (err) => {
    if(err) console.error('Error updating values:', err.message);
    else console.log('Existing receivedValue copied to actualValue');
    
    db.close(() => process.exit(0));
  });
});
