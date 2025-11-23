import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

const dbPath = path.join(process.cwd(), "eldes.db");

// Ensure database file exists
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "");
}

// Get the absolute path to the native binding
// This ensures it works even when Next.js changes the working directory
const projectRoot = process.cwd();
const nativeBindingPath = path.resolve(
  projectRoot,
  "node_modules",
  "better-sqlite3",
  "build",
  "Release",
  "better_sqlite3.node"
);

// Initialize database with explicit native binding path
let db: Database.Database;
try {
  db = new Database(dbPath, {
    nativeBinding: fs.existsSync(nativeBindingPath) ? nativeBindingPath : undefined,
  });
} catch (error) {
  // Fallback: try without explicit path (should work if module is properly external)
  console.warn("Failed to load with explicit native binding, trying default:", error);
  db = new Database(dbPath);
}

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eldes_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    device_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credential_id INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    model TEXT,
    firmware_version TEXT,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credential_id) REFERENCES eldes_credentials(id) ON DELETE CASCADE,
    UNIQUE(credential_id, device_id)
  );

  CREATE TABLE IF NOT EXISTS device_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    partition_id INTEGER,
    partition_name TEXT,
    is_armed INTEGER DEFAULT 0,
    is_ready INTEGER DEFAULT 0,
    temperature REAL,
    zone_status TEXT,
    raw_data TEXT,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS temperature_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    temperature REAL NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_accessed INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_device_status_device_id ON device_status(device_id);
  CREATE INDEX IF NOT EXISTS idx_device_status_fetched_at ON device_status(fetched_at);
  CREATE INDEX IF NOT EXISTS idx_temperature_history_device_id ON temperature_history(device_id);
  CREATE INDEX IF NOT EXISTS idx_temperature_history_recorded_at ON temperature_history(recorded_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`);

  // Add new columns if they don't exist (migration for existing databases)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(temperature_history)").all() as any[];
    const hasSensorId = tableInfo.some((col: any) => col.name === 'sensor_id');
    const hasSensorName = tableInfo.some((col: any) => col.name === 'sensor_name');
    const hasMinTemp = tableInfo.some((col: any) => col.name === 'min_temperature');
    const hasMaxTemp = tableInfo.some((col: any) => col.name === 'max_temperature');
    
    if (!hasSensorId) {
      db.exec("ALTER TABLE temperature_history ADD COLUMN sensor_id INTEGER");
    }
    if (!hasSensorName) {
      db.exec("ALTER TABLE temperature_history ADD COLUMN sensor_name TEXT");
    }
    if (!hasMinTemp) {
      db.exec("ALTER TABLE temperature_history ADD COLUMN min_temperature REAL");
    }
    if (!hasMaxTemp) {
      db.exec("ALTER TABLE temperature_history ADD COLUMN max_temperature REAL");
    }
    
    // Add index for sensor_id if columns were added
    if (!hasSensorId) {
      db.exec("CREATE INDEX IF NOT EXISTS idx_temperature_history_sensor_id ON temperature_history(device_id, sensor_id)");
    }
  } catch (error) {
    console.warn("Error migrating temperature_history table:", error);
  }

// Ensure default user exists (for single-user mode)
// In production, implement proper authentication
const defaultUser = db
  .prepare("SELECT id FROM users WHERE id = 1")
  .get() as { id: number } | undefined;

if (!defaultUser) {
  // Create default user with a placeholder password hash
  // In production, this should be handled through proper authentication
  const bcrypt = require("bcryptjs");
  const defaultPasswordHash = bcrypt.hashSync("default", 10);
  db.prepare(
    "INSERT INTO users (id, username, password_hash) VALUES (1, 'default', ?)"
  ).run(defaultPasswordHash);
}

export default db;

