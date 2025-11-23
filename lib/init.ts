/**
 * Initialize application on startup
 * This ensures the database is set up and cron job is started
 */

import db from "./db";
import { startCronJob } from "./cron";

let initialized = false;

export function initializeApp() {
  if (initialized) {
    return;
  }

  // Database is already initialized in db.ts
  // Just verify connection
  try {
    db.prepare("SELECT 1").get();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  }

  // Start cron job - this will collect all temperature data hourly
  startCronJob();

  initialized = true;
  console.log("Application initialized");
}

