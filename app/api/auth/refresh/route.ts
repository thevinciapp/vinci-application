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
