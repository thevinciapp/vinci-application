import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, description, model, provider, setActive } = await request.json();
    const spaceId = params.id;

    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // First, verify the space belongs to the user
    const { data: existingSpace } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (!existingSpace) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    // Update the space if needed
    let updatedSpace = existingSpace;
    if (name || description || model || provider) {
      const { data: spaceData, error: updateError } = await supabase
        .from('spaces')
        .update({ 
          name: name || undefined,
          description: description || undefined,
          model: model || undefined,
          provider: provider || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', spaceId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating space:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
      updatedSpace = spaceData;
    }

    // Set as active space if requested
    if (setActive) {
      // First, upsert the active space record
      const { error: activeError } = await supabase
        .from('active_spaces')
        .upsert({
          user_id: user.id,
          space_id: spaceId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (activeError) {
        console.error('Error setting active space:', activeError);
        return NextResponse.json({ error: activeError.message }, { status: 400 });
      }

      // Return the updated space with active status
      return NextResponse.json({ ...updatedSpace, isActive: true });
    }

    return NextResponse.json(updatedSpace);
  } catch (err: any) {
    console.error('Error in space update:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const spaceId = params.id;
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
      .eq('id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching space:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in space fetch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const spaceId = params.id;
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
      .eq('id', spaceId)
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