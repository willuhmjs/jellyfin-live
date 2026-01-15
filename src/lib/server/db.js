import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';

const dbPath = env.DB_PATH || 'dvr.db';
const db = new Database(dbPath);

// Initialize database
db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS tvmaze_cache (
        endpoint TEXT PRIMARY KEY,
        data JSON,
        updated_at INTEGER
    );
`);

const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

export function getSetting(key) {
    const row = getStmt.get(key);
    return row ? row.value : null;
}

export function setSetting(key, value) {
    setStmt.run(key, value);
}

export { db };
