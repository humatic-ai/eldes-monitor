/**
 * ELDES Cloud API Client
 * 
 * Reimplementation of the Python eldes-cloud-api module in TypeScript
 * 
 * Original work: https://github.com/tanelvakker/eldes-cloud-api
 * 
 * This TypeScript implementation is inspired by and based on the excellent
 * work of tanelvakker. We extend our thanks for their contribution to the
 * ELDES ecosystem.
 */

export interface ELDESCredentials {
  username: string; // Email address
  password: string;
  hostDeviceId?: string; // Optional persistent device ID
}

export interface ELDESDevice {
  imei: string;
  deviceId?: string; // Alias for imei
  deviceName?: string;
  name?: string; // API uses "name"
  model?: string;
  firmwareVersion?: string;
  partitions?: PartitionStatus[];
}

export interface PartitionStatus {
  partitionId?: number;
  internalId?: number; // API uses "internalId"
  partitionName?: string;
  name?: string; // API uses "name"
  isArmed?: boolean;
  armed?: boolean; // API uses "armed"
  isReady?: boolean;
}

export interface TemperatureSensor {
  sensorId: number;
  sensorName?: string;
  temperature: number;
  minTemperature?: number;
  maxTemperature?: number;
}

export interface DeviceStatus {
  deviceId: string;
  imei?: string;
  partitions: PartitionStatus[];
  temperature?: number; // Primary/aggregate temperature for compatibility
  temperatureDetails?: TemperatureSensor[]; // Array of individual temperature sensors
  zones?: ZoneStatus[];
  rawData?: any;
}

export interface ZoneStatus {
  zoneId: number;
  zoneName?: string;
  isOpen: boolean;
  isTampered: boolean;
}

export interface DeviceListResponse {
  deviceListEntries: ELDESDevice[];
}

export class ELDESCloudAPI {
  private baseUrl = "https://cloud.eldesalarms.com:8083/api";
  private sessionToken: string | null = null;
  private refreshToken: string | null = null;
  private credentials: ELDESCredentials;
  private hostDeviceId: string;

  constructor(credentials: ELDESCredentials) {
    this.credentials = credentials;
    // Generate a persistent hostDeviceId if not provided
    // In production, this should be stored per credential
    this.hostDeviceId = credentials.hostDeviceId || this.generateHostDeviceId(credentials.username);
  }

  private generateHostDeviceId(username: string): string {
    // Generate a deterministic but unique ID based on username
    // In production, store this in the database per credential
    return `eldes-monitor-${Buffer.from(username).toString('base64').substring(0, 16)}`;
  }

