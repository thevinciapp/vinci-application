import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET - Get the current user session
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Error fetching session:", error);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: { session }
    });
  } catch (error) {
    console.error('Server error in GET /api/auth/session:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}