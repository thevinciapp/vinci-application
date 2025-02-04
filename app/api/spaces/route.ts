import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/space
 * Creates a new space record in the database.
 * Expects JSON body: { name: string, description?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);

    const { name, description } = body;
    
    if (!name) {
      console.error('Name is required for space creation');
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      console.error('Unauthorized request to create space');
      return new Response('Unauthorized', { status: 401 });
    }

    const { data, error } = await supabase
      .from('spaces')
      .insert({ name, description, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating space:', { error });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Created space:', data);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in space creation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/space
 * Fetches spaces for the current user.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching spaces:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in space fetch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
