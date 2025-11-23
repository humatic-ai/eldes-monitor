import { NextRequest, NextResponse } from "next/server";
import { createSession, createSessionCookie, getSessionCookieName } from "@/lib/session";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().email("Username must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    // Create session (this will validate credentials with ELDES API)
    const sessionId = await createSession(data.username, data.password);
    
    // Create encrypted session cookie
    const encryptedSession = await createSessionCookie(sessionId);

    // Determine if secure (HTTPS)
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const isSecure = forwardedProto === 'https' || request.url.startsWith('https://');
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
    });

    // Set HTTP-only, secure cookie (Next.js best practice)
    // Set path to "/" - Apache ProxyPassReverseCookiePath will rewrite to "/eldes"
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    response.cookies.set(getSessionCookieName(), encryptedSession, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      expires: expiresAt,
      path: "/", // Backend sets "/", Apache rewrites to "/eldes" for browser
    });
    
    // Log cookie details for debugging
    console.log("[Login] Cookie set - path: /, secure:", isSecure, "expires:", expiresAt.toISOString());
    
    console.log("[Login] Session created and cookie set");

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid credentials",
      },
      { status: 401 }
    );
  }
}

