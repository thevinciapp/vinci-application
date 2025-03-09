import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { redis } from "@/app/lib/cache";

/**
 * POST - Sign out the current user and clear cache
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Clear Redis cache for the user
      try {
        // Use a pattern to clear all user-specific cache entries
        // Note: In a production environment, you might want a more targeted approach
        const keys = await redis.keys(`user:${user.id}:*`);
        if (keys.length > 0) {
          await redis.del(keys);
        }
      } catch (cacheError) {
        console.error('Error clearing Redis cache:', cacheError);
        // Continue with signout even if cache clearing fails
      }

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