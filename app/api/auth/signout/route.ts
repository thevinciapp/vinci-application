import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * POST - Sign out the current user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Sign out the user
      await supabase.auth.signOut();
    }

    return NextResponse.json({
      status: 'success',
      data: { success: true }
    });
  } catch (error) {
    console.error('Server error in POST /api/auth/signout:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred during sign out' },
      { status: 500 }
    );
  }
}