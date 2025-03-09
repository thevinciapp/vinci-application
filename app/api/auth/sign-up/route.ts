import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ERROR_MESSAGES } from "@/app/lib/db";

/**
 * POST - Sign up a new user
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error("Error signing up:", error);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data,
      toast: {
        title: 'Welcome!',
        description: 'Please check your email to confirm your account.',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in POST /api/auth/sign-up:', error);
    return NextResponse.json(
      { status: 'error', error: ERROR_MESSAGES.SERVER_ERROR },
      { status: 500 }
    );
  }
}
