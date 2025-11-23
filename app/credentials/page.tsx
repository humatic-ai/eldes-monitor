"use client";

// Force dynamic rendering to ensure middleware runs
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Shield } from "lucide-react";
import Link from "next/link";

interface Credential {
  id: number;
  username: string;
  device_name: string | null;
  created_at: string;
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    deviceName: "",
  });
  const [submitting, setSubmitting] = useState(false);

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
        fetchCredentials();
      } catch (error) {
        console.error("Error checking auth status:", error);
        // On error, redirect to login (without basePath prefix)
        const currentPath = window.location.pathname.replace("/eldes", "") || "/";
        window.location.href = `/eldes/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    };
    
    checkAuth();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await fetch("/eldes/api/credentials", {
        credentials: "include",
      });
      const data = await response.json();
      setCredentials(data.credentials || []);
    } catch (error) {
      console.error("Error fetching credentials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/eldes/api/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ username: "", password: "", deviceName: "" });
        setShowForm(false);
        fetchCredentials();
        // Trigger device fetch
        fetch("/eldes/api/devices?refresh=true", {
          credentials: "include",
        }).catch(console.error);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to add credentials"}`);
      }
    } catch (error) {
      console.error("Error adding credentials:", error);
      alert("Failed to add credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete these credentials?")) {
      return;
    }

    try {
      const response = await fetch(`/eldes/api/credentials?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        fetchCredentials();
      } else {
        alert("Failed to delete credentials");
      }
    } catch (error) {
      console.error("Error deleting credentials:", error);
      alert("Failed to delete credentials");
    }
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto px-3 sm:px-5 lg:px-6 py-5 max-w-container" style={{ paddingTop: 'calc(1.25rem + 56px)' }}>
        {/* Page Header */}
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-1.5">
            Manage Credentials
          </h1>
          <div className="text-text-secondary text-sm">
            <p>Add and manage your ELDES Cloud API credentials</p>
            <p className="text-xs text-text-secondary mt-1.5">
              Note: The username field must be your email address used to register with ELDES Cloud.
          </p>
          </div>
        </div>

        {/* Add Credentials Form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover border border-accent text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-xs sm:text-sm mb-4"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Add New Credentials
          </button>
        ) : (
          <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-5 text-left transition-all duration-300 overflow-hidden relative shadow-card mb-4">
            <h2 className="mb-3 text-lg font-semibold text-text-primary">Add Credentials</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-text-primary mb-1.5">
                  Email Address <span className="text-text-secondary text-xs">(Your ELDES Cloud login email)</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-xs sm:text-sm"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-text-primary mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-xs sm:text-sm"
                  placeholder="ELDES Cloud password"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-text-primary mb-1.5">
                  Device Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.deviceName}
                  onChange={(e) =>
                    setFormData({ ...formData, deviceName: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-xs sm:text-sm"
                  placeholder="Friendly name for this account"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-3 py-1.5 bg-accent hover:bg-accent-hover border border-accent text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Adding..." : "Add Credentials"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ username: "", password: "", deviceName: "" });
                  }}
                  className="px-3 py-1.5 bg-transparent hover:bg-white/10 border border-white/40 hover:border-accent text-text-secondary hover:text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-xs sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Credentials List */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-border border-t-accent rounded-full animate-spin"></div>
          </div>
        ) : credentials.length === 0 ? (
          <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-5 text-center py-8 text-left transition-all duration-300 overflow-hidden relative shadow-card">
            <Shield className="w-12 h-12 mx-auto text-text-secondary mb-3" />
            <h2 className="mb-1.5 text-lg font-semibold text-text-primary">No credentials added</h2>
            <p className="text-text-secondary m-0 text-sm">
              Add your first credentials to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => (
              <div key={cred.id} className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-4 sm:p-4.5 text-left transition-all duration-300 overflow-hidden relative shadow-card mb-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="mb-1 text-base font-semibold text-text-primary">
                      {cred.device_name || cred.username}
                    </h3>
                    <p className="text-xs text-text-secondary mb-1">
                      Username: {cred.username}
                    </p>
                    <p className="text-xs text-text-secondary m-0">
                      Added: {new Date(cred.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(cred.id)}
                    className="px-3 py-1.5 bg-danger hover:opacity-90 border border-danger text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:w-auto w-full"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
