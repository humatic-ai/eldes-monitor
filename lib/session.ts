import 'server-only';
import { cookies } from "next/headers";
import * as crypto from "crypto";
import { encrypt, decrypt } from "./crypto";
import { ELDESCloudAPI } from "./eldes-api";
import db from "./db";

export interface SessionPayload {
  sessionId: string;
  username: string;
  expiresAt: number;
}

export interface SessionData {
  sessionId: string;
  username: string;
  password: string; // Encrypted in memory
  createdAt: number;
  lastAccessed: number;
}

// Database-backed session store (persists across server reboots)
// Also maintain in-memory cache for performance
const sessionsCache = new Map<string, SessionData>();

const SESSION_COOKIE_NAME = "eldes_session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up expired sessions every hour

// Clean up expired sessions periodically (both database and cache)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    // Clean up expired sessions from database
    try {
      db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
    } catch (error) {
      console.error("[Session] Error cleaning up expired sessions from database:", error);
    }
    // Clean up expired sessions from cache
    for (const [sessionId, session] of sessionsCache.entries()) {
      if (now - session.lastAccessed > SESSION_DURATION) {
        sessionsCache.delete(sessionId);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Generate a secure random session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Create a new session with encrypted credentials
 * Returns the session ID (not the encrypted cookie value)
 */
export async function createSession(
  username: string,
  password: string
): Promise<string> {
  // Allow demo credentials to bypass real API validation
  const isDemoCredentials = username === "demo@eldes.demo" && password === "demo";
  
  if (!isDemoCredentials) {
    // Validate credentials by attempting to authenticate
    const api = new ELDESCloudAPI({ username, password });
    try {
      const authenticated = await api.authenticate();
      if (!authenticated) {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      throw new Error("Invalid credentials");
    }
  }

  // Create session
  const sessionId = generateSessionId();
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION;
  const encryptedPassword = encrypt(password);
  
  const session: SessionData = {
    sessionId,
    username,
    password: encryptedPassword, // Encrypt password in session
    createdAt: now,
    lastAccessed: now,
  };

  // Store in database (persists across reboots)
  try {
    db.prepare(`
      INSERT INTO sessions (session_id, username, password_encrypted, created_at, last_accessed, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, username, encryptedPassword, now, now, expiresAt);
  } catch (error) {
    console.error("[Session] Error storing session in database:", error);
    throw new Error("Failed to create session");
  }

  // Also store in memory cache for performance
  sessionsCache.set(sessionId, session);
  console.log("[Session] Created new session:", sessionId.substring(0, 10) + "...", "for user:", username);
  return sessionId;
}

/**
 * Create and set encrypted session cookie (Next.js best practice)
 */
export async function createSessionCookie(sessionId: string): Promise<string> {
  // Get username from cache or database
  let username = sessionsCache.get(sessionId)?.username;
  if (!username) {
    const dbSession = db.prepare("SELECT username FROM sessions WHERE session_id = ?").get(sessionId) as { username: string } | undefined;
    username = dbSession?.username || "";
  }
  
  const expiresAt = Date.now() + SESSION_DURATION;
  const payload: SessionPayload = {
    sessionId,
    username,
    expiresAt,
  };
  
  // Encrypt the session payload (encrypt is synchronous)
  const encryptedSession = encrypt(JSON.stringify(payload));
  return encryptedSession;
}

/**
 * Get session data from encrypted cookie (Next.js best practice)
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const encryptedSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!encryptedSession) {
      return null;
    }

    // Decrypt the session payload (decrypt is synchronous)
    let payload: SessionPayload;
    try {
      const decrypted = decrypt(encryptedSession);
      payload = JSON.parse(decrypted);
    } catch (error) {
      console.error("[Session] Failed to decrypt session:", error);
      return null;
    }

    // Check if session expired
    if (Date.now() > payload.expiresAt) {
      console.log("[Session] Session expired");
      // Clean up from database and cache
      db.prepare("DELETE FROM sessions WHERE session_id = ?").run(payload.sessionId);
      sessionsCache.delete(payload.sessionId);
      return null;
    }

    // Try to get from cache first (performance optimization)
    let session = sessionsCache.get(payload.sessionId);
    
    // If not in cache, load from database
    if (!session) {
      const dbSession = db.prepare(`
        SELECT session_id, username, password_encrypted, created_at, last_accessed
        FROM sessions
        WHERE session_id = ? AND expires_at > ?
      `).get(payload.sessionId, Date.now()) as {
        session_id: string;
        username: string;
        password_encrypted: string;
        created_at: number;
        last_accessed: number;
      } | undefined;

      if (!dbSession) {
        console.log("[Session] Session not found in database");
        return null;
      }

      // Reconstruct session object
      session = {
        sessionId: dbSession.session_id,
        username: dbSession.username,
        password: dbSession.password_encrypted,
        createdAt: dbSession.created_at,
        lastAccessed: dbSession.last_accessed,
      };

      // Add to cache
      sessionsCache.set(payload.sessionId, session);
    }

    // Update last accessed time in both database and cache
    const now = Date.now();
    session.lastAccessed = now;
    try {
      db.prepare("UPDATE sessions SET last_accessed = ? WHERE session_id = ?").run(now, payload.sessionId);
    } catch (error) {
      console.error("[Session] Error updating last_accessed:", error);
    }
    
    // Only log on errors or important events, not on every successful retrieval
    return session;
  } catch (error) {
    console.error("[Session] Error getting session:", error);
    return null;
  }
}

/**
 * Get decrypted credentials from session
 */
export async function getCredentials(): Promise<{ username: string; password: string } | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  return {
    username: session.username,
    password: decrypt(session.password), // Decrypt password
  };
}

/**
 * Delete a session from store
 */
export async function deleteSession(): Promise<void> {
  try {
    const session = await getSession();
    if (session) {
      // Delete from database
      db.prepare("DELETE FROM sessions WHERE session_id = ?").run(session.sessionId);
      // Delete from cache
      sessionsCache.delete(session.sessionId);
      console.log("[Session] Deleted session:", session.sessionId.substring(0, 10) + "...");
    }
  } catch (error) {
    console.error("[Session] Error deleting session:", error);
  }
}

/**
 * Get session cookie name
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

