import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Electron authentication API
 * 
 * This file provides endpoints for the Electron app to handle authentication:
 * - GET: Get current session cookies if already authenticated
 * - POST: Set up a new session using an access token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json(
        { status: 'error', error: 'Access token is required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Get the session using the token
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error("Error getting user with token:", error);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 401 }
      );
    }
    
    if (!data.user) {
      return NextResponse.json(
        { status: 'error', error: 'Failed to get user from token' },
        { status: 401 }
      );
    }
    
    // Now create a session for this user using admin functions
    // First get the session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return NextResponse.json(
        { status: 'error', error: sessionError.message },
        { status: 401 }
      );
    }
    
    // Get cookies from the response
    const response = new NextResponse(JSON.stringify({
      status: 'success',
      data: {
        user: data.user,
        session: sessionData.session
      }
    }));
    
    // Get cookie headers from the response
    const setCookieHeader = response.headers.get('set-cookie');
    const cookies = setCookieHeader ? parseCookieHeader(setCookieHeader) : {};
    
    return NextResponse.json({
      status: 'success',
      data: {
        user: data.user,
        session: sessionData.session,
        cookies
      }
    });
  } catch (error) {
    console.error('Server error in POST /api/auth/electron:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Try to get the bearer token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    let accessToken = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    const supabase = await createClient();
    let session;
    
    // If we have a token, get the user
    if (accessToken) {
      console.log("Using provided token to get user for Electron");
      const { data, error } = await supabase.auth.getUser(accessToken);
      
      if (error) {
        console.error("Error getting user with token:", error);
        return NextResponse.json(
          { status: 'error', error: error.message },
          { status: 401 }
        );
      }
      
      // Get session after validating the token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Error getting session after token validation:", sessionError);
        return NextResponse.json(
          { status: 'error', error: sessionError.message },
          { status: 401 }
        );
      }
      
      session = sessionData.session;
    } else {
      // Fall back to the session from cookies if no token provided
      const { data: { session: cookieSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error fetching session for Electron:", error);
        return NextResponse.json(
          { status: 'error', error: error.message },
          { status: 401 }
        );
      }
      
      session = cookieSession;
    }

    if (!session) {
      return NextResponse.json(
        { status: 'error', error: 'No active session' },
        { status: 401 }
      );
    }

    // Get all cookies from the request
    const cookieString = request.headers.get('cookie') || '';
    const cookies = parseCookies(cookieString);
    
    return NextResponse.json({
      status: 'success',
      data: {
        session: {
          ...session,
          user: session.user
        },
        cookies
      }
    });
  } catch (error) {
    console.error('Server error in GET /api/auth/electron:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to parse cookie string into an object
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[name] = value;
    }
  });
  
  return cookies;
}

/**
 * Helper function to parse Set-Cookie header into an object
 */
function parseCookieHeader(setCookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!setCookieHeader) return cookies;
  
  // Split multiple Set-Cookie headers
  const cookieStrings = setCookieHeader.split(',');
  
  cookieStrings.forEach(cookieString => {
    // Each cookie is formatted as name=value; path=/; expires=...; etc.
    const cookieParts = cookieString.split(';');
    if (cookieParts.length > 0) {
      const nameValue = cookieParts[0].split('=');
      if (nameValue.length >= 2) {
        const name = nameValue[0].trim();
        const value = nameValue.slice(1).join('=').trim();
        cookies[name] = value;
      }
    }
  });
  
  return cookies;
}