const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'stress_tests.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

// Initialize Schema
db.serialize(() => {
  // 1. Run Summary Table
  db.run(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      duration_seconds REAL,
      total_nodes INTEGER,
      total_browsers INTEGER,
      success_count INTEGER,
      fail_count INTEGER,
      avg_latency_ms REAL,
      min_latency_ms REAL,
      max_latency_ms REAL,
      conclusion TEXT
    )
  `);

  // 2. Node Details Table (Result of each node in a run)
  db.run(`
    CREATE TABLE IF NOT EXISTS test_run_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT,
      hostname TEXT NOT NULL,
      ip TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      success INTEGER NOT NULL, -- 1 = yes, 0 = no
      success_count INTEGER DEFAULT 0,
      fail_count INTEGER DEFAULT 0,
      avg_latency_ms REAL,
      min_latency_ms REAL,
      max_latency_ms REAL,
      error_msg TEXT,
      report_text TEXT,
      FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
    )
  `);
});

module.exports = {
  db,
  
  // Helper to save a full test run
  saveTestRun: (summary, nodeDetails) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Begin Transaction
        db.run('BEGIN TRANSACTION');

        const insertRun = db.prepare(`
          INSERT INTO test_runs (
            id, timestamp, duration_seconds, total_nodes, total_browsers, 
            success_count, fail_count, avg_latency_ms, min_latency_ms, max_latency_ms, conclusion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertRun.run(
          summary.id,
          summary.timestamp,
          summary.duration_seconds,
          summary.total_nodes,
          summary.total_browsers,
          summary.success_count,
          summary.fail_count,
          summary.avg_latency_ms,
          summary.min_latency_ms,
          summary.max_latency_ms,
          summary.conclusion
        );
        insertRun.finalize();

        const insertNode = db.prepare(`
          INSERT INTO test_run_nodes (
            run_id, hostname, ip, capacity, success, success_count, fail_count, 
            avg_latency_ms, min_latency_ms, max_latency_ms, error_msg, report_text
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const node of nodeDetails) {
          insertNode.run(
            summary.id,
            node.hostname,
            node.ip,
            node.capacity,
            node.success ? 1 : 0,
            node.success_count || 0,
            node.fail_count || 0,
            node.avg_latency_ms || 0,
            node.min_latency_ms || 0,
            node.max_latency_ms || 0,
            node.error_msg || null,
            node.report_text || null
          );
        }
        insertNode.finalize();

        // Commit Transaction
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          resolve();
        });
      });
    });
  },

  // Get runs with summary stats
  getTestRuns: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM test_runs ORDER BY timestamp DESC', (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  // Get details for a single run
  getTestRunDetails: (runId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM test_runs WHERE id = ?', [runId], (err, run) => {
        if (err) return reject(err);
        if (!run) return resolve(null);

        db.all('SELECT * FROM test_run_nodes WHERE run_id = ?', [runId], (err2, nodes) => {
          if (err2) return reject(err2);
          resolve({
            summary: run,
            nodes: nodes
          });
        });
      });
    });
  }
};
