import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ELDESCloudAPI } from "@/lib/eldes-api";
import { getCredentials } from "@/lib/session";

/**
 * GET - List all devices with latest status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const credentials = await getCredentials();
    if (!credentials) {
      console.log("[Devices API] No credentials found - unauthorized");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log("[Devices API] Authenticated as:", credentials.username);

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    if (refresh) {
      // Fetch fresh data from API using session credentials
      try {
        const api = new ELDESCloudAPI({
          username: credentials.username,
          password: credentials.password,
        });

          let devices;
          try {
            devices = await api.getDevices();
          } catch (apiError) {
            // Handle rate limiting gracefully
            if (apiError instanceof Error && apiError.message.includes("attempts.limit")) {
              console.warn(`[Devices API] Rate limit hit for ${credentials.username}, using cached data`);
              // Continue with cached data from database instead of failing
              // Fall through to return cached devices
            } else {
              throw apiError; // Re-throw other errors
            }
          }
          
          // Only process devices if we successfully fetched them
          if (devices) {

          for (const device of devices) {
            // Use imei as device_id (primary identifier)
            const deviceId = device.imei || device.deviceId;
            const deviceName = device.deviceName || device.name;
            
            // Skip if no device ID
            if (!deviceId) {
              console.warn("Skipping device without imei or deviceId:", device);
              continue;
            }
            
            // Get the credential_id from the session's credentials
            // Find the credential_id that matches the current session username
            const credential = db
              .prepare("SELECT id FROM eldes_credentials WHERE username = ? AND user_id = 1 LIMIT 1")
              .get(credentials.username) as { id: number } | undefined;
            
            const DEFAULT_CREDENTIAL_ID = credential?.id || 4; // Fallback to 4 if not found
            
            const existingDevice = db
              .prepare(
                "SELECT id FROM devices WHERE device_id = ?"
              )
              .get(deviceId) as any;

            let deviceDbId: number;

            if (existingDevice) {
              deviceDbId = existingDevice.id;
              db.prepare(
                "UPDATE devices SET device_name = ?, model = ?, firmware_version = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?"
              ).run(
                deviceName,
                device.model,
                device.firmwareVersion,
                deviceDbId
              );
            } else {
              const result = db
                .prepare(
                  "INSERT INTO devices (credential_id, device_id, device_name, model, firmware_version, last_seen) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
                )
                .run(
                  DEFAULT_CREDENTIAL_ID,
                  deviceId,
                  deviceName,
                  device.model,
                  device.firmwareVersion
                );
              deviceDbId = result.lastInsertRowid as number;
            }

            // Fetch and store status
            try {
              const status = await api.getDeviceStatus(deviceId);

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
              // Manual refresh also stores data (same as cron job)
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
                      fetchTimestamp // Explicit timestamp for data collection
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
          } // End of if (devices) block
        } catch (error) {
          // Log error but continue to return cached data
          if (error instanceof Error && error.message.includes("attempts.limit")) {
            console.warn(`[Devices API] Rate limit error for ${credentials.username}, returning cached data`);
          } else {
            console.error(`[Devices API] Error fetching devices:`, error);
          }
          // Continue to return cached devices from database
        }
    }

    // Get the credential_id for the current user
    const credential = db
      .prepare("SELECT id FROM eldes_credentials WHERE username = ? AND user_id = 1 LIMIT 1")
      .get(credentials.username) as { id: number } | undefined;
    
    if (!credential) {
      return NextResponse.json({ devices: [] });
    }

    // Get all devices with latest status - filtered by credential_id
    const devices = db
      .prepare(`
        SELECT 
          d.id,
          d.device_id,
          d.device_name,
          d.model,
          d.firmware_version,
          d.last_seen,
          (
            SELECT is_armed 
            FROM device_status 
            WHERE device_id = d.id 
            ORDER BY fetched_at DESC 
            LIMIT 1
          ) as is_armed,
          (
            SELECT temperature 
            FROM device_status 
            WHERE device_id = d.id 
            ORDER BY fetched_at DESC 
            LIMIT 1
          ) as temperature,
          (
            SELECT fetched_at 
            FROM device_status 
            WHERE device_id = d.id 
            ORDER BY fetched_at DESC 
            LIMIT 1
          ) as last_status_update
        FROM devices d
        WHERE d.credential_id = ?
        ORDER BY d.last_seen DESC
      `)
      .all(credential.id);

    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

