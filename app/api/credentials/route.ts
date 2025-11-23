import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";

const credentialSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  deviceName: z.string().optional(),
});

// For simplicity, we'll use a single user session
// In production, implement proper authentication
const DEFAULT_USER_ID = 1;

/**
 * GET - List all credentials
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const credentials = db
      .prepare(
        "SELECT id, username, device_name, created_at, updated_at FROM eldes_credentials WHERE user_id = ?"
      )
      .all(DEFAULT_USER_ID);

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

/**
 * POST - Add new credentials
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = credentialSchema.parse(body);

    // Encrypt password
    const encryptedPassword = encrypt(data.password);

    // Insert credential
    const result = db
      .prepare(
        "INSERT INTO eldes_credentials (user_id, username, password_encrypted, device_name) VALUES (?, ?, ?, ?)"
      )
      .run(
        DEFAULT_USER_ID,
        data.username,
        encryptedPassword,
        data.deviceName || null
      );

    return NextResponse.json({
      id: result.lastInsertRowid,
      message: "Credentials added successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error adding credentials:", error);
    return NextResponse.json(
      { error: "Failed to add credentials" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove credentials
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Credential ID is required" },
        { status: 400 }
      );
    }

    db.prepare("DELETE FROM eldes_credentials WHERE id = ? AND user_id = ?").run(
      id,
      DEFAULT_USER_ID
    );

    return NextResponse.json({ message: "Credentials deleted successfully" });
  } catch (error) {
    console.error("Error deleting credentials:", error);
    return NextResponse.json(
      { error: "Failed to delete credentials" },
      { status: 500 }
    );
  }
}

