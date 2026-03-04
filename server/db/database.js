const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../timekeep.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function runMigrations(db) {
  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!userCols.includes('active')) {
    db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
    console.log('Migration: added users.active column');
  }
  if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='eod_formats'").get()) {
    db.exec(`
      CREATE TABLE eod_formats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        to_addresses TEXT NOT NULL,
        cc_addresses TEXT,
        subject_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE eod_client_types (
        client_id INTEGER NOT NULL PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
        eod_type TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    console.log('Migration: added eod_formats and eod_client_types');
  }
  if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='eod_email_settings'").get()) {
    db.exec(`
      CREATE TABLE eod_email_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_secure INTEGER NOT NULL DEFAULT 0,
        smtp_user TEXT,
        smtp_pass TEXT,
        eod_from TEXT,
        updated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO eod_email_settings (id) VALUES (1);
    `);
    console.log('Migration: added eod_email_settings');
  } else if (!db.prepare('SELECT id FROM eod_email_settings WHERE id = 1').get()) {
    db.prepare('INSERT INTO eod_email_settings (id) VALUES (1)').run();
    console.log('Migration: seeded eod_email_settings row');
  }
}

function seedLinks(db) {
  const existing = db.prepare('SELECT id FROM links WHERE url = ?').get('https://completes.onestrangelife.dev/');
  if (!existing) {
    db.prepare('INSERT INTO links (title, url, description, sort_order) VALUES (?, ?, ?, ?)').run(
      'Completes', 'https://completes.onestrangelife.dev/', 'OneStrangeLife Completes tracker', 0
    );
  }
}

function initDb() {
  const db = getDb();
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  runMigrations(db);
  seedAdminUser(db);
  seedLinks(db);
  console.log('Database initialized');
}

function seedAdminUser(db) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (username, password_hash, display_name, is_admin) VALUES (?, ?, ?, 1)'
    ).run('admin', hash, 'Administrator');
    console.log('Seeded admin user: admin / admin123');
  }
}

module.exports = { getDb, initDb };
