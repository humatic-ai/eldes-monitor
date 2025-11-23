const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Encryption function (matches lib/crypto.ts)
function encrypt(text) {
  const key = crypto.scryptSync(
    process.env.ELDES_ENCRYPTION_KEY || "default-key-change-in-production",
    "eldes-salt",
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

const dbPath = path.join(__dirname, '..', 'eldes.db');
const db = new Database(dbPath);

// Check if demo credential exists
const existingDemo = db.prepare("SELECT id FROM eldes_credentials WHERE username = 'demo@eldes.demo'").get();

let credentialId;
if (existingDemo) {
  credentialId = existingDemo.id;
  console.log('Demo credential already exists, using ID:', credentialId);
} else {
  // Create demo credential
  const result = db.prepare(`
    INSERT INTO eldes_credentials (user_id, username, password_encrypted, device_name)
    VALUES (1, 'demo@eldes.demo', ?, 'Demo Device')
  `).run(encrypt('demo'));
  credentialId = result.lastInsertRowid;
  console.log('Created demo credential with ID:', credentialId);
}

// Check if demo device exists
const demoDeviceId = '999999999999999';
const existingDevice = db.prepare("SELECT id FROM devices WHERE device_id = ?").get(demoDeviceId);

let deviceDbId;
if (existingDevice) {
  deviceDbId = existingDevice.id;
  console.log('Demo device already exists, using ID:', deviceDbId);
} else {
  // Create demo device
  const result = db.prepare(`
    INSERT INTO devices (credential_id, device_id, device_name, model, firmware_version, last_seen)
    VALUES (?, ?, 'Demo ELDES Device', 'ESIM364', '1.0.0', CURRENT_TIMESTAMP)
  `).run(credentialId, demoDeviceId);
  deviceDbId = result.lastInsertRowid;
  console.log('Created demo device with ID:', deviceDbId);
}

// Generate temperature data for the last 30 days
console.log('Generating temperature data...');
const now = Date.now();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;
const thirtyDaysAgo = now - (30 * oneDay);

// Generate data points every hour for 30 days
const insertTemp = db.prepare(`
  INSERT INTO temperature_history (device_id, sensor_id, sensor_name, temperature, min_temperature, max_temperature, recorded_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Clear existing demo temperature data
db.prepare("DELETE FROM temperature_history WHERE device_id = ?").run(deviceDbId);
console.log('Cleared existing temperature data for demo device');

// Generate realistic temperature data with variation
let baseTemp = 20.0;
let currentTime = thirtyDaysAgo;

// Generate 3 sensors worth of data
for (let sensor = 1; sensor <= 3; sensor++) {
  const sensorName = `Sensor ${sensor}`;
  baseTemp = 18 + sensor * 2;
  
  for (let i = 0; i < 30 * 24; i++) {
    const dayOfCycle = (i % 24);
    const dayTemp = Math.sin((dayOfCycle - 6) * Math.PI / 12) * 5;
    const randomVariation = (Math.random() - 0.5) * 2;
    const temperature = baseTemp + dayTemp + randomVariation;
    
    const minTemp = temperature - 0.5;
    const maxTemp = temperature + 0.5;
    
    const recordedAt = new Date(currentTime).toISOString();
    
    insertTemp.run(deviceDbId, sensor, sensorName, temperature, minTemp, maxTemp, recordedAt);
    
    currentTime += oneHour;
  }
  
  currentTime = thirtyDaysAgo;
}

console.log('Generated temperature data for 3 sensors over 30 days');
console.log('Demo setup complete!');
console.log('');
console.log('Demo credentials:');
console.log('  Username: demo@eldes.demo');
console.log('  Password: demo');
console.log('  Device ID: 999999999999999');

db.close();
