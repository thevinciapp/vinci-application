import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AVAILABLE_MODELS, isValidModelForProvider, type Provider } from '@/config/models';

/**
 * POST /api/space
 * Creates a new space record in the database.
 * Expects JSON body: { name: string, description?: string, model: string, provider: string, setActive?: boolean }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);

    const { name, description, model, provider, setActive } = body;
    
    if (!name) {
      console.error('Name is required for space creation');
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!provider || !Object.keys(AVAILABLE_MODELS).includes(provider)) {
      return NextResponse.json({ 
        error: `Invalid provider. Available providers: ${Object.keys(AVAILABLE_MODELS).join(', ')}` 
      }, { status: 400 });
    }

    if (!model || !isValidModelForProvider(provider as Provider, model)) {
      return NextResponse.json({ 
        error: `Invalid model for provider ${provider}. Available models: ${AVAILABLE_MODELS[provider as Provider].map(m => m.name).join(', ')}` 
      }, { status: 400 });
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
        model, 
        provider
      })
      .select()
      .single();

    if (spaceError) {
      console.error('Error creating space:', spaceError);
      return NextResponse.json({ error: spaceError.message }, { status: 400 });
    }

    // Set as active space if requested
    if (setActive && spaceData) {
      const { error: activeError } = await supabase
        .from('active_spaces')
        .upsert({
          user_id: user.id,
          space_id: spaceData.id
        }, {
          onConflict: 'user_id'
        });

      if (activeError) {
        console.error('Error setting active space:', activeError);
        return NextResponse.json({ error: activeError.message }, { status: 400 });
      }

      spaceData.isActive = true;
    }

    if (!spaceError) {
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

    const { data: activeSpaceData } = await supabase
      .from('active_spaces')
      .select('space_id')
      .eq('user_id', user.id)
      .single();

    const { data: spaces, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching spaces:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Add isActive flag and ensure active space is first
    const activeSpace = spaces.find(space => space.id === activeSpaceData?.space_id);
    const otherSpaces = spaces.filter(space => space.id !== activeSpaceData?.space_id);
    
    const spacesWithActive = [
      ...(activeSpace ? [{ ...activeSpace, isActive: true }] : []),
      ...otherSpaces.map(space => ({ ...space, isActive: false }))
    ];

    return NextResponse.json(spacesWithActive);
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
