"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Shield,
  Thermometer,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  Clock,
  Cpu,
  Phone,
  Signal,
  Battery,
  Wifi,
  WifiOff,
  Camera,
  Activity,
  Lock,
  Unlock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, startOfHour, startOfDay, startOfWeek, startOfMonth, startOfYear, addHours, addDays, addWeeks, addMonths, addYears } from "date-fns";

interface DeviceStatus {
  partitionId: number;
  partitionName: string | null;
  isArmed: boolean;
  isReady: boolean;
  temperature: number | null;
  zones: any[];
  rawData?: any;
  temperatureDetails?: any[];
  fetchedAt: string;
}

interface Partition {
  partitionId: number;
  partitionName: string | null;
  isArmed: boolean;
  isReady: boolean;
}

interface TemperatureSensor {
  sensorId: number | null;
  sensorName: string | null;
  temperature: number;
  minTemperature?: number | null;
  maxTemperature?: number | null;
  lastUpdate?: string;
}

interface TemperatureData {
  sensorId: number | null;
  sensorName: string | null;
  temperature: number;
  minTemperature?: number | null;
  maxTemperature?: number | null;
  recordedAt: string;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.deviceId as string;

  const [device, setDevice] = useState<any>(null);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [statuses, setStatuses] = useState<DeviceStatus[]>([]);
  const [temperatureSensors, setTemperatureSensors] = useState<TemperatureSensor[]>([]);
  const [temperatureHistory, setTemperatureHistory] = useState<
    TemperatureData[]
  >([]);
  // Load period from localStorage or default to "1h"
  const getStoredPeriod = (): "1h" | "24h" | "1w" | "1m" | "1y" | "2y" | "all" => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("eldes-temperature-period");
      if (stored && ["1h", "24h", "1w", "1m", "1y", "2y", "all"].includes(stored)) {
        return stored as "1h" | "24h" | "1w" | "1m" | "1y" | "2y" | "all";
      }
    }
    return "1h";
  };

  const [temperaturePeriod, setTemperaturePeriod] = useState<"1h" | "24h" | "1w" | "1m" | "1y" | "2y" | "all">(getStoredPeriod());
  const [periodCounts, setPeriodCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false); // Separate loading state for period changes
  const [controlling, setControlling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const fetchDeviceDetails = async (period?: string, isPeriodChange: boolean = false) => {
    // Only use main loading state if it's the initial load, not period changes
    if (!isPeriodChange) {
      setLoading(true);
    }
    try {
      const periodParam = period || temperaturePeriod;
      const response = await fetch(`/eldes/api/devices/${deviceId}?period=${periodParam}`, {
        credentials: "include",
      });
      if (!response.ok) {
        // If unauthorized, redirect to login with current path as redirect parameter
        if (response.status === 401) {
          const currentPath = window.location.pathname.replace("/eldes", "") || "/";
          // Use __ instead of / to avoid URL encoding (matches middleware format)
          const redirectPath = currentPath.replace(/\//g, "__").replace(/^__/, "");
          window.location.href = `/eldes/login?redirect=${redirectPath}`;
          return;
        }
        // Try to extract error message from response
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setDevice(data.device);
      setPartitions(data.partitions || []);
      setStatuses(data.statuses || []);
      // Process temperature sensors: convert thresholds (min/max) but keep temperature as-is
      const processedSensors = (data.temperatureSensors || []).map((sensor: any) => ({
        ...sensor,
        // Temperature is used as-is (1:1), no conversion
        temperature: sensor.temperature,
        // minTemperature and maxTemperature are thresholds - need conversion (multiply by 10)
        minTemperature: convertTemperatureThreshold(sensor.minTemperature),
        maxTemperature: convertTemperatureThreshold(sensor.maxTemperature),
      }));
      setTemperatureSensors(processedSensors);
      setTemperatureHistory(data.temperatureHistory || []);
      if (data.periodCounts) {
        setPeriodCounts(data.periodCounts);
      }
    } catch (error) {
      console.error("Error fetching device details:", error);
      if (error instanceof Error) {
        // Check if it's an ELDES API error
        if (error.message.includes("ELDES") || error.message.includes("authentication") || error.message.includes("rate limit") || error.message.includes("attempts")) {
          toast.error(error.message, {
            duration: 6000,
          });
        } else if (!error.message.includes("401")) {
          // Don't show toast for 401 (handled by redirect)
          toast.error(error.message);
        }
      }
    } finally {
      if (!isPeriodChange) {
        setLoading(false);
      }
    }
  };

  // Fetch fresh data from external API and then load device details
  const refreshAndFetchDeviceDetails = async (period?: string) => {
    try {
      // First, fetch fresh data from external API (same as refresh button)
      const refreshResponse = await fetch(`/eldes/api/devices?refresh=true`, {
        credentials: "include",
      });
      // If unauthorized, redirect to login
      if (!refreshResponse.ok && refreshResponse.status === 401) {
        const currentPath = window.location.pathname.replace("/eldes", "") || "/";
        const redirectPath = currentPath.replace(/\//g, "__").replace(/^__/, "");
        window.location.href = `/eldes/login?redirect=${redirectPath}`;
        return;
      }
      // Then fetch device details from database
      await fetchDeviceDetails(period);
    } catch (error) {
      console.error("Error refreshing from external API:", error);
      if (error instanceof Error) {
        // Check if it's an ELDES API error
        if (error.message.includes("ELDES") || error.message.includes("authentication") || error.message.includes("rate limit") || error.message.includes("attempts")) {
          toast.error(error.message, {
            duration: 6000,
          });
        }
      }
      // If refresh fails, still try to fetch from database
      await fetchDeviceDetails(period);
    }
  };

  // On page load, fetch fresh data from external API
  useEffect(() => {
    refreshAndFetchDeviceDetails();
  }, [deviceId]);

  // Auto-refresh based on selected period
  useEffect(() => {
    // Determine refresh interval based on period
    // If "1h" period is selected, refresh every 10 minutes
    // Otherwise, refresh every 1 hour
    const refreshInterval = temperaturePeriod === "1h" 
      ? 10 * 60 * 1000  // 10 minutes
      : 60 * 60 * 1000; // 1 hour

    const interval = setInterval(() => {
      // Auto-refresh: fetch fresh data from external API
      refreshAndFetchDeviceDetails();
    }, refreshInterval);

    // Cleanup interval on unmount or period change
    return () => clearInterval(interval);
  }, [temperaturePeriod, deviceId]);

  const handlePeriodChange = async (newPeriod: "1h" | "24h" | "1w" | "1m" | "1y" | "2y" | "all", e?: React.MouseEvent) => {
    // Prevent any default behavior (e.g., form submission, navigation)
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Don't do anything if already on this period
    if (newPeriod === temperaturePeriod) {
      return;
    }
    
    // Store scroll position before updating
    const scrollPosition = window.scrollY;
    
    // Update period state immediately for UI responsiveness
    setTemperaturePeriod(newPeriod);
    
    // Store in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("eldes-temperature-period", newPeriod);
    }
    
    // Use separate loading state for period changes (doesn't show full page loader)
    setPeriodLoading(true);
    
    try {
      await fetchDeviceDetails(newPeriod, true);
    } finally {
      setPeriodLoading(false);
      // Restore scroll position after data loads
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
      });
    }
  };

  /**
   * Convert temperature threshold from device format to actual temperature
   * Device stores threshold values like 2.6 for 26°C, 1.2 for 12°C (multiply by 10)
   * This is ONLY for minTemperature and maxTemperature thresholds
   */
  const convertTemperatureThreshold = (temp: number | null | undefined): number | null => {
    if (temp === null || temp === undefined) return null;
    return temp * 10;
  };

  /**
   * Check if temperature is within valid range based on sensor thresholds
   * Values outside minTemperature-maxTemperature range are considered abnormal/alarm
   * Supports negative values and different thresholds per sensor
   */
  const isTemperatureValid = (temp: number | null, minTemp: number | null = null, maxTemp: number | null = null): boolean => {
    if (temp === null) return false;
    // If no thresholds provided, consider all values valid (fallback)
    if (minTemp === null && maxTemp === null) return true;
    // Check if temperature is within the threshold range
    // Range is between minTemp and maxTemp (inclusive)
    if (minTemp !== null && maxTemp !== null) {
      // Normal case: minTemp <= maxTemp (e.g., 20 to 60)
      if (minTemp <= maxTemp) {
        // Temperature must be >= minTemp AND <= maxTemp to be valid
        const isValid = temp >= minTemp && temp <= maxTemp;
        return isValid;
      }
      // Edge case: minTemp > maxTemp - handle it by checking if temp is outside the reversed range
      return temp >= maxTemp && temp <= minTemp;
    }
    // Only minTemp provided - temperature must be >= minTemp
    if (minTemp !== null) {
      return temp >= minTemp;
    }
    // Only maxTemp provided - temperature must be <= maxTemp
    if (maxTemp !== null) {
      return temp <= maxTemp;
    }
    return true;
  };

  const handleControl = async (action: "arm" | "disarm", partitionId = 1) => {
    if (!confirm(`Are you sure you want to ${action} this device?`)) {
      return;
    }

    setControlling(true);
    try {
      const response = await fetch(`/eldes/api/devices/${deviceId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ action, partitionId }),
      });

      if (response.ok) {
        // Refresh device data after control action
        await fetch(`/eldes/api/devices?refresh=true`, {
          credentials: "include",
        });
        await fetchDeviceDetails();
        toast.success(`Device ${action}ed successfully`);
        router.push("/");
      } else {
        const error = await response.json();
        const errorMessage = error.error || "Failed to control device";
        toast.error(errorMessage, {
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Error controlling device:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to control device";
      toast.error(errorMessage, {
        duration: 6000,
      });
    } finally {
      setControlling(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/eldes/api/devices?refresh=true`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to refresh devices (${response.status})`;
        toast.error(errorMessage, {
          duration: 6000,
        });
        return;
      }
      await fetchDeviceDetails();
      toast.success("Device data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh devices";
      toast.error(errorMessage, {
        duration: 6000,
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background relative flex-1" style={{ minHeight: 'calc(100vh - 52px - 91px)' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <RefreshCw 
            className="w-10 h-10 text-accent animate-spin" 
            style={{ 
              transformOrigin: 'center center',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }} 
          />
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="bg-background relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            Device not found
          </h2>
          <Link
            href="/"
              className="text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            Back to Dashboard
          </Link>
          </div>
        </div>
      </div>
    );
  }

  const latestStatus = statuses[0];
  
  // Extract temperatureDetails from latest status rawData if available (most current)
  const latestTempDetails = latestStatus?.rawData?.temperatureDetails || latestStatus?.temperatureDetails;
  if (latestTempDetails && Array.isArray(latestTempDetails) && temperatureSensors.length === 0) {
    // If we have temp details in rawData but not in temperatureSensors, use them
    const sensorsFromRawData = latestTempDetails.map((sensor: any) => {
      // Temperature is used as-is (1:1), no conversion
      const rawTemp = typeof sensor.temperature === 'number' ? sensor.temperature : parseFloat(sensor.temperature || 0);
      // minTemperature and maxTemperature are thresholds - need conversion (multiply by 10)
      const rawMin = sensor.minTemperature !== undefined ? (typeof sensor.minTemperature === 'number' ? sensor.minTemperature : parseFloat(sensor.minTemperature)) : null;
      const rawMax = sensor.maxTemperature !== undefined ? (typeof sensor.maxTemperature === 'number' ? sensor.maxTemperature : parseFloat(sensor.maxTemperature)) : null;
      return {
      sensorId: sensor.sensorId ?? sensor.id ?? null,
      sensorName: sensor.sensorName || sensor.name || null,
        temperature: rawTemp, // Use as-is, no conversion
        minTemperature: convertTemperatureThreshold(rawMin), // Convert threshold
        maxTemperature: convertTemperatureThreshold(rawMax), // Convert threshold
      lastUpdate: latestStatus.fetchedAt,
      };
    });
    setTemperatureSensors(sensorsFromRawData);
  }
  
  // Create a map of sensorId -> sensorName from current sensors (most reliable source)
  const sensorNameMap = new Map<number | null, string>();
  temperatureSensors.forEach(sensor => {
    if (sensor.sensorId !== null && sensor.sensorId !== undefined && sensor.sensorName) {
      sensorNameMap.set(sensor.sensorId, sensor.sensorName);
    }
  });
  
  // Helper function to parse SQLite timestamps as UTC
  // SQLite returns timestamps without timezone info, but they are stored as UTC
  const parseSQLiteTimestamp = (timestamp: string): number => {
    if (!timestamp) return new Date().getTime();
    // If already has timezone info, use as-is
    if (timestamp.endsWith('Z') || timestamp.includes('+') || timestamp.includes('-', 10)) {
      return new Date(timestamp).getTime();
    }
    // SQLite format: "YYYY-MM-DD HH:MM:SS" -> convert to ISO with UTC
    const isoString = timestamp.includes(' ') ? timestamp.replace(' ', 'T') + 'Z' : timestamp + 'Z';
    return new Date(isoString).getTime();
  };

  // Group temperature history by sensor (convert temperatures)
  const historyBySensor = temperatureHistory.reduce((acc, reading) => {
    const sensorId = reading.sensorId;
    // Use sensor name from current sensors if available, otherwise from history, otherwise fallback
    const sensorName = sensorId !== null && sensorId !== undefined && sensorNameMap.has(sensorId)
      ? sensorNameMap.get(sensorId)!
      : (reading.sensorName || (sensorId !== null && sensorId !== undefined ? `Sensor ${sensorId}` : null));
    
    if (sensorName === null) return acc; // Skip if we can't identify the sensor
    
    const sensorKey = sensorId ?? 'unknown';
    if (!acc[sensorKey]) {
      acc[sensorKey] = {
        sensorId: sensorId,
        sensorName: sensorName,
        data: [],
      };
    }
    
        // Temperature from history is stored as-is (1:1), no conversion needed
    acc[sensorKey].data.push({
          temperature: reading.temperature || 0,
      timestamp: reading.recordedAt,
          timestampMs: parseSQLiteTimestamp(reading.recordedAt),
    });
    return acc;
  }, {} as Record<string | number, { sensorId: number | null; sensorName: string; data: Array<{ temperature: number; timestamp: string; timestampMs: number }> }>);
  
  // Create time-normalized chart data
  // First, determine the time range and interval based on period
  const now = new Date();
  let startTime: Date;
  let endTime: Date;
  let intervalMs: number;
  let getTimeBucket: (date: Date) => Date;
  let formatTimeLabel: (date: Date) => string;
  
  // Collect all timestamps first to determine actual data range
  const allTimestamps = Object.values(historyBySensor).flatMap(sensor => 
    sensor.data.map(d => d.timestampMs)
  );
  // For "all" period, use actual data range; for others, calculate from all data
  const dataMinMs = allTimestamps.length > 0 ? Math.min(...allTimestamps) : now.getTime();
  const dataMaxMs = allTimestamps.length > 0 ? Math.max(...allTimestamps) : now.getTime();
  
  if (temperaturePeriod === "1h") {
    // Exactly 1 hour back from now, rounded down at start, rounded up at end
    const rawStartTime = new Date(now.getTime() - 60 * 60 * 1000);
    // Round down to nearest 10 minutes at beginning
    startTime = new Date(rawStartTime);
    startTime.setMinutes(Math.floor(startTime.getMinutes() / 10) * 10, 0, 0);
    // Round up to nearest 10 minutes at end
    endTime = new Date(now);
    endTime.setMinutes(Math.ceil(endTime.getMinutes() / 10) * 10, 0, 0);
    intervalMs = 60 * 60 * 1000; // 1 hour
    getTimeBucket = (date) => startOfHour(date);
    formatTimeLabel = (date) => format(date, "HH:mm");
  } else if (temperaturePeriod === "24h") {
    // Exactly 24 hours back from now
    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    endTime = now;
    intervalMs = 60 * 60 * 1000; // 1 hour intervals
    getTimeBucket = (date) => startOfHour(date);
    formatTimeLabel = (date) => format(date, "HH:mm");
  } else if (temperaturePeriod === "1w") {
    // Exactly 7 days back from now
    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    endTime = now;
    intervalMs = 24 * 60 * 60 * 1000; // 1 day intervals
    getTimeBucket = (date) => startOfDay(date);
    formatTimeLabel = (date) => format(date, "MMM d, yyyy"); // Day, month, year
  } else if (temperaturePeriod === "1m") {
    // Exactly 30 days back from now
    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    endTime = now;
    intervalMs = 24 * 60 * 60 * 1000; // 1 day intervals
    getTimeBucket = (date) => startOfDay(date);
    formatTimeLabel = (date) => format(date, "MMM d, yyyy"); // Day, month, year
  } else if (temperaturePeriod === "1y") {
    // Exactly 365 days back from now
    startTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    endTime = now;
    intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week intervals
    getTimeBucket = (date) => startOfWeek(date);
    formatTimeLabel = (date) => format(date, "MMM d, yyyy"); // Day, month, year
  } else if (temperaturePeriod === "2y") {
    // Exactly 2 years (730 days) back from now
    startTime = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
    endTime = now;
    intervalMs = 30 * 24 * 60 * 60 * 1000; // ~1 month intervals
    getTimeBucket = (date) => startOfMonth(date);
    formatTimeLabel = (date) => format(date, "MMM yyyy"); // Month, year
  } else { // "all"
    // Use actual first and last data points
    startTime = new Date(dataMinMs);
    endTime = new Date(dataMaxMs);
    intervalMs = 30 * 24 * 60 * 60 * 1000; // ~1 month intervals
    getTimeBucket = (date) => startOfMonth(date);
    formatTimeLabel = (date) => format(date, "MMM d, HH:mm");
  }
  
  // Generate time buckets from start to end
  const timeBuckets: Date[] = [];
  let currentBucket = getTimeBucket(startTime);
  
  while (currentBucket <= endTime) {
    timeBuckets.push(new Date(currentBucket));
    if (temperaturePeriod === "1h") {
      currentBucket = addHours(currentBucket, 1);
    } else if (temperaturePeriod === "24h") {
      currentBucket = addHours(currentBucket, 1);
    } else if (temperaturePeriod === "1w") {
      currentBucket = addDays(currentBucket, 1);
    } else if (temperaturePeriod === "1m") {
      currentBucket = addDays(currentBucket, 1);
    } else if (temperaturePeriod === "1y") {
      currentBucket = addWeeks(currentBucket, 1);
    } else if (temperaturePeriod === "2y") {
      currentBucket = addMonths(currentBucket, 1);
    } else {
      currentBucket = addMonths(currentBucket, 1);
    }
  }
  
  // Create chart data using actual measurement timestamps
  // Data points are positioned at their actual measurement times, not bucket times
  // Filter timestamps within the exact period range
  const startTimeMs = startTime.getTime();
  const endTimeMs = endTime.getTime();
  const filteredTimestamps = allTimestamps
    .filter(ts => ts >= startTimeMs && ts <= endTimeMs)
    .sort((a, b) => a - b);
  
  // Create data points for each actual measurement time
  // Data points are positioned at their actual measurement times, not bucket times
  const combinedChartData = filteredTimestamps.map(timestampMs => {
    const measurementDate = new Date(timestampMs);
    const point: any = {
      time: formatTimeLabel(measurementDate), // Display label
      timestamp: measurementDate.toISOString(), // ISO string for reference
      timestampMs: timestampMs, // ACTUAL MEASUREMENT TIME - used for x-axis positioning
    };
    
    // For each sensor, find the reading closest to this timestamp (within a small tolerance)
    // For exact matches, use that reading; otherwise use the closest previous reading
    Object.values(historyBySensor).forEach(sensor => {
      if (sensor.sensorName) {
        // Find exact match first
        const exactMatch = sensor.data.find(d => d.timestampMs === timestampMs);
        if (exactMatch) {
          point[sensor.sensorName] = exactMatch.temperature;
          point[`${sensor.sensorName}_timestamp`] = exactMatch.timestamp;
        } else {
          // Find the closest previous reading (for interpolation/continuity)
          const previousReadings = sensor.data.filter(d => d.timestampMs <= timestampMs);
          if (previousReadings.length > 0) {
            const closestReading = previousReadings.reduce((closest, current) => 
              current.timestampMs > closest.timestampMs ? current : closest
            );
            // Only use if within reasonable time window (e.g., 1 hour for hourly charts)
            const timeDiff = timestampMs - closestReading.timestampMs;
            if (timeDiff <= intervalMs) {
              point[sensor.sensorName] = closestReading.temperature;
              point[`${sensor.sensorName}_timestamp`] = closestReading.timestamp;
            } else {
              point[sensor.sensorName] = null;
            }
          } else {
            point[sensor.sensorName] = null;
          }
        }
      }
    });
    
    return point;
  });
  
  // Get sensor names for chart lines - prioritize current sensors, then history
  let sensorNames: string[] = [];
  
  // First, add all current sensors (most reliable)
  if (temperatureSensors.length > 0) {
    sensorNames = temperatureSensors
      .filter(sensor => sensor.sensorName) // Only include sensors with names
      .map(sensor => sensor.sensorName!);
  }
  
  // Then add any from history that aren't in current sensors
  Object.values(historyBySensor).forEach(sensor => {
    if (sensor.sensorName && !sensorNames.includes(sensor.sensorName)) {
      sensorNames.push(sensor.sensorName);
    }
  });
  
  // Sort sensor names by current temperature (high to low) for legend
  sensorNames.sort((a, b) => {
    const sensorA = temperatureSensors.find(s => s.sensorName === a);
    const sensorB = temperatureSensors.find(s => s.sensorName === b);
    const tempA = sensorA?.temperature ?? -Infinity;
    const tempB = sensorB?.temperature ?? -Infinity;
    return tempB - tempA; // Descending order (high to low)
  });
  
  // Add current values from API to chart (for display only, not stored in DB)
  // Add as a new data point at the current/fetched time
  if (temperatureSensors.length > 0) {
    const currentTimestamp = latestStatus?.fetchedAt || new Date().toISOString();
    const currentTimestampMs = parseSQLiteTimestamp(currentTimestamp);
    
    // Check if we already have a data point at this exact time
    const existingPoint = combinedChartData.find(d => d.timestampMs === currentTimestampMs);
    
    if (existingPoint) {
      // Update existing point with current values
    temperatureSensors.forEach(sensor => {
      if (sensor.sensorName) {
          existingPoint[sensor.sensorName] = sensor.temperature;
          existingPoint[`${sensor.sensorName}_timestamp`] = currentTimestamp;
      }
    });
      existingPoint.time = formatTimeLabel(new Date(currentTimestampMs)) + " (now)";
    } else {
      // Create new data point at current time
      const currentDate = new Date(currentTimestampMs);
      const currentPoint: any = {
        time: formatTimeLabel(currentDate) + " (now)",
        timestamp: currentTimestamp,
        timestampMs: currentTimestampMs,
      };
      
      temperatureSensors.forEach(sensor => {
        if (sensor.sensorName) {
          currentPoint[sensor.sensorName] = sensor.temperature;
          currentPoint[`${sensor.sensorName}_timestamp`] = currentTimestamp;
        }
      });
      
      // Add to chart data and sort by timestamp
      combinedChartData.push(currentPoint);
      combinedChartData.sort((a, b) => a.timestampMs - b.timestampMs);
    }
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto px-3 sm:px-5 lg:px-6 py-5 max-w-container" style={{ paddingTop: 'calc(1.25rem + 56px)' }}>
        {/* Page Header */}
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary mb-3 transition-colors text-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-1.5">
                {device.name || deviceId}
              </h1>
              <div className="text-text-secondary text-sm space-y-0.5">
                {device.model && <p>{device.model}</p>}
                <div className="flex flex-wrap gap-3 text-xs">
                  <span>Device ID: {deviceId}</span>
                  {device.firmwareVersion && (
                    <span className="flex items-center gap-1">
                      <span title="Firmware version">
                      <Cpu className="w-3 h-3" />
                      </span>
                      Firmware: {device.firmwareVersion}
                    </span>
                  )}
                  {device.lastSeen && (
                    <span className="flex items-center gap-1">
                      <span title="Last device activity timestamp">
                        <Activity className="w-3 h-3" />
                      </span>
                      Last seen: {format(new Date(device.lastSeen), "MMM d, HH:mm")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover border border-accent text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Device Information Card */}
        <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-5 mb-4 sm:mb-5 text-left transition-all duration-300 overflow-hidden relative shadow-card">
          <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span title="Device details and status">
            <Info className="w-4 h-4" />
            </span>
            Device Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-text-secondary mb-1">Device Name</p>
              <p className="text-sm font-medium text-text-primary">{device.name || deviceId}</p>
            </div>
            {device.model && (
              <div>
                <p className="text-xs text-text-secondary mb-1">Model</p>
                <p className="text-sm font-medium text-text-primary">{device.model}</p>
              </div>
            )}
            {device.firmwareVersion && (
              <div>
                <p className="text-xs text-text-secondary mb-1">Firmware Version</p>
                <p className="text-sm font-medium text-text-primary">{device.firmwareVersion}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-text-secondary mb-1">Device ID (IMEI)</p>
              <p className="text-sm font-medium text-text-primary">{deviceId}</p>
            </div>
            {(() => {
              // Extract deviceInfoResponse from latest status
              const latestStatus = statuses[0];
              const deviceInfo = latestStatus?.rawData?.deviceInfoResponse || latestStatus?.rawData?.deviceInfo || null;
              
              return deviceInfo ? (
                <>
                  {deviceInfo.phoneNumber && (
                    <div>
                      <p className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                        <span title="Device phone number">
                        <Phone className="w-3 h-3" />
                        </span>
                        Phone Number
                      </p>
                      <p className="text-sm font-medium text-text-primary">{deviceInfo.phoneNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                      {deviceInfo.online ? (
                        <span title="Network connection active">
                        <Wifi className="w-3 h-3 text-green-500" />
                        </span>
                      ) : (
                        <span title="Network connection inactive">
                        <WifiOff className="w-3 h-3 text-red-500" />
                        </span>
                      )}
                      Online Status
                    </p>
                    <p className={`text-sm font-medium flex items-center gap-1.5 ${deviceInfo.online ? "text-green-500" : "text-red-500"}`}>
                      {deviceInfo.online ? (
                        <>
                          <span title="Online">
                          <CheckCircle className="w-3.5 h-3.5" />
                          </span>
                          Online
                        </>
                      ) : (
                        <>
                          <span title="Offline">
                          <XCircle className="w-3.5 h-3.5" />
                          </span>
                          Offline
                        </>
                      )}
                    </p>
                  </div>
                  {deviceInfo.gsmStrength !== undefined && deviceInfo.gsmStrength !== null && (
                    <div>
                      <p className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                        <span title="GSM signal strength (1-4)">
                        <Signal className="w-3 h-3" />
                        </span>
                        GSM Strength
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`w-1.5 h-3.5 rounded-sm ${
                                level <= deviceInfo.gsmStrength
                                  ? "bg-green-500"
                                  : "bg-gray-300 dark:bg-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm font-medium text-text-primary">
                          {deviceInfo.gsmStrength}/4
                        </p>
                      </div>
                    </div>
                  )}
                  {deviceInfo.batteryStatus !== undefined && deviceInfo.batteryStatus !== null && (
                    <div>
                      <p className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                        <span title="Battery status">
                        <Battery className="w-3 h-3" />
                        </span>
                        Battery Status
                      </p>
                      <p className={`text-sm font-medium flex items-center gap-1.5 ${deviceInfo.batteryStatus ? "text-green-500" : "text-red-500"}`}>
                        {deviceInfo.batteryStatus ? (
                          <>
                            <span title="Battery good">
                            <CheckCircle className="w-3.5 h-3.5" />
                            </span>
                            Good
                          </>
                        ) : (
                          <>
                            <span title="Battery low">
                            <XCircle className="w-3.5 h-3.5" />
                            </span>
                            Low
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  {deviceInfo.migrationPending !== undefined && deviceInfo.migrationPending !== null && (
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Migration Pending</p>
                      <p className={`text-sm font-medium flex items-center gap-1.5 ${deviceInfo.migrationPending ? "text-warning" : "text-green-500"}`}>
                        {deviceInfo.migrationPending ? (
                          <>
                            <span title="Migration pending - action required">
                            <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                            Yes
                          </>
                        ) : (
                          <>
                            <span title="No migration pending">
                            <CheckCircle className="w-3.5 h-3.5" />
                            </span>
                            No
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  {deviceInfo.viewCamerasAllowed !== undefined && deviceInfo.viewCamerasAllowed !== null && (
                    <div>
                      <p className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                        <span title="Camera access permission">
                        <Camera className="w-3 h-3" />
                        </span>
                        Camera Access
                      </p>
                      <p className={`text-sm font-medium flex items-center gap-1.5 ${deviceInfo.viewCamerasAllowed ? "text-green-500" : "text-text-secondary"}`}>
                        {deviceInfo.viewCamerasAllowed ? (
                          <>
                            <span title="Access allowed">
                            <CheckCircle className="w-3.5 h-3.5" />
                            </span>
                            Allowed
                          </>
                        ) : (
                          <>
                            <span title="Access denied">
                            <XCircle className="w-3.5 h-3.5" />
                            </span>
                            Not Allowed
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : null;
            })()}
            {device.lastSeen && (
              <div>
                <p className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                  <span title="Last device activity timestamp">
                    <Activity className="w-3 h-3" />
                  </span>
                  Last Seen
                </p>
                <p className="text-sm font-medium text-text-primary">
                  {format(new Date(device.lastSeen), "MMM d, yyyy HH:mm")}
                </p>
              </div>
            )}
            {device.credentialName && (
              <div>
                <p className="text-xs text-text-secondary mb-1">Credential</p>
                <p className="text-sm font-medium text-text-primary">{device.credentialName}</p>
              </div>
            )}
          </div>
        </div>

        {/* All Partitions */}
        {partitions.length > 0 && (
          <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-5 mb-4 sm:mb-5 text-left transition-all duration-300 overflow-hidden relative shadow-card">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span title="Security partitions - independent areas">
              <Shield className="w-4 h-4" />
              </span>
              All Partitions ({partitions.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {partitions.map((partition) => (
                <div
                  key={partition.partitionId}
                  className="bg-background border border-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Partition {partition.partitionId}</p>
                      {partition.partitionName ? (
                        <p className="text-sm font-medium text-text-primary">{partition.partitionName}</p>
                      ) : (
                        <p className="text-sm font-medium text-text-primary">Partition {partition.partitionId}</p>
                      )}
                    </div>
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        partition.isArmed ? "bg-danger" : "bg-success"
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Status</p>
                      <p className={`text-sm font-medium flex items-center gap-1 ${
                        partition.isArmed ? "text-danger" : "text-success"
                      }`}>
                        {partition.isArmed ? (
                          <>
                            <span title="Armed - system active">
                              <Lock className="w-3 h-3" />
                      </span>
                            Armed
                          </>
                        ) : (
                          <>
                            <span title="Disarmed - system inactive">
                              <Unlock className="w-3 h-3" />
                            </span>
                            Disarmed
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Ready</p>
                      <div className="flex items-center gap-1.5">
                      {partition.isReady ? (
                          <>
                            <span title="Ready to arm - all zones closed">
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                            </span>
                            <span className="text-sm font-medium text-text-primary">Ready</span>
                          </>
                      ) : (
                          <>
                            <span title="Not ready - open zones or faults">
                        <XCircle className="w-3.5 h-3.5 text-text-secondary" />
                            </span>
                            <span className="text-sm font-medium text-text-secondary">Not Ready</span>
                          </>
                      )}
                      </div>
                    </div>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => handleControl("arm", partition.partitionId)}
                        disabled={controlling || partition.isArmed}
                      className="flex-1 px-2.5 py-1.5 bg-danger hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed disabled:text-text-secondary text-text-primary rounded text-xs font-medium transition-colors border border-danger flex items-center justify-center gap-1 cursor-pointer"
                      title={partition.isArmed ? "Partition is already armed" : "Activate the security system for this partition"}
                      >
                      <Lock className="w-3 h-3" />
                        Arm
                      </button>
                      <button
                        onClick={() => handleControl("disarm", partition.partitionId)}
                        disabled={controlling || !partition.isArmed}
                      className="flex-1 px-2.5 py-1.5 bg-success hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed disabled:text-text-secondary text-text-primary rounded text-xs font-medium transition-colors border border-success flex items-center justify-center gap-1 cursor-pointer"
                      title={!partition.isArmed ? "Partition is already disarmed" : "Deactivate the security system for this partition"}
                      >
                      <Unlock className="w-3 h-3" />
                        Disarm
                      </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Temperature Sensors */}
        {temperatureSensors.length > 0 ? (
          <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-5 mb-4 sm:mb-5 text-left transition-all duration-300 overflow-hidden relative shadow-card">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span title="Temperature sensors">
              <Thermometer className="w-4 h-4 text-warning" />
              </span>
              Temperature Sensors ({temperatureSensors.length})
            </h2>
            
            {/* Temperature Sensor Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {temperatureSensors.map((sensor) => {
                // Get chart color for this sensor (same logic as chart)
                const chartColors = [
                  "var(--color-warning)", // Orange/yellow
                  "#3B82F6", // Blue
                  "#10B981", // Green
                  "#EF4444", // Red
                  "#8B5CF6", // Purple
                  "#F59E0B", // Amber
                  "#06B6D4", // Cyan
                  "#EC4899", // Pink
                ];
                const sensorIndex = sensor.sensorName ? sensorNames.indexOf(sensor.sensorName) : -1;
                const chartColor = sensorIndex >= 0 ? chartColors[sensorIndex % chartColors.length] : "var(--color-text-primary)";
                
                return (
                  <div
                    key={sensor.sensorId}
                    className="bg-background border border-border rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">
                          {sensor.sensorName || `Sensor ${sensor.sensorId}`}
                        </h3>
                        {sensor.sensorId !== null && (
                          <p className="text-xs text-text-secondary">ID: {sensor.sensorId}</p>
                        )}
                      </div>
                      <div className="relative w-4 h-4">
                        {/* Thermometer outline - use chart color */}
                        <Thermometer 
                          className="w-4 h-4 absolute inset-0" 
                          style={{ 
                            strokeWidth: 2,
                            fill: "none",
                            color: chartColor,
                          }} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-xs text-text-secondary mb-0.5">Current</p>
                        {/* Note: minTemperature is actually max threshold, maxTemperature is actually min threshold (labels are swapped) */}
                        {(() => {
                          // Get actual thresholds (swapped because labels are swapped)
                          const actualMinThreshold = sensor.maxTemperature ?? null; // This is the actual minimum threshold
                          const actualMaxThreshold = sensor.minTemperature ?? null; // This is the actual maximum threshold
                          const isValid = isTemperatureValid(sensor.temperature, actualMinThreshold, actualMaxThreshold);
                          const colorClass = isValid ? "text-text-primary" : "text-danger";
                          const colorStyle = isValid ? {} : { color: "#ff453a" }; // Fallback inline style
                          return (
                            <p className={`text-xl font-bold ${colorClass}`} style={colorStyle}>
                          {sensor.temperature.toFixed(1)}°C
                        </p>
                          );
                        })()}
                      </div>
                      {(sensor.minTemperature !== null && sensor.minTemperature !== undefined) && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">Max:</span>
                          <span className="font-medium text-text-primary">
                            {sensor.minTemperature.toFixed(1)}°C
                          </span>
                        </div>
                      )}
                      {(sensor.maxTemperature !== null && sensor.maxTemperature !== undefined) && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">Min:</span>
                          <span className="font-medium text-text-primary">
                            {sensor.maxTemperature.toFixed(1)}°C
                          </span>
                        </div>
                      )}
                      {sensor.lastUpdate && (
                        <p className="text-xs text-text-secondary mt-1.5">
                          Updated: {format(new Date(sensor.lastUpdate), "MMM d, HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Combined Temperature Chart - All Sensors */}
            {combinedChartData.length > 0 && sensorNames.length > 0 && (
              <div className="border-t border-border pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                  <h3 className="text-base font-semibold text-text-primary">
                    All Temperature Sensors - {temperaturePeriod === "1h" ? "1 Hour" : temperaturePeriod === "24h" ? "24 Hours" : temperaturePeriod === "1w" ? "1 Week" : temperaturePeriod === "1m" ? "1 Month" : temperaturePeriod === "1y" ? "1 Year" : temperaturePeriod === "2y" ? "2 Years" : "All Time"} History
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(["1h", "24h", "1w", "1m", "1y", "2y", "all"] as const).map((period) => {
                      const periodLabel = period === "1h" ? "1h" : period === "24h" ? "24h" : period === "1w" ? "1w" : period === "1m" ? "1m" : period === "1y" ? "1y" : period === "2y" ? "2y" : "All";
                      return (
                        <button
                          key={period}
                          type="button"
                          onClick={(e) => handlePeriodChange(period, e)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                            temperaturePeriod === period
                              ? "bg-accent text-white"
                              : "bg-background border border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                          }`}
                        >
                          {periodLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
                  <LineChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="timestampMs"
                      type="number"
                      domain={temperaturePeriod === "all" 
                        ? (() => {
                            // For "all" period, use actual data range from filtered chart data
                            if (combinedChartData.length === 0) {
                              return [dataMinMs, dataMaxMs];
                            }
                            const chartDataMin = Math.min(...combinedChartData.map((d: any) => d.timestampMs));
                            const chartDataMax = Math.max(...combinedChartData.map((d: any) => d.timestampMs));
                            // Use actual data range with a small padding for better visualization
                            const padding = (chartDataMax - chartDataMin) * 0.02; // 2% padding on each side
                            return [
                              Math.max(dataMinMs, chartDataMin - padding),
                              Math.min(dataMaxMs, chartDataMax + padding)
                            ];
                          })()
                        : [startTime.getTime(), endTime.getTime()]}
                      stroke="var(--color-text-secondary)"
                      tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                      angle={temperaturePeriod === "all" || temperaturePeriod === "2y" || temperaturePeriod === "1y" || temperaturePeriod === "1m" ? -45 : 0}
                      textAnchor={temperaturePeriod === "all" || temperaturePeriod === "2y" || temperaturePeriod === "1y" || temperaturePeriod === "1m" ? "end" : "middle"}
                      height={temperaturePeriod === "all" || temperaturePeriod === "2y" || temperaturePeriod === "1y" || temperaturePeriod === "1m" ? 60 : 30}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        // For "all" period, use adaptive formatting based on data range
                        if (temperaturePeriod === "all" && combinedChartData.length > 0) {
                          const chartDataMin = Math.min(...combinedChartData.map((d: any) => d.timestampMs));
                          const chartDataMax = Math.max(...combinedChartData.map((d: any) => d.timestampMs));
                          const dataRangeDays = (chartDataMax - chartDataMin) / (24 * 60 * 60 * 1000);
                          
                          if (dataRangeDays <= 14) {
                            // Daily ticks: show date only
                            return format(date, "MMM d");
                          } else if (dataRangeDays <= 90) {
                            // Weekly ticks: show date only
                            return format(date, "MMM d");
                          } else if (dataRangeDays <= 730) {
                            // Monthly ticks: show month and year
                            return format(date, "MMM yyyy");
                          } else if (dataRangeDays <= 1825) {
                            // Quarterly ticks: show month and year
                            return format(date, "MMM yyyy");
                          } else {
                            // Yearly ticks: show year only
                            return format(date, "yyyy");
                          }
                        }
                        return formatTimeLabel(date);
                      }}
                      ticks={(() => {
                        // For 1h period, show 10-minute marks with rounded boundaries
                        if (temperaturePeriod === "1h") {
                          if (combinedChartData.length === 0) return [];
                          
                          // Generate ticks every 10 minutes within the rounded period
                          const ticks: number[] = [];
                          const periodStart = startTime.getTime(); // Already rounded down
                          const periodEnd = endTime.getTime(); // Already rounded up
                          
                          // Start from the rounded start time
                          let currentTick = periodStart;
                          
                          // Generate ticks every 10 minutes from start to end
                          while (currentTick <= periodEnd) {
                            ticks.push(currentTick);
                            currentTick += 10 * 60 * 1000; // Add 10 minutes
                          }
                          
                          return ticks;
                        }
                        
                        // For 24h period, show hourly ticks
                        if (temperaturePeriod === "24h") {
                          if (combinedChartData.length === 0) return [];
                          
                          const ticks: number[] = [];
                          const periodStart = startTime.getTime();
                          const periodEnd = endTime.getTime();
                          
                          // Round down to nearest hour
                          const roundedStart = new Date(periodStart);
                          roundedStart.setMinutes(0, 0, 0);
                          
                          let currentTick = roundedStart.getTime();
                          while (currentTick <= periodEnd) {
                            ticks.push(currentTick);
                            currentTick += 60 * 60 * 1000; // Add 1 hour
                          }
                          
                          return ticks;
                        }
                        
                        // For 1w period, show daily ticks (no time)
                        if (temperaturePeriod === "1w") {
                          if (combinedChartData.length === 0) return [];
                          
                          const ticks: number[] = [];
                          const periodStart = startTime.getTime();
                          const periodEnd = endTime.getTime();
                          
                          // Round down to start of day
                          const roundedStart = new Date(periodStart);
                          roundedStart.setHours(0, 0, 0, 0);
                          
                          let currentTick = roundedStart.getTime();
                          while (currentTick <= periodEnd) {
                            ticks.push(currentTick);
                            currentTick += 24 * 60 * 60 * 1000; // Add 1 day
                          }
                          
                          return ticks;
                        }
                        
                        // For 1m period, show daily ticks (no time)
                        if (temperaturePeriod === "1m") {
                          if (combinedChartData.length === 0) return [];
                          
                          const ticks: number[] = [];
                          const periodStart = startTime.getTime();
                          const periodEnd = endTime.getTime();
                          
                          // Round down to start of day
                          const roundedStart = new Date(periodStart);
                          roundedStart.setHours(0, 0, 0, 0);
                          
                          let currentTick = roundedStart.getTime();
                          // Show every 2-3 days to avoid crowding
                          const step = 2; // days
                          while (currentTick <= periodEnd) {
                            ticks.push(currentTick);
                            currentTick += step * 24 * 60 * 60 * 1000; // Add step days
                          }
                          
                          return ticks;
                        }
                        
                        // For 1y period, show weekly/monthly ticks (no time)
                        if (temperaturePeriod === "1y") {
                          if (combinedChartData.length === 0) return [];
                          
                          const ticks: number[] = [];
                          const periodStart = startTime.getTime();
                          const periodEnd = endTime.getTime();
                          
                          // Round down to start of week
                          const roundedStart = startOfWeek(new Date(periodStart));
                          
                          let currentTick = roundedStart.getTime();
                          while (currentTick <= periodEnd) {
                            ticks.push(currentTick);
                            currentTick += 7 * 24 * 60 * 60 * 1000; // Add 1 week
                          }
                          
                          return ticks;
                        }
                        
                        // For 2y period, show monthly ticks (no time)
                        if (temperaturePeriod === "2y") {
                          if (combinedChartData.length === 0) return [];
                          
                          const ticks: number[] = [];
                          const periodStart = startTime.getTime();
                          const periodEnd = endTime.getTime();
                          
                          // Round down to start of month
                          const roundedStart = startOfMonth(new Date(periodStart));
                          
                          let currentTick = roundedStart.getTime();
                          while (currentTick <= periodEnd) {
                            ticks.push(currentTick);
                            const nextDate = new Date(currentTick);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            currentTick = nextDate.getTime();
                          }
                          
                          return ticks;
                        }
                        
                        // For "all" period, show best-fit ticks based on actual data range
                        if (temperaturePeriod === "all") {
                          if (combinedChartData.length === 0) return [];
                          
                          // Use actual first and last data points from the chart data
                          const chartDataMin = Math.min(...combinedChartData.map((d: any) => d.timestampMs));
                          const chartDataMax = Math.max(...combinedChartData.map((d: any) => d.timestampMs));
                          const dataRangeMs = chartDataMax - chartDataMin;
                          const dataRangeDays = dataRangeMs / (24 * 60 * 60 * 1000);
                          
                          const ticks: number[] = [];
                          const startDate = new Date(chartDataMin);
                          const endDate = new Date(chartDataMax);
                          
                          // Determine best tick interval based on data range
                          // Target: show 8-15 ticks for optimal readability
                          let tickInterval: 'day' | 'week' | 'month' | 'quarter' | 'year';
                          let tickStep = 1;
                          
                          if (dataRangeDays <= 14) {
                            // Less than 2 weeks: show daily ticks
                            tickInterval = 'day';
                            tickStep = dataRangeDays <= 7 ? 1 : 2; // Every day or every 2 days
                          } else if (dataRangeDays <= 90) {
                            // Less than 3 months: show weekly ticks
                            tickInterval = 'week';
                            tickStep = dataRangeDays <= 30 ? 1 : 2; // Every week or every 2 weeks
                          } else if (dataRangeDays <= 730) {
                            // Less than 2 years: show monthly ticks
                            tickInterval = 'month';
                            tickStep = dataRangeDays <= 180 ? 1 : 2; // Every month or every 2 months
                          } else if (dataRangeDays <= 1825) {
                            // Less than 5 years: show quarterly ticks
                            tickInterval = 'quarter';
                            tickStep = 1;
                          } else {
                            // 5+ years: show yearly ticks
                            tickInterval = 'year';
                            tickStep = dataRangeDays <= 3650 ? 1 : 2; // Every year or every 2 years
                          }
                          
                          // Always include the first data point
                          ticks.push(chartDataMin);
                          
                          // Generate ticks based on selected interval
                          let currentTick: number;
                          
                          if (tickInterval === 'day') {
                            const roundedStart = new Date(startDate);
                            roundedStart.setHours(0, 0, 0, 0);
                            currentTick = roundedStart.getTime();
                            if (currentTick < chartDataMin) {
                              currentTick += tickStep * 24 * 60 * 60 * 1000;
                            }
                            while (currentTick <= chartDataMax) {
                              ticks.push(currentTick);
                              currentTick += tickStep * 24 * 60 * 60 * 1000;
                            }
                          } else if (tickInterval === 'week') {
                            const roundedStart = startOfWeek(startDate);
                            currentTick = roundedStart.getTime();
                            if (currentTick < chartDataMin) {
                              currentTick += tickStep * 7 * 24 * 60 * 60 * 1000;
                            }
                            while (currentTick <= chartDataMax) {
                              ticks.push(currentTick);
                              currentTick += tickStep * 7 * 24 * 60 * 60 * 1000;
                            }
                          } else if (tickInterval === 'month') {
                            const roundedStart = startOfMonth(startDate);
                            currentTick = roundedStart.getTime();
                            if (currentTick <= chartDataMin) {
                              const nextDate = new Date(currentTick);
                              nextDate.setMonth(nextDate.getMonth() + tickStep);
                              currentTick = nextDate.getTime();
                            }
                            while (currentTick <= chartDataMax) {
                              ticks.push(currentTick);
                              const nextDate = new Date(currentTick);
                              nextDate.setMonth(nextDate.getMonth() + tickStep);
                              currentTick = nextDate.getTime();
                            }
                          } else if (tickInterval === 'quarter') {
                            const roundedStart = new Date(startDate.getFullYear(), Math.floor(startDate.getMonth() / 3) * 3, 1);
                            currentTick = roundedStart.getTime();
                            if (currentTick <= chartDataMin) {
                              const nextDate = new Date(currentTick);
                              nextDate.setMonth(nextDate.getMonth() + 3);
                              currentTick = nextDate.getTime();
                            }
                            while (currentTick <= chartDataMax) {
                              ticks.push(currentTick);
                              const nextDate = new Date(currentTick);
                              nextDate.setMonth(nextDate.getMonth() + 3);
                              currentTick = nextDate.getTime();
                            }
                          } else { // 'year'
                            const roundedStart = new Date(startDate.getFullYear(), 0, 1);
                            currentTick = roundedStart.getTime();
                            if (currentTick <= chartDataMin) {
                              const nextDate = new Date(currentTick);
                              nextDate.setFullYear(nextDate.getFullYear() + tickStep);
                              currentTick = nextDate.getTime();
                            }
                            while (currentTick <= chartDataMax) {
                              ticks.push(currentTick);
                              const nextDate = new Date(currentTick);
                              nextDate.setFullYear(nextDate.getFullYear() + tickStep);
                              currentTick = nextDate.getTime();
                            }
                          }
                          
                          // Always include the last data point
                          if (ticks.length === 0 || ticks[ticks.length - 1] < chartDataMax) {
                            ticks.push(chartDataMax);
                          }
                          
                          return ticks;
                        }
                        
                        // Fallback: return empty array if no specific tick generation was handled above
                        return [];
                      })()}
                    />
                    <YAxis 
                      stroke="var(--color-text-secondary)"
                      tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                      label={{ value: "°C", angle: -90, position: "insideLeft", fill: "var(--color-text-secondary)", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        color: "var(--color-text-primary)",
                        padding: "12px",
                        zIndex: 1000,
                      }}
                      wrapperStyle={{
                        zIndex: 1000,
                      }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        
                        // Get the data point to access timestamp information
                        const dataPoint = payload[0]?.payload;
                        
                        // Sort payload by temperature value (highest to lowest)
                        const sortedPayload = [...payload].sort((a, b) => {
                          const aValue = a.value as number;
                          const bValue = b.value as number;
                          // Handle null/undefined values - put them at the end
                          if (aValue == null && bValue == null) return 0;
                          if (aValue == null) return 1;
                          if (bValue == null) return -1;
                          return bValue - aValue; // Descending order (high to low)
                        });
                        
                        // Use the data point's timestamp which is the actual measurement time from DB
                        // This aligns with the x-axis position since data points are positioned at their actual measurement times
                        const displayTimestamp = dataPoint?.timestamp || null;
                        
                        return (
                          <div 
                            className="bg-surface border border-border rounded-lg p-3 shadow-lg"
                            style={{
                              backgroundColor: "var(--color-surface)",
                              border: "1px solid var(--color-border)",
                              borderRadius: "12px",
                              padding: "12px",
                              zIndex: 1000,
                            }}
                          >
                            {sortedPayload.map((entry, index) => {
                              if (entry.value === null || entry.value === undefined) return null;
                              const value = typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value;
                              const tempValue = typeof entry.value === 'number' ? entry.value : parseFloat(entry.value as string) || 0;
                              // Find the sensor to get its thresholds
                              const sensor = temperatureSensors.find(s => s.sensorName === entry.name);
                              // Note: minTemperature is actually max threshold, maxTemperature is actually min threshold (labels are swapped)
                              const actualMinThreshold = sensor?.maxTemperature ?? null; // This is the actual minimum threshold
                              const actualMaxThreshold = sensor?.minTemperature ?? null; // This is the actual maximum threshold
                              const isValid = isTemperatureValid(tempValue, actualMinThreshold, actualMaxThreshold);
                              const colorClass = isValid ? "text-text-primary" : "text-danger";
                              const colorStyle = isValid ? {} : { color: "#ff453a" }; // Fallback inline style for red
                              return (
                                <div key={index} className="flex items-center justify-between gap-3 mb-1 last:mb-0">
                                  <span style={{ color: entry.color }} className="text-sm font-medium">
                                    {entry.name}:
                                  </span>
                                  <span className={`text-sm font-semibold ${colorClass}`} style={colorStyle}>
                                    {value}°C
                                  </span>
                                </div>
                              );
                            })}
                            {displayTimestamp && (
                              <div className="text-xs text-text-secondary mt-2 pt-2 border-t border-border">
                                {format(new Date(displayTimestamp), "MMM d, yyyy HH:mm")}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    {sensorNames.map((sensorName, index) => {
                      // Generate different colors for each sensor
                      const colors = [
                        "var(--color-warning)", // Orange/yellow
                        "#3B82F6", // Blue
                        "#10B981", // Green
                        "#EF4444", // Red
                        "#8B5CF6", // Purple
                        "#F59E0B", // Amber
                        "#06B6D4", // Cyan
                        "#EC4899", // Pink
                      ];
                      const color = colors[index % colors.length];
                      
                      // Find the sensor to get its thresholds and current value
                      const sensor = temperatureSensors.find(s => s.sensorName === sensorName);
                      // Note: minTemperature is actually max threshold, maxTemperature is actually min threshold (labels are swapped)
                      const actualMinThreshold = sensor?.maxTemperature ?? null; // This is the actual minimum threshold
                      const actualMaxThreshold = sensor?.minTemperature ?? null; // This is the actual maximum threshold
                      
                      // Check if the CURRENT temperature value is valid (not historical data)
                      const currentTemp = sensor?.temperature ?? null;
                      const isCurrentTempValid = isTemperatureValid(currentTemp, actualMinThreshold, actualMaxThreshold);
                      
                      // Use red stroke only if current value is invalid
                      const lineColor = isCurrentTempValid ? color : "#EF4444";
                      
                      return (
                        <Line
                          key={sensorName}
                          type="monotone"
                          dataKey={sensorName}
                          stroke={lineColor}
                          strokeWidth={2}
                          dot={(props: any) => {
                            const value = props.payload?.[sensorName];
                            const isValid = value !== null && value !== undefined ? isTemperatureValid(value, actualMinThreshold, actualMaxThreshold) : true;
                            const dotColor = isValid ? lineColor : "#EF4444";
                            return (
                              <circle
                                cx={props.cx}
                                cy={props.cy}
                                r={2}
                                fill={dotColor}
                                stroke={dotColor}
                                strokeWidth={1}
                              />
                            );
                          }}
                          activeDot={(props: any) => {
                            const value = props.payload?.[sensorName];
                            const isValid = value !== null && value !== undefined ? isTemperatureValid(value, actualMinThreshold, actualMaxThreshold) : true;
                            const dotColor = isValid ? lineColor : "#EF4444";
                            return (
                              <circle
                                cx={props.cx}
                                cy={props.cy}
                                r={4}
                                fill={dotColor}
                                stroke={dotColor}
                                strokeWidth={2}
                              />
                            );
                          }}
                          connectNulls={false}
                          name={sensorName}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-5 mb-4 sm:mb-5 text-left transition-all duration-300 overflow-hidden relative shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-text-secondary" />
                Temperature
              </h2>
            </div>
            <div className="text-center py-6 text-text-secondary">
              <Thermometer className="w-10 h-10 mx-auto mb-2.5 opacity-50" />
              <p className="font-medium text-text-primary mb-1 text-sm">Temperature not available</p>
              <p className="text-xs mt-1">This device may not support temperature monitoring, or temperature data hasn't been collected yet.</p>
              <p className="text-xs mt-1.5 text-text-secondary">Temperature will appear here if available from the device.</p>
            </div>
          </div>
        )}

        {/* Zones */}
        {latestStatus && latestStatus.zones && latestStatus.zones.length > 0 && (
          <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-5 text-left transition-all duration-300 overflow-hidden relative shadow-card">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span title="Security zones - monitored sensors and areas">
              <Shield className="w-4 h-4" />
              </span>
              Zones ({latestStatus.zones.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
              {latestStatus.zones.map((zone: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 bg-background border rounded-lg transition-colors ${
                    zone.isOpen ? "border-danger" : zone.isTampered ? "border-warning" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-xs font-medium text-text-primary">
                        {zone.zoneName || `Zone ${zone.zoneId || index + 1}`}
                      </span>
                      {zone.zoneId && (
                        <span className="text-xs text-text-secondary ml-1.5">#{zone.zoneId}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {zone.isTampered && (
                        <span title="Zone tampered - action required">
                        <AlertCircle className="w-3.5 h-3.5 text-warning" />
                        </span>
                      )}
                      <div
                        className={`w-2 h-2 rounded-full ${
                          zone.isOpen ? "bg-danger" : "bg-success"
                        }`}
                        title={zone.isOpen ? "Zone open" : "Zone closed"}
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-xs font-medium ${
                      zone.isOpen ? "text-danger" : "text-success"
                    }`}>
                      {zone.isOpen ? "Open" : "Closed"}
                    </p>
                    {zone.isTampered && (
                      <p className="text-xs text-warning">Tampered</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw API Data Viewer - Current Fetch Only */}
        {latestStatus && latestStatus.rawData && (
          <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-5 mt-4 sm:mt-5 text-left transition-all duration-300 overflow-hidden relative shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-1">
                  <span title="Raw API response data">
                  <Database className="w-4 h-4" />
                  </span>
                  Raw API Data (Current Fetch)
                </h2>
                {latestStatus.fetchedAt && (
                  <p className="text-xs text-text-secondary flex items-center gap-1">
                    <span title="Data fetch timestamp">
                    <Clock className="w-3 h-3" />
                    </span>
                    Fetched: {format(new Date(latestStatus.fetchedAt), "MMM d, yyyy HH:mm:ss")}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="px-2.5 py-1 bg-background border border-border text-text-primary rounded-md text-xs font-medium transition-colors hover:bg-accent/10 cursor-pointer"
              >
                {showRawData ? "Hide" : "Show"}
              </button>
            </div>
            {showRawData && (
              <pre className="bg-background border border-border rounded-lg p-3 overflow-auto text-xs text-text-primary font-mono max-h-80">
                {JSON.stringify(latestStatus.rawData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
