import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSessionCookieName } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    // Delete session from store
    await deleteSession();

    const response = NextResponse.json({
      success: true,
      message: "Logout successful",
    });

    // Clear the session cookie (Next.js best practice)
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const isSecure = forwardedProto === 'https' || process.env.NODE_ENV === "production";
    
    response.cookies.delete(getSessionCookieName());
    
    // Also explicitly set empty cookie to ensure it's cleared
    response.cookies.set(getSessionCookieName(), "", {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/", // Use root path - Apache will rewrite it via ProxyPassReverseCookiePath
    });

    console.log("[Logout] Session deleted and cookie cleared");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to logout" },
      { status: 500 }
    );
  }
}

