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
const existingDevice = db.prepare("SELECT id, credential_id FROM devices WHERE device_id = ?").get(demoDeviceId);

let deviceDbId;
if (existingDevice) {
  deviceDbId = existingDevice.id;
  // Update credential_id if it's associated with wrong credential
  if (existingDevice.credential_id !== credentialId) {
    db.prepare("UPDATE devices SET credential_id = ? WHERE id = ?").run(credentialId, deviceDbId);
    console.log('Demo device already exists, updated credential_id to:', credentialId);
  } else {
    console.log('Demo device already exists, using ID:', deviceDbId);
  }
} else {
  // Create demo device
  const result = db.prepare(`
    INSERT INTO devices (credential_id, device_id, device_name, model, firmware_version, last_seen)
    VALUES (?, ?, 'Demo ELDES Device', 'ESIM364', '1.0.0', CURRENT_TIMESTAMP)
  `).run(credentialId, demoDeviceId);
  deviceDbId = result.lastInsertRowid;
  console.log('Created demo device with ID:', deviceDbId);
}

// Generate temperature data for the last 1 month (30 days)
console.log('Generating temperature data for last 1 month...');
const now = Date.now();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;
const oneMonthAgo = now - (30 * oneDay);

// Prepare insert statement
const insertTemp = db.prepare(`
  INSERT INTO temperature_history (device_id, sensor_id, sensor_name, temperature, min_temperature, max_temperature, recorded_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Clear existing demo temperature data
const deleteStmt = db.prepare("DELETE FROM temperature_history WHERE device_id = ?");
const deleteTransaction = db.transaction(() => {
  deleteStmt.run(deviceDbId);
});
deleteTransaction();
console.log('Cleared existing temperature data for demo device');

// Function to generate realistic Vilnius temperature based on date
function getVilniusTemperature(date) {
  const month = date.getMonth(); // 0-11
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / oneDay);
  const hourOfDay = date.getHours();
  
  // Seasonal base temperature for Vilnius (monthly averages)
  // Jan: -5°C, Feb: -4°C, Mar: 0°C, Apr: 7°C, May: 13°C, Jun: 16°C
  // Jul: 18°C, Aug: 17°C, Sep: 12°C, Oct: 6°C, Nov: 1°C, Dec: -3°C
  const monthlyAverages = [-5, -4, 0, 7, 13, 16, 18, 17, 12, 6, 1, -3];
  const baseTemp = monthlyAverages[month];
  
  // Add seasonal variation (sine wave over the year)
  const seasonalVariation = Math.sin((dayOfYear / 365) * 2 * Math.PI - Math.PI / 2) * 3;
  
  // Daily cycle: coldest around 4 AM, warmest around 2 PM
  const dailyCycle = Math.sin((hourOfDay - 4) * Math.PI / 12) * 5;
  
  // Random weather variation
  const weatherVariation = (Math.random() - 0.5) * 8;
  
  // Extreme cold snaps in winter, heat waves in summer
  let extremeVariation = 0;
  if (month >= 11 || month <= 1) {
    // Winter: occasional cold snaps down to -20°C
    if (Math.random() < 0.1) extremeVariation = -10 - Math.random() * 5;
  } else if (month >= 5 && month <= 7) {
    // Summer: occasional heat waves up to 30°C
    if (Math.random() < 0.1) extremeVariation = 5 + Math.random() * 5;
  }
  
  const temperature = baseTemp + seasonalVariation + dailyCycle + weatherVariation + extremeVariation;
  
  // Clamp to realistic Vilnius range (-25°C to 35°C)
  return Math.max(-25, Math.min(35, temperature));
}

// Generate temperature data
let currentTime = oneMonthAgo;
const totalHours = 30 * 24;

// Store outside temperatures first, then calculate internal and boiler
const outsideTemps = [];

console.log('Generating outside temperatures (Vilnius data)...');
for (let i = 0; i < totalHours; i++) {
  const date = new Date(currentTime);
  const outsideTemp = getVilniusTemperature(date);
  outsideTemps.push(outsideTemp);
  currentTime += oneHour;
}

// Use transaction for better performance
const insertTransaction = db.transaction((data) => {
  for (const record of data) {
    insertTemp.run(record.deviceDbId, record.sensor, record.name, record.temp, record.minTemp, record.maxTemp, record.recordedAt);
  }
});

// Collect all records first, then insert in transaction
console.log('Generating sensor data (Outside, Internal, Boiler)...');
const allRecords = [];
currentTime = oneMonthAgo;
let currentInternal = 20.0; // Track internal temperature over time

for (let i = 0; i < totalHours; i++) {
  const date = new Date(currentTime);
  const hourOfDay = date.getHours();
  const outsideTemp = outsideTemps[i];
  
  // Calculate internal temperature (around 20°C, influenced by outside and boiler)
  const targetInternal = 20.0;
  
  // Outside influence: when it's very cold outside, internal tends to drop
  // When it's warm outside, internal tends to rise slightly
  let outsideInfluence = 0;
  if (outsideTemp < 10) {
    // Cold outside: internal tends to drop (heating tries to compensate)
    outsideInfluence = (outsideTemp - 10) * 0.08;
  } else if (outsideTemp > 20) {
    // Warm outside: internal tends to rise
    outsideInfluence = (outsideTemp - 20) * 0.05;
  }
  
  // Internal temperature slowly adjusts toward target, influenced by outside
  const adjustmentRate = 0.1; // How quickly internal temp adjusts
  currentInternal = currentInternal + (targetInternal - currentInternal) * adjustmentRate + outsideInfluence;
  
  // Add slight daily variation and random noise
  const dailyVariation = Math.sin((hourOfDay - 6) * Math.PI / 12) * 0.3;
  const randomVariation = (Math.random() - 0.5) * 0.5;
  const internalTemp = currentInternal + dailyVariation + randomVariation;
  
  // Clamp to realistic indoor range (18-22°C)
  const finalInternalTemp = Math.max(18, Math.min(22, internalTemp));
  currentInternal = finalInternalTemp; // Update tracked value
  
  // Calculate boiler temperature based on heating demand
  // Heating demand increases when:
  // 1. Outside is cold (more heat loss)
  // 2. Internal is below target (needs heating)
  const tempDifference = targetInternal - finalInternalTemp;
  const outsideColdFactor = Math.max(0, (10 - outsideTemp) / 10); // 0-1, higher when colder
  const internalLowFactor = Math.max(0, tempDifference / 2); // 0-1, higher when internal is low
  
  // Combined heating demand (0-1 scale)
  const heatingDemand = Math.min(1, (outsideColdFactor * 0.7 + internalLowFactor * 0.3));
  
  // Boiler temperature: 50°C (idle) to 80°C (full heating)
  let boilerTemp = 50 + (heatingDemand * 30);
  
  // Add some variation
  const boilerVariation = (Math.random() - 0.5) * 3;
  boilerTemp += boilerVariation;
  
  // Clamp to realistic boiler range (45-85°C)
  const finalBoilerTemp = Math.max(45, Math.min(85, boilerTemp));
  
  // Store temperatures for all 3 sensors
  const temperatures = [
    { sensor: 1, name: 'Outside', temp: outsideTemp },
    { sensor: 2, name: 'Internal', temp: finalInternalTemp },
    { sensor: 3, name: 'Boiler', temp: finalBoilerTemp }
  ];
  
  // Prepare records for all sensors
  // Use fixed min/max values matching real user data format (sergey.seregin@gmail.com)
  // The frontend converts these by multiplying by 10, so we store them divided by 10
  // Real data: "за окном" min=12.5→125°C, max=-5.5→-55°C (but these seem wrong)
  // Real data: "второй этаж" min=2.6→26°C, max=1.2→12°C
  // Real data: "котел возврат" min=6.0→60°C, max=2.0→20°C
  // For demo, use realistic ranges stored in device format (divide by 10):
  for (const sensorData of temperatures) {
    let minTemp, maxTemp;
    
    if (sensorData.sensor === 1) {
      // Outside: realistic range -25°C to 35°C, stored as -2.5 to 3.5
      minTemp = -2.5;
      maxTemp = 3.5;
    } else if (sensorData.sensor === 2) {
      // Internal: realistic range 18°C to 22°C, stored as 1.8 to 2.2
      minTemp = 1.8;
      maxTemp = 2.2;
    } else {
      // Boiler: realistic range 45°C to 85°C, stored as 4.5 to 8.5
      minTemp = 4.5;
      maxTemp = 8.5;
    }
    
    const recordedAt = new Date(currentTime).toISOString();
    allRecords.push({
      deviceDbId,
      sensor: sensorData.sensor,
      name: sensorData.name,
      temp: sensorData.temp,
      minTemp,
      maxTemp,
      recordedAt
    });
  }
  
  currentTime += oneHour;
  
  // Progress indicator every 1000 hours
  if (i % 1000 === 0 && i > 0) {
    console.log(`Progress: ${Math.round((i / totalHours) * 100)}% (${i}/${totalHours} hours)`);
  }
}

console.log(`Inserting ${allRecords.length} temperature records...`);
// Insert in batches to avoid database lock
const batchSize = 1000;
for (let i = 0; i < allRecords.length; i += batchSize) {
  const batch = allRecords.slice(i, i + batchSize);
  insertTransaction(batch);
  if (i % 10000 === 0 && i > 0) {
    console.log(`Inserted ${i}/${allRecords.length} records...`);
  }
}

console.log('Generated temperature data for 3 sensors over 1 month (30 days)');
console.log('Demo setup complete!');
console.log('');
console.log('Demo credentials:');
console.log('  Username: demo@eldes.demo');
console.log('  Password: demo');
console.log('  Device ID: 999999999999999');

db.close();
