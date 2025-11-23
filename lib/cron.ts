import cron from "node-cron";
import db from "./db";
import { ELDESCloudAPI } from "./eldes-api";
import { decrypt } from "./crypto";

/**
 * Fetch all devices for a credential set
 */
async function fetchDevicesForCredential(credentialId: number) {
  try {
    const credential = db
      .prepare("SELECT * FROM eldes_credentials WHERE id = ?")
      .get(credentialId) as any;

    if (!credential) {
      console.error(`Credential ${credentialId} not found`);
      return;
    }

    const password = decrypt(credential.password_encrypted);
    
    // Skip API call for demo credentials
    const isDemoCredentials = credential.username === "demo@eldes.demo" && password === "demo";
    if (isDemoCredentials) {
      console.log(`[Cron] Skipping API call for demo credentials (credential ${credentialId})`);
      return;
    }
    
    const api = new ELDESCloudAPI({
      username: credential.username,
      password: password,
    });

    // Get all devices
    const devices = await api.getDevices();

    for (const device of devices) {
      // Use imei as deviceId (primary identifier)
      const deviceId = device.imei || device.deviceId;
      const deviceName = device.deviceName || device.name;
      
      if (!deviceId) {
        console.warn("Skipping device without imei or deviceId:", device);
        continue;
      }
      
      // Insert or update device
      const existingDevice = db
        .prepare("SELECT id FROM devices WHERE credential_id = ? AND device_id = ?")
        .get(credentialId, deviceId) as any;

      let deviceDbId: number;

      if (existingDevice) {
        deviceDbId = existingDevice.id;
        db.prepare(
          "UPDATE devices SET device_name = ?, model = ?, firmware_version = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(deviceName, device.model, device.firmwareVersion, deviceDbId);
      } else {
        const result = db
          .prepare(
            "INSERT INTO devices (credential_id, device_id, device_name, model, firmware_version, last_seen) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
          )
          .run(
            credentialId,
            deviceId,
            deviceName,
            device.model,
            device.firmwareVersion
          );
        deviceDbId = result.lastInsertRowid as number;
      }

      // Fetch device status
      
      try {
        const status = await api.getDeviceStatus(deviceId);

        // Store device status with full raw data
        // Store the complete raw API responses for future use
        const fullRawData = {
          ...status.rawData,
          // Ensure we have all the raw API responses
          deviceListResponse: status.rawData?.deviceListResponse || status.rawData?.device || null,
          deviceInfoResponse: status.rawData?.deviceInfoResponse || status.rawData?.deviceInfo || null,
          temperatureResponse: status.rawData?.temperatureResponse || status.rawData?.temperatureDetails || null,
          // Store complete status object for reference
          completeStatus: {
            deviceId: status.deviceId,
            imei: status.imei,
            partitions: status.partitions,
            temperature: status.temperature,
            temperatureDetails: status.temperatureDetails,
            zones: status.zones,
          },
          fetchedAt: new Date().toISOString(),
        };

        for (const partition of status.partitions) {
          const partitionId = partition.partitionId || partition.internalId;
          const partitionName = partition.partitionName || partition.name;
          const isArmed = partition.isArmed !== undefined ? partition.isArmed : (partition.armed || false);
          
          db.prepare(
            "INSERT INTO device_status (device_id, partition_id, partition_name, is_armed, is_ready, temperature, zone_status, raw_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ).run(
            deviceDbId,
            partitionId,
            partitionName,
            isArmed ? 1 : 0,
            partition.isReady ? 1 : 0,
            status.temperature || null,
            JSON.stringify(status.zones || []),
            JSON.stringify(fullRawData) // Store complete raw dataset
          );
        }

        // Store temperature sensor readings - each sensor separately with timestamp
        // This is the production data collection: cron stores all temperature data with timestamps
        if (status.temperatureDetails && Array.isArray(status.temperatureDetails) && status.temperatureDetails.length > 0) {
          const fetchTimestamp = new Date().toISOString();
          for (const sensor of status.temperatureDetails) {
            if (sensor.temperature !== null && sensor.temperature !== undefined) {
              db.prepare(
                "INSERT INTO temperature_history (device_id, sensor_id, sensor_name, temperature, min_temperature, max_temperature, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
              ).run(
                deviceDbId,
                sensor.sensorId ?? null,
                sensor.sensorName || null,
                sensor.temperature,
                sensor.minTemperature ?? null,
                sensor.maxTemperature ?? null,
                fetchTimestamp // Explicit timestamp for production data collection
              );
            }
          }
        } else if (status.temperature !== null && status.temperature !== undefined) {
          // Fallback: store single temperature if no sensor details
          db.prepare(
            "INSERT INTO temperature_history (device_id, temperature, recorded_at) VALUES (?, ?, ?)"
          ).run(deviceDbId, status.temperature, new Date().toISOString());
        }
      } catch (error) {
        console.error(
          `Error fetching status for device ${deviceId}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error(`Error fetching devices for credential ${credentialId}:`, error);
  }
}

/**
 * Fetch all devices for all credentials
 */
async function fetchAllDevices() {
  console.log("Starting hourly device fetch...");
  const credentials = db
    .prepare("SELECT id FROM eldes_credentials")
    .all() as any[];

  for (const cred of credentials) {
    await fetchDevicesForCredential(cred.id);
  }
  console.log("Hourly device fetch completed");
}

// Track if cron job is already started to prevent duplicates
// Use global to persist across module reloads
declare global {
  var __cronJobStarted: boolean | undefined;
  var __cronTask: cron.ScheduledTask | null | undefined;
}

const cronJobStarted = global.__cronJobStarted ?? false;
const cronTask = global.__cronTask ?? null;

/**
 * Start the cron job to fetch devices every hour
 */
export function startCronJob() {
  // Prevent creating multiple cron jobs
  if (global.__cronJobStarted && global.__cronTask) {
    console.log("Cron job already started, skipping duplicate initialization");
    return;
  }

  // Stop existing task if any (shouldn't happen, but safety check)
  if (global.__cronTask) {
    global.__cronTask.stop();
  }

  // Run every hour at minute 0 (e.g., 09:00, 10:00, 11:00)
  global.__cronTask = cron.schedule("0 * * * *", async () => {
    await fetchAllDevices();
  });

  global.__cronJobStarted = true;

  // Also run immediately on startup
  fetchAllDevices();

  console.log("Cron job started - fetching devices every hour at minute 0");
}

