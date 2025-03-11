import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("Error refreshing session:", error);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { status: 'error', error: 'No session found' },
        { status: 401 }
      );
    }

    // Return the new access token
    return NextResponse.json({
      status: 'success',
      token: session.access_token
    });
  } catch (error) {
    console.error('Server error in POST /api/auth/refresh:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { status: 'error', error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Use the refresh token to get a new session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      console.error("Error refreshing session:", error);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 401 }
      );
    }

    // Return both tokens
    return NextResponse.json({
      status: 'success',
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: data.session.user
        }
      }
    });
  } catch (error) {
    console.error("Server error during refresh:", error);
    return NextResponse.json(
      { status: 'error', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
