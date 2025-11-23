"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/eldes/api/auth/status", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.authenticated) {
        // Redirect to /eldes (dashboard) or the redirect param
        const redirectParam = new URLSearchParams(window.location.search).get("redirect");
        // Next.js has basePath: "/eldes", so use "/" for base path
        // Redirect parameter uses __ instead of / to avoid URL encoding
        let redirectPath;
        if (redirectParam) {
          // Replace __ back to / (used to avoid URL encoding)
          const pathWithSlashes = redirectParam.replace(/__/g, "/");
          // Remove basePath prefix if present, then ensure leading slash
          const cleanParam = pathWithSlashes.startsWith("/eldes") 
            ? pathWithSlashes.replace("/eldes", "") || "/"
            : pathWithSlashes.startsWith("/")
            ? pathWithSlashes
            : `/${pathWithSlashes}`; // Add leading slash if missing
          redirectPath = cleanParam;
        } else {
          redirectPath = "/"; // Next.js will prepend basePath automatically
        }
        router.push(redirectPath);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/eldes/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // Apache intercepted the response and returned HTML
        if (response.status === 401) {
          setError("Invalid credentials. Please check your email and password.");
        } else {
          setError("Failed to connect to server. Please try again.");
        }
        return;
      }

      if (response.ok && data.success) {
        // Cookie is set automatically by server, no need for localStorage
        // Redirect to dashboard or the redirect param
        const redirectParam = new URLSearchParams(window.location.search).get("redirect");
        // Next.js has basePath: "/eldes", so use "/" for base path
        // Redirect parameter uses __ instead of / to avoid URL encoding
        let redirectPath;
        if (redirectParam) {
          // Replace __ back to / (used to avoid URL encoding)
          const pathWithSlashes = redirectParam.replace(/__/g, "/");
          // Remove basePath prefix if present, then ensure leading slash
          const cleanParam = pathWithSlashes.startsWith("/eldes") 
            ? pathWithSlashes.replace("/eldes", "") || "/"
            : pathWithSlashes.startsWith("/")
            ? pathWithSlashes
            : `/${pathWithSlashes}`; // Add leading slash if missing
          redirectPath = cleanParam;
        } else {
          redirectPath = "/"; // Next.js will prepend basePath automatically
        }
        router.push(redirectPath);
      } else {
        setError(data.error || "Invalid credentials. Please check your email and password.");
      }
    } catch (error) {
      console.error("Login error:", error);
      // Check if it's a JSON parse error (likely Apache HTML response)
      if (error instanceof SyntaxError && error.message.includes("JSON")) {
        setError("Invalid credentials. Please check your email and password.");
      } else {
        setError("Failed to connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-[linear-gradient(180deg,rgba(0,122,255,0.08),transparent_70%)] bg-surface border border-border rounded-lg p-6 sm:p-8 shadow-card">
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4">
              <img
                src="/assets/logo.png"
                alt="ELDES Monitor Logo"
                className="h-10 w-auto"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
              ELDES Monitor
            </h1>
            <p className="text-text-secondary text-sm">
              Sign in to access your devices
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-danger/20 border border-danger/50 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Email Address
                <span className="text-text-secondary text-xs ml-1">
                  (Your ELDES Cloud login email)
                </span>
              </label>
              <input
                type="email"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-sm"
                placeholder="your.email@example.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-sm"
                placeholder="Your ELDES Cloud password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-accent hover:bg-accent-hover border border-accent text-text-primary rounded-md font-medium transition-all duration-300 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-text-primary border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Info Note */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-text-secondary text-center">
              Your credentials are securely stored in an encrypted session and are not saved to disk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

