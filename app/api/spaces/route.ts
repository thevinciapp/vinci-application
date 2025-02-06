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

    const { name, description, model, provider } = body;
    
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

      const { data: spaceData, error: spaceError } = await supabase
      .from('spaces')
      .insert({ 
        name, 
        description, 
        user_id: user.id, 
        model: model || 'deepseek-r1-distill-llama-70b', 
        provider: provider || 'deepseek'
      })
      .select()
      .single();

    if (spaceError) {
      console.error('Error creating space:', spaceError);
      return NextResponse.json({ error: spaceError.message }, { status: 400 });
    }

    if (!spaceError) {
      // Create default conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          space_id: spaceData.id,
          title: 'Default Conversation'
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating default conversation:', convError);
        return NextResponse.json({ error: convError.message }, { status: 400 });
      }

      return NextResponse.json({ ...spaceData, default_conversation: convData });
    }

    console.log('Created space:', spaceData);
    return NextResponse.json(spaceData);
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

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { error } = await supabase
      .from('spaces')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting space:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return new Response(null, { status: 204 });
  } catch (err: any) {
    console.error('Error in space deletion:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
