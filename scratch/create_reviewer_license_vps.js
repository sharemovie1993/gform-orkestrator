const sqlite3 = require('sqlite3').verbose();

const dbPath = '/var/www/licensing-server/licenses.db';
console.log('Connecting to database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  
  console.log('Successfully connected to licenses.db');

  const licenseKey = 'ORK-TEST-REVIEWER-2026';
  const schoolName = 'SMK Reviewer Tripay';
  const expiresAt = '2030-12-31';
  const productId = 'gform-orkestrator';
  const planId = 'annual';

  db.serialize(() => {
    // 1. Delete existing
    db.run("DELETE FROM licenses WHERE license_key = ?", [licenseKey], function(err) {
      if (err) console.error('Delete license error:', err);
    });

    // 2. Insert License
    db.run(
      "INSERT INTO licenses (license_key, product_id, school_name, device_limit, is_unlimited, expires_at, status, is_active, plan_id, created_at) VALUES (?, ?, ?, 99999, 1, ?, 'active', 1, ?, (datetime('now', 'localtime')))",
      [licenseKey, productId, schoolName, expiresAt, planId],
      function(err) {
        if (err) {
          console.error('Insert license failed:', err);
          db.close();
          process.exit(1);
        }
        
        const licenseId = this.lastID;
        console.log(`[OK] Inserted reviewer license. ID: ${licenseId}, Key: ${licenseKey}, Expires: ${expiresAt}`);

        // 3. Insert Subscription
        db.run(
          "INSERT INTO subscriptions (license_id, school_name, product_id, plan_id, status, start_date, end_date) VALUES (?, ?, ?, ?, 'active', '2026-05-25', ?)",
          [licenseId, schoolName, productId, planId, expiresAt],
          function(err) {
            if (err) console.error('Insert subscription failed:', err);
            else console.log('[OK] Inserted active subscription.');
          }
        );

        // 4. Insert paid invoice
        db.run(
          "INSERT INTO invoices (invoice_number, license_id, school_name, product_id, plan_title, amount, status, payment_method, paid_at) VALUES ('INV-ORK-TEST-REVIEWER', ?, ?, ?, 'Tahunan', 1199000, 'paid', 'Manual', (datetime('now', 'localtime')))",
          [licenseId, schoolName, productId],
          function(err) {
            if (err) console.error('Insert invoice failed:', err);
            else console.log('[OK] Inserted paid invoice.');

            db.close(() => {
              console.log('Database connection closed safely. Reviewer license created!');
            });
          }
        );
      }
    );
  });
});
