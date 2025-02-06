import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";

/**
 * POST /api/conversation
 * Creates a new conversation within a space.
 * Expects JSON body: { space_id: string, title?: string }
 */
export async function POST(request: Request) {
  try {
    const { space_id, title } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data, error } = await supabase
      .from('conversations')
      .insert({ space_id, title })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
