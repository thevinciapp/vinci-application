import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ERROR_MESSAGES } from "@/app/lib/db";

/**
 * POST - Sign in a user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { status: 'error', error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Error signing in:", error);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data,
      toast: {
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in POST /api/auth/sign-in:', error);
    return NextResponse.json(
      { status: 'error', error: ERROR_MESSAGES.SERVER_ERROR },
      { status: 500 }
    );
  }
}
