import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ELDESCloudAPI } from "@/lib/eldes-api";
import { getCredentials } from "@/lib/session";

/**
 * GET - Get detailed status for a specific device
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    // Check authentication
    const credentials = await getCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { deviceId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "1h";

    // Get device info
    const device = db
      .prepare(
        "SELECT d.* FROM devices d WHERE d.device_id = ?"
      )
      .get(deviceId) as any;

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Get latest status
    const statuses = db
      .prepare(
        "SELECT * FROM device_status WHERE device_id = ? ORDER BY fetched_at DESC LIMIT 10"
      )
      .all(device.id);

    // Build SQL query based on period
    let timeFilter = "";
    switch (period) {
      case "1h":
        timeFilter = "recorded_at > datetime('now', '-1 hour')";
        break;
      case "24h":
        timeFilter = "recorded_at > datetime('now', '-1 day')";
        break;
      case "1w":
        timeFilter = "recorded_at > datetime('now', '-7 days')";
        break;
      case "1m":
        timeFilter = "recorded_at > datetime('now', '-1 month')";
        break;
      case "1y":
        timeFilter = "recorded_at > datetime('now', '-1 year')";
        break;
      case "2y":
        timeFilter = "recorded_at > datetime('now', '-2 years')";
        break;
      case "all":
      default:
        timeFilter = "1=1"; // All time
        break;
    }

    // Get counts for all periods
    const periodCounts: Record<string, number> = {};
    const periods = [
      { key: "1h", filter: "recorded_at > datetime('now', '-1 hour')" },
      { key: "24h", filter: "recorded_at > datetime('now', '-1 day')" },
      { key: "1w", filter: "recorded_at > datetime('now', '-7 days')" },
      { key: "1m", filter: "recorded_at > datetime('now', '-1 month')" },
      { key: "1y", filter: "recorded_at > datetime('now', '-1 year')" },
      { key: "2y", filter: "recorded_at > datetime('now', '-2 years')" },
      { key: "all", filter: "1=1" },
    ];

    for (const p of periods) {
      const count = db
        .prepare(
          `SELECT COUNT(*) as count FROM temperature_history WHERE device_id = ? AND ${p.filter} AND sensor_id IS NOT NULL`
        )
        .get(device.id) as any;
      periodCounts[p.key] = count?.count || 0;
    }

    // Get temperature history based on period - grouped by sensor
    const temperatureHistory = db
      .prepare(
        `SELECT sensor_id, sensor_name, temperature, min_temperature, max_temperature, recorded_at 
         FROM temperature_history 
         WHERE device_id = ? AND ${timeFilter} 
         ORDER BY recorded_at ASC`
      )
      .all(device.id);
    
    // Get latest temperature sensors from database
    const latestTemperatureSensors = db
      .prepare(
        `SELECT sensor_id, sensor_name, temperature, min_temperature, max_temperature, recorded_at
         FROM temperature_history
         WHERE device_id = ? AND sensor_id IS NOT NULL
         AND recorded_at = (SELECT MAX(recorded_at) FROM temperature_history th2 WHERE th2.device_id = temperature_history.device_id AND th2.sensor_id = temperature_history.sensor_id)
         ORDER BY sensor_id`
      )
      .all(device.id);
    
    // Also check latest status rawData for temperatureDetails (in case not yet in history)
    const latestStatus = statuses[0] as any;
    const latestStatusRawData = latestStatus?.raw_data ? JSON.parse(latestStatus.raw_data) : null;
    const latestTempDetails = latestStatusRawData?.temperatureDetails;
    
    // Combine database sensors with latest rawData sensors (prefer rawData as it's most current)
    const allSensors = new Map();
    
    // Add sensors from database
    latestTemperatureSensors.forEach((s: any) => {
      allSensors.set(s.sensor_id, {
        sensorId: s.sensor_id,
        sensorName: s.sensor_name,
        temperature: s.temperature,
        minTemperature: s.min_temperature,
        maxTemperature: s.max_temperature,
        lastUpdate: s.recorded_at,
      });
    });
    
    // Add/update with latest from rawData (more current)
    if (latestTempDetails && Array.isArray(latestTempDetails)) {
      latestTempDetails.forEach((sensor: any) => {
        allSensors.set(sensor.sensorId, {
          sensorId: sensor.sensorId,
          sensorName: sensor.sensorName,
          temperature: sensor.temperature,
          minTemperature: sensor.minTemperature,
          maxTemperature: sensor.maxTemperature,
          lastUpdate: latestStatus?.fetched_at,
        });
      });
    }
    
    const combinedSensors = Array.from(allSensors.values()).sort((a, b) => (a.sensorId ?? 0) - (b.sensorId ?? 0));

    // Get all unique partitions with their latest status
    const partitions = db
      .prepare(
        `SELECT DISTINCT partition_id, partition_name, 
         (SELECT is_armed FROM device_status ds2 
          WHERE ds2.device_id = ? AND ds2.partition_id = ds1.partition_id 
          ORDER BY ds2.fetched_at DESC LIMIT 1) as is_armed,
         (SELECT is_ready FROM device_status ds3 
          WHERE ds3.device_id = ? AND ds3.partition_id = ds1.partition_id 
          ORDER BY ds3.fetched_at DESC LIMIT 1) as is_ready
         FROM device_status ds1 
         WHERE device_id = ? AND partition_id IS NOT NULL
         ORDER BY partition_id`
      )
      .all(device.id, device.id, device.id);

    return NextResponse.json({
      device: {
        id: device.device_id,
        name: device.device_name,
        model: device.model,
        firmwareVersion: device.firmware_version,
        lastSeen: device.last_seen,
      },
      partitions: partitions.map((p: any) => ({
        partitionId: p.partition_id,
        partitionName: p.partition_name,
        isArmed: p.is_armed === 1,
        isReady: p.is_ready === 1,
      })),
      statuses: statuses.map((s: any) => {
        const rawData = s.raw_data ? JSON.parse(s.raw_data) : null;
        // Extract temperatureDetails from rawData if available
        const tempDetails = rawData?.temperatureDetails || null;
        
        return {
          partitionId: s.partition_id,
          partitionName: s.partition_name,
          isArmed: s.is_armed === 1,
          isReady: s.is_ready === 1,
          temperature: s.temperature,
          zones: s.zone_status ? JSON.parse(s.zone_status) : [],
          rawData: rawData,
          temperatureDetails: tempDetails,
          fetchedAt: s.fetched_at,
        };
      }),
      temperatureSensors: combinedSensors,
      temperatureHistory: temperatureHistory.map((t: any) => ({
        sensorId: t.sensor_id,
        sensorName: t.sensor_name,
        temperature: t.temperature,
        minTemperature: t.min_temperature,
        maxTemperature: t.max_temperature,
        recordedAt: t.recorded_at,
      })),
      periodCounts: periodCounts,
    });
  } catch (error) {
    console.error("Error fetching device details:", error);
    return NextResponse.json(
      { error: "Failed to fetch device details" },
      { status: 500 }
    );
  }
}

