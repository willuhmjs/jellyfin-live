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

    CREATE TABLE IF NOT EXISTS series_images (
        name TEXT PRIMARY KEY,
        image_url TEXT
    );
`);

const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

const getImageStmt = db.prepare('SELECT image_url FROM series_images WHERE name = ?');
const setImageStmt = db.prepare('INSERT OR REPLACE INTO series_images (name, image_url) VALUES (?, ?)');

export function getSetting(key) {
    const row = getStmt.get(key);
    return row ? row.value : null;
}

export function setSetting(key, value) {
    setStmt.run(key, value);
}

export function getSeriesImage(name) {
    console.log(`[DB] getSeriesImage called for: ${name}`);
    const row = getImageStmt.get(name);
    const result = row ? row.image_url : null;
    console.log(`[DB] getSeriesImage result for ${name}: ${result}`);
    return result;
}

export function saveSeriesImage(name, url) {
    console.log(`[DB] saveSeriesImage called for: ${name}, url: ${url}`);
    setImageStmt.run(name, url);
}

export { db };
