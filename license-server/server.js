const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

app.use(cors());
app.use(express.json());

// Serve static admin dashboard UI
app.use(express.static(path.join(__dirname, 'public')));

let db;

// ── DATABASE INITIALIZATION ──
async function initDatabase() {
  const dbPath = path.join(__dirname, 'licenses.db');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Table licenses (Added status and is_active columns)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT UNIQUE NOT NULL,
      school_name TEXT NOT NULL,
      device_limit INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active', -- 'pending' or 'active'
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      expires_at TEXT NOT NULL
    )
  `);

  // Table activated_devices
  await db.exec(`
    CREATE TABLE IF NOT EXISTS activated_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      activated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (license_id) REFERENCES licenses (id) ON DELETE CASCADE,
      UNIQUE(license_id, device_id)
    )
  `);

  // Insert a seed test license key if db is empty
  const count = await db.get('SELECT COUNT(*) as count FROM licenses');
  if (count.count === 0) {
    const demoKey = 'ORK-DEMO-TEST-KEY-2026';
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const expiresStr = oneYearLater.toISOString().slice(0, 10); // YYYY-MM-DD

    await db.run(
      "INSERT INTO licenses (license_key, school_name, device_limit, expires_at, status, is_active) VALUES (?, ?, ?, ?, 'active', 1)",
      [demoKey, 'SMK Ujicoba Indonesia', 50, expiresStr]
    );
    console.log(`[SEED] Created default demo license: ${demoKey} (Limit: 50 devices, Expires: ${expiresStr})`);
  }

  console.log('[DATABASE] SQLite database initialized successfully.');
}

// ── ADMIN MIDDLEWARE ──
function adminAuth(req, res, next) {
  const authHeader = req.headers['x-admin-secret'];
  if (!authHeader || authHeader !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: 'Akses Ditolak. Secret Admin PIN tidak valid.' });
  }
  next();
}

// ── UTILITIES ──
function generateKey() {
  // Generates ORK-XXXX-YYYY-ZZZZ key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `ORK-${segment(4)}-${segment(4)}-${segment(4)}`;
}

// ── ENDPOINTS ──

// 1. Redirect root to admin.html for ease of use
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 2. Generate License Key (ADMIN ONLY)
app.post('/api/license/generate', adminAuth, async (req, res) => {
  const { school_name, device_limit, duration_days } = req.body;

  if (!school_name) {
    return res.status(400).json({ success: false, message: 'Nama Sekolah harus diisi.' });
  }

  const limit = parseInt(device_limit, 10) || 1;
  const days = parseInt(duration_days, 10) || 365;

  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + days);
  const expiresStr = expireDate.toISOString().slice(0, 10); // YYYY-MM-DD

  const newKey = generateKey();

  try {
    await db.run(
      "INSERT INTO licenses (license_key, school_name, device_limit, expires_at, status, is_active) VALUES (?, ?, ?, ?, 'active', 1)",
      [newKey, school_name, limit, expiresStr]
    );

    res.json({
      success: true,
      message: 'License Key baru berhasil dibuat.',
      data: {
        license_key: newKey,
        school_name,
        device_limit: limit,
        expires_at: expiresStr,
        duration_days: days
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal membuat kunci lisensi di database.' });
  }
});

// 3. Client request license (PUBLIC - QRIS PAYMENT GATEWAY PREPARATION)
app.post('/api/license/request', async (req, res) => {
  const { school_name, device_limit } = req.body;

  if (!school_name || !device_limit) {
    return res.status(400).json({ success: false, message: 'Nama Sekolah dan Limit Perangkat wajib diisi.' });
  }

  const limit = parseInt(device_limit, 10) || 10;
  const newKey = generateKey();
  
  // Set temporary placeholder expiration (e.g. 365 days from now, will be finalized upon approval)
  const placeholderExpire = new Date();
  placeholderExpire.setFullYear(placeholderExpire.getFullYear() + 1);
  const expiresStr = placeholderExpire.toISOString().slice(0, 10);

  try {
    await db.run(
      "INSERT INTO licenses (license_key, school_name, device_limit, expires_at, status, is_active) VALUES (?, ?, ?, ?, 'pending', 0)",
      [newKey, school_name.trim(), limit, expiresStr]
    );

    res.json({
      success: true,
      message: 'Permintaan aktivasi lisensi berhasil dibuat. Silakan selesaikan pembayaran QRIS.',
      data: {
        license_key: newKey,
        school_name,
        device_limit: limit,
        status: 'pending'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memproses permintaan lisensi.' });
  }
});

// 4. Client check pending license status (PUBLIC POLLING ENDPOINT)
app.get('/api/license/check/:key', async (req, res) => {
  const { key } = req.params;
  const deviceId = req.query.device_id;

  if (!key) {
    return res.status(400).json({ success: false, message: 'Kunci lisensi wajib disertakan.' });
  }

  try {
    const license = await db.get('SELECT * FROM licenses WHERE license_key = ?', [key.trim()]);
    
    if (!license) {
      return res.status(404).json({ success: false, message: 'Kunci lisensi tidak ditemukan.' });
    }

    if (license.status === 'pending') {
      return res.json({
        success: true,
        status: 'pending',
        message: 'Lisensi dalam antrean persetujuan. Menunggu konfirmasi transfer QRIS.'
      });
    }

    if (license.status === 'active' && license.is_active === 1) {
      // License is now approved! Instantly activate this requesting device!
      let token = null;
      if (deviceId) {
        // Register device ID if not already bound
        const alreadyActive = await db.get(
          'SELECT * FROM activated_devices WHERE license_id = ? AND device_id = ?',
          [license.id, deviceId]
        );

        if (!alreadyActive) {
          // Count currently bound devices
          const activeCount = await db.get(
            'SELECT COUNT(*) as count FROM activated_devices WHERE license_id = ?',
            [license.id]
          );

          if (activeCount.count < license.device_limit) {
            await db.run(
              'INSERT INTO activated_devices (license_id, device_id) VALUES (?, ?)',
              [license.id, deviceId]
            );
          } else {
            return res.json({
              success: true,
              status: 'active_limit_reached',
              message: 'Lisensi disetujui, namun kuota limit perangkat (HP) sudah penuh.'
            });
          }
        }

        // Sign JWT Token
        token = jwt.sign(
          {
            license_key: license.license_key,
            school_name: license.school_name,
            device_id: deviceId,
            expires_at: license.expires_at
          },
          JWT_SECRET,
          { expiresIn: '365d' }
        );
      }

      return res.json({
        success: true,
        status: 'active',
        message: 'Lisensi aktif dan disetujui!',
        token,
        school_name: license.school_name,
        expires_at: license.expires_at
      });
    }

    res.json({
      success: true,
      status: 'inactive',
      message: 'Lisensi dalam status tidak aktif.'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Kesalahan sistem saat memeriksa status lisensi.' });
  }
});

// 5. Activate License manually with Direct Input (CLIENT APP)
app.post('/api/license/activate', async (req, res) => {
  const { license_key, device_id } = req.body;

  if (!license_key || !device_id) {
    return res.status(400).json({ success: false, message: 'Kunci lisensi (key) dan Device ID wajib diisi.' });
  }

  try {
    // Check if license exists and is active
    const license = await db.get(
      'SELECT * FROM licenses WHERE license_key = ? AND is_active = 1 AND status = "active"',
      [license_key.trim()]
    );

    if (!license) {
      return res.status(404).json({ success: false, message: 'Kunci lisensi tidak ditemukan, kedaluwarsa, atau belum disetujui.' });
    }

    // Check expiration
    const todayStr = new Date().toISOString().slice(0, 10);
    if (license.expires_at < todayStr) {
      return res.status(410).json({ success: false, message: 'Masa aktif lisensi ini sudah kedaluwarsa.' });
    }

    // Check if this device is already activated for this license
    const alreadyActive = await db.get(
      'SELECT * FROM activated_devices WHERE license_id = ? AND device_id = ?',
      [license.id, device_id]
    );

    if (alreadyActive) {
      const token = jwt.sign(
        {
          license_key: license.license_key,
          school_name: license.school_name,
          device_id,
          expires_at: license.expires_at
        },
        JWT_SECRET,
        { expiresIn: '365d' }
      );

      return res.json({
        success: true,
        message: 'Perangkat ini sudah terdaftar sebelumnya. Aktivasi dipulihkan.',
        token,
        school_name: license.school_name,
        expires_at: license.expires_at
      });
    }

    // Count currently activated devices
    const activeCount = await db.get(
      'SELECT COUNT(*) as count FROM activated_devices WHERE license_id = ?',
      [license.id]
    );

    if (activeCount.count >= license.device_limit) {
      return res.status(403).json({
        success: false,
        message: `Batas limit perangkat tercapai. Kunci lisensi ini hanya untuk maksimal ${license.device_limit} HP.`
      });
    }

    // Register device ID
    await db.run(
      'INSERT INTO activated_devices (license_id, device_id) VALUES (?, ?)',
      [license.id, device_id]
    );

    // Sign JWT Token
    const token = jwt.sign(
      {
        license_key: license.license_key,
        school_name: license.school_name,
        device_id,
        expires_at: license.expires_at
      },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    res.json({
      success: true,
      message: 'Aktivasi lisensi berhasil dipublikasikan untuk perangkat ini.',
      token,
      school_name: license.school_name,
      expires_at: license.expires_at
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat memproses aktivasi.' });
  }
});

// 6. Verify License JWT (CLIENT APP BACKGROUND CHECK)
app.post('/api/license/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token verifikasi tidak ditemukan.' });
  }

  try {
    // Decode and verify JWT signature
    const decoded = jwt.verify(token, JWT_SECRET);

    // Query database to ensure this license is still active
    const license = await db.get(
      'SELECT * FROM licenses WHERE license_key = ? AND is_active = 1 AND status = "active"',
      [decoded.license_key]
    );

    if (!license) {
      return res.status(401).json({ success: false, message: 'Lisensi dibatalkan atau dinonaktifkan oleh administrator.' });
    }

    // Double check database expiration date
    const todayStr = new Date().toISOString().slice(0, 10);
    if (license.expires_at < todayStr) {
      return res.status(401).json({ success: false, message: 'Lisensi ini sudah habis masa berlakunya.' });
    }

    // Ensure the device ID is still registered
    const deviceRecord = await db.get(
      'SELECT * FROM activated_devices WHERE license_id = ? AND device_id = ?',
      [license.id, decoded.device_id]
    );

    if (!deviceRecord) {
      return res.status(401).json({ success: false, message: 'Perangkat ini dide-otorisasi dari lisensi.' });
    }

    res.json({
      success: true,
      message: 'Lisensi valid dan terverifikasi online.',
      data: {
        school_name: license.school_name,
        expires_at: license.expires_at,
        device_id: decoded.device_id
      }
    });

  } catch (err) {
    res.status(401).json({ success: false, message: 'Sesi lisensi kedaluwarsa atau tidak valid.' });
  }
});

// 7. Approve Pending License Key (ADMIN ONLY)
app.post('/api/license/approve/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  
  // Set expiration starting from approval date (e.g. 1 year from today)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const expiresStr = oneYearFromNow.toISOString().slice(0, 10);

  try {
    const license = await db.get('SELECT * FROM licenses WHERE id = ?', [id]);
    if (!license) {
      return res.status(404).json({ success: false, message: 'Kunci lisensi tidak ditemukan.' });
    }

    await db.run(
      "UPDATE licenses SET status = 'active', is_active = 1, expires_at = ? WHERE id = ?",
      [expiresStr, id]
    );

    res.json({
      success: true,
      message: `Lisensi untuk ${license.school_name} berhasil disetujui! Masa aktif disetel hingga ${expiresStr}.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal menyetujui kunci lisensi di database.' });
  }
});

// 8. List all licenses & activations (ADMIN ONLY)
app.get('/api/license/list', adminAuth, async (req, res) => {
  try {
    const list = await db.all('SELECT * FROM licenses ORDER BY id DESC');
    
    // Inject active devices count for each license
    const fullList = await Promise.all(
      list.map(async (license) => {
        const devices = await db.all(
          'SELECT device_id, activated_at FROM activated_devices WHERE license_id = ?',
          [license.id]
        );
        return {
          ...license,
          active_devices_count: devices.length,
          devices
        };
      })
    );

    res.json({ success: true, count: fullList.length, data: fullList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memuat list lisensi.' });
  }
});

// 9. Delete or deactivate license key (ADMIN ONLY)
app.delete('/api/license/delete/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM licenses WHERE id = ?', [id]);
    res.json({ success: true, message: 'Lisensi berhasil dihapus dari server.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal menghapus lisensi dari database.' });
  }
});

// Start Server after DB init
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[LICENSE SERVER] Running securely on port ${PORT}`);
  });
}).catch(err => {
  console.error('[DATABASE] Critical error initializing database:', err);
});
