import { NextResponse } from "next/server";
import { initializeApp } from "@/lib/init";

/**
 * POST - Initialize app and start cron job
 */
export async function POST() {
  try {
    initializeApp();
    return NextResponse.json({ message: "Application initialized and cron job started" });
  } catch (error) {
    console.error("Initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize application" },
      { status: 500 }
    );
  }
}

