import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: { spaceId: string } }
) {
  const { params } = context;
  const spaceId = params.spaceId;
  
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(conversations);
  } catch (error: any) {
    console.error('Error in conversations fetch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
