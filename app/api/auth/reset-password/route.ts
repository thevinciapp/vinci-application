import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ERROR_MESSAGES } from "@/app/lib/db";

/**
 * POST - Send password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { status: 'error', error: 'Email is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/protected/reset-password`,
    });

    if (error) {
      console.error("Error sending reset password email:", error);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: 'success',
      toast: {
        title: 'Check your email',
        description: 'We have sent you a password reset link.',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in POST /api/auth/reset-password:', error);
    return NextResponse.json(
      { status: 'error', error: ERROR_MESSAGES.SERVER_ERROR },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update password
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { status: 'error', error: 'New password is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error("Error updating password:", error);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: 'success',
      toast: {
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in PUT /api/auth/reset-password:', error);
    return NextResponse.json(
      { status: 'error', error: ERROR_MESSAGES.SERVER_ERROR },
      { status: 500 }
    );
  }
}
