import type { NextConfig } from "next";
import * as path from "path";

const nextConfig: NextConfig = {
  basePath: "/eldes",
  trailingSlash: false,
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  
  // Enable source maps for debugging React in browser
  // In development, source maps are enabled by default
  // In production, we can enable them conditionally for debugging
  productionBrowserSourceMaps: process.env.ENABLE_SOURCE_MAPS === "true",
  
  webpack: (config, { isServer, dev }) => {
    // Enable source maps in webpack for better debugging
    if (!isServer) {
      // Client-side source maps
      config.devtool = dev ? "eval-source-map" : "source-map";
    } else {
      // Server-side source maps (for server-side debugging)
      config.devtool = dev ? "eval-source-map" : "source-map";
    }
    
    if (isServer) {
      // Exclude better-sqlite3 and its native bindings from webpack bundling
      const originalExternals = config.externals;
      
      // Use a function to properly exclude better-sqlite3
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        (ctx: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (ctx.request === "better-sqlite3" || ctx.request?.includes("better-sqlite3")) {
            return callback(null, `commonjs ${ctx.request}`);
          }
          if (typeof originalExternals === "function") {
            return (originalExternals as Function)(ctx, callback);
          }
          callback();
        },
      ];
    }
    return config;
  },
  // Ensure native modules are not bundled - Next.js 15 requirement
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
