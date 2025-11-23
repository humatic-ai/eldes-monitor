"use client";

// Force dynamic rendering to ensure middleware runs
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Thermometer, Activity, Plus, RefreshCw, Lock, Unlock } from "lucide-react";

interface Device {
  id: number;
  device_id: string;
  device_name: string | null;
  model: string | null;
  is_armed: number | null;
  temperature: number | null;
  last_status_update: string | null;
}

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevices = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const url = refresh
        ? "/eldes/api/devices?refresh=true"
        : "/eldes/api/devices";
      
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Check authentication status first
    const checkAuth = async () => {
      try {
        const response = await fetch("/eldes/api/auth/status", {
          credentials: "include",
        });
        const data = await response.json();
        if (!data.authenticated) {
          // Redirect to login with current path as redirect parameter (without basePath prefix)
          const currentPath = window.location.pathname.replace("/eldes", "") || "/";
          window.location.href = `/eldes/login?redirect=${encodeURIComponent(currentPath)}`;
          return;
        }
        // User is authenticated, proceed with normal flow
        fetchDevices();
        // Note: Cron job is automatically started on server startup via instrumentation.ts
        // No need to call /api/cron/start here
      } catch (error) {
        console.error("Error checking auth status:", error);
        // On error, redirect to login (without basePath prefix)
        const currentPath = window.location.pathname.replace("/eldes", "") || "/";
        window.location.href = `/eldes/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    };
    
    checkAuth();
  }, []);

  return (
    <div className="bg-background">
      <div className="container mx-auto px-3 sm:px-5 lg:px-6 py-5 max-w-container" style={{ paddingTop: 'calc(1.25rem + 56px)' }}>
        {/* Page Header */}
        <div className="mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-text-primary mb-1.5 sm:mb-2">
                ELDES ESIM364 Monitor
              </h1>
              <p className="text-sm sm:text-base text-text-secondary">
                Monitor and control your alarm systems
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fetchDevices(true)}
                  disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover border border-accent text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent"
                >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </button>
              <Link
                href="/credentials"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover border border-accent text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-xs sm:text-sm"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Add Device</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Devices Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-16 sm:py-24">
            <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-border border-t-accent rounded-full animate-spin"></div>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-16 sm:py-24">
            <Shield className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-text-secondary mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-2">
              No devices found
            </h2>
            <p className="text-sm sm:text-base text-text-secondary mb-5 sm:mb-6 max-w-md mx-auto">
              Add your first ELDES device to get started
            </p>
            <Link
              href="/credentials"
              className="inline-block px-4 py-2 sm:px-5 sm:py-2.5 bg-accent hover:bg-accent-hover border border-accent text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-xs sm:text-sm"
            >
              Add Device
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {devices.map((device) => (
              <Link
                key={device.id}
                href={`/devices/${device.device_id}`}
                className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-4.5 text-left transition-all duration-300 overflow-hidden relative shadow-card hover:-translate-y-0.5 hover:shadow-card-hover hover:border-accent group no-underline block cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-base sm:text-lg font-semibold leading-tight mb-1 text-text-primary group-hover:text-accent transition-colors truncate">
                      {device.device_name || device.device_id}
                    </h3>
                    {device.model && (
                      <p className="text-xs text-text-secondary truncate">
                        {device.model}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 mt-1 ${
                      device.is_armed === 1
                        ? "bg-danger"
                        : device.is_armed === 0
                        ? "bg-success"
                        : "bg-text-secondary"
                    }`}
                    aria-label={
                      device.is_armed === 1
                        ? "Armed"
                        : device.is_armed === 0
                        ? "Disarmed"
                        : "Unknown"
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-text-primary">
                    {device.is_armed === 1 ? (
                      <span title="Armed - system active">
                        <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-danger" />
                      </span>
                    ) : device.is_armed === 0 ? (
                      <span title="Disarmed - system inactive">
                        <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-success" />
                      </span>
                    ) : (
                      <span title="Status unknown">
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      </span>
                    )}
                    <span className="text-xs sm:text-sm">
                      {device.is_armed === 1
                        ? "Armed"
                        : device.is_armed === 0
                        ? "Disarmed"
                        : "Unknown"}
                    </span>
                  </div>

                  {device.temperature !== null && (
                    <div className="flex items-center gap-1.5 text-text-primary">
                      <span title="Current temperature">
                      <Thermometer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning flex-shrink-0" />
                      </span>
                      <span className="text-xs sm:text-sm">
                        {device.temperature.toFixed(1)}°C
                      </span>
                    </div>
                  )}

                  {device.last_status_update && (
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <span title="Last activity timestamp">
                      <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      </span>
                      <span className="text-xs truncate">
                        {new Date(device.last_status_update).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
