import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ELDESCloudAPI } from "@/lib/eldes-api";
import { getCredentials } from "@/lib/session";
import { z } from "zod";

const controlSchema = z.object({
  action: z.enum(["arm", "disarm"]),
  partitionId: z.number().optional(),
  partitionName: z.string().optional(),
});

/**
 * POST - Control device (arm/disarm)
 */
export async function POST(
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
    const body = await request.json();
    const data = controlSchema.parse(body);

    // Get device
    const device = db
      .prepare(
        "SELECT d.* FROM devices d WHERE d.device_id = ?"
      )
      .get(deviceId) as any;

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Create API client with session credentials
    const api = new ELDESCloudAPI({
      username: credentials.username,
      password: credentials.password,
    });

    // Get device list to find location name and partition name
    const devices = await api.getDevices();
    const deviceInfo = devices.find((d) => d.imei === deviceId || d.deviceId === deviceId);
    
    if (!deviceInfo) {
      return NextResponse.json({ error: "Device not found in API" }, { status: 404 });
    }

    // Use device name as location
    const location = deviceInfo.deviceName || deviceInfo.name || device.device_name;
    
    // Find partition by ID or use first partition
    let partitionName: string;
    if (data.partitionName) {
      partitionName = data.partitionName;
    } else if (data.partitionId && deviceInfo.partitions) {
      const partition = deviceInfo.partitions.find(
        (p) => (p.partitionId === data.partitionId) || (p.internalId === data.partitionId)
      );
      if (!partition) {
        return NextResponse.json(
          { error: `Partition ${data.partitionId} not found` },
          { status: 404 }
        );
      }
      partitionName = partition.partitionName || partition.name || `Partition ${data.partitionId}`;
    } else if (deviceInfo.partitions && deviceInfo.partitions.length > 0) {
      // Use first partition as default
      partitionName = deviceInfo.partitions[0].partitionName || deviceInfo.partitions[0].name || "Partition 1";
    } else {
      return NextResponse.json(
        { error: "No partitions found for device" },
        { status: 404 }
      );
    }

    // Perform action
    let success = false;
    if (data.action === "arm") {
      success = await api.armPartition(location, partitionName);
    } else if (data.action === "disarm") {
      success = await api.disarmPartition(location, partitionName);
    }

    if (success) {
      // Fetch updated status
      const status = await api.getDeviceStatus(deviceId);

      // Store updated status
      for (const partition of status.partitions) {
        db.prepare(
          "INSERT INTO device_status (device_id, partition_id, partition_name, is_armed, is_ready, temperature, zone_status, raw_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          device.id,
          partition.partitionId,
          partition.partitionName,
          partition.isArmed ? 1 : 0,
          partition.isReady ? 1 : 0,
          status.temperature || null,
          JSON.stringify(status.zones || []),
          JSON.stringify(status.rawData || {})
        );
      }

      return NextResponse.json({
        success: true,
        message: `Device ${data.action}ed successfully`,
      });
    } else {
      return NextResponse.json(
        { error: `Failed to ${data.action} device` },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error controlling device:", error);
    return NextResponse.json(
      { error: "Failed to control device" },
      { status: 500 }
    );
  }
}