  /**
   * Get request headers matching the Home Assistant implementation
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Requested-With": "XMLHttpRequest",
      "x-whitelable": "eldes",
      "Content-Type": "application/json; charset=UTF-8",
    };

    if (this.sessionToken) {
      headers["Authorization"] = `Bearer ${this.sessionToken}`;
    }

    return headers;
  }

  /**
   * Authenticate with ELDES Cloud API
   */
  async authenticate(): Promise<boolean> {
    try {
      // Ensure username is an email address (API requirement)
      const email = this.credentials.username;
      if (!email || !email.includes("@")) {
        throw new Error(`Invalid email address: "${email}". The username field must be an email address.`);
      }

      const loginBody = {
        email: email,
        password: this.credentials.password,
        hostDeviceId: this.hostDeviceId,
      };

      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(loginBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Authentication failed: ${response.status} ${errorText}`;
        
        // Provide helpful error message for common issues
        if (response.status === 401) {
          errorMessage += `\nPlease verify that:\n- The username field contains a valid email address (currently: "${email}")\n- The password is correct\n- The credentials are valid for ELDES Cloud API`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      this.sessionToken = data.token;
      this.refreshToken = data.refreshToken || null;

      if (!this.sessionToken) {
        throw new Error("No session token received");
      }

      return true;
    } catch (error) {
      console.error("ELDES API authentication error:", error);
      throw error;
    }
  }

  /**
   * Get list of devices associated with the account
   */
  async getDevices(): Promise<ELDESDevice[]> {
    if (!this.sessionToken) {
      await this.authenticate();
    }

    try {
      const response = await fetch(`${this.baseUrl}/device/list?showSupportMessages=true`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, re-authenticate
          await this.authenticate();
          return this.getDevices();
        }
        throw new Error(`Failed to fetch devices: ${response.status} ${response.statusText}`);
      }

      const data: DeviceListResponse = await response.json();
      const devices = data.deviceListEntries || [];
      
      // Normalize device data
      return devices.map((device) => ({
        imei: device.imei,
        deviceId: device.imei, // Use imei as deviceId for compatibility
        deviceName: device.name || device.deviceName,
        name: device.name,
        model: device.model,
        firmwareVersion: device.firmwareVersion,
        partitions: device.partitions?.map((p) => ({
          partitionId: p.internalId,
          internalId: p.internalId,
          partitionName: p.name,
          name: p.name,
          isArmed: p.armed,
          armed: p.armed,
          isReady: p.isReady,
        })),
      }));
    } catch (error) {
      console.error("ELDES API getDevices error:", error);
      throw error;
    }
  }

  /**
   * Get device info (additional details)
   */
  async getDeviceInfo(deviceId: string): Promise<any> {
    if (!this.sessionToken) {
      await this.authenticate();
    }

    try {
      const imei = deviceId;
      const response = await fetch(`${this.baseUrl}/device/info?imei=${imei}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.authenticate();
          return this.getDeviceInfo(deviceId);
        }
        throw new Error(`Failed to fetch device info: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("ELDES API getDeviceInfo error:", error);
      return null;
    }
  }

  /**
   * Get status of a specific device
   * Note: The actual API doesn't have a direct status endpoint
   * We use getDevices() and filter by imei/deviceId
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    if (!this.sessionToken) {
      await this.authenticate();
    }

    try {
      // Get all devices and find the one matching deviceId (imei)
      const devices = await this.getDevices();
      const device = devices.find((d) => d.imei === deviceId || d.deviceId === deviceId);

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Get temperature details (array of temperature sensor readings) and capture raw response
      let temperature: number | null = null;
      let temperatureDetails: TemperatureSensor[] = [];
      let temperatureRawResponse = null;
      
      try {
        // Fetch raw temperature response directly
        const tempResponse = await fetch(`${this.baseUrl}/device/temperatures?imei=${deviceId}`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ "": "", "pin": "" }),
        });
        
        if (tempResponse.ok) {
          temperatureRawResponse = await tempResponse.json();
          const tempData = temperatureRawResponse.temperatureDetailsList || temperatureRawResponse.temperatures || (Array.isArray(temperatureRawResponse) ? temperatureRawResponse : []);
          
          if (tempData.length > 0) {
            // Parse temperature sensors
            temperatureDetails = tempData.map((item: any) => ({
              sensorId: item.sensorId ?? item.id ?? 0,
              sensorName: item.sensorName || item.name || `Sensor ${item.sensorId ?? item.id ?? 0}`,
              temperature: typeof item.temperature === 'number' ? item.temperature : parseFloat(item.temperature || item.temp || item.value || item.t || 0),
              minTemperature: item.minTemperature !== undefined ? (typeof item.minTemperature === 'number' ? item.minTemperature : parseFloat(item.minTemperature)) : undefined,
              maxTemperature: item.maxTemperature !== undefined ? (typeof item.maxTemperature === 'number' ? item.maxTemperature : parseFloat(item.maxTemperature)) : undefined,
            }));
            
            // Use first sensor's temperature as primary (or average if multiple)
            if (temperatureDetails.length > 0) {
              temperature = temperatureDetails[0].temperature;
              console.log(`Temperature fetched for device ${deviceId}: ${temperatureDetails.length} sensor(s)`);
              temperatureDetails.forEach(sensor => {
                console.log(`  - Sensor ${sensor.sensorId} (${sensor.sensorName}): ${sensor.temperature}°C`);
              });
            }
          } else {
            console.log(`No temperature data available for device ${deviceId}`);
          }
        }
      } catch (error) {
        // Temperature fetch is optional - some devices may not support it
        console.warn(`Could not fetch temperature for device ${deviceId}:`, error);
      }

      // Try to get additional device info and capture raw response
      let deviceInfo = null;
      let deviceInfoRaw = null;
      try {
        const imei = deviceId;
        const deviceInfoResponse = await fetch(`${this.baseUrl}/device/info?imei=${imei}`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (deviceInfoResponse.ok) {
          deviceInfoRaw = await deviceInfoResponse.json();
          deviceInfo = deviceInfoRaw;
        }
      } catch (error) {
        // Device info is optional
        console.debug(`Could not fetch device info for device ${deviceId}:`, error);
      }

      // Get raw device list response (contains full device data)
      // We already have this from getDevices(), but let's capture it explicitly for completeness
      let deviceListRawResponse = null;
      try {
        const deviceListResponse = await fetch(`${this.baseUrl}/device/list?showSupportMessages=true`, {
          method: "GET",
          headers: this.getHeaders(),
        });
        if (deviceListResponse.ok) {
          deviceListRawResponse = await deviceListResponse.json();
        }
      } catch (error) {
        console.debug(`Could not fetch raw device list response for device ${deviceId}:`, error);
      }

      return {
        deviceId: device.imei || deviceId,
        imei: device.imei,
        partitions: device.partitions || [],
        temperature: temperature ?? undefined,
        temperatureDetails: temperatureDetails,
        zones: [],
        rawData: {
          // Store full raw API responses for future use
          deviceListResponse: deviceListRawResponse,
          deviceInfoResponse: deviceInfoRaw,
          temperatureResponse: temperatureRawResponse,
          // Also include processed data for backward compatibility
          device: device,
          deviceInfo: deviceInfo,
          temperatureDetails: temperatureDetails,
          // Store timestamp when data was fetched
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("ELDES API getDeviceStatus error:", error);
      throw error;
    }
  }

  /**
   * Get temperature readings from device
   * Returns array of temperature details (matching Home Assistant implementation)
   */
  async getTemperatures(deviceId: string): Promise<any[]> {
    if (!this.sessionToken) {
      await this.authenticate();
    }

    try {
      // API uses imei, not deviceId
      const imei = deviceId;
      const response = await fetch(`${this.baseUrl}/device/temperatures?imei=${imei}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ "": "", "pin": "" }), // Empty pin for now, matching HA implementation
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.authenticate();
          return this.getTemperatures(deviceId);
        }
        throw new Error(`Failed to fetch temperature: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Temperature API response for device", deviceId, ":", data);
      
      // Home Assistant returns temperatureDetailsList array
      const temperatureList = data.temperatureDetailsList || data.temperatures || (Array.isArray(data) ? data : []);
      
      return temperatureList;
    } catch (error) {
      console.error("ELDES API getTemperatures error:", error);
      return [];
    }
  }

  /**
   * Get temperature reading from device (single value for compatibility)
   */
  async getTemperature(deviceId: string): Promise<number | null> {
    try {
      const temperatures = await this.getTemperatures(deviceId);
      
      if (temperatures.length === 0) {
        return null;
      }
      
      // Get the first temperature value
      // Temperature details might have different structures
      const firstTemp = temperatures[0];
      const temp = firstTemp.temperature || firstTemp.temp || firstTemp.value || firstTemp.t || firstTemp;
      
      if (temp === null || temp === undefined) {
        return null;
      }
      
      return typeof temp === 'number' ? temp : parseFloat(temp);
    } catch (error) {
      console.error("ELDES API getTemperature error:", error);
      return null;
    }
  }

  /**
   * Get IMEI for a device by location name
   */
  private async getImei(location: string): Promise<string> {
    const devices = await this.getDevices();
    const device = devices.find((d) => d.deviceName === location || d.name === location);
    if (!device || !device.imei) {
      throw new Error(`Device with location "${location}" not found`);
    }
    return device.imei;
  }

  /**
   * Get partition index (internalId) for a partition by location and partition name
   */
  private async getPartitionIndex(location: string, partition: string): Promise<number> {
    const devices = await this.getDevices();
    const device = devices.find((d) => d.deviceName === location || d.name === location);
    if (!device) {
      throw new Error(`Device with location "${location}" not found`);
    }
    const partitionData = device.partitions?.find(
      (p) => p.partitionName === partition || p.name === partition
    );
    if (!partitionData || partitionData.internalId === undefined) {
      throw new Error(`Partition "${partition}" not found in location "${location}"`);
    }
    return partitionData.internalId;
  }

  /**
   * Check if partition is armed
   * Note: This requires location and partition name, not deviceId and partitionId
   */
  async isPartitionArmed(
    location: string,
    partition: string
  ): Promise<boolean> {
    try {
      const devices = await this.getDevices();
      const device = devices.find((d) => d.deviceName === location || d.name === location);
      if (!device) {
        return false;
      }
      const partitionData = device.partitions?.find(
        (p) => p.partitionName === partition || p.name === partition
      );
      return partitionData?.armed || partitionData?.isArmed || false;
    } catch (error) {
      console.error("ELDES API isPartitionArmed error:", error);
      return false;
    }
  }

  /**
   * Arm a partition
   * Note: API uses location/partition names and imei/partitionIndex
   */
  async armPartition(
    location: string,
    partition: string
  ): Promise<boolean> {
    if (!this.sessionToken) {
      await this.authenticate();
    }

    try {
      const imei = await this.getImei(location);
      const partitionIndex = await this.getPartitionIndex(location, partition);

      const response = await fetch(`${this.baseUrl}/device/action/arm`, {
          method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          imei: imei,
          partitionIndex: partitionIndex,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.authenticate();
          return this.armPartition(location, partition);
        }
        throw new Error(`Failed to arm partition: ${response.status} ${response.statusText}`);
      }

      // API returns 202 on success
      if (response.status === 202) {
      return true;
      }

      return response.ok;
    } catch (error) {
      console.error("ELDES API armPartition error:", error);
      throw error;
    }
  }

  /**
   * Disarm a partition
   * Note: API uses location/partition names and imei/partitionIndex
   */
  async disarmPartition(
    location: string,
    partition: string
  ): Promise<boolean> {
    if (!this.sessionToken) {
      await this.authenticate();
    }

    try {
      const imei = await this.getImei(location);
      const partitionIndex = await this.getPartitionIndex(location, partition);

      const response = await fetch(`${this.baseUrl}/device/action/disarm`, {
          method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          imei: imei,
          partitionIndex: partitionIndex,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.authenticate();
          return this.disarmPartition(location, partition);
        }
        throw new Error(`Failed to disarm partition: ${response.status} ${response.statusText}`);
      }

      // API returns 202 on success
      if (response.status === 202) {
      return true;
      }

      return response.ok;
    } catch (error) {
      console.error("ELDES API disarmPartition error:", error);
      throw error;
    }
  }

}

