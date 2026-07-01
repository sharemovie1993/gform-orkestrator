const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('licenses.db');

db.get('SELECT * FROM invoices WHERE invoice_number = ?', ['INV-ORK-4938-2026'], (err, row) => {
  if (err) {
    console.error(err);
  } else {
    console.log('====== INVOICE ======');
    console.log(JSON.stringify(row, null, 2));
    console.log('=====================');
  }
  db.close();
});
